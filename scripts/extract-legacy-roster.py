"""Extract the Jugadoras and Categorias sheets into a TypeScript module."""

import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path

WORKBOOK = Path(__file__).resolve().parents[1] / "docs" / "legacy" / "2026-Hockey San Telmo.xlsx"
OUTPUT = Path(__file__).resolve().parents[1] / "src" / "lib" / "legacy-roster-data.ts"
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def excel_date(serial: str) -> str:
    days = int(float(serial))
    return (datetime(1899, 12, 30) + timedelta(days=days)).date().isoformat()


def sheet_rows(archive: zipfile.ZipFile, shared: list[str], sheet: str) -> dict[int, dict[str, str]]:
    worksheet = ET.fromstring(archive.read(sheet))
    rows: dict[int, dict[str, str]] = {}
    for cell in worksheet.iter(f"{NS}c"):
        ref = cell.attrib.get("r")
        if not ref:
            continue
        column = "".join(char for char in ref if char.isalpha())
        row = int("".join(char for char in ref if char.isdigit()))
        kind = cell.attrib.get("t")
        value = cell.find(f"{NS}v")
        inline = cell.find(f"{NS}is")
        if kind == "s" and value is not None and value.text:
            text = shared[int(value.text)]
        elif kind == "inlineStr" and inline is not None:
            text = "".join(node.text or "" for node in inline.iter(f"{NS}t"))
        elif value is not None:
            text = value.text or ""
        else:
            text = ""
        rows.setdefault(row, {})[column] = text
    return rows


def ts_string(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace("'", "\\'")
    return f"'{escaped}'"


def main() -> None:
    with zipfile.ZipFile(WORKBOOK) as archive:
        shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
        shared = [
            "".join(node.text or "" for node in item.iter(f"{NS}t"))
            for item in shared_root.findall(f"{NS}si")
        ]
        categories = []
        for row_number, columns in sorted(sheet_rows(archive, shared, "xl/worksheets/sheet10.xml").items()):
            if row_number == 1 or not (columns.get("A") or "").strip():
                continue
            categories.append(
                (
                    columns["A"].strip(),
                    (columns.get("B") or "").strip(),
                    (columns.get("C") or "").strip(),
                )
            )

        players = []
        for row_number, columns in sorted(sheet_rows(archive, shared, "xl/worksheets/sheet6.xml").items()):
            if row_number == 1:
                continue
            name = (columns.get("B") or "").strip()
            raw_id = (columns.get("A") or "").strip()
            if not name and not raw_id:
                continue
            status = (columns.get("D") or "").strip()
            reason = (columns.get("E") or "").strip()
            changed_on = (columns.get("F") or "").strip()
            players.append(
                {
                    "legacyId": int(float(raw_id)),
                    "displayName": name,
                    "categoryCode": (columns.get("C") or "").strip(),
                    "rosterStatus": "ACTIVE" if status == "Activa" else "INACTIVE",
                    "statusReason": reason or None,
                    "statusChangedOn": excel_date(changed_on) if changed_on else None,
                    "sheetStatus": status,
                }
            )

    lines = [
        "// Extracted from docs/legacy/2026-Hockey San Telmo.xlsx sheets Categorias and Jugadoras.",
        "// Display names are copied as written. Do not split them.",
        "",
        "export const legacyCategoryRows = [",
    ]
    for code, description, state in categories:
        active = "true" if state == "Activo" else "false"
        lines.append(
            f"  {{ code: {ts_string(code)}, description: {ts_string(description)}, active: {active} }},"
        )
    lines.extend(["] as const;", "", "export const legacyPlayerRows = ["])
    for player in players:
        reason = "null" if player["statusReason"] is None else ts_string(player["statusReason"])
        changed_on = "null" if player["statusChangedOn"] is None else ts_string(player["statusChangedOn"])
        lines.append(
            "  { legacyId: %d, displayName: %s, categoryCode: %s, rosterStatus: '%s' as const, statusReason: %s, statusChangedOn: %s },"
            % (
                player["legacyId"],
                ts_string(player["displayName"]),
                ts_string(player["categoryCode"]),
                player["rosterStatus"],
                reason,
                changed_on,
            )
        )
    lines.append("] as const;")
    lines.append("")
    OUTPUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"categories={len(categories)} players={len(players)} output={OUTPUT}")


if __name__ == "__main__":
    main()
