import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Loader2, Mail, Send, Calendar, MessageCircle, CreditCard, Camera, Bell, Trophy, Shield, Sparkles, ChevronDown, ChevronUp, Lock, Phone } from "lucide-react";
import BackToAppButton from "../components/public/BackToAppButton";
import BackToWebsiteButton from "../components/public/BackToWebsiteButton";
import { getDeviceFingerprint } from "../components/sanisidro/deviceFingerprint";
import usePublicPageTracker from "../components/public/usePublicPageTracker";
import InstallHelpRequestForm from "../components/public/InstallHelpRequestForm";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

const TYPO_DOMAINS = {
  "gmial.com": "gmail.com", "gmal.com": "gmail.com", "gmil.com": "gmail.com",
  "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gnail.com": "gmail.com",
  "gmail.co": "gmail.com", "gmail.es": "gmail.com", "gmaill.com": "gmail.com",
  "gmaiil.com": "gmail.com", "gemail.com": "gmail.com", "gimail.com": "gmail.com",
  "hotmal.com": "hotmail.com", "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com",
  "hotmaill.com": "hotmail.com", "hotamil.com": "hotmail.com", "hotmil.com": "hotmail.com",
  "hotmail.co": "hotmail.com", "hotmail.con": "hotmail.com",
  "outloo.com": "outlook.com", "outlok.com": "outlook.com", "outllook.com": "outlook.com",
  "outlool.com": "outlook.com", "outlook.co": "outlook.com",
  "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yahoo.co": "yahoo.com",
  "yahho.com": "yahoo.com", "yhaoo.com": "yahoo.com",
  "iclod.com": "icloud.com", "icluod.com": "icloud.com", "icloud.co": "icloud.com",
  "outlook.con": "outlook.com",
};

function checkEmailTypo(emailValue) {
  if (!emailValue || !emailValue.includes("@")) return null;
  const domain = emailValue.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  const suggestion = TYPO_DOMAINS[domain];
  if (suggestion) return emailValue.split("@")[0] + "@" + suggestion;
  return null;
}

const CATEGORIAS = [
  "Fútbol Pre-Benjamín (Mixto)",
  "Fútbol Benjamín (Mixto)",
  "Fútbol Alevín (Mixto)",
  "Fútbol Infantil (Mixto)",
  "Fútbol Cadete",
  "Fútbol Juvenil",
  "Fútbol Aficionado",
  "Fútbol Femenino",
  "Baloncesto (Mixto)",
  "No lo sé aún",
];

const BENEFITS = [
  { icon: Calendar, label: "Calendario", color: "text-blue-600 bg-blue-50" },
  { icon: MessageCircle, label: "Chats", color: "text-green-600 bg-green-50" },
  { icon: CreditCard, label: "Pagos", color: "text-purple-600 bg-purple-50" },
  { icon: Camera, label: "Fotos", color: "text-pink-600 bg-pink-50" },
  { icon: Bell, label: "Avisos", color: "text-orange-600 bg-orange-50" },
  { icon: Trophy, label: "Resultados", color: "text-amber-600 bg-amber-50" },
];

const STEPS = [
  { num: 1, title: "Rellena el formulario", desc: "Tus datos básicos" },
  { num: 2, title: "Recibe tu código", desc: "Te lo enviamos por email en menos de 24h" },
  { num: 3, title: "Instala la app y entra", desc: "Con tu código accedes y te registras" },
];

