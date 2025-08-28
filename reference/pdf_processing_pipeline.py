"""
Credit Card Processor - Async PDF Processing Pipeline
Enterprise-grade async processing with Azure Document Intelligence integration
"""

import asyncio
import hashlib
import json
import logging
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from uuid import UUID

import aiofiles
from azure.ai.documentintelligence.aio import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeResult
from azure.core.credentials import AzureKeyCredential
from azure.storage.blob.aio import BlobServiceClient, ContainerClient
from celery import Celery, Task
from celery.result import AsyncResult
from pydantic import BaseModel, Field
from redis import asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession
import PyPDF2
from PIL import Image
import io


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ========================================
# 1. CONFIGURATION & SETUP
# ========================================

@dataclass
class ProcessorConfig:
    """Configuration for PDF processing pipeline"""
    # Azure Document Intelligence
    doc_intelligence_endpoint: str = "https://iius-doc-intelligence.cognitiveservices.azure.com/"
    doc_intelligence_key: str  # From Key Vault
    
    # Azure Blob Storage
    storage_account_name: str = "cssa915121f46f2ae0d374e7"
    storage_account_key: str  # From Key Vault
    container_name: str = "credit-card-processor"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # Celery
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"
    
    # Processing settings
    max_file_size_mb: int = 100
    max_pages_per_pdf: int = 500
    confidence_threshold: float = 0.75
    batch_size: int = 10
    max_retries: int = 3
    retry_delay_seconds: int = 60


# ========================================
# 2. CELERY CONFIGURATION
# ========================================

app = Celery('credit_card_processor')
app.config_from_object({
    'broker_url': ProcessorConfig().celery_broker_url,
    'result_backend': ProcessorConfig().celery_result_backend,
    'task_serializer': 'json',
    'accept_content': ['json'],
    'result_serializer': 'json',
    'timezone': 'UTC',
    'enable_utc': True,
    'task_track_started': True,
    'task_time_limit': 3600,  # 1 hour
    'task_soft_time_limit': 3300,  # 55 minutes
    'task_acks_late': True,
    'worker_prefetch_multiplier': 1,
    'worker_max_tasks_per_child': 50,
})


# ========================================
# 3. DATA MODELS
# ========================================

class ProcessingStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"


class DocumentType(str, Enum):
    CAR_REPORT = "car_report"
    RECEIPT_REPORT = "receipt_report"


class ExtractionResult(BaseModel):
    """Result from document extraction"""
    document_type: DocumentType
    confidence_score: float
    extracted_data: Dict[str, Any]
    page_count: int
    processing_time_ms: int
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class EmployeeData(BaseModel):
    """Extracted employee data"""
    employee_name: str
    employee_id: Optional[str]
    card_number: Optional[str]
    car_total: Decimal = Decimal("0.00")
    page_range: List[int] = Field(default_factory=list)
    transactions: List[Dict[str, Any]] = Field(default_factory=list)


class TransactionData(BaseModel):
    """Extracted transaction data"""
    transaction_id: str
    employee_name: str
    transaction_date: str
    amount: Decimal
    description: Optional[str]
    merchant_name: Optional[str]
    merchant_address: Optional[str]
    has_attachment: bool = False
    coding_info: Optional[Dict[str, Any]]
    confidence_score: float


# ========================================
# 4. AZURE DOCUMENT INTELLIGENCE CLIENT
# ========================================

