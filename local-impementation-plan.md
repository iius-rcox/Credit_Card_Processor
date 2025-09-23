# Local Credit Card Processor - Detailed Implementation Plan

## Executive Summary
- Build a local-first desktop-style web app (FastAPI + SQLite + Vue) with zero auth.
- Preserve current core UX, but simplify: local storage under ./data, resumable "batches," regex-driven extraction, and the ability to import additional receipts later to update existing action items.
- Ship in three phases: Foundation → Extraction & Merge → UX polish and packaging.

## Architecture Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vue Frontend  │    │  FastAPI Backend│    │   SQLite DB     │
│   (Port 3000)   │◄──►│   (Port 8001)   │◄──►│  ./data/db.db   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Static Assets  │    │  File Storage   │    │  Audit Logs     │
│  ./data/static/ │    │./data/uploads/  │    │ ./data/logs/    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Technology Stack
- **Backend**: FastAPI 0.104+, SQLAlchemy 2.0+, PyMuPDF, Python 3.11+
- **Frontend**: Vue 3, Pinia, Vite, TailwindCSS, Heroicons
- **Database**: SQLite with WAL mode for better concurrency
- **File Processing**: PyMuPDF for PDF text extraction, regex for data parsing
- **Storage**: Local filesystem with organized directory structure

### Phase 0 — Ground rules and success criteria
- Local-only: No network dependencies; all data in `./data/` (SQLite + files).
- Deterministic: Re-running extraction on identical PDFs yields identical results.
- Idempotent updates: Importing the same receipt twice doesn’t duplicate actions.
- Recoverable: Users can reopen prior batches and continue work later.
- Transparent: Every transformation logged to a per-batch log for auditability.

### Phase 1 — Foundation (project skeleton, storage, batch lifecycle)
- Structure
  - Backend: FastAPI app, uvicorn dev server, SQLite via SQLAlchemy.
  - Frontend: Vue 3 + Pinia + Vite, component library already in repo.
  - Folders:
    - `./data/database.db` (SQLite), `./data/uploads/<batch_id>/`, `./data/exports/<batch_id>/`
    - Optional: `./data/checkpoints/<batch_id>/` to persist intermediate results.
### Detailed SQLite Schema

```sql
-- Enable WAL mode for better concurrency
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=10000;
PRAGMA temp_store=memory;

-- Batches table - main container for processing sessions
CREATE TABLE batches (
    id TEXT PRIMARY KEY,  -- UUID string
    name TEXT,            -- User-friendly name (optional)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT CHECK(status IN ('pending', 'processing', 'complete', 'failed')) DEFAULT 'pending',
    notes TEXT,           -- User notes
    source_summary TEXT,  -- JSON: {car_charges: int, receipt_count: int, total_amount: decimal}
    settings TEXT         -- JSON: {date_window_days: 3, amount_tolerance_cents: 0}
);

-- Documents table - uploaded PDF files
CREATE TABLE documents (
    id TEXT PRIMARY KEY,  -- UUID string
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    type TEXT CHECK(type IN ('car', 'receipt')) NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    sha256 TEXT NOT NULL UNIQUE,
    filesize INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    metadata TEXT,        -- JSON: {pages: int, title: str, extraction_errors: []}
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
);

-- Extractions table - parsed data from documents
CREATE TABLE extractions (
    id TEXT PRIMARY KEY,  -- UUID string
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    engine TEXT DEFAULT 'regex',
    key TEXT NOT NULL,    -- 'employee_id', 'date', 'amount', 'vendor', etc.
    value TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    raw_context TEXT,     -- Original line/context where found
    page INTEGER,         -- Page number where found
    line_number INTEGER,  -- Line number within page
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Employees table - normalized employee records per batch
CREATE TABLE employees (
    id TEXT PRIMARY KEY,  -- UUID string
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    external_id TEXT,     -- Employee ID from CAR
    display_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, external_id) WHERE external_id IS NOT NULL,
    UNIQUE(batch_id, normalized_name) WHERE external_id IS NULL
);

-- Charges table - individual transactions
CREATE TABLE charges (
    id TEXT PRIMARY KEY,  -- UUID string
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    vendor TEXT NOT NULL,
    normalized_vendor TEXT NOT NULL,
    category TEXT,
    car_line_id TEXT,     -- Reference to original CAR line
    source TEXT CHECK(source IN ('car', 'receipt')) NOT NULL,
    matched_receipt_id TEXT REFERENCES documents(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, document_id, date, amount, normalized_vendor, source)
);

-- Action items table - exceptions requiring attention
CREATE TABLE action_items (
    id TEXT PRIMARY KEY,  -- UUID string
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    cause TEXT CHECK(cause IN ('missing_receipt', 'mismatch', 'policy_violation', 'orphan_receipt', 'other')) NOT NULL,
    status TEXT CHECK(status IN ('open', 'in_review', 'resolved')) DEFAULT 'open',
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    details TEXT,         -- JSON: {charge_ids: [], mismatch_details: {}, notes: str}
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Action-charge links table - many-to-many relationship
CREATE TABLE action_links (
    id TEXT PRIMARY KEY,  -- UUID string
    action_id TEXT NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
    charge_id TEXT NOT NULL REFERENCES charges(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(action_id, charge_id)
);

-- Audit log table - track all changes
CREATE TABLE audit_log (
    id TEXT PRIMARY KEY,  -- UUID string
    batch_id TEXT REFERENCES batches(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event TEXT NOT NULL,  -- 'batch_created', 'document_uploaded', 'charge_matched', etc.
    data TEXT,            -- JSON: before/after states, metadata
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_documents_batch_type ON documents(batch_id, type);
CREATE INDEX idx_documents_sha256 ON documents(sha256);
CREATE INDEX idx_extractions_document ON extractions(document_id);
CREATE INDEX idx_extractions_key ON extractions(key);
CREATE INDEX idx_employees_batch ON employees(batch_id);
CREATE INDEX idx_employees_external_id ON employees(external_id);
CREATE INDEX idx_charges_batch ON charges(batch_id);
CREATE INDEX idx_charges_employee ON charges(employee_id);
CREATE INDEX idx_charges_date ON charges(date);
CREATE INDEX idx_charges_vendor ON charges(normalized_vendor);
CREATE INDEX idx_action_items_batch ON action_items(batch_id);
CREATE INDEX idx_action_items_employee ON action_items(employee_id);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_audit_log_batch ON audit_log(batch_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_batches_timestamp 
    AFTER UPDATE ON batches 
    BEGIN 
        UPDATE batches SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
    END;
```
- Batch lifecycle
  - New batch → upload PDFs → process → review → export → reopen/edit later.
  - Reopen:
    - Loads batch records, re-hydrates UI state from DB.
    - “Re-process” buttons available to re-run extraction with current regex set.
