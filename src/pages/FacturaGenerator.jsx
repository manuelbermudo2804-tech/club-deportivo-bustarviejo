import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Download, FileText, Trash2, Image as ImageIcon, MessageCircle, Plus, X } from "lucide-react";
import { toast } from "sonner";
import FacturaPreview from "@/components/facturas/FacturaPreview";
import { generateFacturaPDF, generateFacturaBlob } from "@/components/facturas/facturaPdfGenerator";

const CLUB_LOGO_DEFAULT = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

// Reutilizamos las mismas claves que el recibo para que sello/firma/logo sean compartidos
const LS_SELLO = "recibo_sello_url";
const LS_LOGO = "recibo_logo_url";
const LS_FIRMA = "recibo_firma_url";
// Datos del emisor — propios de facturas
const LS_EMISOR = "factura_emisor_datos";

const DEFAULT_EMISOR = {
  emisorNombre: "CD BUSTARVIEJO",
  emisorCif: "G-86543210",
  emisorDireccion: "C/ Real, s/n",
  emisorCp: "28720 Bustarviejo (Madrid)",
  emisorEmail: "info@cdbustarviejo.com",
  emisorTelefono: "",
};

export default function FacturaGenerator() {
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem(LS_LOGO) || CLUB_LOGO_DEFAULT);
  const [selloUrl, setSelloUrl] = useState(() => localStorage.getItem(LS_SELLO) || "");
  const [firmaUrl, setFirmaUrl] = useState(() => localStorage.getItem(LS_FIRMA) || "");
  const [uploading, setUploading] = useState(null);

  const [emisor, setEmisor] = useState(() => {
    try {
      const stored = localStorage.getItem(LS_EMISOR);
      return stored ? { ...DEFAULT_EMISOR, ...JSON.parse(stored) } : DEFAULT_EMISOR;
    } catch { return DEFAULT_EMISOR; }
  });

  const [form, setForm] = useState({
    numero: "",
    fecha: new Date().toISOString().slice(0, 10),
    fechaVencimiento: "",
    clienteNombre: "",
    clienteCif: "",
    clienteDireccion: "",
    clienteCp: "",
    clienteEmail: "",
    ivaPct: 21,
    formaPago: "Transferencia bancaria",
    iban: "",
    observaciones: "",
  });

  const [lineas, setLineas] = useState([
    { descripcion: "Patrocinio temporada 2025-2026", cantidad: 1, precio: "" },
  ]);

  const [telefonoWA, setTelefonoWA] = useState("");
  const [sharingWA, setSharingWA] = useState(false);

  const logoInputRef = useRef(null);
  const selloInputRef = useRef(null);
  const firmaInputRef = useRef(null);

  const updateEmisor = (campo, valor) => {
    const next = { ...emisor, [campo]: valor };
    setEmisor(next);
    localStorage.setItem(LS_EMISOR, JSON.stringify(next));
  };

  const uploadImage = async (file, type) => {
    if (!file) return;
    setUploading(type);
    try {
      const { base44 } = await import("@/api/base44Client");
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (type === "logo") { setLogoUrl(file_url); localStorage.setItem(LS_LOGO, file_url); toast.success("Logo actualizado"); }
      else if (type === "firma") { setFirmaUrl(file_url); localStorage.setItem(LS_FIRMA, file_url); toast.success("Firma guardada"); }
      else { setSelloUrl(file_url); localStorage.setItem(LS_SELLO, file_url); toast.success("Sello guardado"); }
    } catch {
      toast.error("Error al subir la imagen");
    } finally {
      setUploading(null);
    }
  };

  const addLinea = () => setLineas([...lineas, { descripcion: "", cantidad: 1, precio: "" }]);
  const removeLinea = (idx) => setLineas(lineas.filter((_, i) => i !== idx));
  const updateLinea = (idx, campo, valor) => {
    setLineas(lineas.map((l, i) => i === idx ? { ...l, [campo]: valor } : l));
  };

  const buildParams = () => ({
    ...form,
    ...emisor,
    lineas,
    logoUrl,
    selloUrl,
    firmaUrl,
  });

  const handleDownload = async () => {
    if (!form.clienteNombre) { toast.error("Indica el nombre del cliente"); return; }
    try {
      await generateFacturaPDF(buildParams());
      toast.success("Factura descargada");
    } catch (e) {
      console.error(e);
      toast.error("Error al generar el PDF");
    }
  };

  const handleShareWhatsApp = async () => {
    if (!form.clienteNombre) { toast.error("Indica el nombre del cliente"); return; }
    setSharingWA(true);
    try {
      const { blob, filename } = await generateFacturaBlob(buildParams());
      const file = new File([blob], filename, { type: "application/pdf" });
      const mensaje = `Hola ${form.clienteNombre}, te adjunto la factura Nº ${form.numero || "—"} del CD Bustarviejo. ¡Muchas gracias! 🧡`;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Factura ${form.numero || ""}`, text: mensaje });
          toast.success("Factura compartida");
          return;
        } catch (err) {
          if (err?.name === "AbortError") return;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      const tel = telefonoWA.replace(/\D/g, "");
      const waUrl = tel
        ? `https://wa.me/${tel.startsWith("34") ? tel : "34" + tel}?text=${encodeURIComponent(mensaje)}`
        : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
      window.open(waUrl, "_blank");
      toast.success("PDF descargado. Adjúntalo en WhatsApp 📎");
    } catch (e) {
      console.error(e);
      toast.error("Error al compartir la factura");
    } finally {
      setSharingWA(false);
    }
  };

  const resetSello = () => { localStorage.removeItem(LS_SELLO); setSelloUrl(""); };
  const resetFirma = () => { localStorage.removeItem(LS_FIRMA); setFirmaUrl(""); };

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-orange-600 text-white flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900">Generador de Facturas</h1>
            <p className="text-sm text-slate-500">Facturas profesionales con sello, firma y datos fiscales</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Formulario */}
          <div className="space-y-4">
            {/* Logo / Sello / Firma */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Logo, sello y firma
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
                  <Label className="text-xs text-slate-500">Sello</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-16 h-16 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                      {selloUrl ? <img src={selloUrl} alt="sello" className="max-w-full max-h-full object-contain" /> : <ImageIcon className="w-5 h-5 text-slate-300" />}
                    </div>
                    <input ref={selloInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0], "sello")} />
                    <Button variant="outline" size="sm" onClick={() => selloInputRef.current?.click()} disabled={uploading === "sello"}>
                      <Upload className="w-3.5 h-3.5 mr-1" /> {uploading === "sello" ? "Subiendo..." : (selloUrl ? "Cambiar sello" : "Subir sello")}
                    </Button>
                    {selloUrl && <Button variant="ghost" size="sm" onClick={resetSello}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-500">Firma</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-16 h-16 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                      {firmaUrl ? <img src={firmaUrl} alt="firma" className="max-w-full max-h-full object-contain" /> : <ImageIcon className="w-5 h-5 text-slate-300" />}
                    </div>
                    <input ref={firmaInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0], "firma")} />
                    <Button variant="outline" size="sm" onClick={() => firmaInputRef.current?.click()} disabled={uploading === "firma"}>
                      <Upload className="w-3.5 h-3.5 mr-1" /> {uploading === "firma" ? "Subiendo..." : (firmaUrl ? "Cambiar firma" : "Subir firma")}
                    </Button>
                    {firmaUrl && <Button variant="ghost" size="sm" onClick={resetFirma}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Sello y firma se comparten con el Generador de Recibos.</p>
                </div>
              </CardContent>
            </Card>

            {/* Emisor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Datos del emisor (Club)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Razón social</Label>
                    <Input value={emisor.emisorNombre} onChange={(e) => updateEmisor("emisorNombre", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">CIF</Label>
                    <Input value={emisor.emisorCif} onChange={(e) => updateEmisor("emisorCif", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Dirección</Label>
                  <Input value={emisor.emisorDireccion} onChange={(e) => updateEmisor("emisorDireccion", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">CP / Localidad</Label>
                  <Input value={emisor.emisorCp} onChange={(e) => updateEmisor("emisorCp", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={emisor.emisorEmail} onChange={(e) => updateEmisor("emisorEmail", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Teléfono</Label>
                    <Input value={emisor.emisorTelefono} onChange={(e) => updateEmisor("emisorTelefono", e.target.value)} />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">Los datos del emisor se guardan automáticamente.</p>
              </CardContent>
            </Card>

            {/* Datos factura + cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Datos de la factura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Nº Factura</Label>
                    <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="2025/001" />
                  </div>
                  <div>
                    <Label className="text-xs">Fecha</Label>
                    <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Vencimiento</Label>
                    <Input type="date" value={form.fechaVencimiento} onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })} />
                  </div>
                </div>

                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Cliente</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Nombre / Razón social *</Label>
                        <Input value={form.clienteNombre} onChange={(e) => setForm({ ...form, clienteNombre: e.target.value })} placeholder="Empresa S.L." />
                      </div>
                      <div>
                        <Label className="text-xs">CIF / NIF</Label>
                        <Input value={form.clienteCif} onChange={(e) => setForm({ ...form, clienteCif: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Dirección</Label>
                      <Input value={form.clienteDireccion} onChange={(e) => setForm({ ...form, clienteDireccion: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">CP / Localidad</Label>
                        <Input value={form.clienteCp} onChange={(e) => setForm({ ...form, clienteCp: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Email</Label>
                        <Input value={form.clienteEmail} onChange={(e) => setForm({ ...form, clienteEmail: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Líneas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Conceptos
                  <Button size="sm" variant="outline" onClick={addLinea}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Añadir línea
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lineas.map((linea, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Descripción</Label>
                        <Textarea
                          rows={2}
                          value={linea.descripcion}
                          onChange={(e) => updateLinea(idx, "descripcion", e.target.value)}
                          placeholder="Patrocinio temporada 2025-2026"
                        />
                      </div>
                      {lineas.length > 1 && (
                        <Button size="icon" variant="ghost" onClick={() => removeLinea(idx)} className="mt-5">
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Cantidad</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={linea.cantidad}
                          onChange={(e) => updateLinea(idx, "cantidad", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Precio unitario (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={linea.precio}
                          onChange={(e) => updateLinea(idx, "precio", e.target.value)}
                          placeholder="500.00"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <Label className="text-xs">IVA (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.ivaPct}
                      onChange={(e) => setForm({ ...form, ivaPct: e.target.value })}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Usa 0 si está exento.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pago + observaciones */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pago y observaciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Forma de pago</Label>
                  <Input value={form.formaPago} onChange={(e) => setForm({ ...form, formaPago: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">IBAN</Label>
                  <Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="ES00 0000 0000 00 0000000000" />
                </div>
                <div>
                  <Label className="text-xs">Observaciones</Label>
                  <Textarea
                    rows={2}
                    value={form.observaciones}
                    onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                    placeholder="Pago a 30 días desde fecha factura"
                  />
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp */}
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
                <FacturaPreview {...form} {...emisor} lineas={lineas} logoUrl={logoUrl} selloUrl={selloUrl} firmaUrl={firmaUrl} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}