class DocumentIntelligenceProcessor:
    """Wrapper for Azure Document Intelligence operations"""
    
    def __init__(self, config: ProcessorConfig):
        self.config = config
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Document Intelligence client"""
        credential = AzureKeyCredential(self.config.doc_intelligence_key)
        self.client = DocumentIntelligenceClient(
            endpoint=self.config.doc_intelligence_endpoint,
            credential=credential
        )
    
    async def analyze_document(
        self, 
        document_bytes: bytes, 
        document_type: DocumentType
    ) -> AnalyzeResult:
        """Analyze document with appropriate model"""
        try:
            # Select model based on document type
            if document_type == DocumentType.CAR_REPORT:
                model_id = "prebuilt-invoice"  # Or custom model
            else:
                model_id = "prebuilt-receipt"
            
            # Analyze document
            poller = await self.client.begin_analyze_document(
                model_id=model_id,
                document=document_bytes
            )
            
            result = await poller.result()
            return result
            
        except Exception as e:
            logger.error(f"Document Intelligence error: {str(e)}")
            raise
    
    async def extract_car_data(self, analyze_result: AnalyzeResult) -> List[EmployeeData]:
        """Extract CAR data from analysis result"""
        employees = []
        
        for document in analyze_result.documents:
            # Extract fields using Document Intelligence results
            employee_data = EmployeeData(
                employee_name=self._extract_field(document, "EmployeeName"),
                employee_id=self._extract_field(document, "EmployeeId"),
                card_number=self._extract_field(document, "CardNumber"),
                car_total=Decimal(str(self._extract_field(document, "Total", 0)))
            )
            
            # Extract transactions from tables
            for table in analyze_result.tables:
                transactions = self._parse_transaction_table(table)
                employee_data.transactions.extend(transactions)
            
            employees.append(employee_data)
        
        return employees
    
    async def extract_receipt_data(self, analyze_result: AnalyzeResult) -> List[TransactionData]:
        """Extract receipt data from analysis result"""
        transactions = []
        
        for document in analyze_result.documents:
            transaction = TransactionData(
                transaction_id=self._extract_field(document, "TransactionId"),
                employee_name=self._extract_field(document, "EmployeeName"),
                transaction_date=self._extract_field(document, "TransactionDate"),
                amount=Decimal(str(self._extract_field(document, "Total", 0))),
                merchant_name=self._extract_field(document, "MerchantName"),
                confidence_score=document.confidence
            )
            transactions.append(transaction)
        
        return transactions
    
    def _extract_field(self, document: Any, field_name: str, default=None):
        """Helper to extract field from document"""
        if hasattr(document.fields, field_name):
            field = getattr(document.fields, field_name)
            return field.value if field else default
        return default
    
    def _parse_transaction_table(self, table: Any) -> List[Dict[str, Any]]:
        """Parse transaction table from document"""
        transactions = []
        # Implementation to parse table structure
        return transactions


# ========================================
# 5. BLOB STORAGE MANAGER
# ========================================

class BlobStorageManager:
    """Manage Azure Blob Storage operations"""
    
    def __init__(self, config: ProcessorConfig):
        self.config = config
        self.blob_service_client = None
        self.container_client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize blob storage client"""
        connection_string = (
            f"DefaultEndpointsProtocol=https;"
            f"AccountName={self.config.storage_account_name};"
            f"AccountKey={self.config.storage_account_key};"
            f"EndpointSuffix=core.windows.net"
        )
        
        self.blob_service_client = BlobServiceClient.from_connection_string(
            connection_string
        )
        self.container_client = self.blob_service_client.get_container_client(
            self.config.container_name
        )
    
    async def upload_document(
        self, 
        file_bytes: bytes, 
        blob_name: str,
        metadata: Optional[Dict[str, str]] = None
    ) -> str:
        """Upload document to blob storage"""
        try:
            blob_client = self.container_client.get_blob_client(blob_name)
            
            # Upload with metadata
            await blob_client.upload_blob(
                file_bytes,
                overwrite=True,
                metadata=metadata or {}
            )
            
            # Return blob URL
            return blob_client.url
            
        except Exception as e:
            logger.error(f"Blob upload error: {str(e)}")
            raise
    
    async def download_document(self, blob_name: str) -> bytes:
        """Download document from blob storage"""
        try:
            blob_client = self.container_client.get_blob_client(blob_name)
            blob_data = await blob_client.download_blob()
            return await blob_data.readall()
            
        except Exception as e:
            logger.error(f"Blob download error: {str(e)}")
            raise
    
    async def delete_document(self, blob_name: str):
        """Delete document from blob storage"""
        try:
            blob_client = self.container_client.get_blob_client(blob_name)
            await blob_client.delete_blob()
            
        except Exception as e:
            logger.error(f"Blob delete error: {str(e)}")
            raise


# ========================================
# 6. PDF PROCESSOR
# ========================================

