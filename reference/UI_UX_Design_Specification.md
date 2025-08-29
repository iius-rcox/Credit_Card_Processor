# Credit Card Processor - UI/UX Design Specification

## Executive Summary

This document presents a simplified yet modern UI/UX design for the Credit Card Processor web application, transitioning from the existing desktop Python application to a streamlined web-based system. The design prioritizes simplicity and reliability with a modern user experience, using progressive disclosure to ensure both novice and power users can effectively process corporate credit card expenses.

**Architecture Approach**: Modern frontend (Vue 3 + Vite) with simplified backend (FastAPI + SQLite) providing 90% of the user experience benefits with 30% of the technical complexity.

**Authentication Model**: The system uses simplified Windows username-based authentication, eliminating complex login flows. Users access the application via VPN with automatic username detection from the Windows environment. Admin access is controlled through a predefined list of admin usernames.

---

## 1. USER PERSONAS & REQUIREMENTS ANALYSIS

### 1.1 Primary User Personas

**Standard User (Primary User - 90% of interactions)**
- **Profile**: Accounting staff, office managers, administrative assistants, supervisors
- **Goals**: Upload PDFs, monitor processing, resolve issues, export reports
- **Pain Points**: Complex interfaces, unclear error messages, lost progress
- **Technical Comfort**: Moderate - familiar with office software
- **Access**: Full application functionality via Windows username authentication

**Administrator (Power User - 10% of interactions)**
- **Profile**: IT staff, senior accounting personnel, system owners
- **Goals**: Access system analytics, view all user sessions, manage system settings
- **Pain Points**: Need visibility into system usage and performance
- **Technical Comfort**: High
- **Access**: All standard features plus system administration based on Windows username

### 1.2 Core User Workflows Identified

1. **New Report Processing** (Most Common)
   - Upload CAR and Receipt PDFs → Monitor Progress → Review Results → Export Reports

2. **Revision Processing** (Frequent)
   - Access Previous Session → Upload Updated Files → Compare Changes → Resolve Issues

3. **Issue Resolution** (Regular)
   - Identify Outstanding Issues → Research Problem → Apply Corrections → Verify Fix

4. **System Administration** (Admin Only)
   - View System Analytics → Monitor All User Sessions → Export System Reports

---

## 2. WIREFRAMES & LAYOUT STRUCTURE

### 2.1 Main Application Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ [LOGO] Credit Card Processor                    Welcome, rcox       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─ SECTION 1: Quick Start & Session Setup ─────────────────────────┐ │
│ │ [📤 Start New Processing] [🔄 Resume Session] [Admin Tools*]      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ SECTION 2: File Upload (Progressive Disclosure) ────────────────┐ │
│ │ [CAR Report Upload] [Receipt Report Upload] → [Process Files]     │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ SECTION 3: Processing Status (Appears During Processing) ───────┐ │
│ │ Progress: ████████░░░░ 67% (32/45 employees) [Live Updates]     │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ SECTION 4: Results & Export (Appears After Processing) ─────────┐ │
│ │ [Generate pVault File] [Generate Follow-up List] [View Details]   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ *Admin tools visible only to designated usernames                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Section 1: Session Setup & Quick Start

