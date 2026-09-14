import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cotejarArchivo } from "./cotejo/cotejarArchivo";
import { buildEmailContent } from "./cotejo/mensajesCotejo";
import CotejoGrupo from "./cotejo/CotejoGrupo";
import CotejoLecturaPreview from "./cotejo/CotejoLecturaPreview";

// Una fila = una persona. El extractor mapea las columnas del archivo a estos campos.
const SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      nombre: { type: "string" },
      email: { type: "string" },
      telefono: { type: "string" },
      dni: { type: "string" },
    },
  },
};

export default function CotejarArchivoPanel({ members, temporada }) {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [totalFilas, setTotalFilas] = useState(0);
  const [filasLeidas, setFilasLeidas] = useState([]);
  const [error, setError] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("");
  const inputRef = useRef(null);
  const altaUrl = "https://alta-socio.vercel.app/alta-socio.html";

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setLoading(true);
    setResultado(null);
    setError("");
    setNombreArchivo(file.name);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: SCHEMA,
      });

      if (extraction.status !== "success") {
        setError("No se pudo leer el archivo: " + (extraction.details || "formato no reconocido") + ". Asegúrate de que tiene una fila de cabecera con columnas Nombre, Email, Teléfono y DNI.");
        setLoading(false);
        return;
      }

      const salida = extraction.output;
      const lista = Array.isArray(salida) ? salida : (salida ? [salida] : []);
      const filas = lista.filter((p) => p && (p.nombre || p.email || p.telefono || p.dni));
      if (filas.length === 0) {
        setError("El archivo no contiene contactos reconocibles. Revisa que las columnas se llamen Nombre, Email, Teléfono o DNI.");
        setLoading(false);
        return;
      }

      setTotalFilas(filas.length);
      setFilasLeidas(filas);
      setResultado(cotejarArchivo(filas, members, temporada));
      toast.success(`${filas.length} contactos cotejados`);
    } catch (err) {
      setError("Error procesando el archivo: " + (err?.message || "desconocido"));
    } finally {
      setLoading(false);
    }
  };

  const sendEmails = async (personas, tipo) => {
    let sent = 0;
    for (const persona of personas) {
      if (!persona.email) continue;
      const { subject, body } = buildEmailContent({
        nombre: persona.nombre,
        tipo: persona.tipo || tipo,
        temporada,
        url: altaUrl,
      });
      try {
        const res = await base44.functions.invoke("sendEmail", { to: persona.email, subject, html: body });
        if (res.data?.error) throw new Error(res.data.error);
        sent++;
      } catch (err) {
        console.error("[Cotejo] Error enviando a", persona.email, err);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    toast.success(`✅ ${sent} de ${personas.length} emails enviados`);
  };

  // Los que hay que contactar: fueron socios y no han renovado + nunca lo han sido
  const noTenemos = resultado
    ? [
        ...resultado.exSocios.map((p) => ({ ...p, tipo: "ex_socio" })),
        ...resultado.nuevos.map((p) => ({ ...p, tipo: "nuevo" })),
      ]
    : [];

  return (
    <div className="space-y-4">
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-slate-50">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="text-xl font-bold text-slate-900">Cotejar archivo con la base de socios</h3>
              <p className="text-sm text-slate-600">
                Sube una lista de contactos y la app te dirá quién ya es socio, quién lo fue y no ha renovado, y quién nunca lo ha sido.
              </p>
            </div>
          </div>

          <Alert className="bg-white">
            <AlertDescription className="text-sm text-slate-700">
              Acepta Excel, CSV, PDF o una foto de la lista. Cuanto más claras estén las columnas
              (<strong>Nombre, Email, Teléfono, DNI</strong>), mejor será el cotejo. Se cruza por email, DNI y nombre completo.
            </AlertDescription>
          </Alert>

          <input ref={inputRef} type="file" onChange={handleFile} className="hidden" />
          <Button
            type="button"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Leyendo y cotejando...</>
              : <><Upload className="w-4 h-4 mr-2" /> Subir archivo y cotejar</>}
          </Button>

          {nombreArchivo && !error && (
            <p className="text-xs text-slate-500">Archivo: {nombreArchivo}</p>
          )}

          {error && (
            <Alert className="bg-red-50 border-red-300">
              <AlertDescription className="text-sm text-red-800">{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {resultado && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "En el archivo", valor: totalFilas, clase: "text-slate-700" },
              { label: "Ya son socios", valor: resultado.yaSocios.length, clase: "text-green-700" },
              { label: "No los tenemos", valor: noTenemos.length, clase: "text-orange-700" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 text-center">
                  <p className={`text-2xl font-bold ${s.clase}`}>{s.valor}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <CotejoGrupo
            titulo="📣 No los tenemos como socios"
            descripcion={`No están dados de alta en ${temporada}. Mensaje precargado para contactarles.`}
            color="border-orange-300"
            personas={noTenemos}
            tipo="nuevo"
            temporada={temporada}
            altaUrl={altaUrl}
            onSendEmail={sendEmails}
          />

          <CotejoLecturaPreview filas={filasLeidas} />

          {resultado.yaSocios.length > 0 && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800 ml-2">
                {resultado.yaSocios.length} personas del archivo ya son socias en {temporada}. No hace falta contactarlas.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}