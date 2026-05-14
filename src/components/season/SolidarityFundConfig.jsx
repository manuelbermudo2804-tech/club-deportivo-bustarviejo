import React, { useState, useEffect } from "react";
import { Heart, Trash2, Plus, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DEFAULT_IMPORTES = [10, 20, 50];

export default function SolidarityFundConfig({ activeSeason, toggleFeature, updateSeasonMutation }) {
  if (!activeSeason) return null;

  const update = (data) => updateSeasonMutation.mutate({ id: activeSeason.id, data });
  const importes = activeSeason.fondo_solidario_importes || DEFAULT_IMPORTES;

  const handleImporteChange = (index, value) => {
    const newImportes = [...importes];
    newImportes[index] = Number(value) || 0;
    update({ fondo_solidario_importes: newImportes });
  };

  const handleAddImporte = () => {
    if (importes.length >= 6) return;
    update({ fondo_solidario_importes: [...importes, 25] });
  };

  const handleRemoveImporte = (index) => {
    if (importes.length <= 2) return;
    update({ fondo_solidario_importes: importes.filter((_, i) => i !== index) });
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
        <div className="flex items-center gap-3">
          <Heart className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-medium">💚 Fondo Solidario de Becas</p>
            <p className="text-xs text-slate-600">Las familias pueden aportar voluntariamente para becar a niños sin recursos</p>
          </div>
        </div>
        <Switch
          checked={activeSeason.fondo_solidario_activo || false}
          onCheckedChange={(v) => toggleFeature("fondo_solidario_activo", v)}
        />
      </div>

      {activeSeason.fondo_solidario_activo && (
        <div className="ml-8 space-y-4 bg-green-50 rounded-xl p-4 border-2 border-green-200">
          <Alert className="bg-white border-green-300">
            <Info className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-slate-700 ml-2 text-xs">
              Cuando la familia pague la cuota, podrá activar un switch para sumar una aportación voluntaria.
              Si paga en 3 cuotas, la aportación se reparte automáticamente entre los 3 pagos.
              Verás el total acumulado en tu <strong>Panel Financiero → Resumen</strong>.
            </AlertDescription>
          </Alert>

          {/* Título */}
          <div>
            <Label className="text-sm font-medium">📝 Título mostrado a las familias</Label>
            <Input
              key={`fs-titulo-${activeSeason.id}`}
              defaultValue={activeSeason.fondo_solidario_titulo || "💚 Fondo Solidario de Becas"}
              onBlur={(e) => {
                if (e.target.value !== (activeSeason.fondo_solidario_titulo || "")) {
                  update({ fondo_solidario_titulo: e.target.value });
                }
              }}
              placeholder="💚 Fondo Solidario de Becas"
              className="mt-1"
            />
          </div>

          {/* Texto explicativo */}
          <div>
            <Label className="text-sm font-medium">💬 Texto explicativo</Label>
            <Textarea
              key={`fs-texto-${activeSeason.id}`}
              defaultValue={activeSeason.fondo_solidario_texto || "Aporta voluntariamente para becar a niños y niñas del club que lo necesiten. El 100% del dinero recaudado se destinará a cubrir cuotas de familias sin recursos."}
              onBlur={(e) => {
                if (e.target.value !== (activeSeason.fondo_solidario_texto || "")) {
                  update({ fondo_solidario_texto: e.target.value });
                }
              }}
              placeholder="Explica a las familias para qué se usa el dinero..."
              className="mt-1 h-20 text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">Se guarda al salir del campo.</p>
          </div>

          {/* Importes configurables */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">💰 Importes que podrá elegir la familia</Label>
              {importes.length < 6 && (
                <Button size="sm" variant="outline" onClick={handleAddImporte} className="h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Añadir
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {importes.map((importe, index) => (
                <div key={index} className="flex items-center gap-1 bg-white rounded-lg p-2 border border-green-300">
                  <Input
                    type="number"
                    min={1}
                    value={importe}
                    onChange={(e) => handleImporteChange(index, e.target.value)}
                    className="text-center font-bold text-green-700"
                  />
                  <span className="text-sm font-bold text-green-700">€</span>
                  {importes.length > 2 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveImporte(index)}
                      className="h-7 w-7 p-0 text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              💡 Recomendado: 3 opciones (ej. 10€, 20€, 50€). Mínimo 2, máximo 6.
            </p>
          </div>
        </div>
      )}
    </>
  );
}