class PDFProcessor:
    """Core PDF processing logic"""
    
    def __init__(self, config: ProcessorConfig):
        self.config = config
        self.doc_intelligence = DocumentIntelligenceProcessor(config)
        self.blob_storage = BlobStorageManager(config)
        self.redis_client = None
    
    async def initialize(self):
        """Initialize async resources"""
        self.redis_client = await aioredis.from_url(self.config.redis_url)
    
    async def process_car_pdf(
        self,
        session_id: UUID,
        file_bytes: bytes,
        file_name: str
    ) -> Dict[str, Any]:
        """Process CAR PDF file"""
        start_time = datetime.utcnow()
        processing_id = f"car_{session_id}_{start_time.timestamp()}"
        
        try:
            # Update status in Redis
            await self._update_status(processing_id, ProcessingStatus.PROCESSING)
            
            # Calculate file hash
            file_hash = hashlib.sha256(file_bytes).hexdigest()
            
            # Check cache for already processed file
            cached_result = await self._get_cached_result(file_hash)
            if cached_result:
                logger.info(f"Using cached result for {file_name}")
                return cached_result
            
            # Upload to blob storage
            blob_name = f"car/{session_id}/{file_name}"
            blob_url = await self.blob_storage.upload_document(
                file_bytes,
                blob_name,
                metadata={
                    "session_id": str(session_id),
                    "document_type": DocumentType.CAR_REPORT.value,
                    "file_hash": file_hash
                }
            )
            
            # Analyze with Document Intelligence
            analyze_result = await self.doc_intelligence.analyze_document(
                file_bytes,
                DocumentType.CAR_REPORT
            )
            
            # Extract employee data
            employees = await self.doc_intelligence.extract_car_data(analyze_result)
            
            # Split PDF by employee
            split_results = await self._split_pdf_by_employee(
                file_bytes,
                employees,
                session_id
            )
            
            # Prepare result
            result = {
                "session_id": str(session_id),
                "file_name": file_name,
                "file_hash": file_hash,
                "blob_url": blob_url,
                "employee_count": len(employees),
                "employees": [e.dict() for e in employees],
                "split_files": split_results,
                "processing_time_ms": int((datetime.utcnow() - start_time).total_seconds() * 1000),
                "status": ProcessingStatus.COMPLETED.value
            }
            
            # Cache result
            await self._cache_result(file_hash, result)
            
            # Update status
            await self._update_status(processing_id, ProcessingStatus.COMPLETED)
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing CAR PDF: {str(e)}")
            await self._update_status(processing_id, ProcessingStatus.FAILED, str(e))
            raise
    
    async def process_receipt_pdf(
        self,
        session_id: UUID,
        file_bytes: bytes,
        file_name: str
    ) -> Dict[str, Any]:
        """Process Receipt PDF file"""
        start_time = datetime.utcnow()
        processing_id = f"receipt_{session_id}_{start_time.timestamp()}"
        
        try:
            # Update status
            await self._update_status(processing_id, ProcessingStatus.PROCESSING)
            
            # Calculate file hash
            file_hash = hashlib.sha256(file_bytes).hexdigest()
            
            # Check cache
            cached_result = await self._get_cached_result(file_hash)
            if cached_result:
                logger.info(f"Using cached result for {file_name}")
                return cached_result
            
            # Upload to blob storage
            blob_name = f"receipts/{session_id}/{file_name}"
            blob_url = await self.blob_storage.upload_document(
                file_bytes,
                blob_name,
                metadata={
                    "session_id": str(session_id),
                    "document_type": DocumentType.RECEIPT_REPORT.value,
                    "file_hash": file_hash
                }
            )
            
            # Analyze with Document Intelligence
            analyze_result = await self.doc_intelligence.analyze_document(
                file_bytes,
                DocumentType.RECEIPT_REPORT
            )
            
            # Extract transaction data
            transactions = await self.doc_intelligence.extract_receipt_data(analyze_result)
            
            # Group by employee and split PDF
            grouped_transactions = self._group_transactions_by_employee(transactions)
            split_results = await self._split_receipt_pdf(
                file_bytes,
                grouped_transactions,
                session_id
            )
            
            # Validate transactions
            validation_results = await self._validate_transactions(transactions)
            
            # Prepare result
            result = {
                "session_id": str(session_id),
                "file_name": file_name,
                "file_hash": file_hash,
                "blob_url": blob_url,
                "transaction_count": len(transactions),
                "transactions": [t.dict() for t in transactions],
                "validation_issues": validation_results,
                "split_files": split_results,
                "processing_time_ms": int((datetime.utcnow() - start_time).total_seconds() * 1000),
                "status": ProcessingStatus.COMPLETED.value
            }
            
            # Cache result
            await self._cache_result(file_hash, result)
            
            # Update status
            await self._update_status(processing_id, ProcessingStatus.COMPLETED)
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing Receipt PDF: {str(e)}")
            await self._update_status(processing_id, ProcessingStatus.FAILED, str(e))
            raise
    
    async def _split_pdf_by_employee(
        self,
        file_bytes: bytes,
        employees: List[EmployeeData],
        session_id: UUID
    ) -> List[Dict[str, str]]:
        """Split PDF by employee page ranges"""
        split_results = []
        
        # Read PDF
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        
        for employee in employees:
            if not employee.page_range:
                continue
            
            # Create new PDF for employee
            pdf_writer = PyPDF2.PdfWriter()
            
            for page_num in employee.page_range:
                if page_num < len(pdf_reader.pages):
                    pdf_writer.add_page(pdf_reader.pages[page_num])
            
            # Save to bytes
            output_buffer = io.BytesIO()
            pdf_writer.write(output_buffer)
            output_bytes = output_buffer.getvalue()
            
            # Upload to blob storage
            blob_name = f"split/car/{session_id}/{employee.employee_name}.pdf"
            blob_url = await self.blob_storage.upload_document(
                output_bytes,
                blob_name,
                metadata={
                    "session_id": str(session_id),
                    "employee_name": employee.employee_name,
                    "page_count": str(len(employee.page_range))
                }
            )
            
            split_results.append({
                "employee_name": employee.employee_name,
                "blob_url": blob_url,
                "page_count": len(employee.page_range)
            })
        
        return split_results
    
    async def _split_receipt_pdf(
        self,
        file_bytes: bytes,
        grouped_transactions: Dict[str, List[TransactionData]],
        session_id: UUID
    ) -> List[Dict[str, str]]:
        """Split receipt PDF by employee"""
        # Similar implementation to _split_pdf_by_employee
        split_results = []
        # Implementation details...
        return split_results
    
    def _group_transactions_by_employee(
        self,
        transactions: List[TransactionData]
    ) -> Dict[str, List[TransactionData]]:
        """Group transactions by employee name"""
        grouped = {}
        for transaction in transactions:
            if transaction.employee_name not in grouped:
                grouped[transaction.employee_name] = []
            grouped[transaction.employee_name].append(transaction)
        return grouped
    
    async def _validate_transactions(
        self,
        transactions: List[TransactionData]
    ) -> List[Dict[str, Any]]:
        """Validate transactions for issues"""
        issues = []
        
        for transaction in transactions:
            # Check confidence score
            if transaction.confidence_score < self.config.confidence_threshold:
                issues.append({
                    "transaction_id": transaction.transaction_id,
                    "issue_type": "low_confidence",
                    "description": f"Low confidence score: {transaction.confidence_score}",
                    "severity": "medium"
                })
            
            # Check for missing attachment
            if not transaction.has_attachment:
                issues.append({
                    "transaction_id": transaction.transaction_id,
                    "issue_type": "missing_receipt",
                    "description": "No receipt attachment found",
                    "severity": "high"
                })
            
            # Check for missing coding
            if not transaction.coding_info:
                issues.append({
                    "transaction_id": transaction.transaction_id,
                    "issue_type": "missing_coding_info",
                    "description": "No job or GL coding provided",
                    "severity": "high"
                })
        
        return issues
    
    async def _update_status(
        self,
        processing_id: str,
        status: ProcessingStatus,
        error_message: Optional[str] = None
    ):
        """Update processing status in Redis"""
        status_data = {
            "status": status.value,
            "updated_at": datetime.utcnow().isoformat(),
            "error_message": error_message
        }
        
        await self.redis_client.setex(
            f"processing_status:{processing_id}",
            3600,  # 1 hour TTL
            json.dumps(status_data)
        )
    
    async def _get_cached_result(self, file_hash: str) -> Optional[Dict[str, Any]]:
        """Get cached processing result"""
        cached = await self.redis_client.get(f"file_cache:{file_hash}")
        if cached:
            return json.loads(cached)
        return None
    
    async def _cache_result(self, file_hash: str, result: Dict[str, Any]):
        """Cache processing result"""
        await self.redis_client.setex(
            f"file_cache:{file_hash}",
            86400,  # 24 hour TTL
            json.dumps(result)
        )


