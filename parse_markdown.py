import sys
import json
import re

def parse_md(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Matches patterns like | 10199-2 | Bushing | LG Page 2 Item 75 |
    # or just extracted table rows from document--parse_document
    parts = []
    
    # Handle HTML-like tables in markdown
    rows = re.findall(r'<tr>\s*<td>(.*?)</td>\s*<td>(.*?)</td>\s*<td>(.*?)</td>\s*</tr>', content, re.DOTALL)
    for row in rows:
        pn = re.sub('<.*?>', '', row[0]).strip()
        name = re.sub('<.*?>', '', row[1]).strip()
        if pn and pn.lower() != "part number":
            parts.append({"part_number": pn, "name": name})
            
    # Also handle markdown tables
    md_rows = re.findall(r'\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|', content)
    for row in md_rows:
        pn = row[0].strip()
        name = row[1].strip()
        if pn and pn.lower() != "part number" and pn != "---":
            parts.append({"part_number": pn, "name": name})
            
    return parts

if __name__ == "__main__":
    results = parse_md(sys.argv[1])
    # Deduplicate by PN
    unique = {}
    for p in results:
        if p["part_number"] not in unique:
            unique[p["part_number"]] = p
    print(json.dumps(list(unique.values())))
