# Credit Card Processor - Project Requirements Document

## Document Information
- **Project Name**: Credit Card Processor (Expense Splitter)
- **Document Version**: 2.0 - Consolidated Requirements
- **Date**: August 28, 2025
- **Purpose**: Comprehensive requirements specification based on implemented codebase analysis

---

## 1. EXECUTIVE SUMMARY

The Credit Card Processor is a comprehensive expense management system that automates the processing of corporate credit card expense reports with full revision tracking capabilities. It splits PDF reports by employee, extracts receipt metadata, flags compliance issues, merges relevant documents, and generates comprehensive summary reports. The system supports iterative updates, allowing users to reprocess reports multiple times as receipts and coding information become available, maintaining complete audit trails and historical tracking.

### 1.1 Core Objectives
- **Extract** per-employee card activity and receipt data from PDF reports
- **Detect** missing receipts, coding deficiencies, and total mismatches
- **Track** revisions and updates across multiple report submissions
- **Maintain** historical audit trails and change tracking
- **Produce** combined per-employee PDF packets organized by completion status
- **Generate** Excel summary reports and CSV import files for accounting systems
- **Automate** the entire workflow through modern web-based or desktop interfaces
- **Enable** iterative processing for continuous compliance improvement

---

## 2. TECHNOLOGY STACK & DEPENDENCIES

### 2.1 Core Technology Components
| Component | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.10+ | Primary runtime language with match-case syntax support |
| **PyMuPDF** | ~1.24.4 | PDF parsing, text extraction, and document manipulation |
| **pandas** | ~2.2.2 | Data processing, Excel/CSV generation |
| **CustomTkinter** | ~5.2.2 | Modern themed desktop GUI framework |
| **xlsxwriter** | (via pandas) | Excel file generation with formatting |

### 2.2 Standard Library Dependencies
- **os, sys**: Cross-platform file system operations and platform detection
- **json**: Data serialization and persistence management
- **re**: Complex regex pattern matching for PDF text extraction
- **datetime**: Date formatting and processing
- **threading**: Background processing for UI responsiveness
- **time**: GUI update timing and delays

### 2.3 Operating System Support
**Cross-Platform Compatibility**:
- **Windows**: Uses `USERPROFILE` environment variable for Documents path
- **Linux/macOS**: Uses `HOME` environment variable for Documents path
- **Path Detection**: Automatic OS detection via `sys.platform`

---

## 3. APPLICATION ARCHITECTURE & FILE STRUCTURE

### 3.1 Project Structure
```
Credit_Card_Processor/
├── main.py                     # Application entry point and GUI
├── requirements.txt           # Python package dependencies
├── pdf_handler/              # PDF processing modules
│   ├── __init__.py
│   ├── extractor.py          # Parses CAR & receipt PDFs into JSON
│   ├── splitter.py           # Splits PDFs by employee page ranges
│   └── combiner.py           # Reassembles PDFs into finished/unfinished
├── utilities/                # Support and utility modules
│   ├── __init__.py
│   ├── folders.py            # File system operations and path management
│   ├── json_handler.py       # Central JSON data storage and persistence
│   └── excel.py              # Excel/CSV report generation
└── build/dist/               # PyInstaller output (excluded from version control)
```

### 3.2 Runtime Working Directory Structure
**Location**: `~/Documents/Expense Splitter/` (cross-platform)
```
Expense Splitter/
├── Final Reports/                    # Output destination
│   ├── Finished Reports/            # Complete, properly coded expenses
│   └── Unfinished Reports/          # Issues requiring manual attention
├── Import - Cardholder Activity Report/  # Source CAR PDFs
├── Import - Receipt Report/          # Source receipt PDFs
├── Split Card Activity/              # Temporary individual CAR pages
├── Split Receipts/                   # Temporary individual receipt pages
├── activity.json                     # Persistent application state
├── Credit Card Report.xlsx           # Excel summary report
├── Credit Card Import.csv            # Accounting system import file
└── Card Names.xls                    # Optional employee name corrections
```

