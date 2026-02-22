import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, ShieldX, Mail, Clock, FolderSearch, CheckCircle2, Loader2, KeyRound } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const CONSENTIMIENTO_VERSION = "v1.0";

const PERMISOS_SI = [
  { emoji: "📋", texto: "Ver y confirmar convocatorias de partidos" },
  { emoji: "📅", texto: "Ver calendario y horarios de entrenamiento" },
  { emoji: "📊", texto: "Ver sus evaluaciones del entrenador" },
  { emoji: "🏆", texto: "Ver clasificaciones y resultados" },
  { emoji: "📢", texto: "Leer anuncios del club" },
  { emoji: "🖼️", texto: "Ver la galería de fotos" },
  { emoji: "🎉", texto: "Confirmar asistencia a eventos" },
  { emoji: "📋", texto: "Responder encuestas del club" },
];

const PERMISOS_NO = [
  { emoji: "💬", texto: "Chats con entrenadores o familias" },
  { emoji: "💳", texto: "Pagos, cuotas o datos financieros" },
  { emoji: "🖊️", texto: "Firmas de federación" },
  { emoji: "✏️", texto: "Editar datos personales" },
  { emoji: "🛍️", texto: "Tienda, pedidos o lotería" },
  { emoji: "📄", texto: "Documentos oficiales" },
];

export default function MinorAccessDialog({ open, onOpenChange, player, parentUser }) {
  const [email, setEmail] = useState("");
  const [consentimiento, setConsentimiento] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = info, 2 = email + consent

  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNac);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  };

  const edad = calcularEdad(player?.fecha_nacimiento);
  const esElegible = edad >= 13 && edad < 18;

  const handleSubmit = async () => {
    if (!email || !consentimiento) return;
    if (!email.includes("@")) {
      toast.error("Introduce un email válido");
      return;
    }

    setLoading(true);
    try {
      // 1. Guardar consentimiento en el Player
      await base44.entities.Player.update(player.id, {
        acceso_menor_email: email,
        acceso_menor_autorizado: true,
        acceso_menor_fecha_consentimiento: new Date().toISOString(),
        acceso_menor_padre_email: parentUser.email,
        acceso_menor_texto_version: CONSENTIMIENTO_VERSION,
        acceso_menor_user_agent: navigator.userAgent,
      });

      // 2. Generar código de acceso directamente (sin pasar por admin)
      const { data } = await base44.functions.invoke("generateAccessCode", {
        email: email.trim().toLowerCase(),
        tipo: "juvenil",
        nombre_destino: player.nombre?.split(" ")[0] || "",
        jugador_id: player.id,
        jugador_nombre: player.nombre
      });

      if (data.success) {
        toast.success("¡Invitación enviada! Tu hijo/a recibirá un email con el código de acceso.");
      } else {
        toast.error(data.error || "Error al generar el código");
      }

      onOpenChange(false);
      setStep(1);
      setEmail("");
      setConsentimiento(false);
    } catch (error) {
      console.error("Error al enviar solicitud:", error);
      toast.error("Error al enviar la solicitud. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep(1);
    setEmail("");
    setConsentimiento(false);
  };

  if (!esElegible) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            ⚽ Acceso Juvenil para {player?.nombre?.split(" ")[0]}
          </DialogTitle>
          <DialogDescription>
            {player?.nombre} tiene {edad} años y puede acceder a la app del club
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <h3 className="font-bold text-green-800 flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5" />
                Tu hijo/a PODRÁ:
              </h3>
              <div className="space-y-2">
                {PERMISOS_SI.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">✅</span>
                    <span className="text-sm text-green-900">{p.emoji} {p.texto}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <h3 className="font-bold text-red-800 flex items-center gap-2 mb-3">
                <ShieldX className="w-5 h-5" />
                Tu hijo/a NO PODRÁ:
              </h3>
              <div className="space-y-2">
                {PERMISOS_NO.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-red-600 font-bold">❌</span>
                    <span className="text-sm text-red-900">{p.emoji} {p.texto}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
              <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                ¿Qué pasará al activarlo?
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</span>
                  <p className="text-sm text-orange-900">Nos facilitas el <strong>email de tu hijo/a</strong></p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</span>
                  <p className="text-sm text-orange-900">Se envía automáticamente un <strong>código de acceso</strong> a su email</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</span>
                  <p className="text-sm text-orange-900">Tu hijo/a se registra con el código y <strong>accede a su panel juvenil</strong></p>
                </div>
              </div>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800 text-sm">
                💡 <strong>Importante:</strong> Tú seguirás teniendo acceso completo y podrás desactivar el acceso de tu hijo/a en cualquier momento.
              </AlertDescription>
            </Alert>

            <Button onClick={() => setStep(2)} className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg font-bold">
              Entendido, quiero activar el acceso →
            </Button>

            <Button variant="outline" onClick={handleClose} className="w-full">
              Ahora no
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-700 mb-2 block">
                <Mail className="w-4 h-4 inline mr-1" />
                Email de tu hijo/a
              </label>
              <Input
                type="email"
                placeholder="email.de.tu.hijo@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-lg py-6"
              />
              <p className="text-xs text-slate-500 mt-1">
                Recibirá un email con un código de acceso para registrarse
              </p>
            </div>

            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertDescription className="text-yellow-800 text-sm flex items-center gap-2">
                <FolderSearch className="w-4 h-4 flex-shrink-0" />
                <span>Que tu hijo/a <strong>revise la carpeta de SPAM</strong> si no le llega el correo.</span>
              </AlertDescription>
            </Alert>

            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consentimiento"
                  checked={consentimiento}
                  onCheckedChange={setConsentimiento}
                  className="mt-0.5"
                />
                <label htmlFor="consentimiento" className="text-sm text-slate-700 cursor-pointer leading-relaxed">
                  <strong>Autorizo a mi hijo/a {player?.nombre?.split(" ")[0]}</strong> a acceder a la aplicación del CD Bustarviejo con las funciones indicadas anteriormente. Entiendo que podré <strong>desactivar su acceso en cualquier momento</strong>.
                </label>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 pl-7">
                Consentimiento {CONSENTIMIENTO_VERSION} · {new Date().toLocaleDateString('es-ES')}
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!email || !consentimiento || loading}
              className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg font-bold disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Enviando código de acceso...</>
              ) : (
                <><CheckCircle2 className="w-5 h-5 mr-2" /> Enviar código de acceso</>
              )}
            </Button>

            <Button variant="outline" onClick={() => setStep(1)} className="w-full">
              ← Volver
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}