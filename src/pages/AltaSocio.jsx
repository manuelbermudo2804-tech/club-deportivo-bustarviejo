import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Gift, ShieldCheck } from "lucide-react";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function AltaSocio() {
  const [refCode, setRefCode] = useState("");
  const [referidor, setReferidor] = useState(null); // { nombre, email }
  const [form, setForm] = useState({ nombre_completo: "", email: "", telefono: "" });
  const [tipoPago, setTipoPago] = useState("unico"); // 'unico' | 'suscripcion'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;
    setRefCode(ref);
    (async () => {
      try {
        const { data } = await base44.functions.invoke("resolveReferralCode", { code: ref });
        if (data?.found) {
          setReferidor({ nombre: data.referidor_nombre, email: data.referidor_email });
        }
      } catch {}
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.nombre_completo.trim() || !form.email.trim()) {
      setError("Por favor, rellena tu nombre y email.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await base44.functions.invoke("publicMemberCheckout", {
        nombre_completo: form.nombre_completo.trim(),
        email: form.email.trim().toLowerCase(),
        telefono: form.telefono.trim(),
        tipo_pago: tipoPago,
        tipo_inscripcion: "Nueva Inscripción",
        referido_por: refCode || "",
        referidor_nombre: referidor?.nombre || "",
        referidor_email: referidor?.email || "",
        success_url: `${window.location.origin}/AltaSocio?paid=ok`,
        cancel_url: `${window.location.origin}/AltaSocio${refCode ? `?ref=${refCode}` : ""}`,
      });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError(data?.error || "No se pudo iniciar el pago. Inténtalo de nuevo.");
        setSubmitting(false);
      }
    } catch (err) {
      setError(err?.message || "Error al procesar. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  };

  const paidOk = new URLSearchParams(window.location.search).get("paid") === "ok";
  if (paidOk) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-900 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-4 border-white shadow-2xl">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-20 h-20 text-green-600 mx-auto" />
            <h1 className="text-2xl font-bold text-slate-900">¡Bienvenido/a al club! 🎉</h1>
            <p className="text-slate-600">Hemos recibido tu pago. Te enviaremos un email con tu carnet de socio. ¡Gracias por apoyar al CD Bustarviejo!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-700 to-green-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <div className="text-center text-white">
          <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-16 h-16 mx-auto mb-3 rounded-xl shadow-lg" />
          <h1 className="text-2xl font-bold">Hazte socio del CD Bustarviejo</h1>
          <p className="text-white/90 text-sm mt-1">Cuota anual: 25€ · Apoya el deporte base de Bustarviejo</p>
        </div>

        {referidor && (
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center text-white border border-white/30 flex items-center justify-center gap-2">
            <Gift className="w-5 h-5 text-yellow-300" />
            <p className="text-sm"><strong>{referidor.nombre}</strong> te ha invitado a unirte al club 💚</p>
          </div>
        )}

        <Card className="border-none shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Tus datos</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre y apellidos *</Label>
                <Input id="nombre" value={form.nombre_completo} onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })} placeholder="María García" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="maria@email.com" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefono">Teléfono (opcional)</Label>
                <Input id="telefono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="600 000 000" />
              </div>

              <div className="space-y-2">
                <Label>Tipo de pago</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setTipoPago("unico")} className={`rounded-xl p-3 text-sm font-semibold border-2 transition-all ${tipoPago === "unico" ? "border-orange-600 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-600"}`}>
                    Pago único<br /><span className="text-xs font-normal">25€ una vez</span>
                  </button>
                  <button type="button" onClick={() => setTipoPago("suscripcion")} className={`rounded-xl p-3 text-sm font-semibold border-2 transition-all ${tipoPago === "suscripcion" ? "border-orange-600 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-600"}`}>
                    Renovación anual<br /><span className="text-xs font-normal">25€/año automático</span>
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{error}</p>}

              <Button type="submit" disabled={submitting} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-base">
                {submitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Procesando...</> : "Pagar 25€ y hacerme socio"}
              </Button>

              <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Pago seguro con tarjeta vía Stripe
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}