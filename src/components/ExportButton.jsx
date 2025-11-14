import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const exportToCSV = (data, filename) => {
  if (data.length === 0) {
    alert("No hay datos para exportar");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function ExportButton({ data, filename, children, className }) {
  return (
    <Button
      onClick={() => exportToCSV(data, filename)}
      variant="outline"
      className={className}
    >
      <Download className="w-4 h-4 mr-2" />
      {children || "Exportar CSV"}
    </Button>
  );
}