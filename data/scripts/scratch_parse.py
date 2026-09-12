import re
import sys
from html.parser import HTMLParser

class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tables = []
        self.current_table = []
        self.current_row = []
        self.current_cell = []
        self.in_cell = False

    def handle_starttag(self, tag, attrs):
        if tag == 'table':
            self.current_table = []
        elif tag == 'tr':
            self.current_row = []
        elif tag in ('td', 'th'):
            self.in_cell = True
            self.current_cell = []

    def handle_endtag(self, tag):
        if tag in ('td', 'th'):
            self.in_cell = False
            self.current_row.append("".join(self.current_cell).strip())
        elif tag == 'tr':
            if self.current_row:
                self.current_table.append(self.current_row)
        elif tag == 'table':
            if self.current_table:
                self.tables.append(self.current_table)

    def handle_data(self, data):
        if self.in_cell:
            self.current_cell.append(data)

with open('response.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Remove HTTP headers if any from curl -i
if '\r\n\r\n' in content:
    content = content.split('\r\n\r\n', 1)[1]
elif '\n\n' in content:
    content = content.split('\n\n', 1)[1]

parser = TableParser()
parser.feed(content)

with open('parsed_tables.txt', 'w', encoding='utf-8') as out:
    out.write(f"Total tables found: {len(parser.tables)}\n")
    for t_idx, table in enumerate(parser.tables):
        out.write(f"\n--- TABLE {t_idx} (rows: {len(table)}) ---\n")
        for r_idx, row in enumerate(table[:15]): # first 15 rows
            out.write(f"Row {r_idx}: {' | '.join(row)}\n")
        if len(table) > 15:
            out.write(f"... and {len(table) - 15} more rows\n")

print(f"Parsed {len(parser.tables)} tables to parsed_tables.txt")
