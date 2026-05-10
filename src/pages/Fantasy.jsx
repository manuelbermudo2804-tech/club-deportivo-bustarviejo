import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import FantasyHero from "@/components/fantasy/FantasyHero";
import FantasyRules from "@/components/fantasy/FantasyRules";
import FantasyForm from "@/components/fantasy/FantasyForm";
import FantasySuccess from "@/components/fantasy/FantasySuccess";
import FantasyLeaderboard from "@/components/fantasy/FantasyLeaderboard";
import SponsorFooter from "@/components/sponsors-public/SponsorFooter";
import { Loader2, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Fantasy() {
  const [config, setConfig] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success' | 'cancel' | null

  useEffect(() => {
    document.title = "Fantasy Mundial CDB";
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success' || payment === 'cancel') setPaymentStatus(payment);

    (async () => {
      try {
        const [configs, allEntries] = await Promise.all([
          base44.entities.FantasyMundialConfig.list(),
          base44.entities.FantasyMundial.list("-puntos_total", 200),
        ]);
        setConfig(configs?.[0] || { abierto: true, precio_inscripcion: 10, porcentaje_premios: 70, porcentaje_club: 30 });
        setEntries(allEntries || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const cerrado = !config?.abierto || (config?.fecha_limite && new Date(config.fecha_limite) < new Date());

  return (
    <div className="min-h-screen bg-slate-50">
      <FantasyHero
        totalParticipantes={entries.length}
        fechaLimite={config?.fecha_limite}
        precio={config?.precio_inscripcion ?? 10}
      />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {paymentStatus === 'success' && (
          <Card className="border-2 border-emerald-300 bg-emerald-50">
            <CardContent className="p-5 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
              <div>
                <h3 className="font-black text-emerald-900">¡Pago confirmado!</h3>
                <p className="text-sm text-emerald-800">Tu inscripción ya está oficialmente registrada. ¡Mucha suerte! 🍀</p>
              </div>
            </CardContent>
          </Card>
        )}
        {paymentStatus === 'cancel' && (
          <Card className="border-2 border-orange-300 bg-orange-50">
            <CardContent className="p-5 flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-orange-600 shrink-0" />
              <div>
                <h3 className="font-black text-orange-900">Pago cancelado</h3>
                <p className="text-sm text-orange-800">Tu inscripción quedó como <strong>pendiente</strong>. Te enviaremos un email con un enlace para completar el pago cuando quieras.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <FantasyRules
          porcentajePremios={config?.porcentaje_premios ?? 70}
          porcentajeClub={config?.porcentaje_club ?? 30}
        />

        {registered ? (
          <FantasySuccess entry={registered} config={config} />
        ) : cerrado ? (
          <Card className="border-2 border-slate-300">
            <CardContent className="p-8 text-center">
              <Lock className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <h3 className="text-xl font-black text-slate-900 mb-2">Inscripciones cerradas</h3>
              <p className="text-slate-600">Las predicciones ya no se pueden modificar. ¡Sigue la clasificación abajo!</p>
            </CardContent>
          </Card>
        ) : (
          <FantasyForm config={config} onSuccess={setRegistered} />
        )}

        {(config?.mostrar_clasificacion_publica !== false) && (
          <FantasyLeaderboard entries={entries} />
        )}

        <div className="text-center text-xs text-slate-500 py-4">
          La organización se reserva el derecho de revisar cualquier incidencia para garantizar el correcto funcionamiento de la competición.
        </div>
      </div>

      <SponsorFooter />
    </div>
  );
}