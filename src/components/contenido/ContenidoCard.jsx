import React from "react";
import moment from "moment";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Download, Check, X, Send, Megaphone } from "lucide-react";

export default function ContenidoCard({ item, onEstado }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-900 aspect-video flex items-center justify-center">
        {item.tipo === "video" ? (
          <video src={item.archivo_url} controls className="w-full h-full object-contain" />
        ) : (
          <img src={item.archivo_url} alt="" className="w-full h-full object-contain" />
        )}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{item.equipo}</p>
          {item.descripcion && <p className="text-sm text-slate-600 mt-0.5">{item.descripcion}</p>}
          <p className="text-xs text-slate-400 mt-1">
            {item.autor_nombre || "Alguien del club"} · {moment(item.created_date).format("DD/MM/YYYY")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {item.estado !== "guardado" && (
            <Button size="sm" onClick={() => onEstado(item, "guardado")} className="bg-blue-600 hover:bg-blue-700">
              <Check className="w-4 h-4 mr-1" /> Me sirve
            </Button>
          )}
          {item.estado !== "publicado" && (
            <Button size="sm" onClick={() => onEstado(item, "publicado")} className="bg-green-600 hover:bg-green-700">
              <Send className="w-4 h-4 mr-1" /> Ya publicado
            </Button>
          )}
          {item.estado !== "descartado" && (
            <Button size="sm" variant="outline" onClick={() => onEstado(item, "descartado")}>
              <X className="w-4 h-4 mr-1" /> Descartar
            </Button>
          )}
          {item.tipo !== "video" && (
            <Link to={`/SocialHub?imagen=${encodeURIComponent(item.archivo_url)}&desc=${encodeURIComponent(`${item.equipo}${item.descripcion ? ` — ${item.descripcion}` : ''}`)}`}>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Megaphone className="w-4 h-4 mr-1" /> Usar en publicación
              </Button>
            </Link>
          )}
          <a href={item.archivo_url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline">
              <Download className="w-4 h-4 mr-1" /> Descargar
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}