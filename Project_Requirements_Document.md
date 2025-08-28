# Credit Card Processor - Project Requirements Document

## Document Information
- **Project Name**: Credit Card Processor (Expense Splitter)
- **Document Version**: 1.0
- **Date**: August 28, 2025
- **Author**: System Analysis based on existing codebase

---

## 1. EXECUTIVE SUMMARY

The Credit Card Processor is a Python-based desktop application designed to automate the processing, analysis, and reporting of corporate credit card expenses. The system processes PDF reports from financial institutions, extracts transaction data, validates receipt information, and generates comprehensive reports for accounting and auditing purposes.

---

## 2. FUNCTIONAL REQUIREMENTS

### 2.1 Core Processing Workflow

#### 2.1.1 Automated Processing Pipeline
**FR-001**: The system SHALL execute an automated processing pipeline that includes:
- PDF text extraction and parsing
- Data validation and cross-referencing
- File splitting and organization
- Report generation
- Status monitoring and user feedback

#### 2.1.2 Sequential Processing Steps
**FR-002**: The system SHALL process files in the following sequence:
1. Folder structure validation and creation
2. Cardholder Activity Report processing
3. Receipt Report processing
4. Data reconciliation and validation
5. PDF file combination based on employee
6. Excel and CSV report generation

### 2.2 PDF Processing Capabilities

#### 2.2.1 Cardholder Activity Report Processing
**FR-003**: The system SHALL extract the following data from CAR PDFs:
- Employee ID (4-6 digits)
- Employee name (alphabetic characters)
- Credit card number (16 digits, masked or unmasked format)
- Transaction totals per employee
- Page ranges for each employee's data

**FR-004**: The system SHALL use regex pattern matching to identify:
- Employee information: `Employee\s+ID:\s*(?P<employee_id>\d{4,6})\s*(?P<employee_name>[A-Z]+)\s*(?P<card_number>\d{6}(?:X{6}|\d{6})\d{4})`
- Total amounts: `Totals For Card Nbr: \d{16}\n\$([\d,\.]+)`
- End-of-data markers to optimize processing

#### 2.2.2 Receipt Report Processing
**FR-005**: The system SHALL extract comprehensive receipt data including:
- Transaction ID
- Employee name and expense type
- Transaction date
- Amount and purpose
- Merchant name and address
- Coding information (Job or GL)
- Attachment status

**FR-006**: The system SHALL support two coding types:
- **Job Coding**: Extract Job number, Phase, and Cost Type
- **GL Coding**: Extract GL Account number and description

#### 2.2.3 Name Standardization
**FR-007**: The system SHALL implement manual name mapping for inconsistent employee names:
- 'BRITTSCHEXNAIDER' → 'BRITTANSCHEXNAIDER'
- 'JOSEARREDONDO' → 'JOSEPEREZ'
- 'JIMMIERAYUNDERWOOD' → 'JIMMIEUNDERWOOD'

### 2.3 Data Validation and Quality Control

#### 2.3.1 Validation Flags
**FR-008**: The system SHALL maintain validation flags for each employee record:
- `missing_coding_info`: Incomplete job or GL coding
- `missing_receipt`: Missing receipt attachments
- `missing_all_receipts`: No receipts found for employee
- `total_mismatch`: Discrepancy between card activity and receipt totals

#### 2.3.2 Data Integrity Checks
**FR-009**: The system SHALL validate:
- Numeric amount formatting and conversion
- Date format consistency (MM/DD/YYYY)
- Required field completeness
- Transaction ID uniqueness

### 2.4 File Management and Organization

#### 2.4.1 Folder Structure Management
**FR-010**: The system SHALL create and maintain the following folder structure:
```
~/Documents/Expense Splitter/
├── Final Reports/
│   ├── Finished Reports/
│   └── Unfinished Reports/
├── Import - Cardholder Activity Report/
├── Import - Receipt Report/
├── Split Card Activity/
└── Split Receipts/
```

#### 2.4.2 File Splitting and Combination
**FR-011**: The system SHALL split source PDFs by employee and create individual employee PDFs containing:
- Relevant pages from Cardholder Activity Report
- Corresponding pages from Receipt Report
- Combined into single PDF per employee

#### 2.4.3 File Classification
**FR-012**: The system SHALL classify employee reports as:
- **Finished Reports**: Complete with all coding, receipts, and matching totals
- **Unfinished Reports**: Missing coding, receipts, or containing discrepancies

### 2.5 Report Generation

#### 2.5.1 Excel Summary Report
**FR-013**: The system SHALL generate an Excel workbook with two worksheets:

