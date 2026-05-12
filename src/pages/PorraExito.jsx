import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Trophy, Mail, ArrowRight, Loader2, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";

// Página de éxito tras pago Stripe
// Lee ?token=XXXXX de la URL y muestra info + enlace para empezar a predecir
export default function PorraExito() {
  const navigate = useNavigate();
  const [participante, setParticipante] = useState(null);
  const [loading, setLoading] = useState(true);
  const [intentos, setIntentos] = useState(0);

  useEffect(() => {
    document.title = "¡Porra creada! — CD Bustarviejo";
    cargarParticipante();
  }, []);

  // Poll suave por si el webhook tarda — hasta 15 intentos (30s)
  useEffect(() => {
    if (!loading && participante?.estado_pago !== 'pagado' && intentos < 15) {
      const t = setTimeout(() => {
        setIntentos(i => i + 1);
        cargarParticipante();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [loading, participante, intentos]);

  const cargarParticipante = async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      // Endpoint público — funciona sin auth para usuarios web
      const res = await base44.functions.invoke('porraGetByToken', { token });
      // porraGetByToken devuelve 402 si pago pendiente — todavía nos sirve para mostrar el estado
      if (res.data?.participante) {
        setParticipante(res.data.participante);
      } else if (res.data?.error === 'Pago pendiente') {
        // Construir un participante mínimo para que el polling siga funcionando
        setParticipante({ token_acceso: token, estado_pago: 'pendiente', email: '', nombre: '', alias_equipo: '' });
      } else {
        setParticipante(null);
      }
    } catch (e) {
      // Si es 402 (pago pendiente), tratar como participante pendiente
      const errData = e?.response?.data;
      if (errData?.error === 'Pago pendiente') {
        setParticipante({ token_acceso: token, estado_pago: 'pendiente', email: '', nombre: '', alias_equipo: '' });
      } else {
        console.error(e);
      }
    } finally {
      setLoading(false);
    }
  };

  const copiarEnlace = () => {
    const url = `${window.location.origin}/PorraMiPorra?token=${participante?.token_acceso}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace copiado al portapapeles');
  };

  const irAPredecir = () => {
    navigate(`/PorraMiPorra?token=${participante?.token_acceso}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 to-emerald-600">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-3" />
          <p className="font-bold">Confirmando tu pago...</p>
        </div>
      </div>
    );
  }

  if (!participante) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-black mb-2">Token no válido</h1>
          <p className="text-white/70 mb-6">No hemos encontrado tu porra.</p>
          <Button onClick={() => navigate('/Porra')} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  const isPagado = participante.estado_pago === 'pagado';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="shadow-2xl border-2 border-green-300 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-center text-white relative overflow-hidden">
            <div className="absolute top-2 right-4 animate-bounce" style={{animationDelay: '0s'}}>🎉</div>
            <div className="absolute top-8 left-6 animate-bounce text-2xl" style={{animationDelay: '0.3s'}}>⚽</div>
            <div className="absolute bottom-2 right-12 animate-bounce" style={{animationDelay: '0.6s'}}>🏆</div>
            <div className="relative">
              <div className="inline-block bg-white/20 backdrop-blur-sm rounded-full p-4 mb-3 border-4 border-white/40">
                <CheckCircle2 className="w-16 h-16 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black mb-2">
                {isPagado ? '¡Porra creada!' : 'Casi listo...'}
              </h1>
              <p className="text-white/90">
                {isPagado 
                  ? `Bienvenido a la Porra del Mundial 2026, ${participante.nombre.split(' ')[0]}` 
                  : 'Estamos confirmando tu pago...'}
              </p>
            </div>
          </div>

          <CardContent className="p-6 md:p-8 space-y-5">
            {!isPagado && intentos < 15 && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 text-center">
                <Loader2 className="w-6 h-6 mx-auto animate-spin text-yellow-600 mb-2" />
                <p className="text-sm text-yellow-900 font-medium">
                  El pago se está procesando. Esto puede tardar unos segundos. Si pagaste correctamente, recibirás un email en breve.
                </p>
                <p className="text-xs text-yellow-700 mt-1">Intento {intentos + 1}/15...</p>
              </div>
            )}
            {!isPagado && intentos >= 15 && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 text-center">
                <p className="text-sm text-orange-900 font-bold mb-2">⏳ Confirmación pendiente</p>
                <p className="text-sm text-orange-800">
                  El pago tarda más de lo normal en confirmarse. <strong>Revisa tu email en unos minutos</strong>: cuando se procese, recibirás un enlace mágico para acceder a tu porra.
                </p>
                <p className="text-xs text-orange-700 mt-2">
                  Si en 10 minutos no recibes el email, escribe a <a href="mailto:info@cdbustarviejo.com" className="underline font-bold">info@cdbustarviejo.com</a>
                </p>
                <Button onClick={() => { setIntentos(0); cargarParticipante(); }} variant="outline" size="sm" className="mt-3">
                  Reintentar comprobación
                </Button>
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Equipo:</span>
                <span className="font-bold text-slate-900">{participante.alias_equipo}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Email:</span>
                <span className="font-bold text-slate-900">{participante.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Estado:</span>
                <span className={`font-bold ${isPagado ? 'text-green-600' : 'text-orange-600'}`}>
                  {isPagado ? '✅ Pagado' : '⏳ Procesando'}
                </span>
              </div>
            </div>

            {isPagado && (
              <>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold text-slate-900 mb-1">📬 Te hemos enviado un email</p>
                      <p className="text-slate-700">
                        Revisa tu correo <strong>{participante.email}</strong>. Te hemos mandado un <strong>enlace mágico</strong> para acceder a tu porra desde cualquier dispositivo cuando quieras.
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        ¿No lo encuentras? Mira en spam o promociones. <strong>Guarda este email</strong> como acceso permanente.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Button
                    onClick={irAPredecir}
                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-black text-lg py-7 rounded-xl shadow-xl"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    EMPEZAR A PREDECIR
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button
                    onClick={copiarEnlace}
                    variant="outline"
                    className="w-full mt-2"
                  >
                    <Copy className="w-4 h-4 mr-2" /> Copiar mi enlace mágico
                  </Button>
                </div>

                <div className="text-center pt-2">
                  <Sparkles className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
                  <p className="text-xs text-slate-500">
                    💡 Tip: añade tu enlace mágico a favoritos del navegador para acceder rápido
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}