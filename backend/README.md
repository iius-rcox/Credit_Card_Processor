# Credit Card Processor Backend

FastAPI backend for the Credit Card Processor application.

## Setup Instructions

### Prerequisites
- Python 3.11+
- pip

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the development server:
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### API Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check endpoint
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /redoc` - Alternative API documentation

### Configuration

All configuration is managed in `app/config.py`. Key settings:

- Database path: `./data/database.db` 
- Upload directory: `./data/uploads`
- Export directory: `./data/exports`
- Max file size: 100MB
- Admin users: rcox, mikeh, tomj

### Directory Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI application entry point
│   ├── config.py         # Application configuration
│   ├── database.py       # SQLite database setup
│   ├── models.py         # SQLAlchemy models
│   ├── schemas.py        # Pydantic schemas
│   ├── api/              # API endpoints
│   └── services/         # Business logic services
├── data/                 # Database and file storage
├── tests/                # Test files
└── requirements.txt      # Python dependencies
```

### Development

The application automatically:
- Creates required directories on startup
- Initializes the SQLite database
- Sets up CORS for frontend integration (localhost:3000)

For production deployment, see the deployment guide in the project root.