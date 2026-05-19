import sys
import json
import re

def clean_html(raw_html):
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return cleantext.strip()

def parse_parts(content):
    parts = []
    # Find all table rows
    rows = re.findall(r'<tr>(.*?)</tr>', content, re.DOTALL)
    for row in rows:
        cols = re.findall(r'<td>(.*?)</td>', row, re.DOTALL)
        if len(cols) >= 2:
            pn = clean_html(cols[0])
            desc = clean_html(cols[1])
            if pn and pn != "Part Number" and desc != "Description":
                parts.append({
                    "part_number": pn,
                    "name": desc
                })
    return parts

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(1)
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        content = f.read()
    parts = parse_parts(content)
    print(json.dumps(parts))
