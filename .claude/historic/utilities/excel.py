from datetime import datetime
from utilities.folders import get_base_path
from utilities.json_handler import JsonHandler
import pandas as pd
import os


def get_names():
    file_path = get_base_path()
    name_xls = os.path.join(file_path, 'Card Names.xls')
    df = pd.read_excel(name_xls, sheet_name=0, skiprows=12)
    corrected_names = pd.Series(df['First Name'] + ' ' + df['Last Name'], index=df['Card Number']).to_dict()
    return corrected_names


def create_report():
    data = JsonHandler().load()

#    corrected_names = get_names()
    summary_rows = []
    detail_rows = []
    import_rows = []

    for ee_name, ee_details in data.items():
        name = ee_details['name']
        car_total = round(ee_details.get('car_total', 0), 2)
        rec_total = round(ee_details.get('rec_total', 0), 2)
        receipt_count = len(ee_details.get('receipts', []))
        flags = ee_details.get('flags', {})
        flag_descriptions = ', '.join([key for key, value in flags.items() if value])
        missing_receipt_amount = car_total - rec_total

        # Add row to summary table
        summary_rows.append({
            "Name": name,
            "Card Activity Total": car_total,
            "Receipt Total": rec_total,
            "Receipt Count": receipt_count,
            "Missing Receipt Amount": missing_receipt_amount,
            "Flags": flag_descriptions
        })

        # Check if 'missing_all_receipts' is true
        if flags.get('missing_all_receipts', False):
            detail_rows.append({
                "Name": name,
                "Expense": "N/A",
                "Date": "N/A",
                "Amount": "N/A",
                "Purpose": "N/A",
                "Merchant Name": "N/A",
                "Merchant Address": "N/A",
                "Status": "Missing All Receipts"
            })
        else:
            receipts = ee_details.get('receipts', {})
            for receipt_id, receipt_details in receipts.items():

                card_no = ee_details.get('card_no', '')
#                if card_no in corrected_names:
#                    corrected_ee_name = corrected_names[card_no]
#                else:
                corrected_ee_name = ee_name

                import_rows.append({
                    "Transaction ID": receipt_id,
                    "Transaction Date": receipt_details.get('date', ''),
                    "Transaction Amount": receipt_details.get('amt', ''),
                    "Transaction Name": receipt_details.get('purpose', ''),
                    "Vendor": '12332',
                    "Invoice #": ee_details.get('card_no', '')[-4:] + ' ' + datetime.today().strftime('%m01%y'),
                    "Invoice Date": datetime.today().strftime('%m/01/%Y'),
                    "Header Description": corrected_ee_name,
                    "Job": receipt_details.get('job', ''),
                    "Phase": receipt_details.get('phase', ''),
                    "Cost Type": receipt_details.get('cost_type', ''),
                    "GL Account": receipt_details.get('gl_acct', ''),
                    "Item Description": receipt_details.get('purpose', ''),
                    "UM": 'LS',
                    "Tax": 'XX',
                    "Pay Type":
                        '2' if receipt_details.get('job', '') != '' else
                        '1' if receipt_details.get('gl_acct', '') != '' else
                        '',
                    "Card Holder": corrected_ee_name,
                    "Credit Card Number": card_no,
                    "Credit Card Vendor": receipt_details.get('merch_name', '')
                })

                if not receipt_details['coded'] or not receipt_details['attachment']:
                    status = []
                    if not receipt_details['coded']:
                        status.append("Missing Coding")
                    if not receipt_details['attachment']:
                        status.append("Missing Attachment")
                    status = ", ".join(status)
                    detail_rows.append({
                        "Name": name,
                        "Expense": receipt_details.get('exp', ''),
                        "Date": receipt_details.get('date', ''),
                        "Amount": receipt_details.get('amt', ''),
                        "Purpose": receipt_details.get('purpose', ''),
                        "Merchant Name": receipt_details.get('merch_name', ''),
                        "Merchant Address": receipt_details.get('merch_addy', ''),
                        "Status": status
                    })

    output_path = get_base_path()
    excel_file = os.path.join(output_path, 'Credit Card Report.xlsx')
    csv_file = os.path.join(output_path, 'Credit Card Import.csv')
    # Create a Pandas Excel writer using XlsxWriter as the engine
    with pd.ExcelWriter(excel_file, engine='xlsxwriter') as writer:
        # Write the summary table to the first worksheet
        summary_df = pd.DataFrame(summary_rows)
        summary_df.to_excel(writer, sheet_name='Summary', index=False)

        # Write the detail table to the second worksheet
        detail_df = pd.DataFrame(detail_rows)
        detail_df.to_excel(writer, sheet_name='Receipt Issue Details', index=False)

    # Write the import table to the third worksheet
    import_df = pd.DataFrame(import_rows)
    import_df['Transaction Name'] = import_df['Transaction Name'].apply(
        lambda x: x.replace(',', '') if x is not None else x)
    import_df['Item Description'] = import_df['Item Description'].apply(
        lambda x: x.replace(',', '') if x is not None else x)
    import_df.to_csv(csv_file, index=False)
