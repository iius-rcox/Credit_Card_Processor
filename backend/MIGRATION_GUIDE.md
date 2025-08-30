# Database Migration Guide

This guide explains how to manage database migrations for the Credit Card Processor application using Alembic.

## Overview

The application uses Alembic for database schema version control and migrations. This allows for:
- Tracking changes to the database schema over time
- Safely upgrading and downgrading database versions
- Collaboration between developers with consistent database schemas

## Quick Start

### Using the Management Script

The easiest way to manage migrations is using the included `manage_db.py` script:

```bash
# Activate virtual environment
source venv/bin/activate

# Show available commands
python manage_db.py --help

# Check current database version
python manage_db.py current

# Initialize database (apply all migrations)
python manage_db.py init

# Create a new migration
python manage_db.py create -m "Add new column to users table"

# Upgrade database to latest version
python manage_db.py upgrade

# Show migration history
python manage_db.py history
```

### Using Alembic Directly

You can also use Alembic commands directly:

```bash
# Check current revision
alembic current

# Generate a new migration
alembic revision --autogenerate -m "Description of changes"

# Upgrade to latest
alembic upgrade head

# Downgrade one revision
alembic downgrade -1

# Show history
alembic history
```

## Common Operations

### Creating a New Migration

When you modify models in `app/models.py`, you need to create a migration:

1. Make your changes to the model files
2. Generate the migration:
   ```bash
   python manage_db.py create -m "Describe your changes"
   ```
3. Review the generated migration file in `migrations/versions/`
4. Apply the migration:
   ```bash
   python manage_db.py upgrade
   ```

### Upgrading Database

To apply all pending migrations:
```bash
python manage_db.py upgrade
```

To upgrade to a specific revision:
```bash
python manage_db.py upgrade <revision_id>
```

### Rolling Back Changes

To downgrade to a previous version:
```bash
python manage_db.py downgrade <revision_id>
```

**⚠️ Warning**: Downgrades can result in data loss. Always backup your database before downgrading.

### Resetting Database

To completely reset the database (useful for development):
```bash
python manage_db.py reset
```

**⚠️ Warning**: This will delete all data in the database.

## Migration Files

Migration files are stored in `migrations/versions/` and contain:
- `upgrade()` function: Instructions to apply the migration
- `downgrade()` function: Instructions to reverse the migration
- Metadata including revision ID and dependencies

### Example Migration File

```python
def upgrade() -> None:
    # Create new table
    op.create_table('new_table',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    # Drop the table
    op.drop_table('new_table')
```

## Best Practices

### 1. Always Review Generated Migrations

Alembic can auto-generate migrations, but always review them before applying:
- Check that the operations are correct
- Ensure data migrations are included if needed
- Verify that downgrades work correctly

### 2. Test Migrations

Test your migrations on a copy of production data:
- Test both upgrade and downgrade
- Verify data integrity after migration
- Check application functionality with new schema

### 3. Backup Before Production Migrations

Always backup your production database before applying migrations:
```bash
# For SQLite
cp database.db database.db.backup

# For PostgreSQL
pg_dump database_name > backup.sql
```

### 4. Use Descriptive Messages

Use clear, descriptive messages for your migrations:
```bash
# Good
python manage_db.py create -m "Add email column to users table"
python manage_db.py create -m "Create index on session_id for performance"

# Bad
python manage_db.py create -m "Update"
python manage_db.py create -m "Fix stuff"
```

### 5. One Logical Change Per Migration

Keep migrations focused on a single logical change:
- Adding a table
- Modifying a column
- Creating an index

This makes it easier to review, test, and potentially rollback specific changes.

## Troubleshooting

### Migration Conflicts

If multiple developers create migrations simultaneously, you may encounter conflicts:

1. Pull latest changes from repository
2. Check for new migrations: `python manage_db.py history`
3. If conflicts exist, resolve by creating a merge migration:
   ```bash
   alembic merge -m "Merge conflicting migrations" <rev1> <rev2>
   ```

### Failed Migrations

If a migration fails partway through:

1. Check the error message and fix the underlying issue
2. If the database is in an inconsistent state, you may need to:
   - Restore from backup
   - Manually fix the database state
   - Use `alembic stamp <revision>` to mark the correct state

### Schema Drift

If your models don't match the database schema:

1. Check current state: `python manage_db.py current`
2. Generate a migration to sync: `python manage_db.py create -m "Sync schema"`
3. Review the generated migration carefully
4. Apply: `python manage_db.py upgrade`

## Production Deployment

For production deployments:

1. **Always backup the database first**
2. Test the migration on a staging environment
3. Plan for downtime if needed (some migrations require it)
4. Have a rollback plan ready
5. Apply migrations as part of your deployment process:
   ```bash
   python manage_db.py upgrade
   ```

## Directory Structure

```
backend/
├── alembic.ini              # Alembic configuration
├── manage_db.py             # Management utility script
├── migrations/              # Migration files directory
│   ├── env.py              # Migration environment setup
│   ├── script.py.mako      # Migration template
│   └── versions/           # Individual migration files
└── app/
    ├── models.py           # SQLAlchemy models
    └── database.py         # Database configuration
```

## Configuration

The migration system is configured through:

- `alembic.ini`: Main Alembic configuration
- `migrations/env.py`: Environment setup and model imports
- `app/database.py`: Database connection settings

## Support

If you encounter issues with migrations:

1. Check this guide for common solutions
2. Review the Alembic documentation: https://alembic.sqlalchemy.org/
3. Check application logs for detailed error messages
4. Consult with the development team

Remember: Migrations are a powerful tool, but they can be dangerous if used incorrectly. Always test thoroughly and backup before applying to production!