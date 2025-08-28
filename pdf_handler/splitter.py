import os

import pymupdf

from utilities.folders import clear_directory
from utilities.json_handler import JsonHandler


def split_pdf_by_range(pdf_path, output_dir, page_range_field):
    clear_directory(output_dir)  # Clear any existing files
    json_handler = JsonHandler()
    doc = pymupdf.open(pdf_path)  # Open the source PDF
    for ee_name, details in json_handler.data.items():
        if page_range_field not in details:
            continue
        new_doc = pymupdf.open()  # Create a new empty PDF document
        page_ranges = details[page_range_field]

        for page_number in page_ranges:
            try:
                # Insert this page into the new document
                new_doc.insert_pdf(doc, from_page=page_number - 1, to_page=page_number - 1)
            except ValueError as e:
                print(f'Error: {e} in {pdf_path} for page {page_number}')
                continue

        # Format the filename to include the employee name and page range
        output_filename = os.path.join(output_dir, f'{ee_name}.pdf')
        json_handler.add_file(ee_name, output_filename)
        new_doc.save(output_filename)
        new_doc.close()
    doc.close()