### Detailed API Specification

#### Batch Management Endpoints

**POST /api/batches**
```json
// Request
{
  "name": "Q4 2024 Processing",
  "settings": {
    "date_window_days": 3,
    "amount_tolerance_cents": 0
  }
}

// Response
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Q4 2024 Processing",
  "status": "pending",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "source_summary": null,
  "settings": {
    "date_window_days": 3,
    "amount_tolerance_cents": 0
  }
}
```

**GET /api/batches**
```json
// Query params: ?page=1&limit=20&status=complete&sort=created_at&order=desc
// Response
{
  "batches": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Q4 2024 Processing",
      "status": "complete",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T14:22:00Z",
      "source_summary": {
        "car_charges": 45,
        "receipt_count": 38,
        "total_amount": 12547.89,
        "action_items_open": 7
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

**GET /api/batches/{id}**
```json
// Response
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Q4 2024 Processing",
  "status": "complete",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T14:22:00Z",
  "notes": "Processed all Q4 receipts",
  "source_summary": {
    "car_charges": 45,
    "receipt_count": 38,
    "total_amount": 12547.89,
    "action_items_open": 7,
    "action_items_resolved": 12
  },
  "settings": {
    "date_window_days": 3,
    "amount_tolerance_cents": 0
  },
  "documents": [
    {
      "id": "doc-123",
      "type": "car",
      "filename": "car_file.pdf",
      "original_filename": "Q4_CAR_Report.pdf",
      "filesize": 2048576,
      "imported_at": "2024-01-15T10:35:00Z",
      "processed_at": "2024-01-15T10:40:00Z",
      "metadata": {
        "pages": 12,
        "title": "Credit Card Activity Report"
      }
    }
  ]
}
```

#### File Upload Endpoints

**POST /api/batches/{id}/upload**
```json
// Form data: car_file (file), receipt_files[] (files[])
// Response
{
  "batch_id": "550e8400-e29b-41d4-a716-446655440000",
  "uploaded_files": [
    {
      "id": "doc-123",
      "type": "car",
      "filename": "car_file.pdf",
      "original_filename": "Q4_CAR_Report.pdf",
      "filesize": 2048576,
      "sha256": "a1b2c3d4e5f6...",
      "upload_status": "completed"
    },
    {
      "id": "doc-124",
      "type": "receipt",
      "filename": "receipt_001.pdf",
      "original_filename": "Starbucks_Receipt_Jan15.pdf",
      "filesize": 156789,
      "sha256": "f6e5d4c3b2a1...",
      "upload_status": "completed"
    }
  ],
  "message": "Files uploaded successfully"
}
```

**POST /api/batches/{id}/receipts/import**
```json
// Form data: receipt_files[] (files[])
// Response
{
  "batch_id": "550e8400-e29b-41d4-a716-446655440000",
  "imported_count": 3,
  "updated_action_items": 2,
  "resolved_action_items": 1,
  "message": "Successfully imported 3 receipts, updated 2 action items, resolved 1"
}
```

#### Processing Endpoints

**POST /api/batches/{id}/process**
```json
// Request
{
  "force_reprocess": false,
  "extraction_settings": {
    "date_formats": ["%m/%d/%Y", "%m-%d-%Y", "%Y-%m-%d"],
    "amount_patterns": ["$X.XX", "X.XX", "X,XXX.XX"]
  }
}