---

## 4. CORE WORKFLOW & PROCESSING PIPELINE

### 4.1 Automated Processing Sequence
The application executes the following automated pipeline:

1. **GUI Initialization**
   - Launch CustomTkinter window with dark theme and green accents
   - Initialize status display and start background processing thread

2. **System Setup**
   - `create_base_folders()` ensures required directory structure
   - `JsonHandler().clear()` resets persistent `activity.json` state

3. **Cardholder Activity Report (CAR) Processing**
   - Locate most recent CAR PDF in import directory
   - `parse_text_from_car()` extracts employee data using regex patterns
   - Extract: Employee IDs, names, card numbers, transaction totals, page ranges
   - `split_pdf_by_range()` creates individual employee PDFs in `Split Card Activity/`

4. **Receipt Report Processing**
   - Locate most recent receipt PDF in import directory
   - `parse_text_from_receipt()` builds detailed receipt transaction data
   - Extract: Transaction IDs, dates, amounts, coding info, attachments, merchant details
   - `split_pdf_by_range()` creates corresponding receipt PDFs in `Split Receipts/`
   - `update_missing_all_receipts()` flags employees without any receipt data

5. **Data Validation & Reconciliation**
   - Cross-reference CAR totals against receipt totals
   - Flag missing coding information, attachments, and discrepancies
   - Maintain validation flags per employee for quality control

6. **Document Compilation**
   - `combine_files()` merges per-employee CAR and receipt PDFs
   - Route to `Finished Reports/` or `Unfinished Reports/` based on validation flags
   - Clean up temporary split PDF files

7. **Report Generation**
   - `create_report()` generates comprehensive Excel workbook
   - Create CSV import file formatted for accounting system integration
   - Provide final status update and enable GUI close button

### 4.2 Processing Decision Logic
**Report Classification**:
```python
if (missing_coding_info OR total_mismatch OR 
    missing_receipt OR missing_all_receipts):
    → Route to "Unfinished Reports/" folder
else:
    → Route to "Finished Reports/" folder
```

---

## 5. DETAILED FUNCTIONAL REQUIREMENTS

### 5.1 PDF Data Extraction Capabilities

#### 5.1.1 Cardholder Activity Report Processing
**Requirement FR-001**: Extract structured data from CAR PDFs using regex patterns:
- **Employee Information Pattern**: 
  ```regex
  Employee\s+ID:\s*(?P<employee_id>\d{4,6})\s*(?P<employee_name>[A-Z]+)\s*(?P<card_number>\d{6}(?:X{6}|\d{6})\d{4})
  ```
- **Total Amount Pattern**: `Totals For Card Nbr: \d{16}\n\$([\d,\.]+)`
- **Data Extracted**: Employee ID (4-6 digits), Name, Card Number (masked/unmasked), Transaction Totals, Page Ranges

