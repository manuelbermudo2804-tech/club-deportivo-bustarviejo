import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, FileText, Calendar, Euro, Building2, Phone, Mail, Power, MousePointer } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
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
  const isExpiringSoon = () => {
    if (!sponsor.fecha_fin) return false;
    const endDate = new Date(sponsor.fecha_fin);
    const today = new Date();
    const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  };

  const isExpired = () => {
    if (!sponsor.fecha_fin) return false;
    return new Date(sponsor.fecha_fin) < new Date();
  };

  return (
    <Card className={`border-none shadow-lg overflow-hidden transition-all hover:shadow-xl ${
      !sponsor.activo ? 'opacity-60' : ''
    }`}>
      <div className={`h-2 ${nivelColors[sponsor.nivel_patrocinio] || 'bg-slate-400'}`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {sponsor.logo_url ? (
              <img 
                src={sponsor.logo_url} 
                alt={sponsor.nombre} 
                className="w-14 h-14 object-contain rounded-lg border bg-white p-1"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-amber-100 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-amber-600" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-lg text-slate-900">{sponsor.nombre}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={nivelColors[sponsor.nivel_patrocinio]}>
                  {sponsor.nivel_patrocinio}
                </Badge>
                {isExpiringSoon() && (
                  <Badge className="bg-orange-500 text-white animate-pulse">
                    ⚠️ Próximo a vencer
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => onEdit(sponsor)}>
              <Pencil className="w-4 h-4 text-slate-600" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(sponsor)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>

        {/* Switch para activar/desactivar aparición en banner */}
        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Power className={`w-5 h-5 ${sponsor.activo ? 'text-green-600' : 'text-slate-400'}`} />
              <div>
                <p className="font-semibold text-slate-900">Mostrar en Banner</p>
                <p className="text-xs text-slate-500">
                  {sponsor.activo ? '✅ Aparece en el banner de la app' : '⏸️ No aparece en el banner'}
                </p>
              </div>
            </div>
            <Switch
              checked={sponsor.activo}
              onCheckedChange={() => onToggleActive(sponsor)}
            />
          </div>
        </div>

        {/* Métrica de clicks en el banner */}
        <div className={`flex items-center gap-2 mb-3 p-2 rounded-lg ${clicks > 0 ? 'bg-green-50' : 'bg-slate-50'}`}>
          <MousePointer className={`w-4 h-4 ${clicks > 0 ? 'text-green-600' : 'text-slate-400'}`} />
          <span className={`text-sm font-bold ${clicks > 0 ? 'text-green-800' : 'text-slate-500'}`}>{clicks}</span>
          <span className={`text-xs ${clicks > 0 ? 'text-green-600' : 'text-slate-400'}`}>clicks en el banner</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {sponsor.precio_anual && (
            <div className="flex items-center gap-2 text-slate-600">
              <Euro className="w-4 h-4" />
              <span className="font-bold text-lg text-green-600">
                {sponsor.precio_anual?.toLocaleString('es-ES')}€
              </span>
              <span className="text-xs text-slate-400">/año</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(sponsor.fecha_inicio), "MMM yyyy", { locale: es })}
              {sponsor.fecha_fin && ` - ${format(new Date(sponsor.fecha_fin), "MMM yyyy", { locale: es })}`}
            </span>
          </div>
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