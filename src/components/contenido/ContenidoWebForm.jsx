import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, AlertTriangle } from "lucide-react";
import { EQUIPOS_CONTENIDO } from "@/components/contenido/categoriasContenido";

const MAX_MB = 10;

const leerBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1]);
  reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
  reader.readAsDataURL(file);
});

export default function ContenidoWebForm({ onDone }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [equipo, setEquipo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [file, setFile] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const pesoMb = file ? file.size / (1024 * 1024) : 0;
  const demasiadoGrande = pesoMb > MAX_MB;
  const puedeEnviar = nombre.trim() && equipo && file && !demasiadoGrande && !enviando;

  const enviar = async () => {
    setError("");
    setEnviando(true);
    try {
      const archivo_base64 = await leerBase64(file);
      const res = await base44.functions.invoke("enviarContenidoWeb", {
        equipo, descripcion, nombre, email,
        archivo_base64,
        archivo_nombre: file.name,
        archivo_tipo: file.type,
      });
      setEnviando(false);
      if (res?.data?.success) onDone();
      else setError(res?.data?.error || "No se ha podido enviar. Inténtalo otra vez.");
    } catch (e) {
      setEnviando(false);
      setError(e?.response?.data?.error || "No se ha podido enviar. Revisa tu conexión e inténtalo otra vez.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Tu nombre *</Label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: María López" className="mt-1.5" />
        </div>
        <div>
          <Label>Tu email (opcional)</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Para avisarte si lo publicamos" className="mt-1.5" />
        </div>
      </div>

      <div>
        <Label>¿De qué equipo es? *</Label>
        <Select value={equipo} onValueChange={setEquipo}>
          <SelectTrigger className="mt-1.5"><SelectValue placeholder="Elige el equipo" /></SelectTrigger>
          <SelectContent>
            {EQUIPOS_CONTENIDO.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Foto o vídeo *</Label>
        <Input type="file" accept="image/*,video/*" onChange={(e) => { setFile(e.target.files?.[0] || null); setError(""); }} className="mt-1.5" />
        <p className="text-xs text-slate-500 mt-1.5">Un archivo cada vez · máximo {MAX_MB} MB</p>
        {file && !demasiadoGrande && (
          <p className="text-xs text-slate-600 mt-1">{file.name} · {pesoMb.toFixed(1)} MB</p>
        )}
        {demasiadoGrande && (
          <Alert className="mt-2 bg-amber-50 border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-900 text-sm">
              Pesa {pesoMb.toFixed(0)} MB y el máximo son {MAX_MB} MB. Si es un vídeo largo, recórtalo o envíalo desde la app del club.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div>
        <Label>¿Qué se ve? (opcional)</Label>
        <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej: gol de falta en el partido del sábado" className="mt-1.5" rows={2} />
      </div>

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription className="text-red-800 text-sm">{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={enviar} disabled={!puedeEnviar} className="w-full bg-rose-600 hover:bg-rose-700 h-12 text-base">
        {enviando ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Enviando...</> : <><Upload className="w-5 h-5 mr-2" /> Enviar al club</>}
      </Button>
    </div>
  );
}