#### 5.1.2 Receipt Report Processing  
**Requirement FR-002**: Extract comprehensive receipt transaction details:
- Transaction ID, Employee name, Expense type
- Transaction date (MM/DD/YYYY format)
- Amount and purpose description
- Merchant name and address information
- Job Coding (Job#, Phase, Cost Type) or GL Coding (Account, Description)
- Attachment status validation

#### 5.1.3 Name Standardization System
**Requirement FR-003**: Implement manual name mapping for known variations:
```python
manual_names = {
    'BRITTSCHEXNAIDER': 'BRITTANSCHEXNAIDER',
    'JOSEARREDONDO': 'JOSEPEREZ', 
    'JIMMIERAYUNDERWOOD': 'JIMMIEUNDERWOOD'
}
```

### 5.2 Data Validation & Quality Control

#### 5.2.1 Validation Flag System
**Requirement FR-004**: Maintain comprehensive validation flags per employee:
- `missing_coding_info`: Incomplete job or GL account coding
- `missing_receipt`: Missing required receipt attachments  
- `missing_all_receipts`: No receipt data found for employee
- `total_mismatch`: CAR total doesn't match receipt total sum

#### 5.2.2 Data Integrity Verification
**Requirement FR-005**: Validate data consistency and completeness:
- Numeric amount parsing with error handling
- Date format validation and standardization
- Required field presence verification
- Transaction ID uniqueness checking

### 5.3 Revision Tracking & Update Management

#### 5.3.1 Report Versioning System
**Requirement FR-006**: Implement comprehensive revision tracking:
- **Version Control**: Track report submissions with incremental version numbers (v1.0, v1.1, v2.0)
- **Submission Metadata**: Record processing timestamp, user identity, source file checksums
- **Change Detection**: Compare new submissions against previous versions to identify updates
- **Status Transitions**: Track employee status changes (Unfinished → In Progress → Finished)

#### 5.3.2 Incremental Update Processing
**Requirement FR-007**: Support iterative report improvement workflow:
- **Delta Identification**: Compare new vs. existing data to identify what has changed
- **Selective Updates**: Update only modified employee records while preserving completed ones  
- **Progress Tracking**: Maintain completion percentages and outstanding issue counts
- **Rollback Capability**: Ability to revert to previous versions if needed

#### 5.3.3 Historical Audit Trail
**Requirement FR-008**: Maintain comprehensive processing history:
- **Change Log**: Record all modifications with timestamps and reasons
- **Issue Resolution Tracking**: Track when missing receipts/coding are resolved
- **User Actions**: Log manual corrections and administrative overrides
- **Compliance Timeline**: Generate audit reports showing resolution progress over time

#### 5.3.4 Outstanding Issues Management
**Requirement FR-009**: Provide detailed tracking of unresolved items:
- **Issue Categorization**: Group outstanding items by type (missing receipts, coding, mismatches)
- **Priority Scoring**: Rank issues by dollar amount and compliance impact
- **Resolution Workflows**: Define standard procedures for resolving each issue type
- **Notification System**: Alert stakeholders about overdue items and approaching deadlines

### 5.4 Report Generation Requirements

#### 5.4.1 Excel Summary Report Structure
**Requirement FR-010**: Generate multi-worksheet Excel report:

**Summary Worksheet** containing:
- Employee Name, Card Activity Total, Receipt Total
- Receipt Count, Missing Receipt Amount (calculated difference)
- Flags (concatenated validation status indicators)

**Receipt Issue Details Worksheet** containing:
- Employee Name, Expense Type, Transaction Date
- Amount, Purpose, Merchant Name and Address
- Status indicators (Missing Coding, Missing Attachment, etc.)

#### 5.4.2 CSV Accounting Import File
**Requirement FR-011**: Generate accounting system-ready CSV with standardized fields:
- Transaction ID, Date, Amount, Employee Name
- Vendor ID (hardcoded: '12332')
- Invoice Number (last 4 card digits + MMDDYY format)
- Header Description, Job, Phase, Cost Type
- GL Account, Item Description
- Unit of Measure ('LS'), Tax Code ('XX')
- Pay Type (2=Job Coding, 1=GL Coding)
- Card Holder and Credit Card details

---

## 6. TECHNICAL REQUIREMENTS

### 6.1 JSON Data Persistence Structure
**Requirement TR-001**: Maintain hierarchical JSON data structure:
```json
{
  "EMPLOYEE_NAME": {
    "name": "string",
    "employee_id": "string", 
    "car_page_range": [page_numbers],
    "car_total": float,
    "rec_page_range": [page_numbers], 
    "rec_total": float,
    "card_no": "string",
    "flags": {
      "missing_coding_info": boolean,
      "missing_receipt": boolean,
      "missing_all_receipts": boolean,
      "total_mismatch": boolean
    },
    "receipts": {
      "job_or_gl_key": [receipt_objects]
    },
    "files": [generated_file_paths]
  }
}
```

### 6.2 Performance & Memory Management
**Requirement TR-002**: Optimize resource utilization:
- Process large PDF files (50+ pages) within 2 minutes
- Implement proper PDF document object cleanup
- Minimize memory footprint through streaming operations
- Provide real-time progress feedback during processing

### 6.3 Cross-Platform File System Integration
**Requirement TR-003**: Handle file operations across operating systems:
- Automatic most recent file detection based on modification time
- Platform-appropriate directory creation and management
- Robust file cleanup and organization processes
- Cross-platform path handling and normalization

---

## 7. USER INTERFACE & DEPLOYMENT ARCHITECTURE REQUIREMENTS

### 7.1 Deployment Architecture Options

#### 7.1.1 Web-Based Deployment (Recommended)
**Requirement DA-001**: Modern cloud-native web application architecture:
- **Frontend**: React 18 with TypeScript, Material-UI components, responsive design
- **Backend**: FastAPI with async support, Celery task queue, Redis for caching
- **Database**: PostgreSQL with full revision tracking and audit trail capabilities
- **Infrastructure**: Azure Kubernetes Service (AKS) with auto-scaling and high availability
- **Storage**: Azure Blob Storage for PDF file management and archival
- **Authentication**: Azure AD integration with role-based access control (RBAC)

#### 7.1.2 Enhanced Desktop Alternative
**Requirement DA-002**: Modernized desktop application with web technologies:
- **Framework**: Electron with React frontend, maintaining Python backend
- **Database**: SQLite with comprehensive revision tracking schema
- **Sync Capability**: Optional cloud synchronization for multi-device access
- **Deployment**: Auto-updating installer with centralized update management

### 7.2 Web Interface Specifications

#### 7.2.1 Dashboard & Navigation
**Requirement UI-001**: Comprehensive expense management dashboard:
- **Landing Page**: Processing status overview, recent submissions, outstanding issues summary
- **Navigation**: Tabbed interface (Upload, History, Reports, Administration)
- **Responsive Design**: Support for desktop, tablet, and mobile access
- **Theme**: Corporate-friendly light/dark theme with accessibility compliance

#### 7.2.2 File Upload & Processing Interface
**Requirement UI-002**: Intuitive file management system:
- **Drag-and-Drop**: Multi-file upload for CAR and receipt PDFs
- **Progress Tracking**: Real-time processing status with progress bars and ETA
- **Version Management**: Visual comparison of report versions and changes
- **Validation Feedback**: Immediate file format and content validation

#### 7.2.3 Revision History & Audit Trail
**Requirement UI-003**: Comprehensive change tracking interface:
- **Timeline View**: Chronological display of all processing sessions and updates
- **Comparison Tools**: Side-by-side comparison of employee data across versions
- **Issue Resolution Tracking**: Visual indicators for resolved/outstanding compliance issues
- **Audit Export**: Downloadable audit reports for compliance documentation

### 7.3 User Experience & Workflow Requirements

#### 7.3.1 Multi-User Collaboration
**Requirement UI-004**: Support for concurrent users and role-based workflows:
- **User Roles**: Administrator, Processor, Reviewer, Read-Only access levels
- **Concurrent Processing**: Support for multiple simultaneous report processing sessions
- **Conflict Resolution**: Automatic detection and resolution of overlapping updates
- **Notification System**: Email alerts for completed processing and issue resolution

#### 7.3.2 Advanced Reporting Interface
**Requirement UI-005**: Interactive reporting and analytics dashboard:
- **Dynamic Charts**: Real-time visualization of completion rates and outstanding issues
- **Filtering & Search**: Advanced filtering by employee, date range, issue type, amount
- **Export Options**: Multiple format support (Excel, CSV, PDF) with custom templates
- **Historical Trends**: Compliance improvement tracking over time

### 7.4 Security & Access Control

#### 7.4.1 Authentication & Authorization
**Requirement SC-001**: Enterprise-grade security implementation:
- **Single Sign-On**: Integration with corporate Active Directory/Azure AD
- **Multi-Factor Authentication**: Required for all user access
- **Session Management**: Automatic timeout and secure session handling
- **API Security**: OAuth 2.0 with JWT tokens for API access

#### 7.4.2 Data Protection & Compliance
**Requirement SC-002**: Comprehensive data security measures:
- **Encryption**: TLS 1.3 for transit, AES-256 for data at rest
- **PCI Compliance**: Secure handling of credit card information
- **Audit Logging**: Complete access and modification tracking
- **Data Retention**: Configurable retention policies with automated cleanup

### 7.5 Performance & Scalability Requirements

#### 7.5.1 System Performance
**Requirement PF-001**: High-performance processing capabilities:
- **Concurrent Processing**: Support for 10+ simultaneous PDF processing jobs
- **Response Times**: <3 seconds for UI interactions, <2 minutes for PDF processing
- **File Size Limits**: Support for PDFs up to 100MB with 200+ pages
- **Auto-Scaling**: Automatic resource scaling based on processing load

#### 7.5.2 High Availability
**Requirement PF-002**: Enterprise-grade reliability and availability:
- **Uptime SLA**: 99.9% availability with automated failover
- **Disaster Recovery**: Automated backups with point-in-time recovery
- **Load Balancing**: Distributed processing across multiple service instances
- **Monitoring**: Comprehensive application and infrastructure monitoring

---

## 8. INTEGRATION & DEPLOYMENT

### 8.1 Input File Dependencies
**Requirement INT-001**: Process standardized PDF inputs:
- CAR PDFs in 'Import - Cardholder Activity Report' directory
- Receipt PDFs in 'Import - Receipt Report' directory  
- Automatic selection of most recent files by modification timestamp
- Optional 'Card Names.xls' for employee name standardization (currently commented out)

### 8.2 Output File Compatibility
**Requirement INT-002**: Generate industry-standard output formats:
- **Excel**: Microsoft Excel 2016+ compatible (.xlsx) with XlsxWriter formatting
- **CSV**: Standard comma-separated format with UTF-8 encoding and comma removal from text fields
- **PDF**: Individual employee document packets for distribution

### 8.3 Executable Distribution
**Requirement INT-003**: Support standalone deployment:
- PyInstaller executable generation for Windows
- Console and windowed application modes
- UPX compression for reduced file size
- Icon integration capability for professional appearance

---

## 9. QUALITY & SECURITY REQUIREMENTS

### 9.1 Error Handling & Reliability
**Requirement QR-001**: Comprehensive exception management:
- Try-catch blocks around all critical file and PDF operations
- Graceful degradation for parsing errors with continued processing
- Thread-safe GUI updates using proper CustomTkinter methods
- Informative error messages for troubleshooting and user guidance

### 9.2 Data Security & Privacy
**Requirement QR-002**: Protect sensitive financial information:
- Local-only file system access with no network connectivity
- Credit card number processing without long-term storage
- Automatic cleanup of temporary files after processing
- Employee information restricted to local JSON files only

### 9.3 Code Maintainability
**Requirement QR-003**: Support ongoing maintenance and enhancement:
- Clear separation of concerns between PDF processing, utilities, and GUI
- Centralized configuration of regex patterns and business rules
- Modular architecture enabling independent component modification
- Consistent naming conventions and minimal code duplication

---

## 10. CURRENT SYSTEM STATE & CONSTRAINTS

### 10.1 Implementation Status
**Fully Implemented Features**:
- Complete automated PDF processing pipeline
- Sophisticated regex-based data extraction system
- Multi-threaded GUI with real-time status monitoring
- Comprehensive Excel and CSV report generation
- Cross-platform file system support with robust error handling
- Modular architecture with clear component separation

### 10.2 Known System Constraints & Assumptions
**Input Requirements**:
- PDF reports must follow consistent formatting for regex pattern matching
- Employee names may require manual mapping for processing consistency
- `activity.json` file must remain writable in the base directory
- Input PDFs assumed to be valid and accessible

**System Limitations**:
- Hardcoded business rules (vendor codes, date formats) require code modification to change
- Limited error recovery for corrupted or malformed PDF inputs
- No configuration file support for customizing processing rules
- Synchronous PDF processing could benefit from parallelization for very large files

### 10.3 Migration & Implementation Roadmap

#### 10.3.1 Phase 1: Foundation & Core Migration (Months 1-3)
**Immediate Improvements**:
- **Data Model Enhancement**: Implement PostgreSQL schema with revision tracking
- **API Development**: Create FastAPI backend with existing processing logic
- **Basic Web Interface**: Build React frontend with file upload and status monitoring
- **Authentication Framework**: Integrate Azure AD with basic RBAC

#### 10.3.2 Phase 2: Advanced Features (Months 4-6)  
**Enhanced Capabilities**:
- **Revision Management**: Complete version tracking and comparison tools
- **Advanced Reporting**: Interactive dashboards with historical analysis
- **Multi-User Support**: Concurrent processing and user role management  
- **Audit Trail**: Comprehensive change tracking and compliance reporting

#### 10.3.3 Phase 3: Enterprise Integration (Months 7-8)
**Production Readiness**:
- **Performance Optimization**: Auto-scaling and load balancing implementation
- **Security Hardening**: Complete PCI compliance and security audit
- **Integration APIs**: ERP system connectivity and automated workflows
- **Monitoring & Alerting**: Comprehensive observability and incident response

### 10.4 Technology Migration Considerations

#### 10.4.1 Database Migration Path
```sql
-- Migration from JSON to PostgreSQL
CREATE TABLE legacy_data_import (
    employee_name VARCHAR(255) PRIMARY KEY,
    json_data JSONB NOT NULL,
    migrated_at TIMESTAMP DEFAULT NOW()
);

-- Structured migration to new schema
INSERT INTO employee_revisions (session_id, employee_name, car_total, receipt_total, flags)
SELECT gen_random_uuid(), employee_name, 
       (json_data->>'car_total')::decimal,
       (json_data->>'rec_total')::decimal,
       json_data->'flags'
FROM legacy_data_import;
```

#### 10.4.2 Legacy System Compatibility
**Backward Compatibility Requirements**:
- **Data Import**: Automatic migration from existing activity.json files
- **Report Format**: Maintain Excel/CSV output compatibility
- **File Organization**: Preserve existing directory structure during transition
- **Processing Logic**: Retain all current business rules and validation patterns

---

## 11. USAGE INSTRUCTIONS

### 11.1 System Setup
1. **Install Dependencies**: `pip install -r requirements.txt`
2. **Verify Directory Structure**: Ensure Documents/Expense Splitter folders exist
3. **Source File Placement**: 
   - Place CAR PDFs in `Import - Cardholder Activity Report/`
   - Place Receipt PDFs in `Import - Receipt Report/`
   - (Optional) Place `Card Names.xls` in base folder for name corrections

### 11.2 Operation Procedure
1. **Launch Application**: Execute `python main.py`
2. **Monitor Progress**: Watch real-time status updates in GUI window
3. **Retrieve Outputs**: Collect processed files from base directory:
   - Final employee PDFs in `Final Reports/Finished/` and `Final Reports/Unfinished/`
   - Summary report: `Credit Card Report.xlsx`
   - Import file: `Credit Card Import.csv`

### 11.3 Troubleshooting
- **Processing Errors**: Check status display for specific error messages
- **Missing Files**: Verify source PDFs exist in correct import directories
- **Name Mapping Issues**: Update manual name corrections in extractor.py if needed
- **Permissions**: Ensure write access to Documents/Expense Splitter directory

---

## 12. CONCLUSION

The Credit Card Processor represents a sophisticated, production-ready automation solution that successfully addresses the complex requirements of corporate expense processing. The system demonstrates excellent architectural design with robust error handling, comprehensive data validation, and intuitive user experience. 

This consolidated requirements document provides both a complete specification of the existing system capabilities and a foundation for future development initiatives, ensuring that any modifications maintain compatibility with established data structures and processing workflows while supporting the ongoing operational requirements of corporate expense management.

---

**Document Status**: Final - Consolidated from codebase analysis and existing documentation
**Last Updated**: August 28, 2025
**Next Review**: As needed for system modifications or enhancements