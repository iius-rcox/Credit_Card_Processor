# Credit Card Processor Frontend

A modern Vue 3 frontend application for processing PDF credit card statements. Built with Vue 3 Composition API, Pinia for state management, and Tailwind CSS for styling.

## Features

- **PDF Upload & Processing**: Upload multiple PDF files for credit card statement processing
- **Real-time Progress Tracking**: Visual feedback during file processing
- **Session Management**: Organized workflow with session-based processing
- **Export Functionality**: Download processed results in various formats
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Modern Architecture**: Vue 3 Composition API with TypeScript-ready JSDoc annotations

## Tech Stack

- **Vue 3** - Progressive JavaScript framework with Composition API
- **Pinia** - Lightweight state management for Vue
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Vitest** - Fast unit testing framework
- **ESLint + Prettier** - Code quality and formatting tools

## Prerequisites

- Node.js 18+
- npm 9+
- Backend server running on `http://localhost:8000`

## Quick Start

1. **Clone and navigate to the frontend directory**:

   ```bash
   cd frontend
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Start the development server**:

   ```bash
   npm run dev
   ```

4. **Open your browser to `http://localhost:3000`**

## Available Scripts

### Development

```bash
npm run dev          # Start development server on port 3000
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Testing

```bash
npm run test         # Run unit tests with Vitest
npm run test:ui      # Run tests with interactive UI
npm run test:coverage # Generate test coverage report
```

### Code Quality

```bash
npm run lint         # Run ESLint and auto-fix issues
npm run lint:check   # Check for linting errors without fixing
npm run format       # Format code with Prettier
npm run format:check # Check if code is properly formatted
```

## Project Structure

```
frontend/
├── src/
│   ├── components/           # Reusable Vue components
│   │   ├── ExportActions.vue    # Export functionality UI
│   │   ├── FileUpload.vue       # File upload interface
│   │   ├── ProgressTracker.vue  # Processing progress display
│   │   └── ResultsDisplay.vue   # Results visualization
│   ├── composables/          # Composition API utilities
│   │   ├── useApi.js           # API communication logic
│   │   ├── useFileUpload.js    # File upload management
│   │   └── useProgress.js      # Progress tracking utilities
│   ├── stores/              # Pinia state stores
│   │   ├── session.js          # Session management store
│   │   └── session.test.js     # Unit tests for session store
│   ├── styles/              # Global styles and Tailwind config
│   │   └── main.css            # Main stylesheet with Tailwind imports
│   ├── App.vue              # Root Vue component
│   └── main.js              # Application entry point
├── tests/                   # Additional test files (if needed)
├── dist/                    # Production build output
├── index.html              # HTML template
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration with proxy setup
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration
├── .eslintrc.js           # ESLint configuration
├── .prettierrc            # Prettier configuration
└── README.md              # This file
```

## Development Workflow

### 1. Component Development

- All components follow Vue 3 Composition API patterns
- Components are organized by functionality in the `components/` directory
- Use TypeScript-style JSDoc comments for better IDE support

### 2. State Management

- Pinia stores handle application state
- Session store manages the complete processing workflow
- Composables provide reusable logic for components

### 3. Styling Approach

- Tailwind CSS for utility-based styling
- Custom classes defined in `tailwind.config.js`
- Mobile-first responsive design principles

### 4. Testing Strategy

- Unit tests for all stores and critical functions
- Component testing with Vue Test Utils
- Coverage reporting with Vitest

## Tailwind Custom Classes

The application uses several custom Tailwind utility classes:

```css
/* Custom button variants */
.btn-primary    # Primary action buttons
.btn-secondary  # Secondary action buttons
.btn-danger     # Destructive actions

/* Custom form elements */
.form-input     # Standardized input styling
.form-select    # Dropdown styling

/* Status indicators */
.status-idle    # Idle state styling
.status-processing # Processing state styling
.status-completed  # Completed state styling
.status-error   # Error state styling
```

## API Integration

The frontend communicates with the backend through a proxy configuration in `vite.config.js`:

```javascript
// All /api requests are proxied to http://localhost:8000
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
    secure: false
  }
}
```

### Key API Endpoints Used:

- `POST /api/sessions` - Create new processing session
- `POST /api/upload` - Upload PDF files
- `POST /api/process` - Start processing uploaded files
- `GET /api/results/{session_id}` - Retrieve processing results
- `GET /api/export/{session_id}` - Export processed data

## Configuration Files

### Vite Configuration (`vite.config.js`)

- Development server on port 3000
- API proxy to backend
- Vitest testing configuration
- Build optimization settings

### ESLint Configuration (`.eslintrc.js`)

- Vue 3 specific rules
- Prettier integration
- Test environment support
- Custom rule overrides for development

### Prettier Configuration (`.prettierrc`)

- Consistent code formatting
- Vue SFC support
- 2-space indentation
- Single quotes preference

## Troubleshooting

### Common Issues

**Development server won't start:**

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**API calls failing:**

- Ensure backend server is running on `http://localhost:8000`
- Check proxy configuration in `vite.config.js`
- Verify CORS settings on the backend

**Linting errors:**

```bash
# Auto-fix most linting issues
npm run lint

# Check specific file
npx eslint src/components/MyComponent.vue --fix
```

**Test failures:**

```bash
# Run tests in watch mode
npm run test -- --watch

# Run specific test file
npm run test src/stores/session.test.js
```

**Build issues:**

```bash
# Clear Vite cache
rm -rf .vite node_modules/.cache
npm install
npm run build
```

### Performance Optimization

- Use `v-memo` for expensive list renderings
- Implement lazy loading for large components
- Optimize Tailwind CSS bundle size with purging
- Use Vite's code splitting for better load times

### Browser Support

- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- ES2022 features supported
- CSS Grid and Flexbox required

## Contributing

1. Follow the existing code style (ESLint + Prettier)
2. Write tests for new functionality
3. Update JSDoc comments for new functions
4. Ensure all scripts pass:
   ```bash
   npm run lint && npm run test && npm run build
   ```

## Production Deployment

1. **Build the application**:

   ```bash
   npm run build
   ```

2. **Serve the `dist/` directory** with any static file server

3. **Environment considerations**:
   - Update API proxy target for production backend
   - Configure proper CORS headers
   - Set up HTTPS for production use

The built application is a standard SPA that can be deployed to any static hosting service (Netlify, Vercel, AWS S3, etc.).
