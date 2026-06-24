import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, Mail, Globe, MapPin, Edit, Plus } from "lucide-react";
import { ETAPAS, ETAPA_MAP, COLOR_CLASSES, TIPOS_INTERACCION, fmtEuro } from "./crmConfig";
import moment from "moment";

// Ficha de empresa con cronología e interacciones.
export default function CrmSponsorDialog({ sponsor, open, onClose, onLogInteraction, onChangeStage, onEdit }) {
  const [tipo, setTipo] = useState("llamada");
  const [descripcion, setDescripcion] = useState("");
  const [proximaFecha, setProximaFecha] = useState("");
  const [proximaTexto, setProximaTexto] = useState("");

  if (!sponsor) return null;

  const etapa = sponsor.etapa_crm || (sponsor.activo ? "ganado" : "prospecto");
  const etapaInfo = ETAPA_MAP[etapa] || ETAPA_MAP.prospecto;
  const colors = COLOR_CLASSES[etapaInfo.color];
  const historial = [...(sponsor.historial_crm || [])].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const handleSubmit = () => {
    if (!descripcion.trim()) return;
    onLogInteraction(sponsor, {
      tipo,
      descripcion: descripcion.trim(),
      proxima_accion_fecha: proximaFecha || undefined,
      proxima_accion_texto: proximaTexto.trim() || undefined,
    });
    setDescripcion("");
    setProximaFecha("");
    setProximaTexto("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-6">
            <span>{sponsor.nombre}</span>
            <Button size="sm" variant="ghost" onClick={() => onEdit(sponsor)}>
              <Edit className="w-4 h-4 mr-1" /> Editar ficha
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Etapa + cambio rápido */}
        <div>
          <Label className="text-xs text-slate-500">Etapa del pipeline</Label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {ETAPAS.map((e) => {
              const ec = COLOR_CLASSES[e.color];
              const active = e.id === etapa;
              return (
                <button
                  key={e.id}
                  onClick={() => onChangeStage(sponsor, e.id)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    active ? `${ec.bg} ${ec.text} ${ec.border} font-semibold` : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {e.emoji} {e.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Datos de contacto */}
        <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 rounded-lg p-3">
          {sponsor.sector && <div className="col-span-2 text-slate-600">🏢 {sponsor.sector}</div>}
          {sponsor.contacto_nombre && <div className="text-slate-700">👤 {sponsor.contacto_nombre}</div>}
          {(sponsor.importe_potencial || sponsor.precio_anual) && (
            <div className="text-slate-700 font-medium">💶 {fmtEuro(sponsor.importe_potencial || sponsor.precio_anual)}</div>
          )}
          {sponsor.contacto_telefono && (
            <a href={`tel:${sponsor.contacto_telefono}`} className="text-blue-600 flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{sponsor.contacto_telefono}</a>
          )}
          {sponsor.contacto_email && (
            <a href={`mailto:${sponsor.contacto_email}`} className="text-blue-600 flex items-center gap-1 truncate"><Mail className="w-3.5 h-3.5" />{sponsor.contacto_email}</a>
          )}
          {sponsor.website_url && (
            <a href={sponsor.website_url} target="_blank" rel="noreferrer" className="text-blue-600 flex items-center gap-1 truncate"><Globe className="w-3.5 h-3.5" />Web</a>
          )}
          {sponsor.direccion && <div className="text-slate-600 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{sponsor.direccion}</div>}
          {sponsor.interes && <div className="col-span-2 text-slate-600">🎯 {sponsor.interes}</div>}
          {sponsor.proxima_accion_fecha && (
            <div className="col-span-2 text-amber-700 bg-amber-50 rounded px-2 py-1">
              ⏰ Próxima acción: {moment(sponsor.proxima_accion_fecha).format("DD/MM/YYYY")}
              {sponsor.proxima_accion_texto ? ` — ${sponsor.proxima_accion_texto}` : ""}
            </div>
          )}
        </div>

        {/* Registrar interacción */}
        <div className="border border-slate-200 rounded-lg p-3 space-y-2">
          <Label className="text-sm font-semibold">Registrar interacción</Label>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS_INTERACCION.map((t) => (
              <button
                key={t.id}
                onClick={() => setTipo(t.id)}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  tipo === t.id ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-200"
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="¿Qué ha pasado? (ej: Llamada inicial, interesados en banner web)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-slate-500">Próxima acción (fecha)</Label>
              <Input type="date" value={proximaFecha} onChange={(e) => setProximaFecha(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Próxima acción (qué)</Label>
              <Input placeholder="ej: Volver a llamar" value={proximaTexto} onChange={(e) => setProximaTexto(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={!descripcion.trim()} className="w-full bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-1" /> Guardar en historial
          </Button>
        </div>

        {/* Cronología */}
        <div>
          <Label className="text-sm font-semibold">Cronología</Label>
          {historial.length === 0 ? (
            <p className="text-xs text-slate-400 mt-2">Aún no hay interacciones registradas.</p>
          ) : (
            <div className="mt-2 space-y-2 relative pl-4 border-l-2 border-slate-100">
              {historial.map((h, i) => {
                const t = TIPOS_INTERACCION.find(x => x.id === h.tipo);
                return (
                  <div key={i} className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white" />
                    <p className="text-xs text-slate-400">{moment(h.fecha).format("DD/MM/YYYY HH:mm")}</p>
                    <p className="text-sm text-slate-700">
                      <span className="mr-1">{t?.emoji || (h.tipo === "cambio_etapa" ? "🔀" : "📝")}</span>
                      {h.descripcion}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}