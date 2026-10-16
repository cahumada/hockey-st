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


def optional_number(value: str) -> float | None:
    text = value.strip()
    if not text:
        return None
    return float(text)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    workbook_path = sys.argv[1]
    with zipfile.ZipFile(workbook_path) as book:
        strings = load_strings(book)
        path = sheet_path(book, "3er Tiempo")
        sheet = ET.fromstring(book.read(path))
        links = {}
        rels_path = path.replace("worksheets/", "worksheets/_rels/") + ".rels"
        if rels_path in book.namelist():
            relationships = ET.fromstring(book.read(rels_path))
            targets = {rel.attrib["Id"]: rel.attrib.get("Target", "") for rel in relationships}
            for link in sheet.findall("m:hyperlinks/m:hyperlink", NS):
                links[link.attrib["ref"]] = targets.get(link.attrib.get(f"{REL}id", ""), "")

        rows = []
        for row in sheet.findall("m:sheetData/m:row", NS):
            number = int(row.attrib["r"])
            if number < 3:
                continue
            cells = {}
            for cell in row.findall("m:c", NS):
                cells[column(cell.attrib["r"])] = cell_value(cell, strings)
            player_name = (cells.get("A") or "").strip()
            if not player_name:
                continue
            notes = cells.get("L") or ""
            drive_url = links.get(f"F{number}") or links.get(f"L{number}") or None
            if notes.strip().lower() == "link":
                notes = ""
            rows.append(
                {
                    "legacyRow": number,
                    "playerName": player_name,
                    "categoryCode": cells.get("B") or "",
                    "amount": optional_number(cells.get("C") or ""),
                    "excelChargedOn": float(cells.get("D") or 0),
                    "excelPaidOn": optional_number(cells.get("E") or ""),
                    "receiptText": cells.get("F") or "",
                    "driveUrl": drive_url,
                    "channel": cells.get("G") or "",
                    "status": cells.get("H") or "",
                    "controllerName": cells.get("I") or "",
                    "notes": notes,
                }
            )

    json.dump(rows, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
