import os
import sys


def create_base_folders():
    # List of folder names to create
    folder_names = [
        'Final Reports',
        'Final Reports/Finished Reports',
        'Final Reports/Unfinished Reports',
        'Import - Cardholder Activity Report',
        'Import - Receipt Report',
        'Split Card Activity',
        'Split Receipts'
    ]
    # Call the function to create folders
    create_folders(folder_names)


def create_folders(folder_names):
    base_path = get_base_path()
    # Creates folders in the specified base path
    for name in folder_names:
        folder_path = os.path.join(base_path, name)
        try:
            os.makedirs(folder_path, exist_ok=True)
        except OSError as error:
            print(f'Error creating folder {name}: {error}')


def get_base_path():
    # Determine the base path for the Documents directory based on the OS
    if sys.platform.startswith('win32'):
        # Windows: Use USERPROFILE to get to the user's home directory
        base_path = os.path.join(os.environ['USERPROFILE'], 'Documents', 'Expense Splitter')
    elif sys.platform.startswith(('linux', 'darwin')):
        # Linux and macOS: Use HOME to get to the user's home directory
        base_path = os.path.join(os.environ['HOME'], 'Documents', 'Expense Splitter')
    else:
        print('Unsupported OS')
        return None

    # Ensure the 'Expense Splitter' folder exists
    if not os.path.exists(base_path):
        os.makedirs(base_path, exist_ok=True)  # Create the directory if it doesn't exist

    return base_path


def get_folder(directory):
    base_path = get_base_path()
    folder_path = os.path.join(base_path, directory)
    return folder_path


def clear_directory(directory):
    try:
        # List all files and directories in the given directory
        for filename in os.listdir(directory):
            file_path = os.path.join(directory, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)  # Remove file or link
                elif os.path.isdir(file_path):
                    os.rmdir(file_path)  # Remove directory (make sure it's empty)
            except Exception as e:
                print(f'Failed to delete {file_path}. Reason: {e}')
    except Exception as e:
        print(f'Failed to clear the directory {directory}. Reason: {e}')


def find_most_recent_file(directory):
    base_path = get_base_path()
    folder_path = os.path.join(base_path, directory)
    # Finds the most recent file in a specified directory
    try:
        # List all files in the directory
        files = [os.path.join(folder_path, file) for file in os.listdir(folder_path) if
                 os.path.isfile(os.path.join(folder_path, file))]
        if not files:
            return None
        # Find the most recent file
        latest_file = max(files, key=os.path.getmtime)
        return latest_file
    except OSError as error:
        print(f'Error accessing files in {directory}: {error}')
        return None
