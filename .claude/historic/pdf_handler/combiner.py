from utilities.folders import get_folder
from utilities.folders import clear_directory
from utilities.json_handler import JsonHandler
import os
import pymupdf


def combine_files():
    data = JsonHandler().load()

    finished_report_folder = get_folder('Final Reports/Finished Reports')
    unfinished_report_folder = get_folder('Final Reports/Unfinished Reports')
    clear_directory(finished_report_folder)
    clear_directory(unfinished_report_folder)

    for ee_name, ee_details in data.items():
        if (
                ee_details['flags']['missing_coding_info'] or
                ee_details['flags']['total_mismatch'] or
                ee_details['flags']['missing_receipt'] or
                ee_details['flags']['missing_all_receipts']
        ):
            output_folder = unfinished_report_folder
        else:
            output_folder = finished_report_folder

        output_file_path = os.path.join(output_folder, ee_details['name'] + '.pdf')
        output_pdf = pymupdf.open()

        for pdf_fil in ee_details['files']:
            with pymupdf.open(pdf_fil) as input_pdf:
                for page_num in range(len(input_pdf)):
                    output_pdf.insert_pdf(input_pdf, from_page=page_num, to_page=page_num)
            os.remove(pdf_fil)

        # Save the combined PDF to the output file path
        output_pdf.save(output_file_path)
        output_pdf.close()