┌─ Session Information ─────────────────────────────────────────────────┐
│                                                                       │
│ ┌─ Quick Actions ──────────────────┐ ┌─ Recent Activity ──────────────┐ │
│ │                                  │ │                               │ │
│ │ [📤 Start New Session]           │ │ Last Session: #2025-001       │ │
│ │ Large, prominent button          │ │ ├ Status: Completed ✅         │ │
│ │                                  │ │ ├ 45 employees processed       │ │
│ │ [🔄 Resume Previous Session]     │ │ └ 3 issues resolved           │ │
│ │ (If same files detected)         │ │                               │ │
│ │                                  │ │ [📋 View All Sessions]        │ │
│ └──────────────────────────────────┘ └───────────────────────────────┘ │
│                                                                       │
│ Session Name: [Monthly Expenses - March 2025              ] [Required]│
│ Description:  [Updated processing with new receipts       ] [Optional]│
│ Processing:   [⚪ New Session  🔘 Delta from: #2025-001 ▼] [Select] │
└───────────────────────────────────────────────────────────────────────┘

```

### 2.3 Section 2: File Upload Areas

```

┌─ File Upload Area ────────────────────────────────────────────────────┐
│                                                                       │
│ ┌─ CAR Report (Required) ──────────────────────┐ ┌─ Receipt Report ──┐ │
│ │                                              │ │    (Optional)     │ │
│ │         📁 Drag CAR PDF here                 │ │                   │ │
│ │           or click to browse                 │ │  📁 Drag here or  │ │
│ │                                              │ │   click to browse │ │
│ │         [📤 Choose CAR File]                 │ │                   │ │
│ │                                              │ │ [📤 Choose File]  │ │
│ │ ✅ March_CAR_Report.pdf (2.3 MB)            │ │                   │ │
│ │    Uploaded successfully                     │ │ ❓ Upload receipt │ │
│ │                                              │ │   data if available│ │
│ └──────────────────────────────────────────────┘ └───────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘

┌─ Processing Options ──────────────────────────────────────────────────┐
│ ☑ Email notification on completion                                   │
│ ☑ Generate detailed validation report                                │
│ ☐ Skip employees with no changes (revision mode only)                │
└───────────────────────────────────────────────────────────────────────┘

                      [🚀 Start Processing]
                    Large, primary action button
```

### 2.4 Section 3: Processing Status (Progressive Disclosure)

┌─ Processing: March 2025 Expenses ────────────────────────────────────┐
│                                                                       │
│ ┌─ Employee-Level Progress ─────────────────────────────────────────┐ │
│ │ ████████████████████░░░░░░░░ 32/45 employees processed (71%)       │ │
│ │                                                                   │ │
│ │ Current: Processing Johnson, Sarah (Employee #12345)              │ │
│ │ Estimated Time Remaining: 1 minute 45 seconds                    │ │
│ │                                                                   │ │
│ │ ✅ Complete: 29  🔄 Processing: 3  ⚠️ Issues: 4  ⏳ Pending: 9   │ │
│ │                                                                   │ │
│ │ [📊 Show Details] [⏸️ Pause] [❌ Cancel]                          │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│ ┌─ Recent Activity (Expandable) ────────────────────────────────────┐  │
│ │ ✅ Martinez, Carlos - Found 4 receipts, all matched               │  │
│ │ ⚠️ Williams, David - Missing receipt for $156.78 transaction      │  │
│ │ ✅ Brown, Jennifer - Processing complete, no issues                │  │
│ │ 🔄 Johnson, Sarah - Currently processing...                       │  │
│ │ [📝 View Full Activity Log]                                       │  │
│ └───────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│                     [📄 View Results] (Enabled when complete)         │
└───────────────────────────────────────────────────────────────────────┘
```

### 2.5 Section 4: Smart Results Grouping

```
┌─ Processing Results: March 2025 Expenses ────────────────────────────┐
│                                                                       │
│ ┌─ Summary Stats ───────────────────────────────────────────────────┐  │
│ │ 45 Total | 38 Complete ✅ | 4 Issues ⚠️ | 3 Critical ❌           │  │
│ │ Total Amount: $127,543.82 | Processing Time: 3m 42s              │  │
│ └───────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│ 🆔 Delta Recognition: 3 employees unchanged from last processing      │
│                                                                       │
│ ┌─ 🟢 Ready for Export (38 employees) ─┐ ┌─ ⚠️ Needs Attention (7) ─┐ │
│ │                                       │ │                          │ │
│ │ All validations passed                │ │ Missing receipts: 4      │ │
│ │ No issues found                       │ │ Coding issues: 2         │ │
│ │                                       │ │ Amount mismatches: 1     │ │
│ │ [📄 Generate pVault File]             │ │                          │ │
│ │ [📋 Generate Follow-up List]          │ │ [🔍 Review Issues]       │ │
│ └───────────────────────────────────────┘ └──────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

### 2.6 Section 5: Admin Tools (Conditional)

```
┌─ System Administration (Admin Users Only) ───────────────────────────┐
│                                                                       │
│ ┌─ System Status ──────┐ ┌─ Recent Sessions ──────┐ ┌─ Quick Actions ─┐ │
│ │                      │ │                        │ │                 │ │
│ │ Active Sessions: 2   │ │ rcox - Processing      │ │ [📊 Analytics]  │ │
│ │ Queue Length: 0      │ │ jsmith - Completed     │ │ [🔧 Settings]   │ │
│ │ System Load: 23%     │ │ mgarcia - Issues       │ │ [📝 Audit Log]  │ │
│ │                      │ │                        │ │                 │ │
│ └──────────────────────┘ └────────────────────────┘ └─────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 3. COMPONENT SPECIFICATIONS

### 3.1 File Upload Component

**Visual Design:**
- Large, prominent drop zone (300x200px minimum)
- Dashed border with blue accent color (#2196F3)
- Clear visual hierarchy: Drag area > Browse button > File status
- Progress indicator for uploads
- File validation feedback (size, type, format)

**Interaction States:**
- **Default**: Subtle border, upload icon, instructional text
- **Drag Hover**: Highlighted border, darkened background, "Drop file here" text  
- **Uploading**: Progress bar, estimated time remaining
- **Success**: Green checkmark, file name, size, "Upload successful"
- **Error**: Red X icon, error message, "Try Again" button

**Technical Requirements:**
- Support drag-and-drop and click-to-browse
- Accept only PDF files up to 100MB
- Show upload progress with percentage and speed
- Enable file replacement before processing starts
- Client-side file validation before upload

### 3.2 Progress Tracking Component

**Employee-Centered Progress Display:**
1. **Employee Progress Bar**: Shows individual employee completion (32/45)
2. **Current Employee Indicator**: Name and ID of employee being processed
3. **Status Breakdown**: Visual counts of Complete, Processing, Issues, Pending
4. **Live Employee Updates**: Real-time updates showing individual employee progress

**Visual Elements:**
- Employee progress bar: Blue gradient, 8px height, rounded corners
- Current employee: Large, medium-weight font with employee details
- Status grid: 4-column layout with status icons and counts
- Activity feed: Employee-focused updates with names and specific actions

### 3.3 Smart Grouping Component

**Group-Based Layout:**
```
┌─ Smart Results Grouping ──────────────────────────────────────────────┐
│                                                                      │
│ ┌─ 🟢 Ready for Export (38) ──────────────────────────────────────────┐   │
│ │ All employees with complete data and no issues                  │   │
│ │                                                                │   │
│ │ Johnson, S. | Martinez, C. | Brown, J. | Wilson, D. (+34 more)│   │
│ │                                                                │   │
│ │ [📄 Generate pVault File] [📋 Generate Follow-up List]        │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                      │
│ ┌─ ⚠️ Needs Attention (7) ─────────────────────────────────────────────┐   │
│ │ Missing receipts (4): Williams, D. | Garcia, M. | (+2 more)   │   │
│ │ Coding issues (2): Thompson, L. | Davis, R.                   │   │
│ │ Amount mismatches (1): Anderson, K.                           │   │
│ │                                                                │   │
│ │ [🔍 Review All Issues] [📤 Export Issue Report]               │   │
│ └────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

**Delta Recognition Feature:**
- 🆔 **Same Files Detected**: "3 employees unchanged from last processing"
- Smart detection when identical files are uploaded again
- Shows what's changed vs. previous processing
- Option to skip unchanged employees

### 3.4 Data Table Component (History/Reports)

**Table Features:**
- Sortable columns with clear sort indicators
- Filterable columns with dropdown menus
- Pagination with configurable page sizes (25, 50, 100)
- Bulk actions for selected rows
- Export selected/all data options
- Responsive design: stack cards on mobile, full table on desktop

**Column Configuration Example (Sessions Table):**
- Session Name (sortable, searchable)
- Created By (sortable, filterable by user)
- Status (filterable by status)
- Employees (sortable by count)
- Total Amount (sortable)
- Created Date (sortable, date range filter)
- Actions (View, Edit, Export, Delete)

### 3.5 Action-Oriented Export Interface

**Export Button Specifications:**
```
┌─ Export Actions ─────────────────────────────────────────────────────┐
│                                                           │
│ [📄 Generate pVault File]                                 │
│ Primary action button - CSV format for pVault system     │
│ Includes all completed employee records                   │
│                                                           │
│ [📋 Generate Follow-up List]                              │
│ Secondary action button - Excel format                    │
│ Lists all employees requiring follow-up action           │
│                                                           │
│ [📊 Generate Issue Report] (When issues present)         │
│ Tertiary button - Detailed report of all issues found    │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Issue Detail Inline View:**
```
┌─ Issue Details (Expandable) ─────────────────────────────────────────┐
│ ⚠️ Williams, David - Missing Receipt ($156.78)            │
│ ├─ Transaction: Office Supplies - Staples Inc.           │
│ ├─ Date: March 15, 2025                                  │
│ ├─ Suggested: Contact employee or approve if under limit │
│ └─ [✅ Mark Resolved] [📧 Send Reminder] [ℹ️ More Info]  │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 4. USER FLOW DIAGRAMS

### 4.1 Single-Page Processing Flow

```
Start → User opens application (VPN + Windows auth)
  ↓
[Section 1: Session Setup]
  ├→ Enter session name and description
  ├→ Select "New" or "Delta from previous"
  ├→ System checks for delta recognition
  └→ Section expands to show file uploads
  ↓
[Section 2: File Upload]
  ├→ Upload CAR PDF (required)
  ├→ Upload Receipt PDF (optional)
  ├→ System validates files
  └→ "Start Processing" button enabled
  ↓
[Section 3: Processing (Progressive Expansion)]
  ├→ Employee-level progress tracking
  ├→ Real-time individual employee updates
  ├→ Delta recognition feedback if applicable
  └→ Processing completion notification
  ↓
[Section 4: Smart Results Grouping]
  ├→ Employees grouped by status
  ├→ Action-oriented export buttons
  ├→ "Generate pVault File" for completed
  └→ "Generate Follow-up List" for issues
  ↓
[Section 5: Admin Tools (If Admin)]
  └→ System overview and management tools
  ↓
End: All actions available on single page
```

### 4.2 Delta Recognition Flow

```
Start: User uploads files (same as previous session)
  ↓
[Section 1: Session Setup] 
  ├→ System detects identical files
  ├→ Shows "Delta from: #2025-001" option
  └→ User selects delta processing
  ↓
[Section 2: File Upload]
  ├→ Files auto-validated as "Same as previous"
  ├→ Delta recognition message displayed
  └→ "Process Delta" button enabled
  ↓
[Section 3: Processing]
  ├→ Shows "3 employees unchanged from last processing"
  ├→ Processes only changed data
  └→ Faster completion due to delta optimization
  ↓
[Section 4: Results with Delta Feedback]
  ├→ "What Changed" summary prominent
  ├→ Unchanged employees clearly marked
  ├→ Only changed employees in main groupings
  └→ Export options include delta comparison
  ↓
End: Efficient delta processing completed
```

### 4.3 Inline Issue Resolution Flow

```
Start: Issues identified during processing
  ↓
[Section 4: Results] → Issues grouped by type
  ↓
[Smart Issue Grouping]
  ├→ Missing receipts (4 employees)
  ├→ Coding issues (2 employees)
  └→ Amount mismatches (1 employee)
  ↓
Click "Review All Issues" or individual employee
  ↓
[Inline Issue Details] - No modal required
  ├→ Employee name and issue prominently shown
  ├→ Transaction details inline
  ├→ Suggested actions as buttons
  └→ Quick resolution options
  ↓
User Action (Inline):
  ├─ Mark Resolved → Issue moves to resolved group
  ├─ Send Reminder → Email sent, status updated
  └─ More Info → Details expand inline
  ↓
[Live Status Updates]
  ├→ Issue counts update immediately
  ├→ Groups reorganize automatically
  └→ Export buttons reflect current status
  ↓
End: All issues managed without leaving page
```

---

## 5. RESPONSIVE LAYOUT DESIGN

### 5.1 Desktop Layout (1200px+)

**Primary Layout:**
- Full horizontal navigation with all tabs visible
- Three-column dashboard layout where applicable
- Side-by-side file upload areas
- Expanded data tables with all columns
- Detailed progress tracking with live updates
- Modal overlays for complex workflows

**Key Features:**
- Maximum information density
- Efficient use of screen real estate
- Multiple simultaneous data views
- Advanced filtering and sorting options
- Keyboard shortcuts for power users

### 5.2 Tablet Layout (768px - 1199px)

**Adaptive Layout:**
- Horizontal tabs with icons and labels
- Two-column dashboard layout
- Stacked file upload areas (vertical)
- Responsive data tables with horizontal scroll
- Simplified progress tracking
- Full-screen modals for complex tasks

**Interaction Adaptations:**
- Larger touch targets (minimum 44px)
- Simplified navigation patterns
- Consolidated action menus
- Touch-friendly drag and drop
- Optimized for landscape orientation

### 5.3 Mobile Considerations (Future Phase)

**Note:** Initial implementation focuses on desktop and tablet. Mobile support planned for Phase 2.

**Planned Mobile Adaptations:**
- Bottom navigation with icons only
- Single-column layouts throughout
- Card-based information display
- Progressive disclosure for complex data
- Touch-optimized interactions
- Simplified workflows with step-by-step guidance

---

## 6. VISUAL HIERARCHY & DESIGN SYSTEM

### 6.1 Color Palette

**Primary Colors:**
- **Primary Blue**: #1976D2 (main actions, links, progress bars)
- **Success Green**: #388E3C (completed states, success messages)
- **Warning Orange**: #F57C00 (warnings, pending actions)
- **Error Red**: #D32F2F (errors, critical issues)
- **Info Blue**: #0288D1 (informational messages, help text)

**Neutral Colors:**
- **Dark Gray**: #212121 (primary text, headers)
- **Medium Gray**: #757575 (secondary text, labels)  
- **Light Gray**: #E0E0E0 (borders, dividers)
- **Background Gray**: #FAFAFA (page background)
- **White**: #FFFFFF (card backgrounds, modals)

**Status Colors:**
- **Processing**: #FF9800 (orange)
- **Complete**: #4CAF50 (green)
- **Issues**: #FF5722 (red-orange)
- **On Hold**: #9E9E9E (gray)

### 6.2 Typography Scale

**Font Family:** 
- Primary: 'Roboto', 'Segoe UI', 'Helvetica Neue', sans-serif
- Monospace: 'Roboto Mono', 'Consolas', monospace (for data display)

**Type Scale:**
- **H1 - Page Title**: 32px, Bold, Dark Gray
- **H2 - Section Header**: 24px, Medium, Dark Gray  
- **H3 - Subsection**: 20px, Medium, Dark Gray
- **H4 - Card Title**: 18px, Medium, Dark Gray
- **Body - Primary**: 16px, Regular, Dark Gray
- **Body - Secondary**: 14px, Regular, Medium Gray
- **Small Text**: 12px, Regular, Medium Gray
- **Button Text**: 14px, Medium, varies by context

### 6.3 Spacing & Layout Grid

**Base Spacing Unit**: 8px
- **XS**: 4px (tight spacing)
- **SM**: 8px (small spacing)
- **MD**: 16px (default spacing)
- **LG**: 24px (section spacing)
- **XL**: 32px (major section spacing)
- **XXL**: 48px (page-level spacing)

**Layout Grid:**
- **Container Max Width**: 1200px
- **Gutter Width**: 24px
- **Column Count**: 12 columns (responsive)
- **Breakpoints**: 768px (tablet), 1024px (desktop)

### 6.4 Component Styling Guidelines

**Cards:**
- Background: White
- Border: 1px solid Light Gray
- Border Radius: 8px
- Shadow: 0 2px 4px rgba(0,0,0,0.1)
- Padding: 24px

**Buttons:**
- **Primary**: Blue background, white text, 8px radius
- **Secondary**: White background, blue border and text
- **Danger**: Red background, white text
- **Ghost**: Transparent background, colored text
- Height: 40px minimum, 16px padding

**Form Elements:**
- **Input Fields**: White background, light gray border, 8px radius
- **Focus State**: Blue border, subtle shadow
- **Error State**: Red border, red helper text
- **Success State**: Green border, green helper text
- Height: 40px, 12px padding

---

## 7. INTERACTION PATTERNS

### 7.1 Loading States

**Page Loading:**
- Full-page skeleton screens showing content structure
- Progressive loading of components
- Loading indicators for async operations
- Graceful fallbacks for slow connections

**Component Loading:**
- Skeleton placeholders matching final content structure
- Shimmer animations for visual interest
- Contextual loading messages
- Cancel options for long operations

**Button Loading:**
- Spinner inside button, disabled state
- Loading text change ("Processing..." instead of "Submit")
- Prevents multiple submissions
- Clear completion feedback

### 7.2 Hover & Focus States

**Interactive Elements:**
- **Buttons**: Subtle background darkening (10%), transition 0.2s
- **Cards**: Elevation increase (shadow deepening), 0.3s transition
- **Links**: Underline appearance, color darkening
- **Form Inputs**: Border color change to blue, subtle shadow

**Accessibility:**
- All interactive elements have focus indicators
- Focus indicators are high contrast (minimum 3:1 ratio)
- Keyboard navigation follows logical tab order
- Skip links for screen readers

### 7.3 Micro-Interactions

**Success Feedback:**
- Checkmark animation for completed actions
- Brief color flash on status changes
- Subtle bounce animation for notifications
- Sound feedback (optional, user-controlled)

**Error Handling:**
- Shake animation for invalid inputs
- Red color flash for error states
- Clear error messages with suggested fixes
- Automatic error clearing on valid input

**Progress Indication:**
- Smooth progress bar animations
- Percentage updates in real-time
- Phase transition animations
- Completion celebrations (brief, non-intrusive)

### 7.4 Data Loading & Error States

**Empty States:**
- Friendly illustrations with helpful text
- Clear calls-to-action to get started
- Context-appropriate messaging
- Optional onboarding hints

**Error States:**
- Clear error descriptions
- Suggested resolution steps
- "Try Again" actions where appropriate
- Contact support options for persistent errors

**No Results:**
- "No results found" with search criteria summary
- Suggestions for broadening search
- Related content recommendations
- Clear filters/reset options

---

## 8. ACCESSIBILITY CONSIDERATIONS

### 8.1 WCAG 2.1 AA Compliance

**Color & Contrast:**
- Minimum 4.5:1 contrast ratio for normal text
- Minimum 3:1 ratio for large text (18px+)
- Color not the only indicator of meaning
- High contrast mode compatibility

**Keyboard Navigation:**
- All functionality accessible via keyboard
- Logical tab order through interface
- Visual focus indicators for all interactive elements
- Escape key closes modals and dropdowns

**Screen Reader Support:**
- Semantic HTML structure with proper headings
- Alt text for all meaningful images
- ARIA labels for complex interactions
- Live regions for dynamic content updates

### 8.2 Inclusive Design Features

**Motor Accessibility:**
- Large click targets (minimum 44x44px)
- Generous spacing between interactive elements
- Drag and drop with keyboard alternatives
- Timeout extensions for timed actions

**Cognitive Accessibility:**
- Clear, consistent navigation patterns
- Simple language in instructions
- Progress indicators for multi-step processes
- Help text and tooltips for complex features

**Visual Accessibility:**
- Scalable text up to 200% without horizontal scrolling
- High contrast theme option
- Reduced motion option for animations
- Customizable font sizes

### 8.3 Internationalization Readiness

**Text & Language:**
- Externalized strings for easy translation
- Support for right-to-left languages
- Proper date/number formatting by locale
- Cultural considerations for color meanings

**Layout Flexibility:**
- Flexible layouts that accommodate text expansion
- Icon-based navigation supplements text
- Responsive design across different writing systems
- Currency and number format localization

---

## 9. VUE 3 FRONTEND INTEGRATION SPECIFICATIONS

### 9.1 Frontend Architecture & Backend Integration

**Technology Stack:**
- **Framework**: Vite + Vue 3 Composition API (lightweight, modern)
- **Styling**: Tailwind CSS with custom component classes
- **State Management**: Local component state only (no Vuex)
- **HTTP Client**: Native Fetch API with async/await
- **Progress Updates**: Server-Sent Events (SSE) for real-time feedback
- **Build**: Single Vite build command, outputs static files
- **Testing**: Vitest + Vue Testing Library

**Enhanced Project Structure:**
```
frontend/
├── src/
│   ├── components/
│   │   ├── core/
│   │   │   ├── FileUpload.vue      # Drag-drop with backend integration
│   │   │   ├── ProgressTracker.vue # SSE-powered real-time updates
│   │   │   ├── SessionSetup.vue    # Session configuration with delta detection
│   │   │   └── ResultsDisplay.vue  # Smart grouping and export actions
│   │   ├── shared/
│   │   │   ├── DataTable.vue       # Reusable table with sorting/filtering
│   │   │   ├── LoadingSpinner.vue  # Consistent loading states
│   │   │   ├── NotificationToast.vue # User feedback messages
│   │   │   └── ActionButton.vue    # Standardized button component
│   │   └── admin/
│   │       ├── AdminPanel.vue      # Admin-only system overview
│   │       ├── SystemHealth.vue    # Health monitoring display
│   │       └── UserSessions.vue    # All user session management
│   ├── composables/
│   │   ├── useApi.js              # Centralized API communication
│   │   ├── useFileUpload.js       # File handling with validation
│   │   ├── useProgressTracking.js # SSE progress management
│   │   ├── useAuth.js             # Windows auth integration
│   │   ├── useSessionManagement.js # Session CRUD operations
│   │   └── useResultsProcessing.js # Results grouping logic
│   ├── services/
│   │   ├── api/
│   │   │   ├── sessions.js        # Session API endpoints
│   │   │   ├── files.js           # File upload/management
│   │   │   ├── processing.js      # Processing control
│   │   │   ├── results.js         # Results and exports
│   │   │   └── admin.js          # Admin endpoints
│   │   ├── sse.js                # Server-Sent Events handling
│   │   ├── validation.js         # Client-side validation
│   │   └── storage.js            # Local storage management
│   ├── utils/
│   │   ├── formatting.js         # Data formatting utilities
│   │   ├── constants.js          # App constants and enums
│   │   ├── errorHandling.js      # Error processing utilities
│   │   └── accessibility.js      # A11y helper functions
│   ├── styles/
│   │   ├── components.css        # Component-specific styles
│   │   ├── utilities.css         # Custom Tailwind utilities
│   │   └── themes.css           # Color themes and variables
│   └── App.vue                  # Single-page root component
├── dist/                        # Built static files
├── public/                      # Static assets
├── vite.config.js              # Vite configuration with proxy
└── tailwind.config.js          # Tailwind customization
```

### 9.2 Component Architecture & Data Flow

**Core Component Specifications:**

#### 9.2.1 FileUpload.vue - Drag & Drop with Backend Integration
```vue
<template>
  <div class="upload-container">
    <!-- CAR File Upload -->
    <div class="file-drop-zone" 
         :class="{ 'drag-active': dragActive.car, 'has-file': files.car }"
         @drop.prevent="handleDrop($event, 'car')"
         @dragover.prevent="dragActive.car = true"
         @dragleave="dragActive.car = false">
      
      <div v-if="!files.car" class="upload-prompt">
        <Icon name="upload" size="48" class="text-blue-500" />
        <h3>CAR Report (Required)</h3>
        <p>Drag PDF here or click to browse</p>
        <button class="btn-secondary" @click="openFilePicker('car')">
          Choose CAR File
        </button>
      </div>
      
      <div v-else class="file-status">
        <Icon name="check-circle" class="text-green-500" />
        <div class="file-info">
          <p class="file-name">{{ files.car.name }}</p>
          <p class="file-size">{{ formatFileSize(files.car.size) }}</p>
          <p class="upload-status" :class="uploadStatus.car.class">
            {{ uploadStatus.car.message }}
          </p>
        </div>
        <button class="btn-ghost" @click="removeFile('car')">Remove</button>
      </div>
      
      <!-- Upload Progress -->
      <div v-if="uploading.car" class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${uploadProgress.car}%` }"></div>
        </div>
        <p class="progress-text">{{ uploadProgress.car }}% uploaded</p>
      </div>
    </div>

    <!-- Receipt File Upload (Optional) -->
    <div class="file-drop-zone optional" 
         :class="{ 'drag-active': dragActive.receipt, 'has-file': files.receipt }">
      <!-- Similar structure for receipt file -->
    </div>
    
    <!-- Delta Recognition Alert -->
    <div v-if="deltaDetected" class="delta-alert">
      <Icon name="info" class="text-blue-500" />
      <div class="delta-info">
        <h4>Same files detected</h4>
        <p>These files match your previous session: {{ previousSessionName }}</p>
        <button class="btn-secondary" @click="enableDeltaMode">
          Process only changes
        </button>
      </div>
    </div>
    
    <!-- Processing Options -->
    <div class="processing-options">
      <label class="checkbox-label">
        <input type="checkbox" v-model="options.emailNotification" />
        Email notification on completion
      </label>
      <label class="checkbox-label">
        <input type="checkbox" v-model="options.detailedReport" />
        Generate detailed validation report
      </label>
      <label v-if="deltaMode" class="checkbox-label">
        <input type="checkbox" v-model="options.skipUnchanged" />
        Skip employees with no changes
      </label>
    </div>
    
    <!-- Action Button -->
    <button class="btn-primary large" 
            :disabled="!canStartProcessing"
            @click="startProcessing">
      {{ deltaMode ? 'Process Changes' : 'Start Processing' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useFileUpload } from '@/composables/useFileUpload'
import { useSessionManagement } from '@/composables/useSessionManagement'

// Composable integration
const { 
  uploadFile, 
  validateFile, 
  checkFileChecksum,
  uploadProgress,
  uploading 
} = useFileUpload()

const { 
  detectDeltaFiles, 
  createSession,
  sessionData 
} = useSessionManagement()

// Component state
const files = ref({ car: null, receipt: null })
const dragActive = ref({ car: false, receipt: false })
const deltaDetected = ref(false)
const deltaMode = ref(false)
const previousSessionName = ref('')

// Processing options
const options = ref({
  emailNotification: true,
  detailedReport: true,
  skipUnchanged: false
})

// File handling methods
const handleDrop = async (event, type) => {
  dragActive.value[type] = false
  const droppedFiles = Array.from(event.dataTransfer.files)
  const file = droppedFiles[0]
  
  if (await validateFile(file, type)) {
    files.value[type] = file
    await uploadFileWithProgress(file, type)
    await checkForDelta(file, type)
  }
}

const uploadFileWithProgress = async (file, type) => {
  uploading.value[type] = true
  try {
    const result = await uploadFile(file, type, {
      onProgress: (progress) => {
        uploadProgress.value[type] = progress
      }
    })
    
    // Update file metadata
    files.value[type].uploadResult = result
    uploadStatus.value[type] = {
      class: 'success',
      message: 'Upload successful'
    }
  } catch (error) {
    uploadStatus.value[type] = {
      class: 'error', 
      message: `Upload failed: ${error.message}`
    }
  } finally {
    uploading.value[type] = false
  }
}

const checkForDelta = async (file, type) => {
  const checksum = await checkFileChecksum(file)
  const deltaResult = await detectDeltaFiles(checksum, type)
  
  if (deltaResult.found) {
    deltaDetected.value = true
    previousSessionName.value = deltaResult.sessionName
  }
}

// Computed properties
const canStartProcessing = computed(() => {
  return files.value.car && 
         !uploading.value.car && 
         !uploading.value.receipt &&
         uploadStatus.value.car?.class === 'success'
})

// Emit events to parent
const emit = defineEmits(['processing-started', 'delta-enabled'])

const startProcessing = async () => {
  const processingConfig = {
    carFile: files.value.car.uploadResult,
    receiptFile: files.value.receipt?.uploadResult,
    options: options.value,
    deltaMode: deltaMode.value
  }
  
  emit('processing-started', processingConfig)
}
</script>
```

#### 9.2.2 ProgressTracker.vue - Real-Time SSE Integration
```vue
<template>
  <div class="progress-tracker" v-if="sessionId">
    <!-- Overall Progress -->
    <div class="progress-header">
      <h3>Processing: {{ sessionName }}</h3>
      <div class="progress-stats">
        <span class="stat-item">
          <Icon name="users" />
          {{ progress.completed }}/{{ progress.total }} employees
        </span>
        <span class="stat-item">
          <Icon name="clock" />
          {{ estimatedTimeRemaining }}
        </span>
      </div>
    </div>
    
    <!-- Progress Bar -->
    <div class="progress-bar-container">
      <div class="progress-bar large">
        <div class="progress-fill" 
             :style="{ width: `${progressPercentage}%` }"
             :class="progressStatus">
        </div>
      </div>
      <p class="progress-percentage">{{ progressPercentage }}%</p>
    </div>
    
    <!-- Current Employee -->
    <div class="current-employee" v-if="currentEmployee">
      <div class="employee-info">
        <h4>Currently Processing</h4>
        <p class="employee-name">{{ currentEmployee.name }}</p>
        <p class="employee-id">ID: {{ currentEmployee.id }}</p>
      </div>
      <div class="processing-animation">
        <div class="spinner"></div>
      </div>
    </div>
    
    <!-- Status Breakdown -->
    <div class="status-breakdown">
      <div class="status-item complete">
        <Icon name="check-circle" class="text-green-500" />
        <span class="status-count">{{ statusCounts.complete }}</span>
        <span class="status-label">Complete</span>
      </div>
      <div class="status-item processing">
        <Icon name="refresh" class="text-blue-500 animate-spin" />
        <span class="status-count">{{ statusCounts.processing }}</span>
        <span class="status-label">Processing</span>
      </div>
      <div class="status-item issues">
        <Icon name="alert-triangle" class="text-yellow-500" />
        <span class="status-count">{{ statusCounts.issues }}</span>
        <span class="status-label">Issues</span>
      </div>
      <div class="status-item pending">
        <Icon name="clock" class="text-gray-500" />
        <span class="status-count">{{ statusCounts.pending }}</span>
        <span class="status-label">Pending</span>
      </div>
    </div>
    
    <!-- Recent Activity -->
    <div class="recent-activity" v-if="showActivity">
      <h4>Recent Activity</h4>
      <div class="activity-feed">
        <div v-for="activity in recentActivities" 
             :key="activity.id" 
             class="activity-item"
             :class="activity.type">
          <Icon :name="activity.icon" :class="activity.iconClass" />
          <div class="activity-content">
            <p class="activity-message">{{ activity.message }}</p>
            <span class="activity-time">{{ formatTimeAgo(activity.timestamp) }}</span>
          </div>
        </div>
      </div>
      <button class="btn-ghost" @click="showFullLog = true">
        View Full Activity Log
      </button>
    </div>
    
    <!-- Control Buttons -->
    <div class="progress-controls">
      <button class="btn-secondary" @click="pauseProcessing" :disabled="!canPause">
        <Icon name="pause" />
        Pause
      </button>
      <button class="btn-danger" @click="cancelProcessing" :disabled="!canCancel">
        <Icon name="x" />
        Cancel
      </button>
      <button class="btn-primary" 
              @click="viewResults" 
              v-if="isCompleted"
              :disabled="!hasResults">
        <Icon name="bar-chart" />
        View Results
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useProgressTracking } from '@/composables/useProgressTracking'
import { formatTimeAgo, formatDuration } from '@/utils/formatting'

const props = defineProps({
  sessionId: String,
  sessionName: String,
  autoStart: { type: Boolean, default: true }
})

const emit = defineEmits(['processing-complete', 'processing-error', 'view-results'])

// Use composable for SSE integration
const {
  progress,
  currentEmployee,
  recentActivities,
  connectionStatus,
  startTracking,
  stopTracking,
  pauseProcessing,
  cancelProcessing
} = useProgressTracking(props.sessionId)

// Component state
const showActivity = ref(true)
const showFullLog = ref(false)

// Computed properties
const progressPercentage = computed(() => {
  if (!progress.value.total) return 0
  return Math.round((progress.value.completed / progress.value.total) * 100)
})

const progressStatus = computed(() => {
  if (progress.value.status === 'processing') return 'processing'
  if (progress.value.status === 'completed') return 'completed'
  if (progress.value.status === 'failed') return 'error'
  return 'default'
})

const statusCounts = computed(() => ({
  complete: progress.value.complete || 0,
  processing: progress.value.processing || 0,
  issues: progress.value.issues || 0,
  pending: progress.value.pending || 0
}))

const estimatedTimeRemaining = computed(() => {
  if (!progress.value.estimatedTimeRemaining) return 'Calculating...'
  return formatDuration(progress.value.estimatedTimeRemaining)
})

const isCompleted = computed(() => progress.value.status === 'completed')
const hasResults = computed(() => progress.value.hasResults)
const canPause = computed(() => ['processing'].includes(progress.value.status))
const canCancel = computed(() => ['processing', 'pending'].includes(progress.value.status))

// Lifecycle
onMounted(() => {
  if (props.autoStart && props.sessionId) {
    startTracking()
  }
})

onUnmounted(() => {
  stopTracking()
})

// Watch for completion
watch(() => progress.value.status, (newStatus) => {
  if (newStatus === 'completed') {
    emit('processing-complete', progress.value)
  } else if (newStatus === 'failed') {
    emit('processing-error', progress.value.error)
  }
})

// Methods
const viewResults = () => {
  emit('view-results', props.sessionId)
}
</script>
```

### 9.3 Real-Time Updates with Server-Sent Events

**SSE Implementation Pattern:**

```javascript
// composables/useProgressTracking.js
import { ref, reactive, onUnmounted } from 'vue'

export function useProgressTracking(sessionId) {
  const progress = ref({
    total: 0,
    completed: 0,
    processing: 0,
    issues: 0,
    pending: 0,
    status: 'pending',
    estimatedTimeRemaining: null,
    hasResults: false
  })
  
  const currentEmployee = ref(null)
  const recentActivities = ref([])
  const connectionStatus = ref('disconnected')
  
  let eventSource = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 5
  
  const startTracking = () => {
    if (!sessionId) return
    
    // Close existing connection
    stopTracking()
    
    // Create new EventSource connection
    eventSource = new EventSource(`/api/progress/${sessionId}`)
    connectionStatus.value = 'connecting'
    
    eventSource.onopen = () => {
      connectionStatus.value = 'connected'
      reconnectAttempts = 0
      console.log(`SSE connected for session: ${sessionId}`)
    }
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleProgressUpdate(data)
      } catch (error) {
        console.error('Error parsing SSE data:', error)
      }
    }
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      connectionStatus.value = 'error'
      
      // Attempt to reconnect
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++
        setTimeout(() => {
          console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})`)
          startTracking()
        }, 2000 * reconnectAttempts) // Exponential backoff
      }
    }
  }
  
  const stopTracking = () => {
    if (eventSource) {
      eventSource.close()
      eventSource = null
      connectionStatus.value = 'disconnected'
    }
  }
  
  const handleProgressUpdate = (data) => {
    // Update overall progress
    progress.value = {
      ...progress.value,
      ...data.progress
    }
    
    // Update current employee
    if (data.currentEmployee) {
      currentEmployee.value = data.currentEmployee
    }
    
    // Add new activities
    if (data.activity) {
      recentActivities.value.unshift({
        id: Date.now(),
        ...data.activity,
        timestamp: new Date()
      })
      
      // Keep only recent 10 activities
      if (recentActivities.value.length > 10) {
        recentActivities.value = recentActivities.value.slice(0, 10)
      }
    }
    
    // Handle completion
    if (data.progress.status === 'completed') {
      progress.value.hasResults = true
      currentEmployee.value = null
      
      // Show completion notification
      showNotification('Processing completed successfully!', 'success')
    }
    
    // Handle errors
    if (data.progress.status === 'failed') {
      showNotification(`Processing failed: ${data.error}`, 'error')
    }
  }
  
  const pauseProcessing = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/pause`, {
        method: 'POST'
      })
      if (response.ok) {
        showNotification('Processing paused', 'info')
      }
    } catch (error) {
      console.error('Error pausing processing:', error)
    }
  }
  
  const cancelProcessing = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/cancel`, {
        method: 'POST'
      })
      if (response.ok) {
        stopTracking()
        showNotification('Processing cancelled', 'warning')
      }
    } catch (error) {
      console.error('Error cancelling processing:', error)
    }
  }
  
  // Cleanup on unmount
  onUnmounted(() => {
    stopTracking()
  })
  
  return {
    progress,
    currentEmployee,
    recentActivities,
    connectionStatus,
    startTracking,
    stopTracking,
    pauseProcessing,
    cancelProcessing
  }
}