// Response
{
  "batch_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "message": "Processing started",
  "progress": {
    "current_step": "extracting_car",
    "total_steps": 5,
    "completed_steps": 1
  }
}
```

**GET /api/batches/{id}/process/status**
```json
// Response
{
  "batch_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": {
    "current_step": "matching_receipts",
    "total_steps": 5,
    "completed_steps": 3,
    "current_step_progress": 0.6
  },
  "logs": [
    {
      "timestamp": "2024-01-15T10:40:15Z",
      "level": "INFO",
      "message": "Extracted 45 charges from CAR document"
    },
    {
      "timestamp": "2024-01-15T10:40:20Z",
      "level": "INFO",
      "message": "Processing 38 receipt documents"
    }
  ]
}
```

#### Data Retrieval Endpoints

**GET /api/batches/{id}/charges**
```json
// Query params: ?page=1&limit=50&employee_id=emp123&vendor=starbucks&date_from=2024-01-01&date_to=2024-01-31&unmatched_only=true
// Response
{
  "charges": [
    {
      "id": "charge-123",
      "employee_id": "emp-456",
      "employee_name": "John Doe",
      "date": "2024-01-15",
      "amount": 12.50,
      "vendor": "Starbucks Coffee",
      "normalized_vendor": "starbucks coffee",
      "category": "Meals",
      "source": "car",
      "matched_receipt_id": "doc-124",
      "car_line_id": "line_001"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 45,
    "pages": 1
  },
  "summary": {
    "total_amount": 12547.89,
    "matched_count": 38,
    "unmatched_count": 7
  }
}
```

**GET /api/batches/{id}/actions**
```json
// Query params: ?page=1&limit=20&status=open&employee_id=emp123&cause=missing_receipt
// Response
{
  "actions": [
    {
      "id": "action-123",
      "employee_id": "emp-456",
      "employee_name": "John Doe",
      "cause": "missing_receipt",
      "status": "open",
      "opened_at": "2024-01-15T10:45:00Z",
      "resolved_at": null,
      "details": {
        "charge_ids": ["charge-123"],
        "mismatch_details": null,
        "notes": "No receipt found for $12.50 Starbucks charge on 2024-01-15"
      },
      "linked_charges": [
        {
          "id": "charge-123",
          "date": "2024-01-15",
          "amount": 12.50,
          "vendor": "Starbucks Coffee"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 7,
    "pages": 1
  },
  "summary": {
    "open_count": 7,
    "in_review_count": 2,
    "resolved_count": 12
  }
}
```

#### Export Endpoints

**GET /api/batches/{id}/export**
```json
// Query params: ?format=csv&include=charges,actions&filters={"status":"open"}
// Response (file download)
// Content-Type: application/zip
// Content-Disposition: attachment; filename="batch_550e8400_export.zip"

// ZIP contains:
// - charges.csv
// - actions.csv
// - batch_summary.json
```

**GET /api/batches/{id}/export/summary**
```json
// Response
{
  "batch_id": "550e8400-e29b-41d4-a716-446655440000",
  "export_info": {
    "format": "csv",
    "generated_at": "2024-01-15T15:00:00Z",
    "files": [
      {
        "filename": "charges.csv",
        "rows": 45,
        "size_bytes": 8192
      },
      {
        "filename": "actions.csv", 
        "rows": 7,
        "size_bytes": 2048
      }
    ]
  }
}
```
- Frontend flows (v1)
  - Home: “New Batch” or “Open Existing”
  - Upload screen: CAR + multiple receipts; drag-drop, checksum display
  - Processing screen: progress log, counts
  - Review screen:
    - Exceptions/action items table
    - Charges table with filters (employee, vendor, date)
  - Import receipts: button available on batch page; updates exceptions on completion

### Phase 2 — Extraction & matching engine (regex-first, resilient)

#### Detailed Extraction Engine Implementation

**Core Extraction Classes:**

```python
# backend/app/extractors/base_extractor.py
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import fitz  # PyMuPDF
import re
from decimal import Decimal
from datetime import datetime

class BaseExtractor(ABC):
    def __init__(self):
        self.date_patterns = [
            r'(?P<month>\d{1,2})/(?P<day>\d{1,2})/(?P<year>\d{2,4})',
            r'(?P<month>\d{1,2})-(?P<day>\d{1,2})-(?P<year>\d{2,4})',
            r'(?P<year>\d{4})-(?P<month>\d{1,2})-(?P<day>\d{1,2})',
        ]
        
    def extract_text_by_page(self, pdf_path: str) -> List[Dict[str, Any]]:
        """Extract text from PDF with page-by-page structure"""
        doc = fitz.open(pdf_path)
        pages = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            
            pages.append({
                'page_number': page_num + 1,
                'text': text,
                'lines': lines,
                'char_count': len(text)
            })
        
        doc.close()
        return pages
    
    def _parse_date(self, date_str: str) -> Optional[str]:
        """Parse date string to ISO format"""
        for pattern in self.date_patterns:
            match = re.match(pattern, date_str)
            if match:
                groups = match.groupdict()
                year = int(groups['year'])
                month = int(groups['month'])
                day = int(groups['day'])
                
                if year < 100:
                    year += 2000 if year < 50 else 1900
                
                try:
                    return datetime(year, month, day).strftime('%Y-%m-%d')
                except ValueError:
                    continue
        return None
    
    def _parse_amount(self, amount_str: str) -> Optional[Decimal]:
        """Parse amount string to Decimal"""
        clean_amount = amount_str.replace('$', '').replace(',', '')
        try:
            return Decimal(clean_amount)
        except:
            return None
    
    def _normalize_vendor(self, vendor: str) -> str:
        """Normalize vendor name for matching"""
        normalized = re.sub(r'[^\w\s]', '', vendor.lower())
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        return normalized

    @abstractmethod
    def extract(self, pdf_path: str) -> List[Dict[str, Any]]:
        pass
```

**CAR Document Extractor:**

```python
# backend/app/extractors/car_extractor.py
class CARExtractor(BaseExtractor):
    def __init__(self):
        super().__init__()
        self.employee_patterns = [
            r'Employee\s+ID[:\s]+([A-Za-z0-9-]+)',
            r'Emp\s+ID[:\s]+([A-Za-z0-9-]+)',
            r'ID[:\s]+([A-Za-z0-9-]+)',
        ]
        
        self.transaction_line_pattern = re.compile(
            r'(?P<date>\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+'
            r'(?P<vendor>[A-Za-z0-9\s&.,-]+?)\s+'
            r'(?P<amount>\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'
        )

    def extract(self, pdf_path: str) -> List[Dict[str, Any]]:
        """Extract all data from CAR document"""
        pages = self.extract_text_by_page(pdf_path)
        
        employees = self.detect_employees(pages)
        charges = self.extract_charges(pages)
        
        return {
            'employees': employees,
            'charges': charges,
            'metadata': {
                'pages': len(pages),
                'total_lines': sum(len(p['lines']) for p in pages)
            }
        }

    def detect_employees(self, pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract employee information"""
        employees = []
        
        for page in pages:
            for line_num, line in enumerate(page['lines']):
                for pattern in self.employee_patterns:
                    match = re.search(pattern, line, re.IGNORECASE)
                    if match and len(match.group(1)) > 2:
                        employees.append({
                            'external_id': match.group(1),
                            'display_name': self._extract_name_from_context(line, page['lines'], line_num),
                            'page': page['page_number'],
                            'line': line_num + 1,
                            'raw_context': line
                        })
        
        return employees

    def extract_charges(self, pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract charge transactions"""
        charges = []
        
        for page in pages:
            for line_num, line in enumerate(page['lines']):
                match = self.transaction_line_pattern.search(line)
                if match:
                    try:
                        date_str = match.group('date')
                        vendor = match.group('vendor').strip()
                        amount_str = match.group('amount')
                        
                        parsed_date = self._parse_date(date_str)
                        parsed_amount = self._parse_amount(amount_str)
                        
                        if parsed_date and parsed_amount:
                            charges.append({
                                'date': parsed_date,
                                'vendor': vendor,
                                'normalized_vendor': self._normalize_vendor(vendor),
                                'amount': parsed_amount,
                                'page': page['page_number'],
                                'line': line_num + 1,
                                'raw_context': line,
                                'car_line_id': f"page_{page['page_number']}_line_{line_num + 1}"
                            })
                    except Exception as e:
                        continue
        
        return charges
```

**Receipt Document Extractor:**

```python
# backend/app/extractors/receipt_extractor.py
class ReceiptExtractor(BaseExtractor):
    def __init__(self):
        super().__init__()
        self.vendor_patterns = [
            r'^([A-Z][A-Za-z\s&.,-]+?)(?:\s+\d|$)',
            r'([A-Z][A-Za-z\s&.,-]+?)\s*receipt',
        ]
        
        self.total_patterns = [
            r'total[:\s]*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
            r'amount[:\s]*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',
        ]

    def extract(self, pdf_path: str) -> Dict[str, Any]:
        """Extract key data from receipt"""
        pages = self.extract_text_by_page(pdf_path)
        full_text = '\n'.join([page['text'] for page in pages])
        
        vendor = self._extract_vendor(full_text, pages)
        total = self._extract_total(full_text, pages)
        date = self._extract_date(full_text, pages)
        
        return {
            'vendor': vendor,
            'normalized_vendor': self._normalize_vendor(vendor) if vendor else None,
            'total': total,
            'date': date,
            'pages': len(pages),
            'confidence': self._calculate_confidence(vendor, total, date)
        }

    def _extract_vendor(self, text: str, pages: List[Dict]) -> Optional[str]:
        """Extract vendor name from receipt"""
        first_page_lines = pages[0]['lines'][:10] if pages else []
        
        for line in first_page_lines:
            for pattern in self.vendor_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match and len(match.group(1).strip()) > 3:
                    return match.group(1).strip()
        return None

    def _extract_total(self, text: str, pages: List[Dict]) -> Optional[Decimal]:
        """Extract total amount from receipt"""
        amounts = []
        
        for pattern in self.total_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    amount_str = match.group(1) if match.groups() else match.group(0)
                    amount = Decimal(amount_str.replace('$', '').replace(',', ''))
                    amounts.append(amount)
                except:
                    continue
        
        return max(amounts) if amounts else None
```

#### Matching Engine Implementation

```python
# backend/app/matchers/charge_matcher.py
class ChargeMatcher:
    def __init__(self, date_window_days: int = 3, amount_tolerance_cents: int = 0):
        self.date_window_days = date_window_days
        self.amount_tolerance_cents = amount_tolerance_cents

    def match_receipts_to_charges(self, car_charges: List[Dict], receipts: List[Dict]) -> List[Dict]:
        """Match receipt data to CAR charges"""
        matches = []
        unmatched_charges = car_charges.copy()
        unmatched_receipts = receipts.copy()
        
        for receipt in receipts:
            best_match = self._find_best_match(receipt, unmatched_charges)
            if best_match:
                matches.append({
                    'charge': best_match['charge'],
                    'receipt': receipt,
                    'confidence': best_match['confidence'],
                    'match_type': best_match['type']
                })
                unmatched_charges.remove(best_match['charge'])
                unmatched_receipts.remove(receipt)
        
        return {
            'matches': matches,
            'unmatched_charges': unmatched_charges,
            'unmatched_receipts': unmatched_receipts
        }

    def _find_best_match(self, receipt: Dict, charges: List[Dict]) -> Optional[Dict]:
        """Find the best matching charge for a receipt"""
        candidates = []
        
        for charge in charges:
            score = self._calculate_match_score(receipt, charge)
            if score > 0:
                candidates.append({
                    'charge': charge,
                    'score': score,
                    'type': self._get_match_type(receipt, charge)
                })
        
        if not candidates:
            return None
        
        # Return highest scoring candidate
        best = max(candidates, key=lambda x: x['score'])
        return {
            'charge': best['charge'],
            'confidence': best['score'],
            'type': best['type']
        }

    def _calculate_match_score(self, receipt: Dict, charge: Dict) -> float:
        """Calculate match score between receipt and charge"""
        score = 0.0
        
        # Amount match (most important)
        if receipt.get('total') and charge.get('amount'):
            amount_diff = abs(float(receipt['total']) - float(charge['amount']))
            if amount_diff <= self.amount_tolerance_cents / 100:
                score += 0.5
            elif amount_diff <= 1.0:  # Within $1
                score += 0.3
        
        # Date match
        if receipt.get('date') and charge.get('date'):
            date_diff = self._calculate_date_difference(receipt['date'], charge['date'])
            if date_diff <= self.date_window_days:
                score += 0.3
            elif date_diff <= self.date_window_days * 2:
                score += 0.1
        
        # Vendor match
        if receipt.get('normalized_vendor') and charge.get('normalized_vendor'):
            vendor_score = self._calculate_vendor_similarity(
                receipt['normalized_vendor'], 
                charge['normalized_vendor']
            )
            score += vendor_score * 0.2
        
        return score

    def _calculate_vendor_similarity(self, vendor1: str, vendor2: str) -> float:
        """Calculate similarity between vendor names"""
        if not vendor1 or not vendor2:
            return 0.0
        
        # Exact match
        if vendor1 == vendor2:
            return 1.0
        
        # Substring match
        if vendor1 in vendor2 or vendor2 in vendor1:
            return 0.8
        
        # Word overlap
        words1 = set(vendor1.split())
        words2 = set(vendor2.split())
        overlap = len(words1.intersection(words2))
        total_words = len(words1.union(words2))
        
        return overlap / total_words if total_words > 0 else 0.0
```
- CAR extraction (regex)
  - Goals: employee lines, per-transaction lines with date, vendor, amount, possibly category/GL.
  - Strategy:
    - Text extraction using a robust PDF text extractor (PyMuPDF already in requirements).
    - Normalize whitespace, remove headers/footers via simple heuristics (e.g., repeated lines).
    - Regex library:
      - Employee detection:
        - Primary by Employee ID pattern if present (e.g., `Emp(?:loyee)?\s*ID[:\s]+([A-Za-z0-9-]+)`), fallback by Name lines near known section headers.
      - Charge lines (examples):
        - Date: `(?P<date>\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b)` with normalization to ISO.
        - Amount: `(?P<amount>[-+]?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)` parse to Decimal.
        - Vendor: greedy text between date and amount, trimmed and de-noised.
      - Frame regex with lookarounds to avoid column headers and totals.
    - Context capture: store raw line text and page to aid debugging.
- Receipt extraction (regex)
  - Goals: vendor, total, date; optionally taxes/tips.
  - Strategy:
    - Extract text; use vendor-lines near top or repeated brand patterns.
    - Total detection: highest confident price-like token near “total” keywords; fallback to max amount if confident.
    - Date: prefer near “date” keywords; fallback to first valid date.
- Normalization
  - Vendor normalization: lowercase, collapse whitespace, strip punctuation. Vendor alias table (json) in `data/cache/vendor_aliases.json`.
  - Name normalization: lowercase, strip middle initials, unify whitespace; stored on `employees.normalized_name`.
  - Date normalization: parse multiple formats, store as ISO date.
- Matching & updates
  - First pass: Load CAR-derived charges (source=car).
  - Match receipts to charges:
    - Candidate matching by employee + date (± N days configurable, default 3) + amount tolerance (exact default, optionally within few cents).
    - If employee missing on receipt, use vendor+amount+date proximity; if unique match → link employee.
  - Action items:
    - Open missing_receipt when a CAR charge is unmatched after processing.
    - Resolve action when a matching receipt is later imported; set `resolved_at`.
    - Mismatch: if receipt amount/date deviate beyond thresholds → in_review.
- Idempotency & re-imports
  - SHA256 per document; skip processing if already seen unless forced reprocess.
  - Unique constraints on charges to prevent duplicates.
  - When re-importing receipts:
    - Parse, attempt matches, resolve/adjust `action_items` accordingly.
    - Log changes into `audit_log` with before/after states.

### Phase 3 — Batch operations, UX flows, and exports
- Reopen previous batches
  - “Open Existing” shows batches with sortable columns (created, status, open actions).
  - Opening rehydrates tabs: overview, charges, action items, documents.
  - “Reprocess” button: run extraction again with current regex rules; show diff of changes.
- Imports across dates
  - Receipt import supports any date; matching engine compares to existing charges within window.
  - UX shows “updated N action items” summary after import.
- Exports
  - CSV:
    - `charges.csv`: [employee, date, vendor, amount, category, matched_receipt(boolean)]
    - `actions.csv`: [employee, cause, status, opened_at, resolved_at, linked_charges]
  - Excel (optional): use openpyxl; same sheets.
- Review tools
  - Quick filters: unmatched only, mismatches, by employee, by vendor, by date range.
  - Inline resolve: allow manual link of receipt to charge with search by vendor/date/amount.
  - Notes: add a `notes` text on batch and on individual action items.

### Phase 4 — Reliability, performance, and tooling
- File handling
  - Always copy uploads into `./data/uploads/<batch_id>/` with safe filenames.
  - Store SHA256 and original filename; prevent path traversal.
- Concurrency
  - Single-user assumption; still guard with file locks when writing metadata files.
- Logging
  - `audit_log` for user-facing changes; rotating app logs in `./logs/` (optional).
- Backups
  - “Backup now” button → zip `./data` to `./backups/<timestamp>.zip`.
  - Optional scheduled Task Scheduler task.
- Settings
  - `settings.json` under `./data/` for user-tunable knobs:
    - date_window_days (default 3), amount_tolerance_cents (default 0),
    - vendor_aliases_path, regex_overrides_path (advanced).
- Regex overrides (advanced users)
  - Optional `./data/config/regex_overrides.json` to add/override patterns without code changes.
  - On reprocess, load overrides and apply.

### Frontend Component Specifications

#### Vue 3 Component Structure

**Main Layout Components:**

```vue
<!-- src/components/layout/AppLayout.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <h1 class="text-3xl font-bold text-gray-900">
            Credit Card Processor
          </h1>
          <div class="flex space-x-4">
            <button @click="createNewBatch" class="btn-primary">
              New Batch
            </button>
            <button @click="openExistingBatch" class="btn-secondary">
              Open Existing
            </button>
          </div>
        </div>
      </div>
    </header>
    
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <router-view />
    </main>
  </div>
</template>
```

**Batch Management Components:**

```vue
<!-- src/components/batch/BatchList.vue -->
<template>
  <div class="space-y-6">
    <div class="bg-white shadow rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900">
          Recent Batches
        </h3>
        <div class="mt-5">
          <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table class="min-w-full divide-y divide-gray-300">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="batch in batches" :key="batch.id">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {{ batch.name || `Batch ${batch.id.slice(0, 8)}` }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <StatusBadge :status="batch.status" />
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatDate(batch.created_at) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button @click="openBatch(batch.id)" class="text-indigo-600 hover:text-indigo-900">
                      Open
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

**File Upload Components:**

```vue
<!-- src/components/upload/FileUpload.vue -->
<template>
  <div class="space-y-6">
    <!-- CAR File Upload -->
    <div class="bg-white shadow rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">CAR Document</h3>
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
           @drop="handleDrop" @dragover.prevent @dragenter.prevent>
        <input type="file" ref="carFileInput" @change="handleCarFile" 
               accept=".pdf" class="hidden" />
        <div v-if="!carFile" @click="$refs.carFileInput.click()" class="cursor-pointer">
          <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <p class="mt-2 text-sm text-gray-600">Click to upload CAR PDF</p>
        </div>
        <div v-else class="flex items-center justify-between">
          <div class="flex items-center">
            <svg class="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
            </svg>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-900">{{ carFile.name }}</p>
              <p class="text-sm text-gray-500">{{ formatFileSize(carFile.size) }}</p>
            </div>
          </div>
          <button @click="removeCarFile" class="text-red-600 hover:text-red-900">
            Remove
          </button>
        </div>
      </div>
    </div>

    <!-- Receipt Files Upload -->
    <div class="bg-white shadow rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Receipt Documents</h3>
      <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
           @drop="handleReceiptDrop" @dragover.prevent @dragenter.prevent>
        <input type="file" ref="receiptFileInput" @change="handleReceiptFiles" 
               accept=".pdf" multiple class="hidden" />
        <div @click="$refs.receiptFileInput.click()" class="cursor-pointer">
          <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <p class="mt-2 text-sm text-gray-600">Click to upload receipt PDFs</p>
          <p class="text-xs text-gray-500">Multiple files supported</p>
        </div>
      </div>
      
      <!-- Receipt Files List -->
      <div v-if="receiptFiles.length > 0" class="mt-4 space-y-2">
        <div v-for="(file, index) in receiptFiles" :key="index" 
             class="flex items-center justify-between p-3 bg-gray-50 rounded">
          <div class="flex items-center">
            <svg class="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
            </svg>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-900">{{ file.name }}</p>
              <p class="text-sm text-gray-500">{{ formatFileSize(file.size) }}</p>
            </div>
          </div>
          <button @click="removeReceiptFile(index)" class="text-red-600 hover:text-red-900">
            Remove
          </button>
        </div>
      </div>
    </div>

    <!-- Upload Actions -->
    <div class="flex justify-end space-x-4">
      <button @click="uploadFiles" :disabled="!canUpload" 
              class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
        Upload Files
      </button>
    </div>
  </div>
</template>
```

**Data Display Components:**

```vue
<!-- src/components/data/ChargesTable.vue -->
<template>
  <div class="bg-white shadow rounded-lg">
    <div class="px-4 py-5 sm:p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-medium text-gray-900">Charges</h3>
        <div class="flex space-x-2">
          <input v-model="searchTerm" placeholder="Search..." 
                 class="input-field" />
          <select v-model="statusFilter" class="input-field">
            <option value="">All</option>
            <option value="matched">Matched</option>
            <option value="unmatched">Unmatched</option>
          </select>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="charge in filteredCharges" :key="charge.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ charge.employee_name || 'Unknown' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatDate(charge.date) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ charge.vendor }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatCurrency(charge.amount) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="charge.matched_receipt_id ? 'badge-success' : 'badge-warning'">
                  {{ charge.matched_receipt_id ? 'Matched' : 'Unmatched' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div class="mt-4 flex justify-between items-center">
        <p class="text-sm text-gray-700">
          Showing {{ pagination.start }} to {{ pagination.end }} of {{ pagination.total }} results
        </p>
        <div class="flex space-x-2">
          <button @click="previousPage" :disabled="pagination.page === 1" 
                  class="btn-secondary disabled:opacity-50">
            Previous
          </button>
          <button @click="nextPage" :disabled="pagination.page === pagination.pages" 
                  class="btn-secondary disabled:opacity-50">
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
```

#### Pinia Store Implementation

```javascript
// src/stores/batch.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { batchApi } from '@/api/batch'

export const useBatchStore = defineStore('batch', () => {
  // State
  const currentBatch = ref(null)
  const batches = ref([])
  const charges = ref([])
  const actionItems = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const currentBatchId = computed(() => currentBatch.value?.id)
  const batchStatus = computed(() => currentBatch.value?.status)
  const isProcessing = computed(() => batchStatus.value === 'processing')
  const hasUnmatchedCharges = computed(() => 
    charges.value.some(charge => !charge.matched_receipt_id)
  )

  // Actions
  const createBatch = async (batchData) => {
    try {
      loading.value = true
      const response = await batchApi.create(batchData)
      currentBatch.value = response.data
      batches.value.unshift(response.data)
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const loadBatch = async (batchId) => {
    try {
      loading.value = true
      const response = await batchApi.get(batchId)
      currentBatch.value = response.data
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const loadBatches = async (filters = {}) => {
    try {
      loading.value = true
      const response = await batchApi.list(filters)
      batches.value = response.data.batches
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const uploadFiles = async (batchId, files) => {
    try {
      loading.value = true
      const formData = new FormData()
      
      if (files.carFile) {
        formData.append('car_file', files.carFile)
      }
      
      if (files.receiptFiles?.length) {
        files.receiptFiles.forEach(file => {
          formData.append('receipt_files', file)
        })
      }

      const response = await batchApi.upload(batchId, formData)
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const processBatch = async (batchId, options = {}) => {
    try {
      loading.value = true
      const response = await batchApi.process(batchId, options)
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const loadCharges = async (batchId, filters = {}) => {
    try {
      const response = await batchApi.getCharges(batchId, filters)
      charges.value = response.data.charges
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const loadActionItems = async (batchId, filters = {}) => {
    try {
      const response = await batchApi.getActionItems(batchId, filters)
      actionItems.value = response.data.actions
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const importReceipts = async (batchId, files) => {
    try {
      loading.value = true
      const formData = new FormData()
      files.forEach(file => {
        formData.append('receipt_files', file)
      })

      const response = await batchApi.importReceipts(batchId, formData)
      
      // Refresh data after import
      await loadCharges(batchId)
      await loadActionItems(batchId)
      
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const exportBatch = async (batchId, format = 'csv') => {
    try {
      const response = await batchApi.export(batchId, { format })
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/zip' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `batch_${batchId}_export.zip`
      link.click()
      window.URL.revokeObjectURL(url)
      
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  return {
    // State
    currentBatch,
    batches,
    charges,
    actionItems,
    loading,
    error,
    
    // Getters
    currentBatchId,
    batchStatus,
    isProcessing,
    hasUnmatchedCharges,
    
    // Actions
    createBatch,
    loadBatch,
    loadBatches,
    uploadFiles,
    processBatch,
    loadCharges,
    loadActionItems,
    importReceipts,
    exportBatch
  }
})
```

### Detailed Implementation Workflow

#### Phase 1: Foundation Setup (Week 1)

**Day 1-2: Database & Models**
1. Create SQLite database with schema from plan
2. Implement SQLAlchemy models for all tables
3. Add database migration system (Alembic)
4. Create database initialization script

**Day 3-4: Core API Endpoints**
1. Implement batch CRUD endpoints
2. Add file upload endpoints with validation
3. Create basic processing endpoint stubs
4. Add error handling and logging

**Day 5: Frontend Setup**
1. Set up Vue 3 project structure
2. Install and configure Pinia for state management
3. Create basic routing (Home, Batch List, Batch Detail)
4. Implement basic layout components

#### Phase 2: Extraction Engine (Week 2)

**Day 1-2: PDF Processing**
1. Implement BaseExtractor class
2. Create CARExtractor with regex patterns
3. Create ReceiptExtractor with regex patterns
4. Add PDF text extraction utilities

**Day 3-4: Matching Engine**
1. Implement ChargeMatcher class
2. Add vendor normalization logic
3. Create date/amount matching algorithms
4. Add confidence scoring system

**Day 5: Integration**
1. Wire extraction into processing endpoints
2. Add progress tracking for long operations
3. Implement audit logging
4. Test with sample PDFs

#### Phase 3: Frontend Implementation (Week 3)

**Day 1-2: Core Components**
1. Implement FileUpload component
2. Create ChargesTable component
3. Build ActionItemsTable component
4. Add StatusBadge and other UI components

**Day 3-4: Batch Management**
1. Implement BatchList view
2. Create BatchDetail view with tabs
3. Add processing status display
4. Implement file management

**Day 5: Data Operations**
1. Add filtering and search functionality
2. Implement pagination
3. Create export functionality
4. Add receipt import workflow

#### Phase 4: Polish & Testing (Week 4)

**Day 1-2: UX Improvements**
1. Add loading states and error handling
2. Implement responsive design
3. Add keyboard shortcuts
4. Create help documentation

**Day 3-4: Testing & Validation**
1. Unit tests for extraction logic
2. Integration tests for API endpoints
3. End-to-end tests for user workflows
4. Performance testing with large files

**Day 5: Packaging & Deployment**
1. Create local development setup script
2. Add backup/restore functionality
3. Create user documentation
4. Test complete workflow

### Detailed implementation tasks (ordered)
- Backend
  - Initialize SQLite and migrations (alembic or simple bootstrap).
  - Implement models + DAL for batches, documents, extractions, employees, charges, action items, audit logs.
  - Implement file storage pipeline (validate, copy, checksum).
  - Implement PDF text extraction (PyMuPDF) utility with page-wise text accessible.
  - Implement regex extractor modules: `extract_car(document)`, `extract_receipt(document)`.
  - Implement normalizers: vendors, names, dates, amounts; utilities return structured rows.
  - Implement matcher:
    - Produce matches from receipts to existing charges per rules.
    - Update/resolve action items; write audit log entries.
  - Implement endpoints:
    - batch CRUD/list, upload endpoints, process/reprocess, import receipts, exports.
  - Add idempotency (sha256, unique keys) and safe retries.
- Frontend
  - Routing: Home → New Batch / Open Batch / Batch Details.
  - Components:
    - UploadForm: CAR + Receipts (multi), show checksum and size.
    - ProcessingStatus: progress and log tail.
    - ExceptionsTable: filterable action items.
    - ChargesTable: filters, totals.
    - ReceiptImport: modal to add more PDFs and trigger reprocess.
  - State:
    - Batch store (Pinia): current batch, documents, charges, actions; fetch and cache.
  - UX niceties:
    - Persistent column sizing, search, CSV export shortcuts.
- Exports
  - CSV generation utility; one endpoint, multiple files zipped.
  - XCT: test against sample PDFs to ensure correct formatting and totals.
- Tests (high-value)
  - Unit: regex parsing with varied date/amount formats, vendor normalization.
  - Unit: matching rules including tolerance and date windows.
  - Integration: create batch → upload → process → verify action items open.
  - Integration: import additional receipts → verify action items resolved.
  - Regression: duplicate import does not create duplicate charges or actions.
- Documentation
  - “How matching works” page for users; list of rules and edge cases.
  - “How to reopen a batch and reprocess”.

### Data and update logic specifics
- Determining unique charge keys
  - Key: `employee_id` (or normalized employee placeholder if absent) + `date` + `vendor_norm` + `amount_cents` + `source` + `doc_id`.
  - Unique index prevents duplication; when conflict on insert, upsert fields that are safe (e.g., category if previously null).
- Action item update on receipt import
  - For each new receipt line:
    - Find candidate CAR charges (same employee if known, else try by vendor/date/amount).
    - If one unique candidate:
      - Link charge↔receipt (store bidirectional refs as needed).
      - Find open missing_receipt actions referencing that charge and mark resolved.
    - If multiple candidates:
      - Create or update a mismatch/in_review item with details (user can resolve manually).
    - If no candidates:
      - Log “orphan receipt” (optional action item or just a warning; configurable).

### Performance and guardrails
- Stream PDF reading; limit max file size to 300MB for receipts, 100MB for CAR.
- Avoid full-document regex over the entire text when possible; prefer page/line iteration.
- For fuzzy vendor matches, cap candidate pool size and use simple scoring (alias exact > prefix > contains).
- Ensure all list endpoints are paginated and filterable; frontends fetch in pages.

### Packaging (optional later)
- Backend: PyInstaller to create a Windows .exe that runs uvicorn and opens the app on `http://localhost:3000` (if serving static files) or `http://localhost:8001` with a bundled static server.
- All-in-one: Tauri/Electron wrapper that starts backend as a child process and serves frontend assets locally.

### Milestones and acceptance
- Milestone 1: Create/open batch, upload CAR + receipts, process, see charges and action items; reopen batch works.
- Milestone 2: Import more receipts on a different date; matching resolves prior missing-receipt actions; exports accurate.
- Milestone 3: Robustness—idempotent imports, reprocess doesn’t duplicate, logs/audit view, CSV consistent.

If you want, I can generate the initial DB schema and endpoint stubs next, or prepare a checklist adapted to your sample PDFs (so we can design the exact regex patterns around your actual vendor/date formats).


