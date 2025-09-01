# Manual Test Scripts
## Credit Card Processor Application

### Document Information
- **Version**: 1.0
- **Date**: December 2024
- **Purpose**: Detailed manual test scripts for User Acceptance Testing

---

## Test Script Template

Each test script includes:
- **Test ID**: Unique identifier
- **Test Objective**: What is being tested
- **Prerequisites**: Setup required before testing
- **Test Data**: Specific data needed for the test
- **Detailed Steps**: Step-by-step instructions
- **Expected Results**: What should happen at each step
- **Pass/Fail Criteria**: How to determine success
- **Notes**: Additional information or variations

---

## Test Script 1: File Upload - Happy Path

**Test ID**: UAT-TS-001  
**Test Objective**: Verify successful upload and processing of a valid PDF file  
**Priority**: Critical  
**Estimated Time**: 10 minutes  

### Prerequisites
- [ ] User has valid login credentials
- [ ] Application is accessible at the test URL
- [ ] Test PDF file available (2-5MB credit card statement)
- [ ] Browser is one of the supported versions

### Test Data
- **File**: `sample_credit_card_statement.pdf` (3.2MB)
- **Username**: `testuser1`
- **Password**: `TestPass123!`

### Detailed Test Steps

| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Open browser and navigate to application URL | Application login page displays | ☐ | |
| 2 | Enter username and password, click Login | User successfully logged in, dashboard visible | ☐ | |
| 3 | Verify user is on the main dashboard | Dashboard shows upload area and navigation | ☐ | |
| 4 | Click "Upload File" or drag file to upload area | File selection dialog opens OR file is accepted | ☐ | |
| 5 | Select the test PDF file | File name appears in upload area | ☐ | |
| 6 | Click "Upload" button | Upload progress bar appears | ☐ | |
| 7 | Wait for upload to complete | Progress bar reaches 100%, success message displayed | ☐ | |
| 8 | Verify file appears in file list | File listed with correct name, size, and timestamp | ☐ | |
| 9 | Note the session ID | Session ID is generated and displayed | ☐ | Session ID: _______ |
| 10 | Click "Start Processing" | Processing begins, status changes to "Processing" | ☐ | |
| 11 | Wait for processing to complete | Status changes to "Completed", processing time shown | ☐ | Processing time: _____ |
| 12 | Click "View Results" | Results page displays with extracted data | ☐ | |

### Pass/Fail Criteria
**PASS**: All steps complete successfully, file uploaded and processed without errors  
**FAIL**: Any step fails, errors occur, or results are not displayed correctly

### Additional Verification Points
- [ ] File size displayed correctly
- [ ] Upload time is reasonable (< 30 seconds for 5MB file)
- [ ] Processing completes within expected time (< 2 minutes)
- [ ] Session ID is unique and properly formatted
- [ ] No error messages displayed during normal operation

---

## Test Script 2: Invalid File Upload

**Test ID**: UAT-TS-002  
**Test Objective**: Verify proper handling of invalid file types and error messaging  
**Priority**: Critical  
**Estimated Time**: 15 minutes  

### Prerequisites
- [ ] User logged into the application
- [ ] Invalid test files available

### Test Data
- **Valid PDF**: `valid_statement.pdf`
- **Text File**: `invalid_file.txt`
- **Image File**: `invalid_image.jpg`
- **Empty File**: `empty_file.pdf` (0 bytes)
- **Large File**: `oversized_file.pdf` (>100MB)
- **Corrupted PDF**: `corrupted_statement.pdf`

### Detailed Test Steps

#### Test 2A: Wrong File Type
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Navigate to upload page | Upload interface displayed | ☐ | |
| 2 | Attempt to upload `invalid_file.txt` | Error message: "Invalid file type. Please upload a PDF file." | ☐ | |
| 3 | Verify file is not added to upload list | File does not appear in uploaded files | ☐ | |
| 4 | Attempt to upload `invalid_image.jpg` | Same error message displayed | ☐ | |

