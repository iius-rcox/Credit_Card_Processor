import re
import pymupdf
from utilities.folders import get_folder
from utilities.json_handler import JsonHandler

manual_names = {
    'BRITTSCHEXNAIDER': 'BRITTANSCHEXNAIDER',
    'JOSEARREDONDO': 'JOSEPEREZ',
    'JIMMIERAYUNDERWOOD': 'JIMMIEUNDERWOOD'
}


def parse_text_from_car(pdf_path):
    doc = pymupdf.open(pdf_path)
    car_data = {}  # Dictionary to store CAR information
    ee_name_id = None  # Tracks the current employee name ID
    text_accumulator = []  # To store all text for writing to a file later

    for page_number, page in enumerate(doc, start=1):
        text = page.get_text()
        text_accumulator.append(text)

        # Unified pattern for both masked and unmasked credit card numbers
        info_pattern = r"""
            Employee\s+ID:\s*
            (?P<employee_id>\d{4,6})\s*
            (?P<employee_name>[A-Z]+)\s*
            (?P<card_number>\d{6}(?:X{6}|\d{6})\d{4})
        """

        info_match = re.search(info_pattern, text, re.VERBOSE)
        if info_match:
            ee_id = info_match.group("employee_id")
            ee_name = info_match.group("employee_name")
            card_no = info_match.group("card_number")
            ee_name_id = ee_name

            if ee_name_id not in car_data:
                car_data[ee_name_id] = {
                    'name': ee_name,
                    'employee_id': ee_id,
                    'car_page_range': [],
                    'car_total': 0.00,
                    'card_no': card_no
                }
            car_data[ee_name_id]['car_page_range'].append(page_number)

        # Search for Totals Row indicating financial totals
        totals_pattern = r'Totals For Card Nbr: \d{16}\n\$([\d,\.]+)'
        totals_match = re.search(totals_pattern, text)
        if totals_match and ee_name_id:
            car_data[ee_name_id]['car_total'] = float(totals_match.group(1).replace(',', ''))

        # Identify the end of useful data in the file
        end_pattern = r'Product Description\nDescription\nCount\nUnits\/Glns\nGross Cost\nDiscount\nNet Cost'
        end_match = re.search(end_pattern, text)
        if end_match:
            break

    text_output_path = get_folder('pdf_text.txt')
    with open(text_output_path, 'w') as f:
        f.write('\n'.join(text_accumulator))

    json_handler = JsonHandler()
    json_handler.update_car_data(car_data)
    return car_data