// utils/notifications.js
function showNotification(message, type = 'info') {
  // Implementation depends on notification system
  console.log(`[${type.toUpperCase()}] ${message}`)
}
```

### 9.4 Vue 3 Composables for Backend Integration

#### 9.4.1 useFileUpload.js - File Handling & Validation
```javascript
import { ref, computed } from 'vue'
import { validateFileSize, validateFileType, calculateChecksum } from '@/utils/validation'

export function useFileUpload() {
  const uploadProgress = ref({ car: 0, receipt: 0 })
  const uploading = ref({ car: false, receipt: false })
  const uploadStatus = ref({ car: null, receipt: null })
  
  const validateFile = async (file, type) => {
    const errors = []
    
    // Validate file type
    if (!validateFileType(file.name)) {
      errors.push('Only PDF files are allowed')
    }
    
    // Validate file size (100MB limit)
    if (!validateFileSize(file.size, 100 * 1024 * 1024)) {
      errors.push('File size must be less than 100MB')
    }
    
    // Additional validations specific to file type
    if (type === 'car' && file.name.toLowerCase().includes('receipt')) {
      errors.push('This appears to be a receipt file, please use the Receipt upload area')
    }
    
    if (errors.length > 0) {
      uploadStatus.value[type] = {
        class: 'error',
        message: errors.join(', ')
      }
      return false
    }
    
    return true
  }
  
  const uploadFile = async (file, type, options = {}) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    formData.append('filename', file.name)
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        // Add progress tracking if supported
        onUploadProgress: (progressEvent) => {
          if (options.onProgress) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            uploadProgress.value[type] = progress
            options.onProgress(progress)
          }
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Upload failed')
      }
      
      const result = await response.json()
      return result
      
    } catch (error) {
      console.error(`Upload failed for ${type}:`, error)
      throw error
    }
  }
  
  const checkFileChecksum = async (file) => {
    return await calculateChecksum(file)
  }
  
  const removeFile = (type) => {
    uploadProgress.value[type] = 0
    uploading.value[type] = false
    uploadStatus.value[type] = null
  }
  
  const resetUpload = () => {
    uploadProgress.value = { car: 0, receipt: 0 }
    uploading.value = { car: false, receipt: false }
    uploadStatus.value = { car: null, receipt: null }
  }
  
  return {
    uploadProgress,
    uploading,
    uploadStatus,
    validateFile,
    uploadFile,
    checkFileChecksum,
    removeFile,
    resetUpload
  }
}
```

#### 9.4.2 useSessionManagement.js - Session Operations
```javascript
import { ref, computed } from 'vue'
import { useApi } from './useApi'