#### Test 2B: File Size Validation
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 5 | Attempt to upload empty file (0 bytes) | Error message: "File is too small. Minimum size is 100 bytes." | ☐ | |
| 6 | Attempt to upload oversized file (>100MB) | Error message: "File is too large. Maximum size is 100MB." | ☐ | |
| 7 | Verify upload progress does not start | No progress bar appears | ☐ | |

#### Test 2C: Corrupted File Handling
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 8 | Upload corrupted PDF file | File uploads but processing fails gracefully | ☐ | |
| 9 | Check processing status | Status shows "Processing Failed" with error details | ☐ | |
| 10 | Verify error message is helpful | Error explains file corruption and suggests retry | ☐ | |

### Pass/Fail Criteria
**PASS**: All invalid files properly rejected with clear, helpful error messages  
**FAIL**: Invalid files accepted, unclear error messages, or system crashes

---

## Test Script 3: Multi-User Concurrent Access

**Test ID**: UAT-TS-003  
**Test Objective**: Verify system handles multiple concurrent users properly  
**Priority**: High  
**Estimated Time**: 30 minutes  

### Prerequisites
- [ ] Multiple test user accounts available (User1, User2, User3)
- [ ] Multiple browser instances or different computers available
- [ ] Test files prepared for each user

### Test Data
- **User 1**: `user1@test.com` / `Pass123!`
- **User 2**: `user2@test.com` / `Pass123!`
- **User 3**: `user3@test.com` / `Pass123!`
- **Files**: Different PDF files for each user

### Detailed Test Steps

#### Setup Phase
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Open 3 browser instances/tabs | All browsers ready | ☐ | |
| 2 | Login as User 1 in browser 1 | User 1 logged in successfully | ☐ | |
| 3 | Login as User 2 in browser 2 | User 2 logged in successfully | ☐ | |
| 4 | Login as User 3 in browser 3 | User 3 logged in successfully | ☐ | |

#### Concurrent Operations
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 5 | All users upload files simultaneously | All uploads succeed | ☐ | |
| 6 | Monitor upload progress for all users | Each shows individual progress | ☐ | |
| 7 | All users start processing simultaneously | All processing jobs start | ☐ | |
| 8 | Check that users can't see each other's files | Files are properly isolated by user | ☐ | |
| 9 | Verify system responsiveness | No significant slowdown observed | ☐ | |
| 10 | All users access results page | Results load properly for each user | ☐ | |

### Pass/Fail Criteria
**PASS**: All users can work simultaneously without interference or significant performance degradation  
**FAIL**: Users experience errors, see other users' data, or system becomes unresponsive

---

## Test Script 4: Admin Functions

**Test ID**: UAT-TS-004  
**Test Objective**: Verify admin-only functions work correctly and are properly secured  
**Priority**: Critical  
**Estimated Time**: 20 minutes  

### Prerequisites
- [ ] Admin user account available
- [ ] Regular user account available
- [ ] Some processing data exists in the system

### Test Data
- **Admin User**: `admin@test.com` / `AdminPass123!`
- **Regular User**: `user@test.com` / `UserPass123!`

### Detailed Test Steps

#### Test 4A: Regular User Access Restrictions
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Login as regular user | Login successful | ☐ | |
| 2 | Try to access `/api/admin` endpoints directly | Access denied (401/403 error) | ☐ | |
| 3 | Look for admin menu options | No admin options visible in UI | ☐ | |
| 4 | Try to access system metrics | Access denied or limited view | ☐ | |

#### Test 4B: Admin User Privileges  
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 5 | Login as admin user | Login successful | ☐ | |
| 6 | Access admin dashboard | Admin dashboard loads with system overview | ☐ | |
| 7 | View system health metrics | Detailed system metrics displayed | ☐ | |
| 8 | Access user management (if available) | User list and management options visible | ☐ | |
| 9 | View all user sessions/files | Can see system-wide data | ☐ | |
| 10 | Check admin audit logs | Admin actions logged properly | ☐ | |

