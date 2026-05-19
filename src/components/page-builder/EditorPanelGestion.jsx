import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { X, Plus, Info } from "lucide-react";

// Editor del panel de gestión interno: quién ve esta landing en el menú lateral de la app.
export default function EditorPanelGestion({ panel = {}, onChange }) {
  const [newEmail, setNewEmail] = useState("");

  const update = (k, v) => onChange({ ...panel, [k]: v });

  const emails = panel.emails_autorizados || [];

  const addEmail = () => {
    const e = newEmail.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
    if (emails.includes(e)) return;
    update("emails_autorizados", [...emails, e]);
    setNewEmail("");
  };

  const removeEmail = (e) => {
    update("emails_autorizados", emails.filter((x) => x !== e));
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-slate-900 text-base mb-1">🎫 Panel en la app</h3>
      <p className="text-xs text-slate-500">
        Permite que esta página aparezca en el menú lateral de personas concretas para que vean y gestionen las inscripciones desde la app.
      </p>

      <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
        <div>
          <Label className="font-semibold">Mostrar en el menú</Label>
          <p className="text-xs text-slate-500">Aparece como "Eventos Especiales" en el menú lateral.</p>
        </div>
        <Switch
          checked={!!panel.mostrar_en_menu}
          onCheckedChange={(v) => update("mostrar_en_menu", v)}
        />
      </div>

      {panel.mostrar_en_menu && (
        <>
          <div>
            <Label>Nombre en el menú</Label>
            <Input
              value={panel.nombre_menu || ""}
              onChange={(e) => update("nombre_menu", e.target.value)}
              placeholder="Ej: Torneo Pádel 2026"
            />
            <p className="text-xs text-slate-500 mt-1">Si lo dejas vacío, se usa el nombre interno.</p>
          </div>

          <div>
            <Label>Emoji / icono</Label>
            <Input
              value={panel.emoji || ""}
              onChange={(e) => update("emoji", e.target.value)}
              placeholder="🎾"
              className="w-24"
              maxLength={4}
            />
          </div>

          <div className="pt-3 border-t border-slate-200">
            <Label className="font-bold">👥 ¿Quién puede gestionar?</Label>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-2 flex gap-2 text-xs text-amber-900">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Los administradores siempre tienen acceso. Aquí añades emails de otras personas (coordinador, entrenador, secretaría…) que verán esta página en su menú.</span>
            </div>
          </div>

          <div>
            <Label>Añadir email autorizado</Label>
            <div className="flex gap-2">
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
                placeholder="persona@email.com"
                type="email"
              />
              <Button type="button" onClick={addEmail} size="sm" className="gap-1 flex-shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {emails.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Personas autorizadas ({emails.length})</Label>
              {emails.map((e) => (
                <div key={e} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                  <span className="text-sm text-slate-700 truncate">{e}</span>
                  <button
                    onClick={() => removeEmail(e)}
                    className="text-slate-400 hover:text-red-600 ml-2"
                    title="Quitar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {emails.length === 0 && (
            <p className="text-xs text-slate-400 italic">Solo los administradores tendrán acceso por ahora.</p>
          )}
        </>
      )}
    </div>
  );
}