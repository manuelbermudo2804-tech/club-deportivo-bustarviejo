import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

// Política de privacidad específica para la Porra Mundial 2026
// Pública (sin login). Enlazada desde /Porra, /PorraCrear y /PorraRanking
export default function PorraPrivacidad() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Política de privacidad — Porra Mundial 2026";
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-500 text-white">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/90 hover:text-white text-sm mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-yellow-200" />
            <div>
              <h1 className="text-2xl md:text-3xl font-black">Política de privacidad</h1>
              <p className="text-white/90 text-sm">Porra Mundial 2026 · CD Bustarviejo</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 md:p-8 space-y-6 text-slate-700">

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. Quién es el responsable</h2>
            <p className="text-sm leading-relaxed">
              <strong>Club Deportivo Bustarviejo</strong> (en adelante, "el Club") es el responsable
              del tratamiento de los datos que nos facilitas al participar en la Porra Mundial 2026.
            </p>
            <p className="text-sm leading-relaxed mt-2">
              Contacto:{' '}
              <a href="mailto:info@cdbustarviejo.com" className="text-orange-600 hover:underline inline-flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> info@cdbustarviejo.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. Qué datos recogemos</h2>
            <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1">
              <li>Nombre y apellidos</li>
              <li>Email</li>
              <li>Teléfono</li>
              <li>Alias público que tú eliges para el ranking</li>
              <li>Tus predicciones del torneo</li>
            </ul>
            <p className="text-sm mt-2">
              <strong>No recogemos datos de pago.</strong> El pago lo gestiona Stripe directamente
              (ver punto 5).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. Para qué los usamos</h2>
            <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1">
              <li>Gestionar tu participación en la porra y enviarte el enlace para rellenarla.</li>
              <li>Mostrar tu <em>alias</em> (no tu nombre real) en el ranking público.</li>
              <li>Contactarte por email o teléfono <strong>solo si ganas un premio</strong>.</li>
              <li>Enviarte recordatorios si no has completado tu porra antes del cierre.</li>
            </ul>
            <p className="text-sm mt-2">
              <strong>No usaremos tus datos para publicidad ni los cederemos a terceros.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">4. Base legal</h2>
            <p className="text-sm leading-relaxed">
              Tu consentimiento expreso al aceptar esta política y la ejecución del contrato
              (participación en la porra) que aceptas al pagar.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">5. Procesadores</h2>
            <p className="text-sm leading-relaxed">
              Para que el servicio funcione usamos los siguientes proveedores:
            </p>
            <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1 mt-2">
              <li><strong>Stripe</strong> (Irlanda) — procesamiento del pago.</li>
              <li><strong>Resend</strong> (USA) — envío del email con tu enlace de acceso.</li>
              <li><strong>Base44</strong> — alojamiento de los datos.</li>
            </ul>
            <p className="text-sm mt-2">
              Todos cumplen el RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">6. Cuánto tiempo los guardamos</h2>
            <p className="text-sm leading-relaxed">
              Conservamos tus datos hasta el fin del Mundial 2026 más un máximo de 6 meses adicionales
              para resolver posibles incidencias y entregar premios. Después se eliminan.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">7. Tus derechos</h2>
            <p className="text-sm leading-relaxed">
              Puedes ejercer en cualquier momento tus derechos de <strong>acceso, rectificación,
              supresión, oposición, limitación y portabilidad</strong> escribiendo a{' '}
              <a href="mailto:info@cdbustarviejo.com" className="text-orange-600 hover:underline">
                info@cdbustarviejo.com
              </a>{' '}
              indicando "Porra Mundial 2026" en el asunto.
            </p>
            <p className="text-sm leading-relaxed mt-2">
              También tienes derecho a presentar una reclamación ante la{' '}
              <a
                href="https://www.aepd.es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:underline"
              >
                Agencia Española de Protección de Datos (AEPD)
              </a>.
            </p>
          </section>

          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}
            </p>
          </div>

          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
        </div>
      </div>
    </div>
  );
}