**Summary Sheet** containing:
- Employee Name
- Card Activity Total
- Receipt Total
- Receipt Count
- Missing Receipt Amount (calculated difference)
- Flags (concatenated list of active validation flags)

**Receipt Issue Details Sheet** containing:
- Employee Name
- Expense Type
- Transaction Date
- Amount
- Purpose
- Merchant Name and Address
- Status (Missing Coding, Missing Attachment, etc.)

#### 2.5.2 CSV Import File
**FR-014**: The system SHALL generate a CSV file for accounting system import with fields:
- Transaction ID, Date, Amount, Name
- Vendor ID (hardcoded as '12332')
- Invoice Number (last 4 digits of card + MMDDYY format)
- Header Description, Job, Phase, Cost Type
- GL Account, Item Description
- Unit of Measure (hardcoded as 'LS')
- Tax Code (hardcoded as 'XX')
- Pay Type (2 for Job Coding, 1 for GL Coding)
- Card Holder information
- Credit Card details

---

## 3. TECHNICAL REQUIREMENTS

### 3.1 System Architecture

#### 3.1.1 Modular Design
**TR-001**: The system SHALL implement a modular architecture with distinct packages:
- `pdf_handler`: PDF processing operations (extractor, splitter, combiner)
- `utilities`: Support functions (folders, excel, json_handler)
- `main.py`: GUI application and workflow orchestration

#### 3.1.2 Data Management
**TR-002**: The system SHALL use JSON for intermediate data storage with:
- Persistent storage in `~/Documents/Expense Splitter/activity.json`
- In-memory data manipulation via JsonHandler class
- Atomic save operations to prevent data corruption

### 3.2 Technology Stack

#### 3.2.1 Core Dependencies
**TR-003**: The system SHALL utilize the following Python packages:
- **PyMuPDF 1.24.4**: PDF text extraction and manipulation
- **pandas 2.2.2**: Data processing and Excel/CSV generation
- **customtkinter 5.2.2**: Modern GUI framework

#### 3.2.2 Python Version Compatibility
**TR-004**: The system SHALL support Python 3.10+ with match-case syntax usage.

#### 3.2.3 Operating System Support
**TR-005**: The system SHALL support cross-platform operation:
- Windows (using USERPROFILE environment variable)
- Linux/macOS (using HOME environment variable)

### 3.3 Performance Requirements

#### 3.3.1 Processing Speed
**TR-006**: The system SHALL process typical corporate expense reports within reasonable timeframes:
- Large PDF files (50+ pages) processed within 2 minutes
- Memory usage optimized through document streaming
- Progress feedback provided to user during processing

#### 3.3.2 Memory Management
**TR-007**: The system SHALL implement proper resource management:
- PDF document objects closed after processing
- Temporary files cleaned up automatically
- Memory footprint minimized through streaming operations

### 3.4 Data Storage and Persistence

