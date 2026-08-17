import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2 } from "lucide-react";

export const SECCIONES_APP = [
  { url: "/Schedules", label: "🕐 Horarios de entrenamiento" },
  { url: "/CalendarAndSchedules", label: "📅 Calendario y eventos" },
  { url: "/ParentCallups", label: "📋 Convocatorias" },
  { url: "/ParentPayments", label: "💳 Mis pagos" },
  { url: "/ParentPlayers", label: "👦 Mis jugadores" },
  { url: "/CentroCompeticion", label: "🏆 Centro de competición" },
  { url: "/Tienda", label: "👕 Tienda" },
  { url: "/Gallery", label: "📸 Galería de fotos" },
  { url: "/Surveys", label: "📝 Encuestas" },
  { url: "/Voluntariado", label: "🤝 Voluntariado y comunidad" },
  { url: "/Mercadillo", label: "♻️ Mercadillo" },
  { url: "/ClubMembership", label: "🎫 Hazte socio" },
  { url: "/ParentDocuments", label: "📄 Documentos" },
  { url: "/MeteoClub", label: "🌦️ Meteo Club" },
];

export default function AnnouncementCtaSelector({ texto, url, onChange }) {
  const esPersonalizada = url && !SECCIONES_APP.some((s) => s.url === url);
  const valorSelect = url ? (esPersonalizada ? "__custom__" : url) : "__none__";

  return (
    <div className="space-y-3 p-4 rounded-lg bg-indigo-50 border-2 border-indigo-200">
      <Label className="text-base font-medium text-indigo-900 flex items-center gap-2">
        <Link2 className="w-4 h-4" /> Botón de enlace (opcional)
      </Label>
      <p className="text-sm text-indigo-700">
        Añade un botón que lleve directamente a una sección de la app.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-indigo-900">Sección destino</Label>
          <Select
            value={valorSelect}
            onValueChange={(v) => {
              if (v === "__none__") onChange({ cta_texto: "", cta_url: "" });
              else if (v === "__custom__") onChange({ cta_texto: texto || "", cta_url: "/" });
              else {
                const sec = SECCIONES_APP.find((s) => s.url === v);
                onChange({ cta_texto: texto || `Ver ${sec.label.replace(/^\S+\s/, "").toLowerCase()}`, cta_url: v });
              }
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin botón</SelectItem>
              {SECCIONES_APP.map((s) => (
                <SelectItem key={s.url} value={s.url}>{s.label}</SelectItem>
              ))}
              <SelectItem value="__custom__">🔗 Otra URL...</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-indigo-900">Texto del botón</Label>
          <Input
            placeholder="Ver horarios"
            value={texto || ""}
            onChange={(e) => onChange({ cta_texto: e.target.value, cta_url: url || "" })}
            disabled={!url}
          />
        </div>
      </div>
      {esPersonalizada && (
        <div className="space-y-1">
          <Label className="text-indigo-900">URL destino</Label>
          <Input
            placeholder="/l/torneo-padel-2026 o https://..."
            value={url || ""}
            onChange={(e) => onChange({ cta_texto: texto || "", cta_url: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}