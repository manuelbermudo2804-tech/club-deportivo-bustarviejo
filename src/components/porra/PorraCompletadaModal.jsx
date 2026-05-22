import React, { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Home, Users, Share2, CheckCircle2, Sparkles, MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";

// Pantalla de éxito que aparece cuando el participante llega al 100% por primera vez.
// Le da opciones claras: ver ranking, ir a mini-ligas, compartir, o volver al inicio.
export default function PorraCompletadaModal({ open, onOpenChange, participante, token, onIrAMiniLigas }) {
  // Lanzar confetti suave al abrirse
  useEffect(() => {
    if (!open) return;
    // Confetti sencillo con emojis y CSS (sin librería extra)
    const root = document.createElement('div');
    root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden';
    document.body.appendChild(root);
    const emojis = ['🎉', '🏆', '⚽', '🥇', '✨', '🎊'];
    for (let i = 0; i < 30; i++) {
      const span = document.createElement('span');
      span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      span.style.cssText = `position:absolute;left:${Math.random()*100}%;top:-5%;font-size:${20+Math.random()*20}px;animation:porraFall ${2+Math.random()*2}s linear forwards;animation-delay:${Math.random()*0.5}s`;
      root.appendChild(span);
    }
    const style = document.createElement('style');
    style.textContent = '@keyframes porraFall{to{transform:translateY(110vh) rotate(360deg);opacity:0}}';
    document.head.appendChild(style);
    const timer = setTimeout(() => { root.remove(); style.remove(); }, 4500);
    return () => { clearTimeout(timer); root.remove(); style.remove(); };
  }, [open]);

  const handleCompartir = async () => {
    const url = `${window.location.origin}/Porra`;
    const texto = `¡Acabo de completar mi porra del Mundial 2026 con el equipo "${participante?.alias_equipo}"! 🏆⚽ ¿Te atreves a competir conmigo? Apúntate aquí:`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Porra Mundial 2026', text: texto, url });
      } else {
        await navigator.clipboard.writeText(`${texto} ${url}`);
        toast.success('✅ Enlace copiado al portapapeles');
      }
    } catch {/* usuario canceló */}
  };

  const handleVerRanking = () => {
    window.open(`/PorraRanking${token ? `?token=${token}` : ''}`, '_blank');
  };

  const handleVolverInicio = () => {
    onOpenChange(false);
    // Pequeño retardo para que se cierre el modal antes de navegar
    setTimeout(() => { window.location.href = '/Porra'; }, 150);
  };

  const getEnlaceMagico = () => `${window.location.origin}/PorraMiPorra?token=${token}`;

  const handleGuardarWhatsApp = () => {
    const url = getEnlaceMagico();
    const nombre = participante?.nombre?.split(' ')[0] || '';
    const texto = `🏆 *Mi Porra Mundial 2026 — CD Bustarviejo*%0A%0AHola ${nombre}, este es tu enlace personal para volver a tu porra cuando quieras:%0A%0A${encodeURIComponent(url)}%0A%0A⚠️ Guárdalo bien, es personal e intransferible.`;
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  };

  const handleCopiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(getEnlaceMagico());
      toast.success('✅ Enlace copiado — pégalo donde quieras guardarlo');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-gradient-to-br from-green-500 via-emerald-600 to-green-700 text-white">
        {/* Header celebración */}
        <div className="text-center px-6 pt-8 pb-4">
          <div className="text-6xl mb-2 animate-bounce">🎉</div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">¡Porra completada!</h2>
          <p className="text-white/90 text-sm mt-2">
            Has terminado todas las predicciones de <strong>{participante?.alias_equipo}</strong>
          </p>
        </div>

        {/* Card blanca con info y acciones */}
        <div className="bg-white text-slate-900 p-6 space-y-4 rounded-t-3xl">
          <div className="flex items-start gap-3 bg-green-50 border-2 border-green-200 rounded-xl p-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-green-900">Todo guardado ✅</p>
              <p className="text-green-800 text-xs mt-0.5">
                Puedes seguir editando hasta el cierre del plazo. Te avisaremos cuando empiecen los puntos.
              </p>
            </div>
          </div>

          {/* 💾 GUARDA TU ENLACE — Aquí sí tiene sentido: ya ha terminado y se va a ir */}
          <div className="bg-gradient-to-br from-orange-50 via-yellow-50 to-amber-50 border-2 border-orange-300 rounded-xl p-4">
            <p className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
              🔑 Guarda tu enlace para volver
            </p>
            <p className="text-xs text-slate-700 mb-3">
              Es tu acceso personal y permanente. También te lo hemos enviado por <strong>email</strong>, pero guárdalo aquí para no depender de él:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleGuardarWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
              </Button>
              <Button
                onClick={handleCopiarEnlace}
                variant="outline"
                className="border-slate-300 font-bold"
              >
                <Copy className="w-4 h-4 mr-2" /> Copiar
              </Button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 text-center">
              💡 Recomendado: envíatelo por WhatsApp a tu propio número
            </p>
          </div>

          {/* Botones de acción */}
          <div className="space-y-2">
            <Button
              onClick={handleVerRanking}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold py-6 rounded-xl shadow-lg"
            >
              <Trophy className="w-5 h-5 mr-2" /> Ver el ranking
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => { onOpenChange(false); onIrAMiniLigas?.(); }}
                variant="outline"
                className="border-2 border-purple-300 hover:bg-purple-50 text-purple-700 font-bold"
              >
                <Users className="w-4 h-4 mr-1" /> Mini-ligas
              </Button>
              <Button
                onClick={handleCompartir}
                variant="outline"
                className="border-2 border-blue-300 hover:bg-blue-50 text-blue-700 font-bold"
              >
                <Share2 className="w-4 h-4 mr-1" /> Compartir
              </Button>
            </div>
            <Button
              onClick={handleVolverInicio}
              variant="ghost"
              className="w-full text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <Home className="w-4 h-4 mr-2" /> Volver al inicio de la porra
            </Button>
          </div>

          <p className="text-center text-[11px] text-slate-400 pt-2">
            Puedes cerrar esta ventana y seguir revisando o cambiando tus predicciones cuando quieras.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}