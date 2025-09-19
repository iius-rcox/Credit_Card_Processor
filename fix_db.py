#!/usr/bin/env python
"""Fix database schema by adding missing columns"""

from app.database import engine
from sqlalchemy import text

def add_missing_columns():
    """Add missing columns to processing_sessions table"""
    columns_to_add = [
        ("is_closed", "BOOLEAN DEFAULT 0"),
        ("closure_reason", "TEXT"),
        ("closed_by", "TEXT"),
        ("closed_at", "TEXT")
    ]

    with engine.connect() as conn:
        for column_name, column_def in columns_to_add:
            try:
                conn.execute(text(f"ALTER TABLE processing_sessions ADD COLUMN {column_name} {column_def}"))
                conn.commit()
                print(f"Added column: {column_name}")
            except Exception as e:
                if "duplicate column" in str(e).lower():
                    print(f"Column {column_name} already exists")
                else:
                    print(f"Error adding {column_name}: {e}")

if __name__ == "__main__":
    add_missing_columns()
    print("Database schema update completed")