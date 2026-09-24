import * as XLSX from "xlsx";

// sheets: [{ name, rows: [ {col: val} ] }]
export function downloadExcel(fileName, sheets) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ "Sin datos": "" }]);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, fileName);
}