import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Handshake, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Bloque público "Quiero patrocinar": tarjeta con un botón que despliega un
// formulario para que una empresa se ofrezca a patrocinar el torneo.
// La solicitud se guarda en TorneoPatrocinioSolicitud vía la función pública.
export default function PatrocinarBlock({ datos = {}, color, slug, paginaNombre }) {
  const [abierto, setAbierto] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState({ nombre_empresa: "", nombre_contacto: "", email: "", telefono: "", mensaje: "" });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const enviar = async (e) => {
    e.preventDefault();
    if (!form.nombre_empresa || !form.nombre_contacto || !form.email || !form.telefono) {
      toast.error("Completa empresa, contacto, email y teléfono");
      return;
    }
    setEnviando(true);
    try {
      const { data } = await base44.functions.submitTorneoPatrocinio({
        landing_slug: slug || "",
        pagina_nombre: paginaNombre || datos.titulo || "",
        ...form,
      });
      if (data?.success) {
        setEnviado(true);
      } else {
        toast.error(data?.error || "No se pudo enviar. Inténtalo de nuevo.");
      }
    } catch {
      toast.error("No se pudo enviar. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const titulo = datos.titulo || "¿Quieres patrocinar el torneo?";
  const descripcion = datos.descripcion || "Da visibilidad a tu marca ante cientos de familias y deportistas. Déjanos tus datos y te contamos las opciones.";
  const textoBoton = datos.texto_boton || "Quiero patrocinar";

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 lg:py-16">
      <div
        className="rounded-3xl border border-slate-200 shadow-lg overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}0d, #ffffff)` }}
      >
        <div className="p-8 lg:p-10 text-center">
          <div
            className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
            style={{ background: `${color}1a`, color }}
          >
            <Handshake className="w-8 h-8" />
          </div>
          <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-3">{titulo}</h2>
          <p className="text-slate-600 text-base lg:text-lg leading-relaxed max-w-xl mx-auto">{descripcion}</p>

          {enviado ? (
            <div className="mt-8 flex flex-col items-center gap-3 text-green-700">
              <CheckCircle2 className="w-12 h-12" />
              <p className="text-lg font-bold">¡Solicitud enviada!</p>
              <p className="text-sm text-slate-500">Nos pondremos en contacto contigo en breve.</p>
            </div>
          ) : !abierto ? (
            <Button
              onClick={() => setAbierto(true)}
              className="mt-8 px-10 py-6 rounded-full text-lg font-bold text-white shadow-xl hover:scale-105 transition-transform"
              style={{ background: `linear-gradient(135deg, ${color}, ${color})` }}
            >
              {textoBoton}
            </Button>
          ) : (
            <form onSubmit={enviar} className="mt-8 space-y-3 text-left max-w-md mx-auto">
              <Input value={form.nombre_empresa} onChange={(e) => set("nombre_empresa", e.target.value)} placeholder="Nombre de la empresa *" />
              <Input value={form.nombre_contacto} onChange={(e) => set("nombre_contacto", e.target.value)} placeholder="Persona de contacto *" />
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Email *" />
              <Input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="Teléfono *" />
              <Textarea value={form.mensaje} onChange={(e) => set("mensaje", e.target.value)} placeholder="Mensaje (opcional)" rows={3} />
              <Button
                type="submit"
                disabled={enviando}
                className="w-full py-6 rounded-full text-lg font-bold text-white shadow-xl"
                style={{ background: `linear-gradient(135deg, ${color}, ${color})` }}
              >
                {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar solicitud"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}