import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import BackToAppButton from "../components/public/BackToAppButton";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

// Mapa de dominios mal escritos → corrección
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
  "gmail.con": "gmail.com", "hotmail.con": "hotmail.com", "outlook.con": "outlook.com",
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

export default function PublicAccessRequest() {
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const emailsMatch = email && emailConfirm && email.trim().toLowerCase() === emailConfirm.trim().toLowerCase();
  const emailSuggestion = checkEmailTypo(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !nombre.trim() || !categoria) {
      setError("Por favor, rellena todos los campos obligatorios.");
      return;
    }

    if (emailSuggestion) {
      setError(`¿Quisiste escribir ${emailSuggestion}? Corrige tu email antes de continuar.`);
      return;
    }

    if (!emailsMatch) {
      setError("Los emails no coinciden. Revísalos por favor.");
      return;
    }

    setSending(true);
    try {
      await base44.functions.invoke("submitAccessRequest", {
        email: email.trim().toLowerCase(),
        nombre_progenitor: nombre.trim(),
        categoria,
      });
      setSent(true);
    } catch (err) {
      setError(err?.response?.data?.error || "Error al enviar. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Solicitud enviada!</h2>
          <p className="text-slate-600 mb-4">
            Hemos recibido tu email. El club te enviará un <strong>código de acceso</strong> para que puedas instalar la app y registrarte.
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800">
            <p className="font-bold mb-1">📧 Revisa tu bandeja de entrada</p>
            <p>Recibirás un email de <strong>CD Bustarviejo</strong> con tu código. Si no lo ves, revisa la carpeta de spam.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center p-4">
      <BackToAppButton />
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-center">
          <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-20 h-20 rounded-full border-3 border-white/30 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white">CD Bustarviejo</h1>
          <p className="text-slate-300 text-sm mt-1">Solicita tu código de acceso a la app</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
            <p>📱 Rellena este formulario y te enviaremos un <strong>código de acceso</strong> por email para que puedas entrar en la app del club.</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Nombre del padre/madre/tutor *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: María García López"
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              required
            />
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
              Categoría del hijo/a *
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

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white font-bold py-3.5 rounded-xl hover:from-orange-700 hover:to-orange-800 transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
          >
            {sending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
            ) : (
              <><Send className="w-4 h-4" /> Solicitar código de acceso</>
            )}
          </button>

          <p className="text-xs text-slate-400 text-center">
            Tus datos solo se usarán para enviarte el código de acceso al club.
          </p>
        </form>
      </div>
    </div>
  );
}