# ========================================
# 7. CELERY TASKS
# ========================================

@app.task(bind=True, max_retries=3)
def process_car_pdf_task(
    self: Task,
    session_id: str,
    file_path: str,
    user_id: str
) -> Dict[str, Any]:
    """Celery task to process CAR PDF"""
    try:
        # Run async processing
        config = ProcessorConfig()
        processor = PDFProcessor(config)
        
        # Create event loop for async execution
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # Initialize processor
        loop.run_until_complete(processor.initialize())
        
        # Read file
        with open(file_path, 'rb') as f:
            file_bytes = f.read()
        
        # Process PDF
        result = loop.run_until_complete(
            processor.process_car_pdf(
                UUID(session_id),
                file_bytes,
                Path(file_path).name
            )
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Task failed: {str(e)}")
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@app.task(bind=True, max_retries=3)
def process_receipt_pdf_task(
    self: Task,
    session_id: str,
    file_path: str,
    user_id: str
) -> Dict[str, Any]:
    """Celery task to process Receipt PDF"""
    try:
        # Similar implementation to process_car_pdf_task
        config = ProcessorConfig()
        processor = PDFProcessor(config)
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        loop.run_until_complete(processor.initialize())
        
        with open(file_path, 'rb') as f:
            file_bytes = f.read()
        
        result = loop.run_until_complete(
            processor.process_receipt_pdf(
                UUID(session_id),
                file_bytes,
                Path(file_path).name
            )
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Task failed: {str(e)}")
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@app.task(bind=True)
def combine_and_generate_reports_task(
    self: Task,
    session_id: str,
    user_id: str
) -> Dict[str, Any]:
    """Combine PDFs and generate final reports"""
    try:
        # Implementation for combining PDFs and generating Excel/CSV reports
        pass
        
    except Exception as e:
        logger.error(f"Report generation failed: {str(e)}")
        raise


# ========================================
# 8. MONITORING & METRICS
# ========================================

class ProcessingMetrics:
    """Track processing metrics"""
    
    def __init__(self):
        self.redis_client = None
    
    async def initialize(self, redis_url: str):
        """Initialize Redis client"""
        self.redis_client = await aioredis.from_url(redis_url)
    
    async def record_processing_time(
        self,
        document_type: DocumentType,
        processing_time_ms: int
    ):
        """Record processing time metric"""
        key = f"metrics:processing_time:{document_type.value}"
        await self.redis_client.lpush(key, processing_time_ms)
        await self.redis_client.ltrim(key, 0, 999)  # Keep last 1000 entries
    
    async def record_error(
        self,
        error_type: str,
        error_message: str
    ):
        """Record error metric"""
        key = f"metrics:errors:{datetime.utcnow().strftime('%Y%m%d')}"
        error_data = {
            "type": error_type,
            "message": error_message,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.redis_client.lpush(key, json.dumps(error_data))
    
    async def get_processing_stats(self) -> Dict[str, Any]:
        """Get processing statistics"""
        # Implementation to aggregate and return metrics
        return {
            "average_car_processing_time_ms": 0,
            "average_receipt_processing_time_ms": 0,
            "total_processed_today": 0,
            "error_rate": 0.0
        }


# ========================================
# 9. ERROR HANDLING & RECOVERY
# ========================================

class ProcessingError(Exception):
    """Custom exception for processing errors"""
    def __init__(self, message: str, error_type: str, recoverable: bool = True):
        self.message = message
        self.error_type = error_type
        self.recoverable = recoverable
        super().__init__(self.message)


async def handle_processing_error(
    error: Exception,
    session_id: UUID,
    document_type: DocumentType
):
    """Handle processing errors with appropriate recovery"""
    logger.error(f"Processing error for session {session_id}: {str(error)}")
    
    # Record error metric
    metrics = ProcessingMetrics()
    await metrics.record_error(
        error_type=type(error).__name__,
        error_message=str(error)
    )
    
    # Determine if recoverable
    if isinstance(error, ProcessingError) and error.recoverable:
        # Schedule for retry
        logger.info(f"Scheduling retry for session {session_id}")
        # Implementation for retry scheduling
    else:
        # Mark as failed
        logger.error(f"Non-recoverable error for session {session_id}")
        # Implementation for failure handling


# ========================================
# 10. INTEGRATION POINTS
# ========================================

async def process_session_documents(
    session_id: UUID,
    car_file_path: str,
    receipt_file_path: Optional[str],
    user_id: UUID,
    db_session: AsyncSession
):
    """Main entry point for processing session documents"""
    try:
        # Queue CAR processing
        car_task = process_car_pdf_task.delay(
            str(session_id),
            car_file_path,
            str(user_id)
        )
        
        # Queue Receipt processing if provided
        receipt_task = None
        if receipt_file_path:
            receipt_task = process_receipt_pdf_task.delay(
                str(session_id),
                receipt_file_path,
                str(user_id)
            )
        
        # Wait for completion
        car_result = car_task.get(timeout=300)  # 5 minute timeout
        receipt_result = receipt_task.get(timeout=300) if receipt_task else None
        
        # Combine and generate reports
        report_task = combine_and_generate_reports_task.delay(
            str(session_id),
            str(user_id)
        )
        
        report_result = report_task.get(timeout=180)  # 3 minute timeout
        
        return {
            "session_id": str(session_id),
            "car_result": car_result,
            "receipt_result": receipt_result,
            "report_result": report_result,
            "status": "completed"
        }
        
    except Exception as e:
        await handle_processing_error(e, session_id, DocumentType.CAR_REPORT)
        raise


if __name__ == "__main__":
    # Example usage
    import asyncio
    
    async def main():
        config = ProcessorConfig()
        processor = PDFProcessor(config)
        await processor.initialize()
        
        # Example processing
        # result = await processor.process_car_pdf(...)
        
    asyncio.run(main())