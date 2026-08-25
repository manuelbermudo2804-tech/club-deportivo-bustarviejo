import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Loader2, CheckCircle2, X } from "lucide-react";
import { EQUIPOS_CONTENIDO, getTemporadaActual } from "./categoriasContenido";

export default function SubirContenidoForm({ user, onDone }) {
  const inputRef = useRef(null);
  const [equipo, setEquipo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivos, setArchivos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'error', texto }

  const elegirArchivos = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    setArchivos(files);
  };

  const enviar = async () => {
    setAviso(null);
    if (!equipo) return setAviso({ tipo: "error", texto: "Elige primero el equipo (paso 1)" });
    if (!archivos.length) return setAviso({ tipo: "error", texto: "Elige al menos una foto o vídeo (paso 2)" });

    setSubiendo(true);
    let subidas = 0;
    let ultimoError = "";
    for (const file of archivos) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.ContenidoClub.create({
          tipo: file.type.startsWith("video") ? "video" : "foto",
          archivo_url: file_url,
          descripcion,
          equipo,
          autor_nombre: user?.full_name || "",
          autor_email: user?.email || "",
          estado: "pendiente",
          temporada: getTemporadaActual(),
        });
        subidas++;
      } catch (err) {
        ultimoError = err?.message || "error desconocido";
        console.error("[SubirContenido] fallo con", file.name, err);
      }
    }
    setSubiendo(false);

    if (subidas) {
      setAviso({ tipo: "ok", texto: `¡Gracias! Has enviado ${subidas} ${subidas === 1 ? "archivo" : "archivos"} al club` });
      setArchivos([]);
      setDescripcion("");
      if (inputRef.current) inputRef.current.value = "";
      onDone?.();
    } else {
      setAviso({ tipo: "error", texto: `No se pudo subir: ${ultimoError}` });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
      {/* Paso 1 */}
      <div>
        <p className="font-bold text-slate-800 mb-2">1. ¿De qué equipo es?</p>
        <Select value={equipo} onValueChange={setEquipo}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder="Elige el equipo" />
          </SelectTrigger>
          <SelectContent>
            {EQUIPOS_CONTENIDO.map((eq) => (
              <SelectItem key={eq} value={eq}>{eq}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Paso 2 */}
      <div>
        <p className="font-bold text-slate-800 mb-2">2. Elige las fotos o el vídeo</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={elegirArchivos}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-orange-300 bg-orange-50 rounded-2xl py-8 flex flex-col items-center gap-2 hover:bg-orange-100"
        >
          <Camera className="w-9 h-9 text-orange-500" />
          <span className="font-bold text-orange-700">Pulsa aquí para elegir</span>
          <span className="text-xs text-slate-500">Hasta 5 archivos · fotos o vídeos</span>
        </button>

        {archivos.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {archivos.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span className="truncate flex-1 text-slate-700">{f.name}</span>
                <button onClick={() => setArchivos(archivos.filter((_, x) => x !== i))}>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paso 3 */}
      <div>
        <p className="font-bold text-slate-800 mb-2">3. ¿Qué se ve? <span className="font-normal text-slate-400 text-sm">(opcional)</span></p>
        <Textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej: El golazo de falta de Marcos en el minuto 80"
          className="min-h-[70px] text-base"
        />
      </div>

      {aviso && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-semibold ${
            aviso.tipo === "ok"
              ? "bg-green-50 border border-green-300 text-green-800"
              : "bg-red-50 border border-red-300 text-red-800"
          }`}
        >
          {aviso.texto}
        </div>
      )}

      <Button
        onClick={enviar}
        disabled={subiendo}
        className="w-full h-14 text-lg font-bold bg-orange-600 hover:bg-orange-700"
      >
        {subiendo ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Enviando...</>) : "Enviar al club"}
      </Button>
      <p className="text-xs text-slate-500 text-center">
        El club revisará el material y decidirá qué se publica. Gracias por aportar 🙌
      </p>
    </div>
  );
}