export function useSessionManagement() {
  const { get, post, put, del } = useApi()
  
  const sessions = ref([])
  const currentSession = ref(null)
  const loading = ref(false)
  const error = ref(null)
  
  const createSession = async (sessionData) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await post('/api/sessions', {
        session_name: sessionData.name,
        description: sessionData.description,
        processing_config: sessionData.config,
        parent_session_id: sessionData.parentSessionId
      })
      
      currentSession.value = response.data
      return response.data
      
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const loadSessions = async (limit = 10) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await get(`/api/sessions?limit=${limit}`)
      sessions.value = response.data
      return response.data
      
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const loadSession = async (sessionId) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await get(`/api/sessions/${sessionId}`)
      currentSession.value = response.data
      return response.data
      
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const detectDeltaFiles = async (checksum, fileType) => {
    try {
      const response = await post('/api/sessions/detect-delta', {
        checksum,
        file_type: fileType
      })
      
      return response.data
      
    } catch (err) {
      console.error('Delta detection failed:', err)
      return { found: false }
    }
  }
  
  const createRevisionSession = async (parentSessionId, newFiles) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await post(`/api/sessions/${parentSessionId}/revision`, {
        files: newFiles,
        processing_config: {
          skip_unchanged: true,
          delta_processing: true
        }
      })
      
      currentSession.value = response.data
      return response.data
      
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const startProcessing = async (sessionId, processingConfig) => {
    try {
      const response = await post(`/api/sessions/${sessionId}/process`, {
        config: processingConfig
      })
      
      return response.data
      
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  // Computed properties
  const recentSessions = computed(() => 
    sessions.value.slice(0, 5)
  )
  
  const hasActiveSessions = computed(() => 
    sessions.value.some(s => s.status === 'processing')
  )
  
  const sessionsByStatus = computed(() => {
    return sessions.value.reduce((acc, session) => {
      if (!acc[session.status]) {
        acc[session.status] = []
      }
      acc[session.status].push(session)
      return acc
    }, {})
  })
  
  return {
    sessions,
    currentSession,
    loading,
    error,
    recentSessions,
    hasActiveSessions,
    sessionsByStatus,
    createSession,
    loadSessions,
    loadSession,
    detectDeltaFiles,
    createRevisionSession,
    startProcessing
  }
}
```

#### 9.4.3 useResultsProcessing.js - Results Display & Export
```javascript
import { ref, computed } from 'vue'
import { useApi } from './useApi'

export function useResultsProcessing(sessionId) {
  const { get, post } = useApi()
  
  const results = ref([])
  const summary = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const exporting = ref(false)
  
  const loadResults = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await get(`/api/results/${sessionId}`)
      results.value = response.data.employees
      summary.value = response.data.summary
      return response.data
      
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const exportResults = async (exportType, options = {}) => {
    exporting.value = true
    
    try {
      let endpoint = `/api/export/${sessionId}/`
      
      switch (exportType) {
        case 'pvault':
          endpoint += 'pvault'
          break
        case 'followup':
          endpoint += 'followup'
          break
        case 'issues':
          endpoint += 'issues'
          break
        default:
          throw new Error('Invalid export type')
      }
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/octet-stream'
        }
      })
      
      if (!response.ok) {
        throw new Error('Export failed')
      }
      
      // Download file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition')
      let filename = `${exportType}-${sessionId}.csv`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]*)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      link.download = filename
      link.click()
      
      window.URL.revokeObjectURL(url)
      
      return true
      
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      exporting.value = false
    }
  }
  
  const resolveIssue = async (employeeId, resolution) => {
    try {
      const response = await post(`/api/results/${sessionId}/employees/${employeeId}/resolve`, {
        resolution: resolution.type,
        notes: resolution.notes,
        resolved_by: resolution.resolvedBy
      })
      
      // Update local results
      const employeeIndex = results.value.findIndex(emp => emp.revision_id === employeeId)
      if (employeeIndex !== -1) {
        results.value[employeeIndex] = response.data
      }
      
      return response.data
      
    } catch (err) {
      error.value = err.message
      throw err
    }
  }
  
  // Smart grouping computed properties
  const readyForExport = computed(() => 
    results.value.filter(employee => 
      employee.status === 'finished' && !employee.has_issues
    )
  )
  
  const needsAttention = computed(() => 
    results.value.filter(employee => 
      employee.has_issues || employee.status === 'issues'
    )
  )
  
  const issuesByType = computed(() => {
    const issues = {}
    
    needsAttention.value.forEach(employee => {
      if (employee.validation_flags) {
        Object.keys(employee.validation_flags).forEach(flagType => {
          if (!issues[flagType]) {
            issues[flagType] = []
          }
          issues[flagType].push(employee)
        })
      }
    })
    
    return issues
  })
  
  const deltaComparison = computed(() => {
    if (!summary.value?.delta_info) return null
    
    return {
      unchanged: summary.value.delta_info.unchanged_count,
      changed: summary.value.delta_info.changed_count,
      new: summary.value.delta_info.new_count,
      removed: summary.value.delta_info.removed_count
    }
  })
  
  return {
    results,
    summary,
    loading,
    error,
    exporting,
    readyForExport,
    needsAttention,
    issuesByType,
    deltaComparison,
    loadResults,
    exportResults,
    resolveIssue
  }
}
```

**Implementation Pattern:**
```javascript
// Vue 3 Composable for progress tracking
import { ref, onMounted, onUnmounted } from 'vue'

