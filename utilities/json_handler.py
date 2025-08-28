import json
import os

from utilities.folders import get_folder


class JsonHandler:
    def __init__(self):
        filepath = get_folder('activity.json')
        self.filepath = filepath
        self.data = self.load()

    def clear(self):
        self.data = {}
        self.save()

    def load(self):
        """ Load the existing data from the JSON file. """
        if not os.path.exists(self.filepath):
            return {}  # Return an empty dictionary if the file does not exist
        with open(self.filepath, 'r') as file:
            return json.load(file)

    def update_car_data(self, updates):
        """ Update internal dictionary with new data and save to file. """
        for ee_name, car_details in updates.items():
            self.data[ee_name] = car_details
        self.save()

    def update_rec_data(self, updates):
        """ Update internal dictionary with new data and save to file. """
        for ee_name, ee_details in updates.items():
            if ee_name not in self.data:
                self.data[ee_name] = {}
                self.data[ee_name]['name'] = ee_details['name']
            for rec_detail, rec_details in ee_details.items():
                if rec_detail not in self.data[ee_name]:
                    self.data[ee_name][rec_detail] = rec_details
        self.save()

    def update_missing_all_receipts(self):
        for ee_name, ee_details in self.data.items():
            if 'flags' not in ee_details:
                self.data[ee_name]['flags'] = {
                    'missing_coding_info': False,
                    'missing_receipt': False,
                    'missing_all_receipts': True,
                    'total_mismatch': False,
                }
        self.save()

    def add_file(self, ee_name, filepath):
        """ Update internal dictionary with saved file info. """
        if ee_name not in self.data:
            self.data[ee_name] = {}
        if 'files' not in self.data[ee_name]:
            self.data[ee_name]['files'] = []
        self.data[ee_name]['files'].append(filepath)
        self.save()

    def save(self):
        with open(self.filepath, 'w') as f:
            json.dump(self.data, f, indent=2)

    def __str__(self):
        return json.dumps(self.data, indent=2)
