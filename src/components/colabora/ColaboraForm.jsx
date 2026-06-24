import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Upload, CreditCard, CheckCircle2 } from "lucide-react";
import { NIVELES } from "./ColaboraNiveles";

export default function ColaboraForm({ nivelId, otraCantidad, onOtraCantidadChange }) {
  const [form, setForm] = useState({
    nombre_comercio: "",
    contacto_nombre: "",
    email: "",
    telefono: "",
    website_url: "",
  });
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const nivel = NIVELES.find((n) => n.id === nivelId);
  const importe = nivelId === "otra" ? Number(otraCantidad) || 0 : nivel?.precio || 0;
  const nivelNombre = nivelId === "otra" ? "Otra cantidad" : nivel?.nombre || "";

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await base44.functions.invoke("landingUploadFile", fd);
      if (res?.data?.file_url) setLogoUrl(res.data.file_url);
      else setError("No se pudo subir el logo, inténtalo de nuevo.");
    } catch {
      setError("No se pudo subir el logo, inténtalo de nuevo.");
    }
    setUploadingLogo(false);
  };

  const handlePay = async () => {
    setError("");
    if (!nivelId) return setError("Elige una opción de colaboración arriba.");
    if (!form.nombre_comercio || !form.email) return setError("El nombre del negocio y el email son obligatorios.");
    if (!(importe > 0)) return setError("Indica un importe válido.");

    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("collaborationCheckout", {
        ...form,
        logo_url: logoUrl,
        nivel_nombre: nivelNombre,
        importe,
        origin: window.location.origin,
        honeypot,
      });
      if (res?.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError(res?.data?.error || "No se pudo iniciar el pago.");
        setSubmitting(false);
      }
    } catch (e) {
      setError(e?.response?.data?.error || "Error al iniciar el pago.");
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-md p-5 lg:p-6 space-y-4">
      <h3 className="text-lg font-black text-slate-900">Tus datos</h3>

      {nivelId === "otra" && (
        <div>
          <label className="text-sm font-semibold text-slate-700">Importe a aportar (€) *</label>
          <input
            type="number" min="1" inputMode="decimal"
            value={otraCantidad}
            onChange={(e) => onOtraCantidadChange(e.target.value)}
            placeholder="Ej: 75"
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
          />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-slate-700">Nombre del negocio *</label>
          <input value={form.nombre_comercio} onChange={set("nombre_comercio")} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Persona de contacto</label>
          <input value={form.contacto_nombre} onChange={set("contacto_nombre")} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Email *</label>
          <input type="email" value={form.email} onChange={set("email")} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Teléfono</label>
          <input type="tel" value={form.telefono} onChange={set("telefono")} className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm font-semibold text-slate-700">Web del negocio (opcional)</label>
          <input value={form.website_url} onChange={set("website_url")} placeholder="https://..." className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none" />
          <p className="text-[11px] text-slate-400 mt-1">Tu logo en el banner enlazará a esta web.</p>
        </div>
      </div>

      {/* Logo */}
      <div>
        <label className="text-sm font-semibold text-slate-700">Logo del negocio</label>
        <div className="mt-1 flex items-center gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all">
            {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {logoUrl ? "Cambiar logo" : "Subir logo"}
            <input type="file" accept="image/*" onChange={handleLogo} className="hidden" disabled={uploadingLogo} />
          </label>
          {logoUrl && (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Logo subido
            </span>
          )}
        </div>
        {logoUrl && <img src={logoUrl} alt="Logo" className="mt-3 h-16 object-contain rounded-lg border border-slate-200 bg-white p-1" />}
      </div>

      {/* Honeypot anti-bot */}
      <input type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="hidden" tabIndex="-1" autoComplete="off" aria-hidden="true" />

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <button
        onClick={handlePay}
        disabled={submitting || uploadingLogo}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black px-6 py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
        {submitting ? "Redirigiendo al pago..." : importe > 0 ? `Pagar ${importe}€ con tarjeta` : "Pagar con tarjeta"}
      </button>
      <p className="text-[11px] text-slate-400 text-center">Pago seguro con tarjeta · Tu banner se activará tras la revisión del club.</p>
    </div>
  );
}