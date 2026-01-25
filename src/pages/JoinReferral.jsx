import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, CreditCard, Heart, CheckCircle2, Gift, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { CombinedSuccessAnimation } from "../components/animations/SuccessAnimation";

const CUOTA_SOCIO = 25;
const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function JoinReferral() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  
  const [formData, setFormData] = useState({
    nombre_completo: "",
    dni: "",
    telefono: "",
    email: "",
    direccion: "",
    municipio: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setReferralCode(ref);

    // Detectar retorno de éxito de Stripe
    if (params.get('success') === 'true') {
      setShowSuccess(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre_completo || !formData.email || !formData.telefono || !formData.dni) {
      toast.error("Por favor, rellena todos los campos obligatorios");
      return;
    }

    setIsSubmitting(true);
    try {
      // Iniciar checkout de Stripe
      // Pasamos los datos del usuario en metadata para que el webhook cree el socio
      const successUrl = `${window.location.origin}/JoinReferral?success=true`;
      const cancelUrl = `${window.location.origin}/JoinReferral`;

      const { data } = await base44.functions.invoke('stripeCheckout', {
        amount: CUOTA_SOCIO * 100, // En céntimos
        name: `Cuota Socio - ${formData.nombre_completo}`,
        successUrl,
        cancelUrl,
        metadata: {
          tipo: 'alta_socio_referido', // Tipo especial para el webhook
          nombre_completo: formData.nombre_completo,
          dni: formData.dni,
          email: formData.email,
          telefono: formData.telefono,
          direccion: formData.direccion,
          municipio: formData.municipio,
          referral_code: referralCode, // Importante para atribuir el premio
          temporada: "2024-2025" // Podríamos hacerlo dinámico si es necesario
        }
      });

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No se pudo iniciar el pago");
      }

    } catch (error) {
      console.error("Error submitting:", error);
      toast.error("Error al iniciar el pago: " + (error.message || "Inténtalo de nuevo"));
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <CombinedSuccessAnimation 
        show={showSuccess} 
        onComplete={() => setShowSuccess(false)}
        message="¡Bienvenido al Club! 🎉"
        withConfetti={true}
      />

      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-4 lg:p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-4">
            <img 
              src={CLUB_LOGO_URL} 
              alt="CD Bustarviejo" 
              className="w-20 h-20 mx-auto rounded-2xl shadow-2xl border-4 border-white/20 object-cover"
            />
            {referralCode && (
              <Badge className="bg-purple-500 text-white animate-pulse mb-2">
                🎁 HAS SIDO INVITADO
              </Badge>
            )}
            <h1 className="text-3xl lg:text-4xl font-black text-white leading-tight">
              Únete al <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">CD Bustarviejo</span>
            </h1>
            <p className="text-purple-200 text-lg">
              Alguien especial te ha invitado a formar parte de nuestra familia.
            </p>
          </div>

          {showSuccess ? (
            <Card className="border-none shadow-2xl bg-white/10 backdrop-blur-md border border-white/20">
              <CardContent className="pt-8 pb-8 text-center text-white">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">¡Pago Realizado con Éxito!</h2>
                <p className="text-white/80 mb-6">
                  Ya eres socio oficial del CD Bustarviejo.
                  <br/>
                  Revisa tu correo electrónico, te hemos enviado tu carnet virtual y los detalles de acceso.
                </p>
                <div className="bg-white/10 rounded-xl p-4 max-w-sm mx-auto">
                  <p className="text-sm font-medium">¿Dudas?</p>
                  <p className="text-xs opacity-70">Escríbenos a cdbustarviejo@gmail.com</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500"></div>
              
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-slate-800">
                  <Heart className="w-6 h-6 text-pink-500" />
                  Hazte Socio ahora
                </CardTitle>
                <p className="text-slate-500 text-sm">
                  Completa tus datos y realiza el pago seguro para activar tu carnet.
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Beneficios */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-purple-900">Comunidad</p>
                      <p className="text-xs text-purple-700">Forma parte del club</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl border border-pink-100">
                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-pink-900">Ventajas</p>
                      <p className="text-xs text-pink-700">Descuentos exclusivos</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre Completo *</Label>
                        <Input 
                          id="nombre" 
                          value={formData.nombre_completo}
                          onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                          placeholder="Tu nombre y apellidos"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dni">DNI/NIE *</Label>
                        <Input 
                          id="dni" 
                          value={formData.dni}
                          onChange={(e) => setFormData({...formData, dni: e.target.value})}
                          placeholder="12345678A"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input 
                          id="email" 
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="tu@email.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefono">Teléfono *</Label>
                        <Input 
                          id="telefono" 
                          type="tel"
                          value={formData.telefono}
                          onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                          placeholder="600 123 456"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="direccion">Dirección</Label>
                        <Input 
                          id="direccion" 
                          value={formData.direccion}
                          onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                          placeholder="Calle, número..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="municipio">Municipio</Label>
                        <Input 
                          id="municipio" 
                          value={formData.municipio}
                          onChange={(e) => setFormData({...formData, municipio: e.target.value})}
                          placeholder="Bustarviejo"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-bold text-slate-900">Cuota de Socio Anual</p>
                        <p className="text-xs text-slate-500">Temporada 2024/2025</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-slate-900">{CUOTA_SOCIO}€</span>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 text-lg rounded-xl shadow-xl transition-all hover:scale-[1.02]"
                    >
                      {isSubmitting ? (
                        <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Procesando...</>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5 mr-2" />
                          Pagar y Unirse
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                    <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3" /> Pago seguro vía Stripe
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <p className="text-center text-slate-400 text-sm">
            © CD Bustarviejo - Pasión por el deporte
          </p>
        </div>
      </div>
    </>
  );
}