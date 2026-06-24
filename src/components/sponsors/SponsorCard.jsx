import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, FileText, Calendar, Building2, Phone, Mail, Power, MousePointer, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

const nivelColors = {
  "Principal": "bg-gradient-to-r from-yellow-500 to-amber-600 text-white",
  "Oro": "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white",
  "Plata": "bg-gradient-to-r from-slate-400 to-slate-500 text-white",
  "Bronce": "bg-gradient-to-r from-orange-600 to-orange-700 text-white",
  "Colaborador": "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
};

export default function SponsorCard({ sponsor, onEdit, onDelete, onToggleActive }) {
  const clicks = sponsor.clicks_totales || 0;

  const diasRestantes = sponsor.fecha_fin
    ? differenceInDays(new Date(sponsor.fecha_fin), new Date())
    : null;
  const isExpired = diasRestantes !== null && diasRestantes < 0;
  const isExpiringSoon = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 30;

  return (
    <Card className={`border-none shadow-lg overflow-hidden transition-all hover:shadow-xl ${
      !sponsor.activo ? 'opacity-60' : ''
    } ${isExpired ? 'ring-2 ring-red-300' : isExpiringSoon ? 'ring-2 ring-orange-200' : ''}`}>
      <div className={`h-2 ${nivelColors[sponsor.nivel_patrocinio] || 'bg-slate-400'}`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {sponsor.logo_url ? (
              <img 
                src={sponsor.logo_url} 
                alt={sponsor.nombre} 
                className="w-14 h-14 object-contain rounded-lg border bg-white p-1 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Building2 className="w-7 h-7 text-amber-600" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-bold text-lg text-slate-900 truncate">{sponsor.nombre}</h3>
              <div className="flex items-center flex-wrap gap-2 mt-1">
                <Badge className={nivelColors[sponsor.nivel_patrocinio]}>
                  {sponsor.nivel_patrocinio}
                </Badge>
                {sponsor.website_url && (
                  <a href={sponsor.website_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                    <ExternalLink className="w-3 h-3" /> Web
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="icon" variant="ghost" onClick={() => onEdit(sponsor)}>
              <Pencil className="w-4 h-4 text-slate-600" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(sponsor)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>

        {/* Aviso de vencimiento destacado */}
        {(isExpired || isExpiringSoon) && (
          <div className={`mb-3 px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
            isExpired ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
          }`}>
            <Calendar className="w-4 h-4 shrink-0" />
            {isExpired
              ? `Patrocinio vencido hace ${Math.abs(diasRestantes)} días`
              : `Vence en ${diasRestantes} días`}
          </div>
        )}

        {/* Importe destacado */}
        {sponsor.precio_anual ? (
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-green-600">
              {sponsor.precio_anual.toLocaleString('es-ES')}€
            </span>
            <span className="text-sm text-slate-400">/año</span>
          </div>
        ) : null}

        {/* Switch banner + clicks en una fila compacta */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Power className={`w-5 h-5 shrink-0 ${sponsor.activo ? 'text-green-600' : 'text-slate-400'}`} />
              <span className="text-xs font-medium text-slate-700 truncate">
                {sponsor.activo ? 'En banner' : 'Oculto'}
              </span>
            </div>
            <Switch
              checked={sponsor.activo}
              onCheckedChange={() => onToggleActive(sponsor)}
            />
          </div>
          <div className={`p-3 rounded-lg flex items-center gap-2 ${clicks > 0 ? 'bg-green-50' : 'bg-slate-50'}`}>
            <MousePointer className={`w-4 h-4 shrink-0 ${clicks > 0 ? 'text-green-600' : 'text-slate-400'}`} />
            <span className={`text-sm font-bold ${clicks > 0 ? 'text-green-800' : 'text-slate-500'}`}>{clicks}</span>
            <span className={`text-xs ${clicks > 0 ? 'text-green-600' : 'text-slate-400'}`}>clicks</span>
          </div>
        </div>

        {/* Fechas */}
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>
            {format(new Date(sponsor.fecha_inicio), "MMM yyyy", { locale: es })}
            {sponsor.fecha_fin && ` — ${format(new Date(sponsor.fecha_fin), "MMM yyyy", { locale: es })}`}
          </span>
        </div>

        {sponsor.contacto_nombre && (
          <div className="mt-3 pt-3 border-t space-y-1">
            <p className="text-sm font-medium text-slate-700">{sponsor.contacto_nombre}</p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              {sponsor.contacto_email && (
                <a href={`mailto:${sponsor.contacto_email}`} className="flex items-center gap-1 hover:text-blue-600">
                  <Mail className="w-3 h-3" /> {sponsor.contacto_email}
                </a>
              )}
              {sponsor.contacto_telefono && (
                <a href={`tel:${sponsor.contacto_telefono}`} className="flex items-center gap-1 hover:text-blue-600">
                  <Phone className="w-3 h-3" /> {sponsor.contacto_telefono}
                </a>
              )}
            </div>
          </div>
        )}

        {(sponsor.equipos_patrocinados?.length > 0 || sponsor.jugadores_patrocinados?.length > 0) && (
          <div className="mt-3 pt-3 border-t">
            {sponsor.equipos_patrocinados?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {sponsor.equipos_patrocinados.map(eq => (
                  <Badge key={eq} variant="outline" className="text-xs">⚽ {eq.split(' ')[1] || eq}</Badge>
                ))}
              </div>
            )}
            {sponsor.jugadores_patrocinados?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {sponsor.jugadores_patrocinados.map(j => (
                  <Badge key={j.jugador_id} variant="outline" className="text-xs bg-blue-50">
                    👤 {j.jugador_nombre}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {sponsor.documentos?.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex flex-wrap gap-2">
              {sponsor.documentos.map((doc, idx) => (
                <a 
                  key={idx} 
                  href={doc.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
                >
                  <FileText className="w-3 h-3" />
                  {doc.tipo}
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}