### Pass/Fail Criteria
**PASS**: Regular users cannot access admin functions, admin users have full access  
**FAIL**: Unauthorized access possible, admin functions not working, or audit logging missing

---

## Test Script 5: Data Export Functionality

**Test ID**: UAT-TS-005  
**Test Objective**: Verify data export features work correctly in all supported formats  
**Priority**: High  
**Estimated Time**: 25 minutes  

### Prerequisites
- [ ] User has completed file processing with results available
- [ ] Results contain various types of data for export testing

### Test Data
- **Processed Session**: Session with completed results
- **Export Formats**: CSV, Excel (XLSX), JSON

### Detailed Test Steps

#### Test 5A: CSV Export
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Navigate to results page | Results displayed correctly | ☐ | |
| 2 | Click "Export" button | Export options menu appears | ☐ | |
| 3 | Select "Export as CSV" | Download starts automatically | ☐ | |
| 4 | Open downloaded CSV file | File opens correctly in Excel/text editor | ☐ | |
| 5 | Verify data accuracy | All data matches what's shown in UI | ☐ | |
| 6 | Check column headers | Headers are descriptive and correct | ☐ | |

#### Test 5B: Excel Export
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 7 | Select "Export as Excel" | Download starts, .xlsx file generated | ☐ | |
| 8 | Open in Microsoft Excel | File opens properly in Excel | ☐ | |
| 9 | Verify formatting | Data properly formatted in columns | ☐ | |
| 10 | Check for formula compatibility | No formula errors or formatting issues | ☐ | |

#### Test 5C: JSON Export
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 11 | Select "Export as JSON" | Download starts, .json file generated | ☐ | |
| 12 | Validate JSON structure | File contains valid JSON syntax | ☐ | |
| 13 | Verify data completeness | All data fields present in JSON | ☐ | |
| 14 | Check data types | Numeric, string, date fields properly typed | ☐ | |

### Pass/Fail Criteria
**PASS**: All export formats generate correctly, data is accurate and complete  
**FAIL**: Export fails, data is missing/incorrect, or files are corrupted

---

## Test Script 6: Error Recovery and System Resilience

**Test ID**: UAT-TS-006  
**Test Objective**: Verify system handles errors gracefully and recovers appropriately  
**Priority**: High  
**Estimated Time**: 35 minutes  

### Prerequisites
- [ ] User logged into system
- [ ] Test files available
- [ ] Ability to simulate network issues (optional)

### Test Data
- **Various Files**: Valid and invalid files for testing
- **Network Tools**: Browser dev tools to simulate network issues

### Detailed Test Steps

#### Test 6A: Upload Interruption Recovery
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 1 | Start uploading a large file (20MB+) | Upload begins, progress bar appears | ☐ | |
| 2 | During upload, close browser tab | Upload interrupted | ☐ | |
| 3 | Reopen application and login | Login successful | ☐ | |
| 4 | Check for partially uploaded file | System either completed upload or shows clean state | ☐ | |
| 5 | Retry the same file upload | Upload works normally | ☐ | |

#### Test 6B: Session Timeout Handling
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 6 | Leave system idle for session timeout period | No action for configured timeout period | ☐ | Timeout period: _____ |
| 7 | Try to perform an action | Session timeout message displayed | ☐ | |
| 8 | Click "Login Again" or similar | Redirected to login page | ☐ | |
| 9 | Login with credentials | Return to previous page or dashboard | ☐ | |

#### Test 6C: Processing Error Recovery
| Step | Action | Expected Result | ✓/✗ | Notes |
|------|--------|-----------------|-----|-------|
| 10 | Upload a problematic file that will cause processing errors | Upload succeeds, processing starts | ☐ | |
| 11 | Wait for processing to fail | Processing status shows "Failed" with error details | ☐ | |
| 12 | Check system stability | System remains responsive and usable | ☐ | |
| 13 | Upload a valid file after the error | New upload and processing work normally | ☐ | |