# noinspection PyTypeChecker
def parse_text_from_receipt(pdf_path):
    doc = pymupdf.open(pdf_path)
    rec_data = {}
    text_accumulator = []

    for page_number, page in enumerate(doc, start=1):
        date_pattern = r'Expense.+Transaction.+(\d{2}/\d{2}/\d{4})'
        block = page.get_text("blocks")
        rec_dt = None
        for line in block:
            date_match = re.search(date_pattern, line[4])
            if date_match:
                rec_dt = date_match.group(1).strip()
                break

        text = page.get_text()
        text_accumulator.append(text)

        name_pattern = r'\d{7}\n([a-zA-Z\. ]+)\n([a-zA-Z\. ]+)'
        name_match = re.search(name_pattern, text)
        if name_match:
            ee_name_id = name_match.group(1).strip().replace(' ', '').replace('.', '').upper()
            if ee_name_id in manual_names:
                ee_name_id = manual_names[ee_name_id]
            rec_exp = name_match.group(2).strip()
        else:
            print(f"""Error: Could not find EE Info for page {page_number}""")
            break

        if ee_name_id not in rec_data:
            rec_data[ee_name_id] = {
                'name': ee_name_id,
                'car_total': 0.00,
                'card_no': 'None',
                'rec_page_range': [],
                'rec_total': 0.00,
                'flags': {
                    'missing_coding_info': False,
                    'missing_receipt': False,
                    'missing_all_receipts': False,
                    'total_mismatch': False,
                },
                'receipts': {}
            }

        name_pattern = r'Transaction ID:\n(\d+)'
        name_match = re.search(name_pattern, text)
        if name_match:
            rec_id = name_match.group(1).strip()
        else:
            print(f"""Error: Could not find ID for page {page_number}""")
            break

        title_pattern = r'(.+)\nExpense Title:'
        title_match = re.search(title_pattern, text)
        rec_title = title_match.group(1).strip() if title_match else None

        amt_pattern = r'Amount :\nAddress:\n.+\n(-?[0-9\\,\.]+)'
        amt_match = re.search(amt_pattern, text)
        rec_amt = amt_match.group(1).strip().replace(',', '') if amt_match else 0

        purpose_pattern = r'Purpose:\n(.+)'
        purpose_match = re.search(purpose_pattern, text)
        raw_purpose = purpose_match.group(1).strip() if purpose_match else None
        rec_purpose = re.sub(r'Receipts Notes \(\d+\):\s', '', raw_purpose).strip() if raw_purpose else None

        merch_pattern = r'Merchant Name:\n(.+)\nMerchant Address:\n(.+)'
        merch_match = re.search(merch_pattern, text)
        rec_merch_name = merch_match.group(1).strip() if merch_match else None
        rec_merch_addy = merch_match.group(2).strip() if merch_match else None

        code_type_pattern = r'(Job Coding|GL Coding)\nAccounts Coding Type :'
        code_type_match = re.search(code_type_pattern, text)
        rec_code_type = code_type_match.group(1).strip() if code_type_match else None

        rec_job = rec_phase = rec_cost_type = rec_gl_acct = rec_gl_desc = None
        rec_coding = False

        match rec_code_type:
            case 'Job Coding':
                job_pattern = r'Job\n(\d{5}\.) .*\nPhase\n(\d{3}\.?\d*?) .*\nCost Type\n(\d+)'
                job_match = re.search(job_pattern, text)
                if job_match:
                    rec_job = job_match.group(1).strip()
                    rec_phase = job_match.group(2).strip()
                    rec_cost_type = job_match.group(3).strip()
                    rec_coding = True
                else:
                    rec_data.setdefault(ee_name_id, {}).setdefault('flags', {})['missing_coding_info'] = True

            case 'GL Coding':
                gl_pattern = r'GL Account\n([0-9\.]+) \((.+?)\)'
                gl_match = re.search(gl_pattern, text)
                if gl_match:
                    rec_gl_acct = gl_match.group(1).strip()
                    rec_gl_desc = gl_match.group(2).strip()
                    rec_coding = True
                else:
                    rec_data.setdefault(ee_name_id, {}).setdefault('flags', {})['missing_coding_info'] = True

            case _:
                print(f'Unexpected Coding {rec_code_type}')
                return None

        attach_pattern = r'Attachment Name:\n.*\..*\nRequest Type:'
        attach_match = re.search(attach_pattern, text)
        rec_attach = True if attach_match else False

        key = rec_job if rec_job else rec_gl_acct
        rec_data[ee_name_id]['rec_page_range'].append(page_number)
        try:
            rec_data[ee_name_id]['rec_total'] += float(rec_amt)
        except ValueError as e:
            print(f"Error: {e} for page {page_number}")
            continue

        if key not in rec_data[ee_name_id]['receipts']:
            rec_data[ee_name_id]['receipts'][key] = []

        rec_data[ee_name_id]['receipts'][key].append({
            'rec_id': rec_id,
            'exp': rec_exp,
            'date': rec_dt,
            'title': rec_title,
            'amt': rec_amt,
            'purpose': rec_purpose,
            'merch_name': rec_merch_name,
            'merch_addy': rec_merch_addy,
            'code_type': rec_code_type,
            'gl_acct': rec_gl_acct,
            'gl_desc': rec_gl_desc,
            'job': rec_job,
            'phase': rec_phase,
            'cost_type': rec_cost_type,
            'coded': rec_coding,
            'attachment': rec_attach
        })

        if not rec_attach and not rec_data[ee_name_id]['flags']['missing_receipt']:
            rec_data[ee_name_id]['flags']['missing_receipt'] = True

    text_output_path = get_folder('pdf_text.txt')
    with open(text_output_path, 'w') as f:
        f.write('\n'.join(text_accumulator))

    json_handler = JsonHandler()
    json_handler.update_rec_data(rec_data)
    return rec_data