export function useProcessingProgress(sessionId) {
  const progress = ref(null)
  let eventSource = null
  
  const startListening = () => {
    eventSource = new EventSource(`/api/progress/${sessionId}`)
    
    eventSource.onmessage = (event) => {
      progress.value = JSON.parse(event.data)
    }
    
    eventSource.onerror = () => {
      console.log('Connection lost, will retry...')
    }
  }
  
  onMounted(startListening)
  onUnmounted(() => eventSource?.close())
  
  return { progress }
}
```

### 9.3 Performance Optimization

**Build Optimization:**
- Single bundle output with Vite's tree-shaking
- Automatic code splitting for large components
- Built-in asset optimization (images, CSS, JS)
- Development hot-reload for fast iteration

**Data Management:**
- Simple fetch API with error handling
- Optimistic UI updates for better perceived performance
- Local component state with Vue 3 reactivity
- Minimal caching for processing status

**Asset Strategy:**
- SVG icons for scalability
- Tailwind CSS for consistent styling
- Minimal JavaScript bundle (<200KB)
- Static file serving from FastAPI

### 9.4 API Integration

**RESTful API Design:**
- Consistent endpoint naming conventions
- Proper HTTP status codes
- Standardized error response format
- Request/response logging for debugging

**Error Handling:**
- Global error boundary for unhandled errors
- Specific error handling for API failures
- User-friendly error messages
- Automatic retry for transient failures

**Authentication Flow:**
```typescript
// Windows Username-based authentication
export const useWindowsAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    // Get username from server (which reads from Windows environment)
    const fetchUser = async () => {
      const response = await fetch('/api/auth/current-user');
      const userData = await response.json();
      setUser({
        username: userData.username,
        isAdmin: userData.isAdmin // Based on predefined admin list
      });
    };
    
    fetchUser();
  }, []);
  
  return { user };
};
```

---

## 10. TESTING & VALIDATION STRATEGY

### 10.1 Usability Testing Plan

**Test Scenarios:**
1. **First-Time User Experience**
   - Can new users complete basic upload and processing?
   - How long does it take to understand the interface?
   - What are the common confusion points?

2. **Power User Efficiency**  
   - Can experienced users complete tasks quickly?
   - Are advanced features discoverable?
   - Does the interface support efficient workflows?

3. **Error Recovery**
   - How do users handle upload failures?
   - Can users understand and resolve validation issues?
   - Is error messaging clear and actionable?

**Testing Methodology:**
- Task-based testing with real user scenarios
- Think-aloud protocol to understand user reasoning
- A/B testing for critical interface decisions
- Analytics tracking for user behavior patterns

### 10.2 Accessibility Testing

**Automated Testing:**
- axe-core integration in CI/CD pipeline
- Lighthouse accessibility audits
- Color contrast validation tools
- Keyboard navigation testing

**Manual Testing:**
- Screen reader testing (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation testing
- High contrast mode validation
- Zoom testing up to 200%

**User Testing:**
- Testing with actual users with disabilities
- Feedback incorporation into design iterations
- Ongoing accessibility review process
- Regular accessibility training for team

### 10.3 Cross-Browser & Device Testing

**Browser Support:**
- Chrome 90+ (primary target)
- Firefox 88+ (secondary target)  
- Safari 14+ (secondary target)
- Edge 90+ (secondary target)

**Device Testing:**
- Desktop: 1920x1080, 1366x768, 2560x1440
- Tablet: iPad (1024x768), Surface (1368x912)
- Various DPI settings and zoom levels
- Touch vs. mouse interaction patterns

---

## 11. IMPLEMENTATION ROADMAP

### 11.1 Phase 1: Core Interface (Weeks 1-4)

**Sprint 1 (Weeks 1-2): Foundation**
- Set up React + TypeScript + MUI project structure
- Implement Windows username authentication
- Create single-page layout with progressive sections
- Build session setup section

**Sprint 2 (Weeks 3-4): Upload & Processing**
- Implement dual file upload interface
- Create progressive processing section
- Build employee-level progress tracking
- Integration with backend API

### 11.2 Phase 2: Advanced Features (Weeks 5-8)

**Sprint 3 (Weeks 5-6): Smart Features**
- Implement delta recognition system
- Build smart results grouping
- Create inline issue resolution
- Add contextual progress indicators

**Sprint 4 (Weeks 7-8): Export & Admin**
- Implement action-oriented export buttons
- Build admin tools section
- Create pVault file generation
- Add follow-up list functionality

### 11.3 Phase 3: Polish & Optimization (Weeks 9-12)

**Sprint 5 (Weeks 9-10): User Experience**
- Conduct usability testing
- Implement accessibility improvements
- Performance optimization
- Mobile responsiveness (tablet focus)

**Sprint 6 (Weeks 11-12): Production Ready**
- Security review and hardening
- Load testing and optimization
- Documentation completion
- Deployment and monitoring setup

---

## 12. SUCCESS METRICS

### 12.1 User Experience Metrics

**Efficiency Metrics:**
- **Task Completion Time**: <5 minutes for standard report processing
- **Error Rate**: <5% for file uploads and processing initiation
- **User Satisfaction**: >4.5/5.0 in post-use surveys
- **Feature Discovery**: >80% of users find advanced features within 3 sessions

**Adoption Metrics:**
- **User Onboarding**: >90% complete first successful processing within 24 hours
- **Return Usage**: >75% of users return within one week
- **Feature Utilization**: >60% use revision tracking features
- **Support Requests**: <10% of users require support assistance

### 12.2 System Performance Metrics

**Response Time Targets:**
- **Page Load**: <3 seconds for initial page load
- **File Upload**: <30 seconds for 50MB files
- **Processing Start**: <5 seconds from upload completion
- **Results Display**: <2 seconds after processing completion

**Reliability Targets:**
- **Uptime**: 99.9% availability during business hours
- **Error Rate**: <1% for successful uploads
- **Data Accuracy**: >99% parsing accuracy compared to manual review
- **Recovery Time**: <1 hour for service restoration

### 12.3 Business Impact Metrics

**Process Improvement:**
- **Processing Speed**: 70% reduction in manual processing time
- **Error Reduction**: 85% fewer manual data entry errors  
- **Compliance**: 95% of reports meet compliance requirements
- **Audit Trail**: 100% of changes tracked for audit purposes

**Cost Effectiveness:**
- **User Productivity**: 40% increase in reports processed per user
- **Training Time**: 60% reduction in user training requirements
- **Support Costs**: 50% reduction in help desk tickets
- **IT Maintenance**: 30% reduction in system maintenance overhead

---

## CONCLUSION

This UI/UX design specification provides a comprehensive blueprint for transforming the Credit Card Processor from a desktop application into a modern, web-based enterprise system. The design prioritizes user experience while maintaining the robust functionality required for corporate expense processing.

**Key Design Principles Achieved:**

1. **Single-Page Simplicity**: Eliminates navigation complexity with progressive disclosure
2. **User-Centered Progress**: Employee-level tracking instead of generic percentages
3. **Smart Recognition**: Delta detection when same files are processed again
4. **Action-Oriented Interface**: Export buttons clearly labeled for specific tasks
5. **Contextual Grouping**: Results organized by employee status with embedded actions
6. **Seamless Authentication**: Windows username integration with VPN security

The design transforms complex multi-step processing into a guided, single-page experience. Progressive disclosure reveals functionality as needed while smart grouping and delta recognition reduce cognitive load and processing time.

**Next Steps:**
1. Review and approve design specifications with stakeholders
2. Create high-fidelity mockups for key user flows
3. Begin frontend development following the technical implementation notes
4. Conduct regular design reviews and usability testing throughout development
5. Plan for iterative improvements based on user feedback post-launch

This streamlined design specification creates a focused, efficient expense processing system that eliminates interface complexity while enhancing core functionality through smart recognition, contextual progress tracking, and action-oriented interactions.

---

**Document Version**: 1.0  
**Date**: August 28, 2025  
**Status**: Ready for Development