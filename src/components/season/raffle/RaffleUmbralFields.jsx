import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RaffleUmbralFields({ activeSeason, update }) {
  const valorPremio = activeSeason.sorteo_premio_valor || 0;
  const valorPapeleta = activeSeason.sorteo_valor_papeleta || 25;
  const umbralPapeletas = valorPremio > 0 && valorPapeleta > 0 ? Math.ceil(valorPremio / valorPapeleta) : 0;

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Valor del premio (€)</Label>
          <Input
            key={`premio-valor-${activeSeason.id}`}
            type="number"
            min="0"
            defaultValue={activeSeason.sorteo_premio_valor ?? 0}
            onBlur={(e) => {
              const v = Number(e.target.value) || 0;
              if (v !== (activeSeason.sorteo_premio_valor || 0)) {
                update({ sorteo_premio_valor: v });
              }
            }}
            placeholder="Ej: 500"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Valor por papeleta (€)</Label>
          <Input
            key={`premio-papeleta-${activeSeason.id}`}
            type="number"
            min="1"
            defaultValue={activeSeason.sorteo_valor_papeleta ?? 25}
            onBlur={(e) => {
              const v = Number(e.target.value) || 0;
              if (v !== (activeSeason.sorteo_valor_papeleta || 0)) {
                update({ sorteo_valor_papeleta: v });
              }
            }}
            placeholder="Ej: 25"
            className="mt-1"
          />
        </div>
      </div>

      {umbralPapeletas > 0 ? (
        <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">
          Harán falta <strong>{umbralPapeletas} papeletas</strong> ({umbralPapeletas} amigos) para desbloquear el sorteo
          — {valorPremio}€ ÷ {valorPapeleta}€.
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          Con el valor del premio a 0, el sorteo se puede hacer en cualquier momento.
        </p>
      )}
    </div>
  );
}