#### 3.4.1 JSON Data Structure
**TR-008**: The system SHALL maintain JSON data with the following structure:
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
      "coding_key": [receipt_objects]
    },
    "files": [file_paths]
  }
}
```

#### 3.4.2 File System Integration
**TR-009**: The system SHALL integrate with the local file system for:
- Automatic detection of most recent source files
- Directory creation and management
- File cleanup and organization
- Cross-platform path handling

---

## 4. USER INTERFACE REQUIREMENTS

### 4.1 GUI Specifications

#### 4.1.1 Application Window
**UI-001**: The system SHALL provide a minimal status window with:
- Window title: "Expense Splitter Status"
- Window dimensions: 300x150 pixels
- Dark theme with green accent color
- Non-resizable, centered on screen

#### 4.1.2 Status Display
**UI-002**: The system SHALL display real-time processing status:
- Initial state: "Status: Waiting to start"
- Progress messages during each processing phase
- Final state: "Process completed successfully!" or error message
- Status updates with 1-second delays for user visibility

#### 4.1.3 User Controls
**UI-003**: The system SHALL provide:
- Close button (initially disabled, enabled upon completion)
- Automatic process initiation (1-second delay after startup)
- Window close protocol handling for clean shutdown

### 4.2 User Interaction Patterns

#### 4.2.1 Automated Operation
**UI-004**: The system SHALL operate with minimal user intervention:
- Automatic startup of processing pipeline
- No user input required during normal operation
- Self-contained processing with status feedback

#### 4.2.2 Error Handling Display
**UI-005**: The system SHALL display error information:
- Exception messages shown in status label
- Error state prevents premature application closure
- Graceful degradation with informative error messages

---

## 5. INTEGRATION REQUIREMENTS

### 5.1 External File Dependencies

#### 5.1.1 Source File Requirements
**INT-001**: The system SHALL process PDF files with specific naming conventions:
- Cardholder Activity Reports in 'Import - Cardholder Activity Report' folder
- Receipt Reports in 'Import - Receipt Report' folder
- Most recent file selection based on file modification time

#### 5.1.2 Optional Name Reference File
**INT-002**: The system SHALL optionally integrate with:
- 'Card Names.xls' file for employee name corrections (currently commented out)
- Excel file processing with pandas for name standardization
- Skip row functionality for formatted spreadsheets

### 5.2 Output File Specifications

#### 5.2.1 Excel Report Format
**INT-003**: The system SHALL generate Excel files compatible with:
- Microsoft Excel 2016+
- XlsxWriter engine for formatting
- Multiple worksheet structure
- Standard business report formatting

#### 5.2.2 CSV Export Format
**INT-004**: The system SHALL generate CSV files with:
- Standard comma-separated values format
- UTF-8 encoding
- Header row with field names
- Comma removal from description fields to prevent parsing issues

### 5.3 Build and Distribution

#### 5.3.1 Executable Generation
**INT-005**: The system SHALL support executable generation via PyInstaller:
- Windows executable creation
- Console and windowed modes supported
- UPX compression enabled
- Icon file integration capability

---

## 6. QUALITY REQUIREMENTS

### 6.1 Reliability and Error Handling

#### 6.1.1 Exception Management
**QR-001**: The system SHALL implement comprehensive error handling:
- Try-catch blocks around critical operations
- Graceful degradation for parsing errors
- Informative error messages for troubleshooting
- Process continuation where possible after non-critical errors

#### 6.1.2 Data Validation
**QR-002**: The system SHALL validate:
- File existence before processing
- Numeric value conversion with error handling
- Required field presence checking
- Page range validation for PDF operations

#### 6.1.3 Threading Safety
**QR-003**: The system SHALL implement thread-safe operations:
- Background processing thread for long operations
- GUI thread protection during status updates
- Proper thread cleanup on application exit

### 6.2 Maintainability Considerations

#### 6.2.1 Code Organization
**QR-004**: The system SHALL maintain:
- Clear separation of concerns between modules
- Consistent naming conventions
- Modular design for easy modification
- Minimal code duplication

#### 6.2.2 Configuration Management
**QR-005**: The system SHALL support:
- Hardcoded values clearly identified for easy modification
- Regex patterns centrally defined
- Folder structure definitions in single location
- Manual name mappings easily updatable

### 6.3 Security Implications

#### 6.3.1 File System Access
**QR-006**: The system SHALL operate with:
- Local file system access only
- User document directory restrictions
- No network connectivity requirements
- File cleanup to prevent data accumulation

#### 6.3.2 Data Privacy
**QR-007**: The system SHALL handle sensitive data appropriately:
- Credit card numbers processed but not stored long-term
- Employee information kept in local JSON files only
- Temporary files cleaned up after processing
- No external data transmission

---

## 7. CURRENT SYSTEM STATE

### 7.1 Implemented Features

The analysis reveals a fully functional system with the following implemented capabilities:
- Complete PDF processing pipeline
- Regex-based data extraction
- GUI status monitoring
- Multi-format report generation
- Cross-platform file system support
- Modular architecture with clear separation of concerns

### 7.2 Known Limitations

Based on code analysis, the following limitations are identified:
- Manual name mapping required for employee name variations
- Hardcoded vendor ID and formatting rules
- Limited error recovery for parsing failures
- No configuration file support for business rules
- Commented-out name correction feature indicates incomplete implementation

### 7.3 Future Enhancement Opportunities

The current codebase provides a solid foundation for potential enhancements:
- Configuration file support for business rules
- Enhanced error reporting and logging
- Progress bars for long operations
- Email notification capabilities
- Database integration options
- Audit trail functionality

---

## 8. CONCLUSION

The Credit Card Processor represents a well-designed, purpose-built application for automating corporate expense processing. The system successfully addresses the complex requirements of PDF data extraction, validation, and reporting while maintaining a simple user interface and robust error handling. The modular architecture and clear separation of concerns provide a maintainable foundation for future enhancements while meeting current operational requirements.

This requirements document serves as both a specification for the existing system and a foundation for future development efforts, ensuring that modifications maintain compatibility with the established data structures and processing workflows.

---

**End of Document**