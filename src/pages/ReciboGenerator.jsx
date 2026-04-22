import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Download, FileText, Trash2, Image as ImageIcon, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import ReciboPreview from "@/components/recibos/ReciboPreview";
import { generateReciboPDF, generateReciboBlob } from "@/components/recibos/reciboPdfGenerator";

const CLUB_LOGO_DEFAULT = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

const LS_SELLO = "recibo_sello_url";
const LS_LOGO = "recibo_logo_url";
const LS_FIRMA = "recibo_firma_url";

export default function ReciboGenerator() {
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem(LS_LOGO) || CLUB_LOGO_DEFAULT);
  const [selloUrl, setSelloUrl] = useState(() => localStorage.getItem(LS_SELLO) || "");
  const [firmaUrl, setFirmaUrl] = useState(() => localStorage.getItem(LS_FIRMA) || "");
  const [uploading, setUploading] = useState(null);

  const [form, setForm] = useState({
    numero: "",
    fecha: new Date().toISOString().slice(0, 10),
    recibiDe: "",
    cantidad: "",
    concepto: "Patrocinio / Colaboración temporada",
    temporada: "2025-2026",
    lugar: "Bustarviejo",
  });
  const [telefonoWA, setTelefonoWA] = useState("");
  const [sharingWA, setSharingWA] = useState(false);

  const logoInputRef = useRef(null);
  const selloInputRef = useRef(null);
  const firmaInputRef = useRef(null);

  const uploadImage = async (file, type) => {
    if (!file) return;
    setUploading(type);
    try {
      const { base44 } = await import("@/api/base44Client");
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (type === "logo") {
        setLogoUrl(file_url);
        localStorage.setItem(LS_LOGO, file_url);
        toast.success("Logo actualizado");
      } else if (type === "firma") {
        setFirmaUrl(file_url);
        localStorage.setItem(LS_FIRMA, file_url);
        toast.success("Firma guardada");
      } else {
        setSelloUrl(file_url);
        localStorage.setItem(LS_SELLO, file_url);
        toast.success("Sello guardado");
      }
    } catch (e) {
      toast.error("Error al subir la imagen");
    } finally {
      setUploading(null);
    }
  };

  const handleDownload = async () => {
    try {
      await generateReciboPDF({ ...form, logoUrl, selloUrl, firmaUrl });
      toast.success("Recibo descargado");
    } catch (e) {
      console.error(e);
      toast.error("Error al generar el PDF");
    }
  };

  const handleShareWhatsApp = async () => {
    if (!form.recibiDe || !form.cantidad) {
      toast.error("Rellena al menos 'Recibí de' y 'Cantidad'");
      return;
    }
    setSharingWA(true);
    try {
      const { blob, filename } = await generateReciboBlob({ ...form, logoUrl, selloUrl, firmaUrl });
      const file = new File([blob], filename, { type: "application/pdf" });

      const mensaje = `Hola ${form.recibiDe}, te adjunto el recibo Nº ${form.numero || "—"} por importe de ${form.cantidad}€ en concepto de ${form.concepto}${form.temporada ? ` (Temporada ${form.temporada})` : ""}. ¡Muchas gracias por tu colaboración con el CD Bustarviejo! 🧡`;

      // Intentar Web Share API con archivo (móvil)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Recibo ${form.numero || ""}`,
            text: mensaje,
          });
          toast.success("Recibo compartido");
          return;
        } catch (err) {
          if (err?.name === "AbortError") return;
          console.warn("Share API falló, usando fallback:", err);
        }
      }

      // Fallback: descargar PDF y abrir WhatsApp con mensaje pre-rellenado
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      const tel = telefonoWA.replace(/\D/g, "");
      const waUrl = tel
        ? `https://wa.me/${tel.startsWith("34") ? tel : "34" + tel}?text=${encodeURIComponent(mensaje)}`
        : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
      window.open(waUrl, "_blank");
      toast.success("PDF descargado. Adjúntalo en WhatsApp 📎");
    } catch (e) {
      console.error(e);
      toast.error("Error al compartir el recibo");
    } finally {
      setSharingWA(false);
    }
  };

  const resetSello = () => {
    localStorage.removeItem(LS_SELLO);
    setSelloUrl("");
  };

  const resetFirma = () => {
    localStorage.removeItem(LS_FIRMA);
    setFirmaUrl("");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-orange-600 text-white flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900">Generador de Recibos</h1>
            <p className="text-sm text-slate-500">Crea recibos profesionales con logo y sello del club</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Formulario */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Logo y sello
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-slate-500">Logo del club</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-16 h-16 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                      {logoUrl ? <img src={logoUrl} alt="logo" className="max-w-full max-h-full object-contain" /> : <ImageIcon className="w-5 h-5 text-slate-300" />}
                    </div>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0], "logo")} />
                    <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploading === "logo"}>
                      <Upload className="w-3.5 h-3.5 mr-1" /> {uploading === "logo" ? "Subiendo..." : "Cambiar logo"}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-500">Sello escaneado (PNG con fondo transparente recomendado)</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-16 h-16 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                      {selloUrl ? <img src={selloUrl} alt="sello" className="max-w-full max-h-full object-contain" /> : <ImageIcon className="w-5 h-5 text-slate-300" />}
                    </div>
                    <input ref={selloInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0], "sello")} />
                    <Button variant="outline" size="sm" onClick={() => selloInputRef.current?.click()} disabled={uploading === "sello"}>
                      <Upload className="w-3.5 h-3.5 mr-1" /> {uploading === "sello" ? "Subiendo..." : (selloUrl ? "Cambiar sello" : "Subir sello")}
                    </Button>
                    {selloUrl && (
                      <Button variant="ghost" size="sm" onClick={resetSello}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">El sello se guarda en este navegador para reutilizarlo.</p>
                </div>

                <div>
                  <Label className="text-xs text-slate-500">Firma escaneada (PNG con fondo transparente recomendado)</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-16 h-16 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                      {firmaUrl ? <img src={firmaUrl} alt="firma" className="max-w-full max-h-full object-contain" /> : <ImageIcon className="w-5 h-5 text-slate-300" />}
                    </div>
                    <input ref={firmaInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0], "firma")} />
                    <Button variant="outline" size="sm" onClick={() => firmaInputRef.current?.click()} disabled={uploading === "firma"}>
                      <Upload className="w-3.5 h-3.5 mr-1" /> {uploading === "firma" ? "Subiendo..." : (firmaUrl ? "Cambiar firma" : "Subir firma")}
                    </Button>
                    {firmaUrl && (
                      <Button variant="ghost" size="sm" onClick={resetFirma}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">La firma se guarda en este navegador para reutilizarla.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Datos del recibo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nº Recibo</Label>
                    <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="001/2025" />
                  </div>
                  <div>
                    <Label className="text-xs">Fecha</Label>
                    <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Recibí de</Label>
                  <Input value={form.recibiDe} onChange={(e) => setForm({ ...form, recibiDe: e.target.value })} placeholder="Nombre del comercio / persona" />
                </div>

                <div>
                  <Label className="text-xs">La cantidad de (€)</Label>
                  <Input value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} placeholder="100,00" />
                </div>

                <div>
                  <Label className="text-xs">En concepto de</Label>
                  <Textarea rows={2} value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Temporada</Label>
                    <Input value={form.temporada} onChange={(e) => setForm({ ...form, temporada: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Lugar</Label>
                    <Input value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-green-600" /> Enviar por WhatsApp (opcional)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label className="text-xs">Teléfono del destinatario</Label>
                <Input
                  value={telefonoWA}
                  onChange={(e) => setTelefonoWA(e.target.value)}
                  placeholder="600 123 456 (sin prefijo si es España)"
                />
                <p className="text-[11px] text-slate-400">
                  Si lo dejas vacío, podrás elegir el contacto al compartir. En móvil se adjunta el PDF directamente; en ordenador se descarga y se abre WhatsApp Web.
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button onClick={handleDownload} className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 text-base font-bold">
                <Download className="w-5 h-5 mr-2" /> Descargar PDF
              </Button>
              <Button onClick={handleShareWhatsApp} disabled={sharingWA} className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-bold">
                <MessageCircle className="w-5 h-5 mr-2" /> {sharingWA ? "Preparando..." : "Enviar por WhatsApp"}
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:sticky lg:top-6 self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vista previa</CardTitle>
              </CardHeader>
              <CardContent>
                <ReciboPreview {...form} logoUrl={logoUrl} selloUrl={selloUrl} firmaUrl={firmaUrl} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}