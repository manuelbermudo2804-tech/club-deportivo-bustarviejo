import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

/** Muestra lo que la app ha leído realmente del archivo, para detectar columnas mal interpretadas. */
export default function CotejoLecturaPreview({ filas }) {
  const [abierto, setAbierto] = useState(false);
  if (!filas?.length) return null;

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={() => setAbierto(!abierto)}>
        <Eye className="w-4 h-4 mr-2" />
        {abierto ? "Ocultar" : "Ver"} lo que se ha leído del archivo
      </Button>

      {abierto && (
        <div className="border rounded-lg overflow-x-auto max-h-72 overflow-y-auto bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="text-left p-2 border-b">#</th>
                <th className="text-left p-2 border-b">Nombre</th>
                <th className="text-left p-2 border-b">Email</th>
                <th className="text-left p-2 border-b">Teléfono</th>
                <th className="text-left p-2 border-b">DNI</th>
              </tr>
            </thead>
            <tbody>
              {filas.slice(0, 100).map((f, i) => (
                <tr key={i}>
                  <td className="p-2 border-b text-slate-400">{i + 1}</td>
                  <td className="p-2 border-b font-medium">{f.nombre || "—"}</td>
                  <td className="p-2 border-b text-blue-600">{f.email || "—"}</td>
                  <td className="p-2 border-b">{f.telefono || "—"}</td>
                  <td className="p-2 border-b">{f.dni || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}