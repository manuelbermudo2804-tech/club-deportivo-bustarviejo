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
  const [progreso, setProgreso] = useState({ hecho: 0, total: 0 });
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'error' | 'parcial', texto }

  const elegirArchivos = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    setArchivos(files);
    setAviso(null);
  };

  const pesoMB = (f) => f.size / (1024 * 1024);
  const archivosPesados = archivos.filter((f) => pesoMB(f) > 100);

  const enviar = async () => {
    setAviso(null);
    if (!equipo) return setAviso({ tipo: "error", texto: "Elige primero el equipo (paso 1)" });
    if (!archivos.length) return setAviso({ tipo: "error", texto: "Elige al menos una foto o vídeo (paso 2)" });
    if (!descripcion.trim()) return setAviso({ tipo: "error", texto: "Cuéntanos qué se ve en la foto o vídeo (paso 3)" });

    setSubiendo(true);
    setProgreso({ hecho: 0, total: archivos.length });
    let subidas = 0;
    const fallidos = [];
    const okFiles = [];
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
        okFiles.push(file);
      } catch (err) {
        fallidos.push(file.name);
        console.error("[SubirContenido] fallo con", file.name, err);
      }
      setProgreso((p) => ({ ...p, hecho: p.hecho + 1 }));
    }
    setSubiendo(false);
    setProgreso({ hecho: 0, total: 0 });

    if (subidas && !fallidos.length) {
      setAviso({ tipo: "ok", texto: `¡Gracias! Has enviado ${subidas} ${subidas === 1 ? "archivo" : "archivos"} al club` });
      setArchivos([]);
      setDescripcion("");
      if (inputRef.current) inputRef.current.value = "";
      onDone?.();
    } else if (subidas && fallidos.length) {
      // Los que sí subieron quedan guardados; dejamos en la lista solo los que fallaron
      setAviso({
        tipo: "parcial",
        texto: `Se enviaron ${subidas} al club, pero no se pudo con: ${fallidos.join(", ")}. Suelen ser vídeos muy largos o pesados: recórtalo en el móvil y vuelve a darle a Enviar.`,
      });
      setArchivos(archivos.filter((f) => !okFiles.includes(f)));
      onDone?.();
    } else {
      setAviso({
        tipo: "error",
        texto: "No se pudo enviar. Si es un vídeo largo o pesado, recórtalo en el móvil (menos de 1 minuto) y vuelve a intentarlo.",
      });
    }
  };

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
        Para enviarlo, completa los tres pasos: <strong className="text-slate-800">equipo</strong>, <strong className="text-slate-800">archivo</strong> y <strong className="text-slate-800">descripción</strong>.
      </p>

      {/* Paso 1 */}
      <div>
        <p className="mb-2 font-bold text-slate-800">1. ¿De qué equipo es? <span className="text-orange-600">*</span></p>
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
        <p className="mb-2 font-bold text-slate-800">2. Elige las fotos o el vídeo <span className="text-orange-600">*</span></p>
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
          className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 px-4 py-8 transition-colors hover:bg-orange-100 sm:py-10"
        >
          <Camera className="w-9 h-9 text-orange-500" />
          <span className="font-bold text-orange-700">Pulsa aquí para elegir</span>
          <span className="text-xs text-slate-500">Hasta 5 archivos · fotos y vídeos</span>
          <span className="text-xs text-slate-500">Los vídeos, mejor cortos (menos de 1 minuto)</span>
        </button>

        {archivosPesados.length > 0 && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-300 px-4 py-3 text-sm text-amber-900">
            <strong>Ojo, hay archivos muy pesados</strong> ({archivosPesados.map((f) => `${f.name} · ${Math.round(pesoMB(f))} MB`).join(", ")}).
            Puede tardar bastante o fallar. Si es un vídeo largo, recórtalo en el móvil antes de enviarlo.
          </div>
        )}

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
        <p className="mb-2 font-bold text-slate-800">3. ¿Qué se ve? <span className="text-orange-600">*</span></p>
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
              : aviso.tipo === "parcial"
              ? "bg-amber-50 border border-amber-300 text-amber-900"
              : "bg-red-50 border border-red-300 text-red-800"
          }`}
        >
          {aviso.texto}
        </div>
      )}

      <Button
        onClick={enviar}
        disabled={subiendo}
        className="h-14 w-full rounded-xl bg-orange-600 text-base font-bold text-white shadow-sm hover:bg-orange-700 sm:text-lg"
      >
        {subiendo ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            {progreso.total > 1 ? `Enviando ${progreso.hecho + 1} de ${progreso.total}...` : "Enviando..."}
          </>
        ) : "Enviar al club"}
      </Button>
      {subiendo && (
        <p className="text-xs text-slate-500 text-center">
          No cierres la app hasta que termine. Los vídeos tardan más que las fotos.
        </p>
      )}
      <p className="text-xs text-slate-500 text-center">
        El club revisará el material y decidirá qué se publica. Gracias por aportar 🙌
      </p>
    </div>
  );
}