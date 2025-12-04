import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, Star, Users, Trophy, Sparkles, Send, CheckCircle2, 
  Calendar, MapPin, Clock, Phone, Mail, ArrowRight, Zap,
  Shield, Target, Smile, Medal
} from "lucide-react";
import { toast } from "sonner";
import { CombinedSuccessAnimation } from "../components/animations/SuccessAnimation";

const HERO_IMAGE = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/8c92c8030_ChatGPTImage4dic202516_29_25.png";

export default function JoinFemenino() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState(null);
  const [formData, setFormData] = useState({
    nombre_jugadora: "",
    fecha_nacimiento: "",
    nombre_padre: "",
    email: "",
    telefono: "",
    municipio: "",
    experiencia_previa: "",
    como_nos_conocio: "",
    mensaje: ""
  });

  // Leer código de referido de la URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      // Buscar quién tiene ese código de referido
      const fetchReferrer = async () => {
        try {
          const allUsers = await base44.entities.User.list();
          const allPlayers = await base44.entities.Player.list();
          
          // Obtener emails de padres con jugadores
          const parentEmails = new Set();
          allPlayers.forEach(p => {
            if (p.email_padre) parentEmails.add(p.email_padre.toLowerCase());
            if (p.email_tutor_2) parentEmails.add(p.email_tutor_2.toLowerCase());
          });
          
          // Generar código y buscar coincidencia
          const generateCode = (email) => {
            let hash = 0;
            for (let i = 0; i < email.length; i++) {
              const char = email.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash;
            }
            return Math.abs(hash).toString(36).toUpperCase().slice(0, 8);
          };
          
          const referrer = allUsers.find(u => 
            generateCode(u.email) === refCode && 
            parentEmails.has(u.email.toLowerCase())
          );
          
          if (referrer) {
            setReferrerInfo(referrer);
          }
        } catch (error) {
          console.error("Error fetching referrer:", error);
        }
      };
      fetchReferrer();
    }
  }, []);

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const interest = await base44.entities.FemeninoInterest.create({
        ...data,
        referido_por_email: referrerInfo?.email || "",
        referido_por_nombre: referrerInfo?.full_name || "",
        estado: "Nuevo",
        temporada: seasonConfig?.temporada || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
      });

      // Notificar al admin
      await base44.integrations.Core.SendEmail({
        from_name: "CD Bustarviejo - Fútbol Femenino",
        to: "cdbustarviejo@gmail.com",
        subject: `⚽👧 ¡Nueva interesada en Fútbol Femenino! - ${data.nombre_jugadora}`,
        body: `¡Tenemos una nueva interesada en el equipo de Fútbol Femenino!

👧 DATOS DE LA JUGADORA:
• Nombre: ${data.nombre_jugadora}
• Fecha de nacimiento: ${data.fecha_nacimiento || "No indicada"}
• Experiencia: ${data.experiencia_previa || "No indicada"}

👨‍👩‍👧 DATOS DE CONTACTO:
• Padre/Madre/Tutor: ${data.nombre_padre}
• Email: ${data.email}
• Teléfono: ${data.telefono}
• Municipio: ${data.municipio || "No indicado"}

📣 ¿Cómo nos conoció?: ${data.como_nos_conocio || "No indicado"}
${referrerInfo ? `🎁 REFERIDO POR: ${referrerInfo.full_name} (${referrerInfo.email}) - ¡Aplicar bonus si se inscribe!` : ""}

💬 Mensaje: ${data.mensaje || "Sin mensaje"}

---
Accede al panel de administración para gestionar esta solicitud.`
      });

      return interest;
    },
    onSuccess: () => {
      setShowSuccess(true);
      setFormData({
        nombre_jugadora: "",
        fecha_nacimiento: "",
        nombre_padre: "",
        email: "",
        telefono: "",
        municipio: "",
        experiencia_previa: "",
        como_nos_conocio: "",
        mensaje: ""
      });
    },
    onError: (error) => {
      toast.error("Error al enviar: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre_jugadora || !formData.nombre_padre || !formData.email || !formData.telefono) {
      toast.error("Por favor, completa los campos obligatorios");
      return;
    }
    submitMutation.mutate(formData);
  };

  const benefits = [
    { icon: Users, title: "Equipo unido", desc: "Compañeras que se convierten en amigas para toda la vida" },
    { icon: Trophy, title: "Competición", desc: "Participa en ligas y torneos oficiales" },
    { icon: Heart, title: "Valores", desc: "Respeto, trabajo en equipo y superación personal" },
    { icon: Shield, title: "Entorno seguro", desc: "Entrenadores titulados y ambiente familiar" },
    { icon: Target, title: "Desarrollo", desc: "Mejora técnica, táctica y física adaptada" },
    { icon: Smile, title: "Diversión", desc: "¡Porque el fútbol es ante todo diversión!" }
  ];

  return (
    <>
      <CombinedSuccessAnimation 
        show={showSuccess} 
        onComplete={() => setShowSuccess(false)}
        message="¡Solicitud enviada! Te contactaremos pronto ⚽"
        withConfetti={true}
      />

      <div className="min-h-screen bg-black">
        {/* Hero Section con imagen de fondo */}
        <div className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
          {/* Imagen de fondo */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${HERO_IMAGE})` }}
          />
          {/* Overlay degradado */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
          
          {/* Contenido del hero */}
          <div className="relative z-10 text-center px-4 py-12 max-w-4xl mx-auto">
            <div className="flex justify-center gap-2 mb-4">
              <Badge className="bg-pink-500 text-white text-sm px-4 py-1 animate-pulse">
                ⚽ FÚTBOL FEMENINO
              </Badge>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-4 leading-tight">
              <span className="bg-gradient-to-r from-orange-400 via-pink-500 to-orange-400 bg-clip-text text-transparent">
                ¡ÚNETE AL EQUIPO!
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-6 font-medium">
              CD Bustarviejo Fútbol Femenino
            </p>
            
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Buscamos jugadoras con ganas de aprender, competir y sobre todo... 
              <span className="text-pink-400 font-bold"> ¡PASARLO GENIAL!</span>
            </p>

            {referrerInfo && (
              <div className="bg-gradient-to-r from-green-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-white/20 inline-block">
                <p className="text-white text-sm">
                  🎁 Te invita: <span className="font-bold text-pink-300">{referrerInfo.full_name}</span>
                </p>
              </div>
            )}

            <Button 
              onClick={() => document.getElementById('formulario').scrollIntoView({ behavior: 'smooth' })}
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold py-6 px-10 text-xl rounded-full shadow-2xl hover:scale-105 transition-all"
            >
              <Sparkles className="w-6 h-6 mr-2" />
              ¡QUIERO APUNTARME!
              <ArrowRight className="w-6 h-6 ml-2" />
            </Button>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-8 h-12 rounded-full border-2 border-white/50 flex items-start justify-center p-2">
              <div className="w-1.5 h-3 bg-white/80 rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        {/* Sección de beneficios */}
        <div className="bg-gradient-to-b from-black via-slate-900 to-slate-900 py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
              ¿Por qué unirte a nosotras? 💪
            </h2>
            <p className="text-center text-white/70 mb-12 max-w-2xl mx-auto">
              Más que un equipo, somos una familia donde cada jugadora crece como deportista y como persona
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {benefits.map((benefit, idx) => (
                <div 
                  key={idx}
                  className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-pink-500/50 transition-all hover:scale-105"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center mb-3">
                    <benefit.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-white mb-1">{benefit.title}</h3>
                  <p className="text-sm text-white/70">{benefit.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info rápida */}
        <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-orange-500 py-8 px-4">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-white">
            <div>
              <Calendar className="w-8 h-8 mx-auto mb-2" />
              <p className="font-bold">Temporada</p>
              <p className="text-sm opacity-90">Septiembre - Junio</p>
            </div>
            <div>
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <p className="font-bold">Entrenamientos</p>
              <p className="text-sm opacity-90">2-3 días/semana</p>
            </div>
            <div>
              <MapPin className="w-8 h-8 mx-auto mb-2" />
              <p className="font-bold">Ubicación</p>
              <p className="text-sm opacity-90">Bustarviejo, Madrid</p>
            </div>
            <div>
              <Medal className="w-8 h-8 mx-auto mb-2" />
              <p className="font-bold">Todas las edades</p>
              <p className="text-sm opacity-90">Desde 5 años</p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div id="formulario" className="bg-gradient-to-b from-slate-900 to-black py-16 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <Badge className="bg-pink-500 text-white mb-4">📝 FORMULARIO DE INTERÉS</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                ¡Da el primer paso!
              </h2>
              <p className="text-white/70">
                Rellena el formulario y nos pondremos en contacto contigo
              </p>
            </div>

            <Card className="border-none shadow-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Datos de la jugadora */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-white flex items-center gap-2 border-b border-white/20 pb-2">
                      ⚽ Datos de la jugadora
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white">Nombre de la jugadora *</Label>
                        <Input 
                          value={formData.nombre_jugadora}
                          onChange={(e) => setFormData({...formData, nombre_jugadora: e.target.value})}
                          placeholder="Nombre y apellidos"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Fecha de nacimiento</Label>
                        <Input 
                          type="date"
                          value={formData.fecha_nacimiento}
                          onChange={(e) => setFormData({...formData, fecha_nacimiento: e.target.value})}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">Experiencia previa</Label>
                      <Select value={formData.experiencia_previa} onValueChange={(v) => setFormData({...formData, experiencia_previa: v})}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Selecciona..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sin experiencia">Sin experiencia (¡no pasa nada!)</SelectItem>
                          <SelectItem value="Menos de 1 año">Menos de 1 año</SelectItem>
                          <SelectItem value="1-2 años">1-2 años</SelectItem>
                          <SelectItem value="Más de 2 años">Más de 2 años</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Datos de contacto */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-white flex items-center gap-2 border-b border-white/20 pb-2">
                      👨‍👩‍👧 Datos de contacto
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white">Nombre del padre/madre/tutor *</Label>
                        <Input 
                          value={formData.nombre_padre}
                          onChange={(e) => setFormData({...formData, nombre_padre: e.target.value})}
                          placeholder="Tu nombre"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Municipio</Label>
                        <Input 
                          value={formData.municipio}
                          onChange={(e) => setFormData({...formData, municipio: e.target.value})}
                          placeholder="Bustarviejo, Miraflores..."
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white">Email *</Label>
                        <Input 
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="tu@email.com"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Teléfono *</Label>
                        <Input 
                          type="tel"
                          value={formData.telefono}
                          onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                          placeholder="600 123 456"
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cómo nos conoció */}
                  <div className="space-y-2">
                    <Label className="text-white">¿Cómo nos has conocido?</Label>
                    <Select value={formData.como_nos_conocio} onValueChange={(v) => setFormData({...formData, como_nos_conocio: v})}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Amigo/Familiar del club">Amigo/Familiar del club</SelectItem>
                        <SelectItem value="Redes sociales">Redes sociales</SelectItem>
                        <SelectItem value="Cartel/Publicidad">Cartel/Publicidad</SelectItem>
                        <SelectItem value="Web del club">Web del club</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Mensaje */}
                  <div className="space-y-2">
                    <Label className="text-white">¿Algo que quieras contarnos?</Label>
                    <Textarea 
                      value={formData.mensaje}
                      onChange={(e) => setFormData({...formData, mensaje: e.target.value})}
                      placeholder="Preguntas, comentarios..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[80px]"
                    />
                  </div>

                  {/* Referido por */}
                  {referrerInfo && (
                    <div className="bg-gradient-to-r from-green-500/20 to-pink-500/20 rounded-xl p-4 border border-white/20">
                      <p className="text-white text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        Recomendado por: <span className="font-bold text-pink-300">{referrerInfo.full_name}</span>
                      </p>
                    </div>
                  )}

                  {/* Botón enviar */}
                  <Button 
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold py-6 text-lg rounded-xl shadow-xl"
                  >
                    {submitMutation.isPending ? (
                      <>Enviando...</>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        ¡ENVIAR SOLICITUD!
                      </>
                    )}
                  </Button>

                  <p className="text-center text-white/50 text-xs">
                    🔒 Tus datos están protegidos según RGPD
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-black py-8 px-4 text-center border-t border-white/10">
          <p className="text-white/50 text-sm">
            CD Bustarviejo © {new Date().getFullYear()} | Fútbol Femenino
          </p>
          <p className="text-pink-400 font-bold mt-2">
            ⚽ ¡Te esperamos en el campo! 💪
          </p>
        </div>
      </div>
    </>
  );
}