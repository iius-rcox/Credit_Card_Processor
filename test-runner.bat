@echo off
setlocal enabledelayedexpansion

REM Credit Card Processor - Test Runner Script (Windows)
REM This script provides an easy way to run different test configurations

set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Function to print colored output
:print_status
echo %BLUE%[INFO]%NC% %~1
goto :eof

:print_success
echo %GREEN%[SUCCESS]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:print_error
echo %RED%[ERROR]%NC% %~1
goto :eof

REM Function to check if Docker is running
:check_docker
docker info >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker is not running. Please start Docker and try again."
    exit /b 1
)
call :print_success "Docker is running"
goto :eof

REM Function to check if containers are running
:check_containers
docker-compose ps --services --filter "status=running" | findstr "frontend backend" >nul
if errorlevel 1 (
    call :print_warning "Required containers are not running. Starting them..."
    docker-compose up -d
    call :print_status "Waiting for services to be ready..."
    timeout /t 10 /nobreak >nul
) else (
    call :print_success "Required containers are running"
)
goto :eof

REM Function to check if services are accessible
:check_services
call :print_status "Checking service accessibility..."

REM Check frontend
curl -f http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    call :print_error "Frontend is not accessible at http://localhost:3000"
    exit /b 1
) else (
    call :print_success "Frontend is accessible at http://localhost:3000"
)

REM Check backend
curl -f http://localhost:8001/health >nul 2>&1
if errorlevel 1 (
    call :print_error "Backend is not accessible at http://localhost:8001"
    exit /b 1
) else (
    call :print_success "Backend is accessible at http://localhost:8001"
)
goto :eof

REM Function to install dependencies
:install_dependencies
call :print_status "Installing dependencies..."
call npm install
call :print_status "Installing Playwright browsers..."
call npx playwright install
call :print_success "Dependencies installed"
goto :eof

REM Function to run tests
:run_tests
set "test_command=%~1"
set "test_name=%~2"
call :print_status "Running %test_name%..."
echo Command: %test_command%
echo ----------------------------------------
call %test_command%
if errorlevel 1 (
    call :print_error "%test_name% failed!"
    exit /b 1
) else (
    call :print_success "%test_name% completed successfully!"
)
goto :eof

REM Function to show help
:show_help
echo Credit Card Processor - Test Runner
echo ==================================
echo.
echo Usage: %~nx0 [OPTION]
echo.
echo Options:
echo   all                 Run all tests
echo   complete           Run complete functionality tests
echo   session            Run session management tests
echo   modals             Run modal functionality tests
echo   api                Run API integration tests
echo   phase4             Run Phase 4 functionality tests
echo   smoke              Run smoke tests
echo   regression         Run regression tests
echo   critical           Run critical tests
echo   browsers           Run tests on all browsers
echo   mobile             Run mobile tests
echo   headed             Run tests with visible browser
echo   debug              Run tests in debug mode
echo   ui                 Run tests in UI mode
echo   report             Show test report
echo   clean              Clean test artifacts
echo   setup              Setup test environment
echo   check              Check environment only
echo   help               Show this help message
echo.
echo Examples:
echo   %~nx0 all             # Run all tests
echo   %~nx0 smoke           # Run smoke tests
echo   %~nx0 headed          # Run with visible browser
echo   %~nx0 debug           # Run in debug mode
goto :eof

REM Main script logic
:main
if "%1"=="" set "1=help"
if "%1"=="all" goto :run_all
if "%1"=="complete" goto :run_complete
if "%1"=="session" goto :run_session
if "%1"=="modals" goto :run_modals
if "%1"=="api" goto :run_api
if "%1"=="phase4" goto :run_phase4
if "%1"=="smoke" goto :run_smoke
if "%1"=="regression" goto :run_regression
if "%1"=="critical" goto :run_critical
if "%1"=="browsers" goto :run_browsers
if "%1"=="mobile" goto :run_mobile
if "%1"=="headed" goto :run_headed
if "%1"=="debug" goto :run_debug
if "%1"=="ui" goto :run_ui
if "%1"=="report" goto :run_report
if "%1"=="clean" goto :run_clean
if "%1"=="setup" goto :run_setup
if "%1"=="check" goto :run_check
if "%1"=="help" goto :show_help
if "%1"=="-h" goto :show_help
if "%1"=="--help" goto :show_help
call :print_error "Unknown option: %1"
goto :show_help

:run_all
call :check_docker
call :check_containers
call :check_services
call :run_tests "npm test" "All Tests"
goto :eof

:run_complete
call :check_docker
call :check_containers
call :check_services
call :run_tests "npm run test:complete" "Complete Functionality Tests"
goto :eof

:run_session
call :check_docker
call :check_containers
call :check_services
call :run_tests "npm run test:session-management" "Session Management Tests"
goto :eof

:run_modals
call :check_docker
call :check_containers
call :check_services
call :run_tests "npm run test:modals" "Modal Functionality Tests"
goto :eof

:run_api
call :check_docker
call :check_containers
call :check_services
call :run_tests "npm run test:api" "API Integration Tests"
goto :eof

:run_phase4
call :check_docker
call :check_containers
call :check_services
call :run_tests "npm run test:phase4" "Phase 4 Functionality Tests"
goto :eof

:run_smoke
call :check_docker
call :check_containers
call :check_services
call :run_tests "npm run test:smoke" "Smoke Tests"
goto :eof

:run_regression
call :check_docker
call :check_containers
call :check_services
call :run_tests "npm run test:regression" "Regression Tests"
goto :eof

:run_critical
call :check_docker
call :check_containers
call :check_services
call :run_tests "npm run test:critical" "Critical Tests"
goto :eof

:run_browsers
call :check_docker
call :check_containers
call :check_services
call :run_tests "npm run test:all-browsers" "All Browsers Tests"
goto :eof

:run_mobile
call :check_docker
call :check_containers
call :check_services
call :run_tests "npm run test:mobile" "Mobile Tests"
goto :eof

:run_headed
call :check_docker
call :check_containers
call :check_services
call :run_tests "npm run test:headed" "Headed Tests"
goto :eof

:run_debug
call :check_docker
call :check_containers
call :check_services
call :run_tests "npm run test:debug" "Debug Tests"
goto :eof

:run_ui
call :check_docker
call :check_containers
call :check_services
call :run_tests "npm run test:ui" "UI Tests"
goto :eof

:run_report
call :print_status "Opening test report..."
call npm run test:report
goto :eof

:run_clean
call :print_status "Cleaning test artifacts..."
call npm run test:clean
call :print_success "Test artifacts cleaned"
goto :eof

:run_setup
call :print_status "Setting up test environment..."
call :check_docker
call :install_dependencies
call :check_containers
call :check_services
call :print_success "Test environment setup complete"
goto :eof

:run_check
call :print_status "Checking environment..."
call :check_docker
call :check_containers
call :check_services
call :print_success "Environment check complete"
goto :eof

REM Run main function
call :main %*


