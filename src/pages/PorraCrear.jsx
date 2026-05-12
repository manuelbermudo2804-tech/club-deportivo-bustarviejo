import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Trophy, ArrowLeft, Loader2, ShieldCheck, Heart, Mail } from "lucide-react";
import { toast } from "sonner";
import PorraMiniLigaInfo from "@/components/porra/PorraMiniLigaInfo";

// Página pública para crear una porra: formulario + pago Stripe
export default function PorraCrear() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    alias_equipo: '',
    telefono: '',
    mini_liga_codigo: '',
    acepta_terminos: false,
  });
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    document.title = "Apuntar a la Porra — CD Bustarviejo";
    cargar();
  }, []);

  const cargar = async () => {
    try {
      const res = await base44.functions.invoke('porraPublicLanding', {});
      setConfig(res.data?.config || null);
      // Pre-rellenar email y nombre si el usuario llega logueado desde la app interna
      try {
        const authed = await base44.auth.isAuthenticated();
        if (authed) {
          const me = await base44.auth.me();
          if (me?.email) {
            setForm(p => ({
              ...p,
              email: p.email || me.email,
              nombre: p.nombre || me.full_name || '',
            }));
          }
        }
      } catch { /* usuario no logueado: dejar campos vacíos */ }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConfig(false);
    }
  };

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim() || !form.alias_equipo.trim() || !form.telefono.trim()) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }
    // Validar teléfono español (9 dígitos)
    const telLimpio = form.telefono.replace(/[\s\-+]/g, '').replace(/^34/, '');
    if (!/^[6789]\d{8}$/.test(telLimpio)) {
      toast.error('El teléfono debe ser un número español de 9 dígitos (ej: 612 345 678)');
      return;
    }
    if (!form.acepta_terminos) {
      toast.error('Debes aceptar los términos para continuar');
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('porraCrearParticipante', {
        nombre: form.nombre,
        email: form.email,
        alias_equipo: form.alias_equipo,
        telefono: form.telefono,
        mini_liga_codigo: form.mini_liga_codigo || null,
        return_url: window.location.origin,
      });
      if (res.data?.ok && res.data?.modo_test && res.data?.redirect_url) {
        // MODO TEST: saltar Stripe y abrir pantalla de éxito directa
        toast.success('🧪 Modo test activo — porra creada sin cobro');
        window.location.href = res.data.redirect_url;
      } else if (res.data?.ok && res.data?.checkout_url) {
        // Redirigir a Stripe Checkout
        window.location.href = res.data.checkout_url;
      } else {
        toast.error(res.data?.error || 'Error al crear la porra');
      }
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-orange-600">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  if (!config?.activa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
        <div className="text-center max-w-md">
          <Trophy className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
          <h1 className="text-2xl font-black mb-2">Porra cerrada</h1>
          <p className="text-white/70 mb-6">Las inscripciones no están abiertas en este momento.</p>
          <Button onClick={() => navigate('/Porra')} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
            Volver a la landing
          </Button>
        </div>
      </div>
    );
  }

  const precio = config.precio_entrada || 15;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-500 text-white">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <button onClick={() => navigate('/Porra')} className="flex items-center gap-2 text-white/90 hover:text-white text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <div className="flex items-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-300" />
            <div>
              <h1 className="text-2xl md:text-3xl font-black">Apunta tu porra</h1>
              <p className="text-white/90 text-sm">Mundial 2026 — CD Bustarviejo</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit}>
          <Card className="shadow-xl border-2 border-orange-200">
            <CardContent className="p-6 space-y-5">
              {/* Datos */}
              <div>
                <Label htmlFor="nombre" className="font-bold text-slate-900">Nombre y apellidos *</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={e => update('nombre', e.target.value)}
                  placeholder="María García López"
                  required
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">Tu nombre real (no se hará público)</p>
              </div>

              <div>
                <Label htmlFor="email" className="font-bold text-slate-900">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Aquí te enviaremos el enlace mágico para editar tu porra
                </p>
              </div>

              <div>
                <Label htmlFor="alias" className="font-bold text-slate-900">Alias / Nombre del equipo *</Label>
                <Input
                  id="alias"
                  value={form.alias_equipo}
                  onChange={e => update('alias_equipo', e.target.value)}
                  placeholder="Los Profetas del Gol"
                  maxLength={40}
                  required
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">⚡ Este nombre se mostrará en el ranking público (¡que sea original!)</p>
              </div>

              <div>
                <Label htmlFor="telefono" className="font-bold text-slate-900">Teléfono *</Label>
                <Input
                  id="telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={e => update('telefono', e.target.value)}
                  placeholder="612 345 678"
                  required
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">📞 Imprescindible para contactarte si ganas un premio</p>
              </div>

              {config.permitir_mini_ligas && (
                <div>
                  <Label htmlFor="liga" className="font-bold text-slate-900">Código mini-liga <span className="text-slate-400 font-normal">(opcional)</span></Label>
                  <Input
                    id="liga"
                    value={form.mini_liga_codigo}
                    onChange={e => update('mini_liga_codigo', e.target.value.toUpperCase())}
                    placeholder="ABCD12"
                    maxLength={6}
                    className="mt-1 font-mono uppercase"
                  />
                  <p className="text-xs text-slate-500 mt-1">¿Tienes un código de una peña? Pégalo aquí. Si no, déjalo vacío.</p>
                  <PorraMiniLigaInfo />
                </div>
              )}

              {/* Resumen precio */}
              <div className="bg-gradient-to-br from-orange-100 to-yellow-100 border-2 border-orange-300 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-2xl text-slate-900">{precio}€</p>
                    <p className="text-xs text-slate-600">Pago único · Sin renovaciones</p>
                  </div>
                  <Trophy className="w-10 h-10 text-orange-600" />
                </div>
                <div className="mt-3 pt-3 border-t border-orange-200 space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-green-600" />
                    <span>El <strong>{config.comision_club_porcentaje || 10}%</strong> va destinado a <strong>{config.destino_comision_club || 'el club'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pago seguro con tarjeta vía <strong>Stripe</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-purple-600" />
                    <span>Recibes un <strong>enlace mágico</strong> por email para predecir y editar tu porra</span>
                  </div>
                </div>
              </div>

              {/* Aceptación */}
              <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg">
                <Checkbox
                  id="terms"
                  checked={form.acepta_terminos}
                  onCheckedChange={v => update('acepta_terminos', !!v)}
                  className="mt-0.5"
                />
                <label htmlFor="terms" className="text-sm text-slate-700 cursor-pointer">
                  Acepto participar en la Porra del Mundial 2026 del CD Bustarviejo. Entiendo que el pago no es reembolsable una vez empiece el torneo y que mis predicciones se bloquearán al cierre del plazo. El club destinará el {config.comision_club_porcentaje || 10}% del bote a {config.destino_comision_club || 'el club'}.
                </label>
              </div>

              {/* CTA */}
              <Button
                type="submit"
                disabled={loading || !form.acepta_terminos}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-black text-lg py-7 rounded-xl shadow-xl disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Abriendo pago seguro...</>
                ) : (
                  <><Trophy className="w-5 h-5 mr-2" /> Pagar {precio}€ y crear mi porra</>
                )}
              </Button>

              <p className="text-center text-xs text-slate-500">
                🔒 Tu pago está protegido por Stripe. No almacenamos tu tarjeta.
              </p>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}