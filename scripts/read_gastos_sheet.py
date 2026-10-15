import json
import sys
import xml.etree.ElementTree as ET
import zipfile

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def column(ref: str) -> str:
    return "".join(char for char in ref if char.isalpha())


def load_strings(book: zipfile.ZipFile) -> list[str]:
    root = ET.fromstring(book.read("xl/sharedStrings.xml"))
    values = []
    for item in root.findall("m:si", NS):
        values.append("".join(text.text or "" for text in item.iter(f"{MAIN}t")))
    return values


def sheet_path(book: zipfile.ZipFile, name: str) -> str:
    workbook = ET.fromstring(book.read("xl/workbook.xml"))
    relationships = ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))
    targets = {rel.attrib["Id"]: rel.attrib["Target"] for rel in relationships}
    for sheet in workbook.find("m:sheets", NS):
        if sheet.attrib.get("name") != name:
            continue
        target = targets[sheet.attrib[f"{REL}id"]]
        return target if target.startswith("xl/") else f"xl/{target}"
    raise SystemExit(f"Missing sheet {name}")


def cell_value(cell: ET.Element, strings: list[str]) -> str:
    kind = cell.attrib.get("t")
    value = cell.find("m:v", NS)
    if kind == "s" and value is not None and value.text is not None:
        return strings[int(value.text)]
    if kind == "inlineStr":
        return "".join(text.text or "" for text in cell.iter(f"{MAIN}t"))
    return value.text if value is not None and value.text is not None else ""


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    workbook_path = sys.argv[1]
    with zipfile.ZipFile(workbook_path) as book:
        strings = load_strings(book)
        path = sheet_path(book, "Gastos")
        sheet = ET.fromstring(book.read(path))
        links = {}
        rels_path = path.replace("worksheets/", "worksheets/_rels/") + ".rels"
        if rels_path in book.namelist():
            relationships = ET.fromstring(book.read(rels_path))
            targets = {rel.attrib["Id"]: rel.attrib.get("Target", "") for rel in relationships}
            for link in sheet.findall("m:hyperlinks/m:hyperlink", NS):
                links[link.attrib["ref"]] = targets.get(link.attrib.get(f"{REL}id", ""), "")

        rows = []
        for row in sheet.findall("m:sheetData/m:row", NS)[1:]:
            number = int(row.attrib["r"])
            cells = {}
            for cell in row.findall("m:c", NS):
                cells[column(cell.attrib["r"])] = cell_value(cell, strings)
            if not any(cells.get(key) for key in "ABCDF"):
                continue
            rows.append(
                {
                    "legacyRow": number,
                    "excelDateSerial": float(cells.get("A") or 0),
                    "expenseType": cells.get("B") or "",
                    "unitAmount": float(cells.get("C") or 0),
                    "quantity": float(cells.get("D") or 0),
                    "collaboratorLabel": cells.get("F") or "",
                    "notes": cells.get("H") or "",
                    "verified": int(float(cells.get("I") or 0)),
                    "driveUrl": links.get(f"G{number}") or None,
                }
            )
    json.dump(rows, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