export default function PublicAccessRequest() {
  usePublicPageTracker("PublicAccessRequest");
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [categoria, setCategoria] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [aceptaGdpr, setAceptaGdpr] = useState(false);
  const [showGdprDetails, setShowGdprDetails] = useState(false);
  const [prefiereWhatsapp, setPrefiereWhatsapp] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  const emailsMatch = email && emailConfirm && email.trim().toLowerCase() === emailConfirm.trim().toLowerCase();
  const emailSuggestion = checkEmailTypo(email);

  const trackEvent = (accion, detalles = {}, severidad = "info") => {
    // Llamada HTTP directa: la página es pública (sin login), el SDK rechazaría
    // la petición con 403 silencioso. logPublicEvent guarda con service role.
    try {
      fetch(`${window.location.origin}/functions/logPublicEvent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          event_type: "app_error",
          context: `PublicAccessRequest · ${accion}`,
          error_message: detalles.motivo || detalles.mensaje || accion,
          user_email: email || "anónimo",
          page_path: "/SolicitarAcceso",
          user_agent: navigator.userAgent,
          device: /Mobile|Android|iPhone/.test(navigator.userAgent) ? "móvil" : "desktop",
          extra_data: { accion, severidad, ...detalles },
          severity: severidad === "error" ? "error" : severidad === "warning" ? "warning" : "info",
        }),
      }).catch(() => {});
    } catch {}
  };

  // Snapshot del formulario para poder recuperar la solicitud si falla el servidor
  const formSnapshot = () => ({
    email: email.trim().toLowerCase(),
    nombre_progenitor: nombre.trim(),
    telefono: telefono.trim(),
    categoria,
    prefiere_whatsapp: prefiereWhatsapp,
  });

  // ---- Tracking de ABANDONO de formulario ----
  // Si el usuario rellena algo y cierra la pestaña sin enviar, lo registramos
  // una sola vez por sesión (con los datos rellenados para poder contactar).
  const formStateRef = useRef({ email, nombre, telefono, categoria, prefiereWhatsapp, aceptaGdpr });
  const abandonedLoggedRef = useRef(false);
  const sentRef = useRef(false);

  useEffect(() => {
    formStateRef.current = { email, nombre, telefono, categoria, prefiereWhatsapp, aceptaGdpr };
  });

  useEffect(() => { sentRef.current = sent; }, [sent]);

  useEffect(() => {
    const handleHide = () => {
      if (abandonedLoggedRef.current || sentRef.current) return;
      const s = formStateRef.current;
      // Solo si rellenó algo significativo (al menos email o nombre o teléfono)
      if (!s.email.trim() && !s.nombre.trim() && !s.telefono.trim()) return;
      abandonedLoggedRef.current = true;
      try {
        // keepalive: true para que el navegador envíe el fetch aunque se cierre la pestaña
        fetch(`${window.location.origin}/functions/logPublicEvent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            event_type: "app_error",
            context: "PublicAccessRequest · form_abandoned",
            error_message: "Usuario abandonó el formulario sin enviar",
            user_email: s.email || "anónimo",
            page_path: "/SolicitarAcceso",
            user_agent: navigator.userAgent,
            device: /Mobile|Android|iPhone/.test(navigator.userAgent) ? "móvil" : "desktop",
            severity: "warning",
            extra_data: {
              accion: "form_abandoned",
              severidad: "warning",
              form_data: {
                email: s.email.trim().toLowerCase(),
                nombre_progenitor: s.nombre.trim(),
                telefono: s.telefono.trim(),
                categoria: s.categoria,
                prefiere_whatsapp: s.prefiereWhatsapp,
              },
              campos_rellenos: {
                nombre: !!s.nombre.trim(),
                email: !!s.email.trim(),
                telefono: !!s.telefono.trim(),
                categoria: !!s.categoria,
                gdpr: s.aceptaGdpr,
              },
            },
          }),
        }).catch(() => {});
      } catch {}
    };
    const onVisChange = () => { if (document.visibilityState === "hidden") handleHide(); };
    document.addEventListener("visibilitychange", onVisChange);
    window.addEventListener("pagehide", handleHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisChange);
      window.removeEventListener("pagehide", handleHide);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    trackEvent("submit_attempt", { form_data: formSnapshot() });

    if (!email.trim() || !nombre.trim() || !categoria || !telefono.trim()) {
      setError("Por favor, rellena todos los campos obligatorios.");
      trackEvent("validation_failed", { motivo: "campos_vacios" }, "warning");
      return;
    }

    // Validar nombre real (mínimo 4 caracteres y nombre + apellido)
    const trimmedName = nombre.trim();
    if (trimmedName.length < 4 || !trimmedName.includes(" ")) {
      setError("Por favor introduce tu nombre y apellidos completos.");
      trackEvent("validation_failed", { motivo: "nombre_invalido", valor: trimmedName }, "warning");
      return;
    }

    // Validar móvil español (9 dígitos, empieza por 6 o 7)
    const telDigits = telefono.replace(/\D/g, "");
    if (telDigits.length !== 9 || !/^[67]/.test(telDigits)) {
      setError("Introduce un móvil español válido (9 dígitos, empieza por 6 o 7).");
      trackEvent("validation_failed", { motivo: "movil_invalido" }, "warning");
      return;
    }

    if (emailSuggestion) {
      setError(`¿Quisiste escribir ${emailSuggestion}? Corrige tu email antes de continuar.`);
      trackEvent("validation_failed", { motivo: "email_typo", sugerencia: emailSuggestion }, "warning");
      return;
    }

    if (!emailsMatch) {
      setError("Los emails no coinciden. Revísalos por favor.");
      trackEvent("validation_failed", { motivo: "emails_no_coinciden" }, "warning");
      return;
    }

    if (!aceptaGdpr) {
      setError("Debes aceptar la política de protección de datos para continuar.");
      trackEvent("validation_failed", { motivo: "gdpr_no_aceptado" }, "warning");
      return;
    }

    setSending(true);
    try {
      const fingerprint = getDeviceFingerprint();
      // Llamada HTTP directa (sin SDK) para que funcione SIN login.
      // El SDK exige auth a nivel de app aunque la función sea anónima,
      // así que las familias no logueadas recibían 403 silencioso.
      const res = await fetch(`${window.location.origin}/functions/submitAccessRequest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          nombre_progenitor: trimmedName,
          telefono: telefono.trim(),
          categoria,
          prefiere_whatsapp: prefiereWhatsapp,
          device_fingerprint: fingerprint,
          user_agent: navigator.userAgent,
          website, // honeypot
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Error ${res.status}`);
      }
      trackEvent("submit_success", { categoria });
      setSent(true);
    } catch (err) {
      const msg = err?.message || "Error al enviar. Inténtalo de nuevo.";
      setError(msg);
      trackEvent("submit_error", { mensaje: msg, form_data: formSnapshot() }, "error");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
          >
            <CheckCircle2 className="w-14 h-14 text-white" />
          </motion.div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">¡Solicitud enviada!</h2>
          <p className="text-slate-600 mb-5">
            Hemos recibido tus datos. <br />Recibirás tu código en <strong>menos de 24h</strong>.
          </p>

          {/* Próximos pasos */}
          <div className="bg-gradient-to-br from-orange-50 to-green-50 border border-orange-200 rounded-2xl p-4 text-left mb-4">
            <p className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-600" /> Qué pasa ahora:
            </p>
            <ol className="space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                <span>Revisa tu <strong>email</strong> (también el spam)</span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                <span>Recibirás tu <strong>código de acceso</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                <span>Instala la app y entra con el código</span>
              </li>
            </ol>
          </div>

          {/* Ayuda para instalar la app */}
          <div className="mt-5 pt-5 border-t border-slate-200">
            {!showInstallHelp ? (
              <>
                <p className="text-xs font-bold text-slate-700 mb-2">📲 ¿No sabes instalar la app?</p>
                <button
                  type="button"
                  onClick={() => setShowInstallHelp(true)}
                  className="w-full bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 text-blue-800 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Phone className="w-4 h-4" /> Que un voluntario me llame y me ayude
                </button>
              </>
            ) : (
              <InstallHelpRequestForm
                defaultEmail={email}
                defaultNombre={nombre}
                defaultTelefono={telefono}
                onClose={() => setShowInstallHelp(false)}
              />
            )}
          </div>

          <p className="text-xs text-slate-500 mt-4">
            ¿No te llega el código? Escríbenos a <a href="mailto:info@cdbustarviejo.com" className="text-orange-600 font-bold underline">info@cdbustarviejo.com</a>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 py-6 px-4">
      <BackToAppButton />
      <BackToWebsiteButton />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full mx-auto"
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 30%, white 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
            <div className="relative">
              <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-24 h-24 rounded-full border-4 border-white/30 mx-auto mb-3 shadow-xl" />
              <h1 className="text-2xl font-extrabold text-white">CD Bustarviejo</h1>
              <p className="text-orange-300 text-sm font-semibold mt-1">Únete a la app del club</p>
            </div>
          </div>

          {/* Beneficios */}
          <div className="px-6 pt-5 pb-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 text-center">Todo en una sola app</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {BENEFITS.map((b, i) => (
                <motion.div
                  key={b.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className={`${b.color} rounded-xl p-3 text-center`}
                >
                  <b.icon className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-xs font-bold">{b.label}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Pasos del proceso */}
          <div className="px-6 pb-2">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Cómo funciona</p>
              <div className="space-y-2.5">
                {STEPS.map((s) => (
                  <div key={s.num} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-extrabold flex items-center justify-center shadow-md">
                      {s.num}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 leading-tight">{s.title}</p>
                      <p className="text-xs text-slate-500">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Aviso importante */}
          <div className="px-6 pb-2">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong>ℹ️ Importante:</strong> Solo debe registrarse <strong>un progenitor</strong> por familia. Al inscribir a los jugadores podrás añadir al segundo progenitor y dar acceso a los <strong>juveniles (13-17 años)</strong>. Los <strong>jugadores +18</strong> tienen su propio acceso independiente.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Honeypot - invisible para humanos, los bots lo rellenan */}
            <div style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true">
              <label>Website (no rellenar)</label>
              <input
                type="text"
                tabIndex="-1"
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Nombre del padre/madre/tutor/jugador +18 *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: María García López"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Nombre y apellidos completos</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tuemail@ejemplo.com"
                  className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  required
                />
              </div>
              {emailSuggestion ? (
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  ⚠️ ¿Quisiste decir <button type="button" className="underline font-bold" onClick={() => { setEmail(emailSuggestion); setEmailConfirm(""); }}>{emailSuggestion}</button>?
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">Este será tu email de acceso a la app</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Confirmar email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={emailConfirm}
                  onChange={(e) => setEmailConfirm(e.target.value)}
                  placeholder="Repite tu email"
                  onPaste={(e) => e.preventDefault()}
                  className={`w-full border rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none ${
                    emailConfirm && !emailsMatch ? "border-red-400 bg-red-50" : "border-slate-300"
                  }`}
                  required
                />
              </div>
              {emailConfirm && !emailsMatch && (
                <p className="text-xs text-red-500 mt-1">Los emails no coinciden</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Móvil *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 600 123 456"
                  className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  required
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">📱 <strong>Necesario</strong> para enviarte el código y contactar contigo si tienes problemas.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Categoría *
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
                required
              >
                <option value="">Selecciona una categoría</option>
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Preferencia WhatsApp — solo visible si hay teléfono válido */}
            {telefono.replace(/\D/g, '').length === 9 && /^[67]/.test(telefono.replace(/\D/g, '')) && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefiereWhatsapp}
                    onChange={(e) => setPrefiereWhatsapp(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-green-600 flex-shrink-0"
                  />
                  <span className="text-xs text-green-800 leading-relaxed">
                    <MessageCircle className="w-3.5 h-3.5 inline mr-1 text-green-600" />
                    <strong>Quiero recibir el código también por WhatsApp</strong>
                    <br />
                    <span className="text-green-600">Además del email, te enviaremos las instrucciones por WhatsApp al número que has indicado.</span>
                  </span>
                </label>
              </div>
            )}

            {/* Aviso de protección de datos (GDPR) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aceptaGdpr}
                  onChange={(e) => setAceptaGdpr(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-orange-600 flex-shrink-0"
                  required
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  He leído y acepto la <strong>política de protección de datos</strong> del CD Bustarviejo. *
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowGdprDetails(!showGdprDetails)}
                className="mt-2 text-xs text-orange-600 font-semibold flex items-center gap-1 hover:underline"
              >
                <Lock className="w-3 h-3" />
                {showGdprDetails ? "Ocultar información legal" : "Ver información legal"}
                {showGdprDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showGdprDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 pt-3 border-t border-slate-200 text-[11px] text-slate-600 leading-relaxed space-y-2"
                >
                  <p><strong>Responsable:</strong> CD Bustarviejo (info@cdbustarviejo.com).</p>
                  <p><strong>Finalidad:</strong> Gestionar tu solicitud de acceso a la app del club y enviarte el código por email.</p>
                  <p><strong>Legitimación:</strong> Tu consentimiento al marcar esta casilla.</p>
                  <p><strong>Conservación:</strong> Los datos se conservarán mientras gestionamos tu solicitud y, una vez procesada, se eliminan en un máximo de 30 días.</p>
                  <p><strong>Destinatarios:</strong> No se cederán datos a terceros salvo obligación legal.</p>
                  <p><strong>Tus derechos:</strong> Puedes acceder, rectificar, suprimir tus datos u oponerte a su tratamiento escribiendo a <a href="mailto:info@cdbustarviejo.com" className="text-orange-600 underline">info@cdbustarviejo.com</a>.</p>
                </motion.div>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={sending || !aceptaGdpr}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white font-bold py-3.5 rounded-xl hover:from-orange-700 hover:to-orange-800 transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-lg"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="w-4 h-4" /> Solicitar código de acceso</>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-1">
              <Shield className="w-3 h-3" />
              <span>Tus datos solo se usan para enviarte el código.</span>
            </div>
          </form>
        </div>

        {/* Pie */}
        <p className="text-center text-white/80 text-xs mt-4">
          ¿Problemas? Escríbenos a <a href="mailto:info@cdbustarviejo.com" className="text-white font-bold underline">info@cdbustarviejo.com</a>
        </p>
      </motion.div>
    </div>
  );
}