import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users, CreditCard, Heart, Star, PartyPopper, Sparkles, UserPlus, Gift, Share2, MessageCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const CUOTA_SOCIO = 25;
const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function PublicMembershipView() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tipoPago, setTipoPago] = useState("unico");

  const urlParams = new URLSearchParams(window.location.search);
  const paidOk = urlParams.get("paid") === "ok" || urlParams.get("paid") === "stripe";
  const canceled = urlParams.get("canceled") === "socio";
  const referidoPorParam = urlParams.get("ref") || "";

  const [formData, setFormData] = useState({
    tipo_inscripcion: "Nueva Inscripción",
    nombre_completo: "",
    dni: "",
    telefono: "",
    email: "",
    direccion: "",
    municipio: "",
    fecha_nacimiento: "",
    es_segundo_progenitor: false,
    referido_por: referidoPorParam,
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre_completo || !formData.email) {
      toast.error("Nombre y email son obligatorios");
      return;
    }

    setIsSubmitting(true);
    try {
      const currentUrl = window.location.href.split("?")[0];
      const response = await base44.functions.invoke("publicMemberCheckout", {
        nombre_completo: formData.nombre_completo,
        dni: formData.dni,
        telefono: formData.telefono,
        email: formData.email,
        direccion: formData.direccion,
        municipio: formData.municipio,
        fecha_nacimiento: formData.fecha_nacimiento,
        tipo_pago: tipoPago,
        referido_por: formData.referido_por,
        es_segundo_progenitor: formData.es_segundo_progenitor,
        success_url: `${currentUrl}?paid=ok`,
        cancel_url: `${currentUrl}?canceled=socio`,
      });

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        toast.error(response.data?.error || "Error al crear la sesión de pago");
      }
    } catch (error) {
      toast.error("Error: " + (error?.response?.data?.error || error.message || "Inténtalo de nuevo"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBaseUrl = () => window.location.href.split("?")[0];

  const getWhatsAppShareLink = () => {
    const url = getBaseUrl();
    const message = `¡Hazte socio del CD Bustarviejo! ⚽🏀\n\nPor solo ${CUOTA_SOCIO}€/temporada ayudas a los jóvenes deportistas del club.\n\n👉 Regístrate aquí: ${url}\n\n¡Gracias por tu apoyo! 💪`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  if (paidOk) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-none shadow-2xl bg-gradient-to-br from-green-100 to-green-200">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-green-900">🎉 ¡Pago recibido!</h2>
              <p className="text-green-800">Tu solicitud de socio ha sido registrada correctamente. Recibirás un email de confirmación.</p>
              <p className="text-green-700 text-sm">¡Bienvenido/a a la familia del CD Bustarviejo!</p>
              <a href={getWhatsAppShareLink()} target="_blank" rel="noopener noreferrer" className="w-full">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 mt-2">
                  <MessageCircle className="w-5 h-5" /> Invitar a más amigos por WhatsApp
                </Button>
              </a>
              <Button variant="outline" onClick={() => window.location.href = getBaseUrl()} className="mt-2">
                Volver al inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (canceled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-none shadow-2xl bg-white">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="text-5xl">😕</div>
              <h2 className="text-xl font-bold text-slate-900">Pago cancelado</h2>
              <p className="text-slate-600">No se ha realizado ningún cargo. Puedes volver a intentarlo cuando quieras.</p>
              <Button onClick={() => window.location.href = getBaseUrl()} className="mt-4 bg-orange-600 hover:bg-orange-700 text-white">
                Volver al formulario
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 p-4 lg:p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-4 pt-6">
          <img
            src={CLUB_LOGO_URL}
            alt="CD Bustarviejo"
            className="w-24 h-24 mx-auto rounded-2xl shadow-2xl border-4 border-orange-500/50 object-cover"
          />
          <div className="flex justify-center gap-2 text-4xl">
            <span>🎉</span><span>⚽</span><span>🏀</span><span>🎉</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-orange-400 via-green-400 to-orange-400 bg-clip-text text-transparent">
            ¡Hazte Socio del CD Bustarviejo!
          </h1>
          <p className="text-slate-300 text-sm lg:text-base">
            Forma parte de nuestra gran familia deportiva
          </p>
        </div>

        {/* Beneficios */}
        <Card className="border-none shadow-xl bg-white/95 backdrop-blur-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200 rounded-full -mr-16 -mt-16 opacity-50" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-200 rounded-full -ml-12 -mb-12 opacity-50" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Star className="w-6 h-6 text-yellow-500" />
              ¿Por qué ser socio?
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { icon: Heart, bgColor: "bg-green-100", textColor: "text-green-600", cardBg: "bg-green-50", title: "Apoyo esencial al club", desc: "Tu aportación es vital para el desarrollo de nuestros jóvenes deportistas" },
                { icon: Users, bgColor: "bg-orange-100", textColor: "text-orange-600", cardBg: "bg-orange-50", title: "Fuerza para la comunidad", desc: "Únete a la gran familia del club y vive la pasión por el deporte en Bustarviejo" },
                { icon: PartyPopper, bgColor: "bg-blue-100", textColor: "text-blue-600", cardBg: "bg-blue-50", title: "Eventos inolvidables", desc: "Participa en las actividades del club y comparte experiencias únicas" },
                { icon: Sparkles, bgColor: "bg-purple-100", textColor: "text-purple-600", cardBg: "bg-purple-50", title: "Compromiso con el deporte base", desc: "Contribuye al crecimiento y formación de nuestros deportistas" },
              ].map((item, i) => (
                <div key={i} className={`flex items-start gap-3 ${item.cardBg} rounded-xl p-3 shadow-sm`}>
                  <div className={`w-10 h-10 rounded-full ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <item.icon className={`w-5 h-5 ${item.textColor}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp compartir */}
        <Card className="border-none shadow-xl bg-gradient-to-r from-green-600 to-green-700 text-white overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Share2 className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl mb-2">¿Conoces a alguien más? 🤝</h3>
                <p className="text-white/90 text-sm mb-4">¡Comparte este enlace con más personas que quieran apoyar al club!</p>
                <a href={getWhatsAppShareLink()} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-white text-green-700 hover:bg-green-50 font-bold py-3 gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Compartir por WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulario */}
        <Card className="border-none shadow-xl bg-white">
          <CardHeader className="bg-gradient-to-r from-orange-600 to-green-600 text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Formulario de Inscripción como Socio
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tipo inscripción */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Tipo de Inscripción *</Label>
                <RadioGroup value={formData.tipo_inscripcion} onValueChange={(v) => handleChange("tipo_inscripcion", v)} className="space-y-2">
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border-2 border-green-200 hover:border-green-400 transition-colors">
                    <RadioGroupItem value="Nueva Inscripción" id="pub_nueva" />
                    <Label htmlFor="pub_nueva" className="cursor-pointer flex-1">
                      <span className="font-semibold">🆕 Nueva Inscripción</span>
                      <p className="text-xs text-slate-600">Primera vez como socio del club</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-colors">
                    <RadioGroupItem value="Renovación" id="pub_renovacion" />
                    <Label htmlFor="pub_renovacion" className="cursor-pointer flex-1">
                      <span className="font-semibold">🔄 Renovación</span>
                      <p className="text-xs text-slate-600">Ya fui socio en temporadas anteriores</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Segundo progenitor */}
              <div className="p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="pub_segundo_progenitor"
                    checked={formData.es_segundo_progenitor}
                    onCheckedChange={(v) => handleChange("es_segundo_progenitor", v)}
                    className="mt-1"
                  />
                  <Label htmlFor="pub_segundo_progenitor" className="cursor-pointer">
                    <span className="font-semibold text-orange-900">👫 Soy el segundo progenitor de un jugador inscrito</span>
                    <p className="text-xs text-orange-700 mt-1">Marca si el jugador ya ha sido inscrito por otro tutor</p>
                  </Label>
                </div>
              </div>

              {/* Referido por */}
              <div className="p-4 rounded-xl border-2 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                <div className="flex items-start gap-3">
                  <Gift className="w-6 h-6 mt-1 flex-shrink-0 text-purple-600" />
                  <div className="flex-1">
                    <Label htmlFor="pub_referido_por" className="font-semibold text-purple-900">🎁 ¿Quién te ha invitado?</Label>
                    <p className="text-xs text-purple-700 mt-1 mb-2">Si un amigo te invitó, escribe su nombre (opcional)</p>
                    <Input id="pub_referido_por" value={formData.referido_por} onChange={(e) => handleChange("referido_por", e.target.value)} placeholder="Nombre de quien te invitó (opcional)" className="bg-white" />
                  </div>
                </div>
              </div>

              {/* Datos personales */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 border-b pb-2">Datos del nuevo socio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pub_nombre">Nombre y Apellidos *</Label>
                    <Input id="pub_nombre" value={formData.nombre_completo} onChange={(e) => handleChange("nombre_completo", e.target.value)} placeholder="Juan García López" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pub_dni">DNI</Label>
                    <Input id="pub_dni" value={formData.dni} onChange={(e) => handleChange("dni", e.target.value)} placeholder="12345678A" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pub_telefono">Teléfono Móvil</Label>
                    <Input id="pub_telefono" type="tel" value={formData.telefono} onChange={(e) => handleChange("telefono", e.target.value)} placeholder="600123456" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pub_email">Correo Electrónico *</Label>
                    <Input id="pub_email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="correo@ejemplo.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pub_fecha_nacimiento">Fecha de Nacimiento</Label>
                    <Input id="pub_fecha_nacimiento" type="date" value={formData.fecha_nacimiento} onChange={(e) => handleChange("fecha_nacimiento", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pub_municipio">Municipio</Label>
                    <Input id="pub_municipio" value={formData.municipio} onChange={(e) => handleChange("municipio", e.target.value)} placeholder="Bustarviejo" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="pub_direccion">Dirección Completa</Label>
                    <Input id="pub_direccion" value={formData.direccion} onChange={(e) => handleChange("direccion", e.target.value)} placeholder="Calle, número, piso..." />
                  </div>
                </div>
              </div>

              {/* Selección de pago */}
              <div className="space-y-4 border-2 border-green-300 rounded-xl p-6 bg-gradient-to-br from-green-50 to-green-100">
                <h3 className="font-bold text-green-900 flex items-center gap-2 text-lg">
                  <CreditCard className="w-6 h-6" />
                  Pago: {CUOTA_SOCIO}€
                </h3>
                <p className="text-sm text-green-800">Al pulsar "Pagar", serás redirigido a Stripe para realizar el pago de forma segura con tarjeta.</p>

                <div className="space-y-3">
                  <Label className="font-semibold">Tipo de pago</Label>
                  <RadioGroup value={tipoPago} onValueChange={setTipoPago} className="space-y-2">
                    <div className="flex items-center space-x-3 p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-green-400 transition-colors">
                      <RadioGroupItem value="unico" id="pub_pago_unico" />
                      <Label htmlFor="pub_pago_unico" className="cursor-pointer flex-1">
                        <span className="font-semibold">💳 Pago Único - {CUOTA_SOCIO}€</span>
                        <p className="text-xs text-slate-600">Un solo pago para esta temporada</p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-green-400 transition-colors">
                      <RadioGroupItem value="suscripcion" id="pub_pago_suscripcion" />
                      <Label htmlFor="pub_pago_suscripcion" className="cursor-pointer flex-1">
                        <span className="font-semibold">🔄 Suscripción Anual - {CUOTA_SOCIO}€/año</span>
                        <p className="text-xs text-slate-600">Se renueva automáticamente cada año (puedes cancelar en cualquier momento)</p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Botón enviar */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-600 to-green-600 hover:from-orange-700 hover:to-green-700 py-7 text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Procesando...</>
                ) : (
                  <><UserPlus className="w-5 h-5 mr-2" /> Pagar {CUOTA_SOCIO}€ con tarjeta 💳</>
                )}
              </Button>

              <p className="text-center text-xs text-slate-500">
                Pago seguro procesado por Stripe. No almacenamos datos de tu tarjeta.
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-slate-400 text-sm pb-8">
          <p>📧 cdbustarviejo@gmail.com</p>
          <p className="mt-1">📍 Bustarviejo, Madrid</p>
          <p className="mt-4 text-xs text-slate-500">© CD Bustarviejo - Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );
}