#!/usr/bin/env python3
"""
Database Management Utility for Credit Card Processor
Provides convenient commands for database migrations and management
"""

import argparse
import os
import sys
from pathlib import Path

def run_alembic_command(command):
    """Run an alembic command"""
    return os.system(f"alembic {command}")

def init_db():
    """Initialize database with initial migration"""
    print("Initializing database...")
    
    # Check if migrations directory exists
    if not Path("migrations").exists():
        print("ERROR: Migrations directory not found. Run 'alembic init migrations' first.")
        return 1
    
    # Run the migration
    result = run_alembic_command("upgrade head")
    if result == 0:
        print("✅ Database initialized successfully!")
    else:
        print("❌ Database initialization failed!")
    return result

def create_migration(message):
    """Create a new migration"""
    if not message:
        message = input("Enter migration message: ")
    
    print(f"Creating migration: {message}")
    result = run_alembic_command(f'revision --autogenerate -m "{message}"')
    if result == 0:
        print("✅ Migration created successfully!")
    else:
        print("❌ Migration creation failed!")
    return result

def upgrade_db(revision="head"):
    """Upgrade database to latest or specific revision"""
    print(f"Upgrading database to {revision}...")
    result = run_alembic_command(f"upgrade {revision}")
    if result == 0:
        print("✅ Database upgraded successfully!")
    else:
        print("❌ Database upgrade failed!")
    return result

def downgrade_db(revision):
    """Downgrade database to specific revision"""
    if not revision:
        revision = input("Enter revision to downgrade to: ")
    
    print(f"Downgrading database to {revision}...")
    result = run_alembic_command(f"downgrade {revision}")
    if result == 0:
        print("✅ Database downgraded successfully!")
    else:
        print("❌ Database downgrade failed!")
    return result

def show_current():
    """Show current database revision"""
    print("Current database revision:")
    return run_alembic_command("current")

def show_history():
    """Show migration history"""
    print("Migration history:")
    return run_alembic_command("history")

def reset_db():
    """Reset database to initial state"""
    confirmation = input("⚠️  This will reset the database to initial state. Are you sure? (yes/no): ")
    if confirmation.lower() != 'yes':
        print("Operation cancelled.")
        return 0
    
    print("Resetting database...")
    result = run_alembic_command("downgrade base")
    if result == 0:
        result = run_alembic_command("upgrade head")
        if result == 0:
            print("✅ Database reset successfully!")
        else:
            print("❌ Database reset failed during upgrade!")
    else:
        print("❌ Database reset failed during downgrade!")
    return result

def main():
    parser = argparse.ArgumentParser(description="Database Management Utility")
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Init command
    subparsers.add_parser('init', help='Initialize database')
    
    # Create migration command
    create_parser = subparsers.add_parser('create', help='Create new migration')
    create_parser.add_argument('-m', '--message', help='Migration message')
    
    # Upgrade command
    upgrade_parser = subparsers.add_parser('upgrade', help='Upgrade database')
    upgrade_parser.add_argument('revision', nargs='?', default='head', help='Revision to upgrade to')
    
    # Downgrade command
    downgrade_parser = subparsers.add_parser('downgrade', help='Downgrade database')
    downgrade_parser.add_argument('revision', help='Revision to downgrade to')
    
    # Status commands
    subparsers.add_parser('current', help='Show current revision')
    subparsers.add_parser('history', help='Show migration history')
    
    # Reset command
    subparsers.add_parser('reset', help='Reset database to initial state')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    # Ensure we're in the right directory
    if not Path("alembic.ini").exists():
        print("ERROR: alembic.ini not found. Make sure you're in the project root directory.")
        return 1
    
    try:
        if args.command == 'init':
            return init_db()
        elif args.command == 'create':
            return create_migration(getattr(args, 'message', None))
        elif args.command == 'upgrade':
            return upgrade_db(args.revision)
        elif args.command == 'downgrade':
            return downgrade_db(args.revision)
        elif args.command == 'current':
            return show_current()
        elif args.command == 'history':
            return show_history()
        elif args.command == 'reset':
            return reset_db()
        else:
            parser.print_help()
            return 1
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
        return 1

if __name__ == "__main__":
    sys.exit(main())