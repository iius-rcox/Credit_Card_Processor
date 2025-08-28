import customtkinter as ctk
import threading
import time
from pdf_handler.extractor import parse_text_from_car, parse_text_from_receipt
from pdf_handler.splitter import split_pdf_by_range
from utilities.folders import create_base_folders, find_most_recent_file, get_folder
from utilities.excel import create_report
from utilities.json_handler import JsonHandler
from pdf_handler.combiner import combine_files

# Set the appearance mode to dark and color theme to green
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("green")


class ExpenseSplitterGUI(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.process_thread = None
        self.title("Expense Splitter Status")
        self.geometry("300x150")

        self.status_label = ctk.CTkLabel(self, text="Status: Waiting to start")
        self.status_label.pack(pady=20)

        self.btn_color = ctk.ThemeManager.theme["CTkButton"]["fg_color"]
        self.close_button = ctk.CTkButton(self, text="Close", command=self.destroy)
        self.close_button.pack(pady=20)
        self.close_button.configure(state="disabled", fg_color="grey")

        # Start the process automatically
        self.after(1000, self.start_process)

        self.protocol("WM_DELETE_WINDOW", self.destroy)

    def update_status(self, message):
        self.status_label.configure(text=f"Status: {message}")

    def start_process(self):
        self.process_thread = threading.Thread(target=self.run_process)
        self.process_thread.start()

    def on_closing(self):
        if self.process_thread and self.process_thread.is_alive():
            self.process_thread.join(1)  # Wait for the thread to finish
        self.destroy()

    def run_process(self):
        try:
            self.update_status("Checking Folder Setup")
            create_base_folders()
            time.sleep(1)

            self.update_status("Getting Things Started...")
            json_handler = JsonHandler()
            json_handler.clear()
            time.sleep(1)

            car_file = find_most_recent_file('Import - Cardholder Activity Report')
            car_data = parse_text_from_car(car_file)
            time.sleep(1)

            car_extract_dir = get_folder('Split Card Activity')
            split_pdf_by_range(car_file, car_extract_dir, 'car_page_range')
            self.update_status("Finished Card Activity Report")
            time.sleep(1)

            receipt_file = find_most_recent_file('Import - Receipt Report')
            rec_data = parse_text_from_receipt(receipt_file)
            time.sleep(1)

            receipt_extract_dir = get_folder('Split Receipts')
            split_pdf_by_range(receipt_file, receipt_extract_dir, 'rec_page_range')
            self.update_status("Finished Receipt Report")
            time.sleep(1)

            json_handler = JsonHandler()
            json_handler.update_missing_all_receipts()
            time.sleep(1)

            combine_files()
            self.update_status("Combined All Files")
            time.sleep(1)

            create_report()
            self.update_status("Created The Report")
            time.sleep(1)

            self.update_status("Process completed successfully!")
            self.close_button.configure(state="normal", fg_color=self.btn_color)

        except Exception as e:
            self.update_status(f"Error: {e}")


if __name__ == "__main__":
    app = ExpenseSplitterGUI()
    app.mainloop()
