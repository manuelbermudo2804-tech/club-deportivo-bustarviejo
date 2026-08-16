import React from "react";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import WhatsAppButton from "@/components/callups/WhatsAppButton";
import { getInteresLabel } from "./conectaIntereses";

export default function ConectaCard({ profile, misIntereses = [] }) {
  const comunes = (profile.intereses || []).filter(i => misIntereses.includes(i));
  const otros = (profile.intereses || []).filter(i => !misIntereses.includes(i));

  return (
    <div className="bg-white rounded-xl border p-3.5 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 truncate">{profile.nombre}</p>
          {profile.equipo_hijo && (
            <p className="text-xs text-slate-500">{profile.equipo_hijo}</p>
          )}
        </div>
        <WhatsAppButton telefono={profile.telefono} />
      </div>

      {comunes.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className="bg-green-600 text-white text-[10px]">
            <Users className="w-3 h-3 mr-1" />{comunes.length} en común
          </Badge>
          {comunes.map(i => (
            <Badge key={i} className="bg-green-50 border border-green-300 text-green-800 text-[10px]">{getInteresLabel(i)}</Badge>
          ))}
        </div>
      )}

      {otros.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {otros.map(i => (
            <Badge key={i} className="bg-slate-100 text-slate-700 text-[10px]">{getInteresLabel(i)}</Badge>
          ))}
        </div>
      )}

      {profile.descripcion && (
        <p className="text-sm text-slate-600 italic">"{profile.descripcion}"</p>
      )}
    </div>
  );
}