### Pass/Fail Criteria
**PASS**: System handles all error conditions gracefully, provides helpful messages, and recovers properly  
**FAIL**: System crashes, becomes unresponsive, or doesn't recover from errors

---

## Test Script 7: Performance and Responsiveness

**Test ID**: UAT-TS-007  
**Test Objective**: Verify system meets performance requirements under normal usage  
**Priority**: High  
**Estimated Time**: 40 minutes  

### Prerequisites
- [ ] System performance monitoring tools available
- [ ] Multiple test files of different sizes
- [ ] Stopwatch or timing method available

### Test Data
- **Small File**: 1MB PDF
- **Medium File**: 10MB PDF  
- **Large File**: 50MB PDF
- **Very Large File**: 90MB PDF

### Detailed Test Steps

#### Test 7A: Page Load Performance
| Step | Action | Expected Result | ✓/✗ | Time | Notes |
|------|--------|-----------------|-----|------|-------|
| 1 | Navigate to application homepage | Page loads in < 3 seconds | ☐ | ___s | |
| 2 | Login to the application | Login completes in < 2 seconds | ☐ | ___s | |
| 3 | Navigate to dashboard | Dashboard loads in < 3 seconds | ☐ | ___s | |
| 4 | Access upload page | Upload page loads in < 2 seconds | ☐ | ___s | |

#### Test 7B: File Upload Performance
| Step | Action | Expected Result | ✓/✗ | Time | Notes |
|------|--------|-----------------|-----|------|-------|
| 5 | Upload 1MB file | Upload completes in < 10 seconds | ☐ | ___s | |
| 6 | Upload 10MB file | Upload completes in < 30 seconds | ☐ | ___s | |
| 7 | Upload 50MB file | Upload completes in < 2 minutes | ☐ | ___s | |
| 8 | Upload 90MB file | Upload completes in < 3 minutes | ☐ | ___s | |

#### Test 7C: Processing Performance
| Step | Action | Expected Result | ✓/✗ | Time | Notes |
|------|--------|-----------------|-----|------|-------|
| 9 | Process 1MB file | Processing completes in < 30 seconds | ☐ | ___s | |
| 10 | Process 10MB file | Processing completes in < 60 seconds | ☐ | ___s | |
| 11 | Process 50MB file | Processing completes in < 3 minutes | ☐ | ___s | |

### Pass/Fail Criteria
**PASS**: All operations complete within specified time limits  
**FAIL**: Any operation exceeds the time limit or system becomes unresponsive

---

## Test Execution Tracking

### Test Execution Summary
| Test Script | Tester | Date | Result | Comments |
|-------------|---------|------|--------|----------|
| UAT-TS-001 | _______ | _____ | ☐ Pass ☐ Fail | |
| UAT-TS-002 | _______ | _____ | ☐ Pass ☐ Fail | |
| UAT-TS-003 | _______ | _____ | ☐ Pass ☐ Fail | |
| UAT-TS-004 | _______ | _____ | ☐ Pass ☐ Fail | |
| UAT-TS-005 | _______ | _____ | ☐ Pass ☐ Fail | |
| UAT-TS-006 | _______ | _____ | ☐ Pass ☐ Fail | |
| UAT-TS-007 | _______ | _____ | ☐ Pass ☐ Fail | |

### Defect Log
| Defect ID | Test Script | Description | Severity | Status | Resolution |
|-----------|-------------|-------------|----------|--------|------------|
| DEF-001 | | | | | |
| DEF-002 | | | | | |
| DEF-003 | | | | | |

### Notes and Observations
_Use this section to record any additional observations, suggestions for improvement, or issues that don't warrant formal defects._

---

**Test Execution Sign-off**
- **Tester Name**: _________________
- **Date Completed**: _________________
- **Overall Result**: ☐ Pass ☐ Fail
- **Signature**: _________________