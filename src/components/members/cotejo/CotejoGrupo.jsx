import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw } from "lucide-react";
import CotejoContactRow from "./CotejoContactRow";

export default function CotejoGrupo({ titulo, descripcion, color, personas, tipo, temporada, altaUrl, onSendEmail }) {
  const [sendingId, setSendingId] = useState(null);
  const [bulkSending, setBulkSending] = useState(false);
  const conEmail = personas.filter((p) => p.email);

  const handleOne = async (persona) => {
    setSendingId(persona.key);
    await onSendEmail([persona], persona.tipo || tipo);
    setSendingId(null);
  };

  const handleBulk = async () => {
    if (!confirm(`¿Enviar email a ${conEmail.length} personas de "${titulo}"?`)) return;
    setBulkSending(true);
    await onSendEmail(conEmail, tipo);
    setBulkSending(false);
  };

  if (personas.length === 0) return null;

  return (
    <Card className={`border-2 ${color}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">{titulo} ({personas.length})</h3>
            <p className="text-sm text-slate-600">{descripcion}</p>
          </div>
          {conEmail.length > 0 && (
            <Button onClick={handleBulk} disabled={bulkSending} className="bg-orange-600 hover:bg-orange-700">
              {bulkSending
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                : <><Mail className="w-4 h-4 mr-2" /> Enviar email a {conEmail.length}</>}
            </Button>
          )}
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {personas.map((p) => (
            <CotejoContactRow
              key={p.key}
              persona={p}
              tipo={p.tipo || tipo}
              temporada={temporada}
              altaUrl={altaUrl}
              onSendEmail={handleOne}
              sending={sendingId === p.key}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}