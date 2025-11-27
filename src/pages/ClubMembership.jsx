import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, AlertCircle, CheckCircle2, Users, CreditCard, Download, Heart, Star, PartyPopper, Sparkles, UserPlus, Trophy, Gift } from "lucide-react";
import ReferralProgramCard from "../components/referrals/ReferralProgramCard";
import { CheckmarkAnimation } from "../components/animations/SuccessAnimation";
import { toast } from "sonner";

const CUOTA_SOCIO = 25;

export default function ClubMembership() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [uploadingJustificante, setUploadingJustificante] = useState(false);
  const [invitadoPor, setInvitadoPor] = useState(null); // Datos del socio que invita
  const [formData, setFormData] = useState({
    tipo_inscripcion: "Nueva Inscripción",
    nombre_completo: "",
    dni: "",
    telefono: "",
    email: "",
    direccion: "",
    municipio: "",
    metodo_pago: "Transferencia",
    justificante_url: "",
    es_segundo_progenitor: false,
    referido_por: ""
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastRegisteredName, setLastRegisteredName] = useState("");

  const queryClient = useQueryClient();

  // Función para generar el mismo código de referido que en ReferralProgramCard
  const generateReferralCode = (email) => {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).toUpperCase().slice(0, 8);
  };

  // Leer parámetro "ref" de la URL (código de referido)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      // Buscar el usuario que tiene ese código de referido
      const fetchInviter = async () => {
        try {
          const allUsers = await base44.entities.User.list();
          // Buscar el usuario cuyo código coincida
          const inviter = allUsers.find(u => generateReferralCode(u.email) === refCode);
          if (inviter) {
            setInvitadoPor(inviter);
            setFormData(prev => ({ ...prev, referido_por: inviter.full_name }));
          }
        } catch (error) {
          console.error("Error fetching inviter:", error);
        }
      };
      fetchInviter();
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: myMemberships = [], isLoading } = useQuery({
    queryKey: ['myMemberships', user?.email],
    queryFn: () => user ? base44.entities.ClubMember.filter({ email: user.email }) : [],
    enabled: !!user?.email,
  });

  const { data: allMemberships = [] } = useQuery({
    queryKey: ['allMemberships'],
    queryFn: () => base44.entities.ClubMember.list(),
  });

  const { data: myPlayers = [] } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => p.email_padre === user.email || p.email_tutor_2 === user.email);
    },
    enabled: !!user?.email,
  });

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });

  const createMembershipMutation = useMutation({
    mutationFn: async (data) => {
      const membership = await base44.entities.ClubMember.create({
        ...data,
        cuota_socio: CUOTA_SOCIO,
        estado_pago: data.justificante_url ? "En revisión" : "Pendiente",
        temporada: seasonConfig?.temporada || new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
        jugadores_relacionados: myPlayers.map(p => ({ jugador_id: p.id, jugador_nombre: p.nombre })),
        activo: true
      });

      // Si tiene referido_por y el programa está activo, registrar la referencia
      if (data.referido_por && seasonConfig?.programa_referidos_activo) {
        try {
          // Buscar usuario que refirió
          const allUsers = await base44.entities.User.list();
          const referrer = allUsers.find(u => 
            u.full_name?.toLowerCase().includes(data.referido_por.toLowerCase()) ||
            u.email?.toLowerCase() === data.referido_por.toLowerCase()
          );
          
          if (referrer) {
            // Registrar la referencia
            await base44.entities.ReferralReward.create({
              referrer_email: referrer.email,
              referrer_name: referrer.full_name,
              referred_member_id: membership.id,
              referred_member_name: data.nombre_completo,
              temporada: seasonConfig?.temporada,
              clothing_credit_earned: seasonConfig.referidos_premio_1 || 5
            });

            // Actualizar contador del usuario
            const newCount = (referrer.referrals_count || 0) + 1;
            let newCredit = (referrer.clothing_credit_balance || 0) + (seasonConfig.referidos_premio_1 || 5);
            let newRaffles = referrer.raffle_entries_total || 0;

            // Calcular bonificaciones por niveles
            if (newCount === 3) {
              newCredit += (seasonConfig.referidos_premio_3 || 15) - (seasonConfig.referidos_premio_1 || 5);
              newRaffles += seasonConfig.referidos_sorteo_3 || 1;
            } else if (newCount === 5) {
              newCredit += (seasonConfig.referidos_premio_5 || 25) - (seasonConfig.referidos_premio_3 || 15);
              newRaffles += (seasonConfig.referidos_sorteo_5 || 3) - (seasonConfig.referidos_sorteo_3 || 1);
            } else if (newCount === 10) {
              newCredit += (seasonConfig.referidos_premio_10 || 50) - (seasonConfig.referidos_premio_5 || 25);
              newRaffles += (seasonConfig.referidos_sorteo_10 || 5) - (seasonConfig.referidos_sorteo_5 || 3);
            } else if (newCount === 15) {
              newCredit += (seasonConfig.referidos_premio_15 || 50) - (seasonConfig.referidos_premio_10 || 50);
              newRaffles += (seasonConfig.referidos_sorteo_15 || 10) - (seasonConfig.referidos_sorteo_10 || 5);
            }

            await base44.entities.User.update(referrer.id, {
              referrals_count: newCount,
              clothing_credit_balance: newCredit,
              raffle_entries_total: newRaffles
            });
          }
        } catch (error) {
          console.error("Error processing referral:", error);
        }
      }

      // Notificar al admin (solo si notificaciones están activas)
      if (seasonConfig?.notificaciones_admin_email) {
        await base44.integrations.Core.SendEmail({
          to: "cdbustarviejo@gmail.com",
          subject: `🎉 Nueva solicitud de socio: ${data.nombre_completo}`,
          body: `Se ha recibido una nueva solicitud de socio:\n\nNombre: ${data.nombre_completo}\nDNI: ${data.dni}\nEmail: ${data.email}\nTeléfono: ${data.telefono}\nMétodo de pago: ${data.metodo_pago}\nTipo: ${data.tipo_inscripcion}\nEs segundo progenitor: ${data.es_segundo_progenitor ? "Sí" : "No"}${data.referido_por ? `\nReferido por: ${data.referido_por}` : ""}\n\nPago: Justificante subido - REVISAR\n\nAccede al panel de administración para gestionar.`
        });
      }

      return membership;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMemberships'] });
      queryClient.invalidateQueries({ queryKey: ['allMemberships'] });
      
      // Guardar nombre y mostrar mensaje de éxito
      setLastRegisteredName(formData.nombre_completo);
      setShowSuccess(true);
      
      // Limpiar formulario para nuevo registro
                  setFormData({
                    tipo_inscripcion: "Nueva Inscripción",
                    nombre_completo: "",
                    dni: "",
                    telefono: "",
                    email: "",
                    direccion: "",
                    municipio: "",
                    metodo_pago: "Transferencia",
                    justificante_url: "",
                    es_segundo_progenitor: false,
                    referido_por: ""
                  });
      
      // Ocultar mensaje de éxito después de 4 segundos
      setTimeout(() => {
        setShowSuccess(false);
      }, 4000);
    },
    onError: (error) => {
      toast.error("Error al enviar solicitud: " + error.message);
    }
  });

  const handleJustificanteUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingJustificante(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, justificante_url: response.file_url }));
      toast.success("✅ Justificante subido");
    } catch (error) {
      toast.error("Error al subir el archivo");
    } finally {
      setUploadingJustificante(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre_completo || !formData.dni || !formData.telefono || !formData.email || !formData.direccion || !formData.municipio) {
      toast.error("Por favor, rellena todos los campos obligatorios");
      return;
    }
    if (!formData.justificante_url) {
      toast.error("Por favor, sube el justificante de pago");
      return;
    }
    createMembershipMutation.mutate(formData);
  };

  const currentSeasonMembership = myMemberships.find(m => m.temporada === seasonConfig?.temporada);
  const totalSocios = allMemberships.filter(m => m.temporada === seasonConfig?.temporada && m.activo).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <>
      <CheckmarkAnimation 
        show={showSuccess} 
        onComplete={() => setShowSuccess(false)}
        message={`¡Bienvenido/a, ${lastRegisteredName}!`}
      />
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header festivo */}
      <div className="text-center space-y-2">
        <div className="flex justify-center gap-2 text-4xl animate-bounce">
          <span>🎉</span>
          <span>⚽</span>
          <span>🏀</span>
          <span>🎉</span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-orange-600 via-green-600 to-orange-600 bg-clip-text text-transparent">
          ¡Hazte Socio del CD Bustarviejo!
        </h1>
        <p className="text-slate-600 text-sm lg:text-base">Forma parte de nuestra gran familia deportiva</p>
      </div>

      {/* Contador de socios */}
      <div className="bg-gradient-to-r from-orange-500 via-green-500 to-orange-500 rounded-2xl p-1">
        <div className="bg-white rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <Users className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-3xl font-bold text-slate-900">{totalSocios}</p>
              <p className="text-sm text-slate-600">socios esta temporada</p>
            </div>
            <Heart className="w-8 h-8 text-red-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Beneficios de ser socio */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-orange-50 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200 rounded-full -mr-16 -mt-16 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-200 rounded-full -ml-12 -mb-12 opacity-50"></div>
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Star className="w-6 h-6 text-yellow-500" />
            ¿Por qué ser socio?
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 bg-white rounded-xl p-3 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Apoyo esencial al club</p>
                <p className="text-xs text-slate-600">Tu aportación es vital para el desarrollo de nuestros jóvenes deportistas</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white rounded-xl p-3 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Fuerza para la comunidad</p>
                <p className="text-xs text-slate-600">Únete a la gran familia del club y vive la pasión por el deporte en Bustarviejo</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white rounded-xl p-3 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <PartyPopper className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Eventos y momentos inolvidables</p>
                <p className="text-xs text-slate-600">Participa en las actividades del club y comparte experiencias únicas</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white rounded-xl p-3 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Compromiso con el deporte base</p>
                <p className="text-xs text-slate-600">Contribuye directamente al crecimiento y formación de nuestros deportistas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estado actual si ya es socio */}
      {currentSeasonMembership ? (
        <Card className="border-none shadow-xl bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-400">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center animate-pulse">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-green-900 text-xl flex items-center gap-2">
                  🎉 ¡Ya eres socio! 
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                </h3>
                <p className="text-green-800 text-sm mt-1">
                  Temporada {currentSeasonMembership.temporada}
                </p>
                <div className="mt-3">
                  <Badge className={`text-sm ${
                    currentSeasonMembership.estado_pago === "Pagado" ? "bg-green-600" :
                    currentSeasonMembership.estado_pago === "En revisión" ? "bg-yellow-600" : "bg-red-600"
                  }`}>
                    {currentSeasonMembership.estado_pago === "Pagado" ? "✅ Pagado" :
                     currentSeasonMembership.estado_pago === "En revisión" ? "⏳ En revisión" : "⚠️ Pendiente de pago"}
                  </Badge>
                </div>
                {currentSeasonMembership.estado_pago === "Pendiente" && (
                  <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      Recuerda subir el justificante de pago para completar tu inscripción.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Programa Trae un Socio Amigo */}
      <ReferralProgramCard 
        seasonConfig={seasonConfig}
        userReferrals={user?.referrals_count || 0}
        userCredit={user?.clothing_credit_balance || 0}
        userRaffleEntries={user?.raffle_entries_total || 0}
        userEmail={user?.email || ""}
        userName={user?.full_name || ""}
      />

      {/* Invitar familiares y amigos */}
      <Card className="border-none shadow-xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
        <CardContent className="pt-6 relative">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-2xl mb-2">
                ¡Invita a familiares y amigos! 👨‍👩‍👧‍👦
              </h3>
              <p className="text-white/90 text-sm mb-4">
                ¿Abuelos, tíos, padrinos, amigos de la familia? ¡Todos pueden ser socios y apoyar a nuestros deportistas! 
                Cada nuevo socio es un granito de arena que ayuda a que el club siga creciendo.
              </p>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <p className="text-white font-semibold text-center">
                  Solo <span className="text-3xl font-bold">{CUOTA_SOCIO}€</span> /temporada
                </p>
                <p className="text-white/80 text-xs text-center mt-1">
                  ¡Un pequeño gesto con un gran impacto! 💪
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Botón para hacerse socio o formulario */}
      {!showForm ? (
        <div className="space-y-4">
          <Button 
            onClick={() => setShowForm(true)} 
            className="w-full bg-gradient-to-r from-orange-600 to-green-600 hover:from-orange-700 hover:to-green-700 text-white font-bold py-8 text-xl rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105"
          >
            <UserPlus className="w-6 h-6 mr-3" />
            ¡Quiero ser socio! 🎉
          </Button>
          <p className="text-center text-slate-500 text-sm">
            Puedes inscribir a cualquier persona: tú mismo, tu pareja, abuelos, tíos, amigos...
          </p>
        </div>
      ) : (
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-600 to-green-600 text-white rounded-t-xl">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Formulario de Inscripción como Socio
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tipo */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Tipo de Inscripción *</Label>
                <RadioGroup value={formData.tipo_inscripcion} onValueChange={(v) => setFormData({...formData, tipo_inscripcion: v})} className="space-y-2">
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border-2 border-green-200 hover:border-green-400 transition-colors">
                    <RadioGroupItem value="Nueva Inscripción" id="nueva" />
                    <Label htmlFor="nueva" className="cursor-pointer flex-1">
                      <span className="font-semibold">🆕 Nueva Inscripción</span>
                      <p className="text-xs text-slate-600">Primera vez como socio del club</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-colors">
                    <RadioGroupItem value="Renovación" id="renovacion" />
                    <Label htmlFor="renovacion" className="cursor-pointer flex-1">
                      <span className="font-semibold">🔄 Renovación</span>
                      <p className="text-xs text-slate-600">Ya fui socio en temporadas anteriores</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* ¿Es segundo progenitor? */}
              <div className="p-4 bg-orange-50 rounded-xl border-2 border-orange-200">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="segundo_progenitor"
                    checked={formData.es_segundo_progenitor}
                    onChange={(e) => setFormData({...formData, es_segundo_progenitor: e.target.checked})}
                    className="mt-1 w-5 h-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                  />
                  <Label htmlFor="segundo_progenitor" className="cursor-pointer">
                    <span className="font-semibold text-orange-900">👫 Soy el segundo progenitor de un jugador inscrito</span>
                    <p className="text-xs text-orange-700 mt-1">
                      Marca esta casilla si el jugador principal ya ha sido inscrito por otro tutor y quieres ser socio
                    </p>
                  </Label>
                </div>
              </div>

              {/* Campo de quién te invitó */}
              {seasonConfig?.programa_referidos_activo && (
                <div className={`p-4 rounded-xl border-2 ${invitadoPor ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300' : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'}`}>
                  <div className="flex items-start gap-3">
                    <Gift className={`w-6 h-6 mt-1 flex-shrink-0 ${invitadoPor ? 'text-green-600' : 'text-purple-600'}`} />
                    <div className="flex-1">
                      {invitadoPor ? (
                        <>
                          <Label className="font-semibold text-green-900 flex items-center gap-2">
                            ✅ ¡Te ha invitado {invitadoPor.full_name}!
                          </Label>
                          <p className="text-xs text-green-700 mt-1 mb-2">
                            Al registrarte, {invitadoPor.full_name} recibirá su premio automáticamente 🎉
                          </p>
                          <div className="bg-white rounded-lg p-2 border border-green-200">
                            <p className="text-sm font-medium text-green-800">{invitadoPor.full_name}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Label htmlFor="referido_por" className="font-semibold text-purple-900 flex items-center gap-2">
                            🎁 ¿Quién te ha invitado a hacerte socio?
                          </Label>
                          <p className="text-xs text-purple-700 mt-1 mb-2">
                            Si un amigo o familiar te invitó, escribe su nombre para que reciba su premio
                          </p>
                          <Input 
                            id="referido_por"
                            value={formData.referido_por}
                            onChange={(e) => setFormData({...formData, referido_por: e.target.value})}
                            placeholder="Nombre de quien te invitó (opcional)"
                            className="bg-white"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Datos personales */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 border-b pb-2">Datos del nuevo socio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre y Apellidos *</Label>
                    <Input 
                      id="nombre" 
                      name="name"
                      autoComplete="name"
                      value={formData.nombre_completo} 
                      onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})} 
                      onBlur={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                      placeholder="Ej: Juan García López"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dni">DNI *</Label>
                    <Input 
                      id="dni" 
                      name="dni"
                      autoComplete="off"
                      value={formData.dni} 
                      onChange={(e) => setFormData({...formData, dni: e.target.value})} 
                      onBlur={(e) => setFormData({...formData, dni: e.target.value})}
                      placeholder="12345678A" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono Móvil *</Label>
                    <Input 
                      id="telefono" 
                      name="tel"
                      type="tel" 
                      autoComplete="tel"
                      value={formData.telefono} 
                      onChange={(e) => setFormData({...formData, telefono: e.target.value})} 
                      onBlur={(e) => setFormData({...formData, telefono: e.target.value})}
                      placeholder="600123456" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico *</Label>
                    <Input 
                      id="email" 
                      name="email"
                      type="email" 
                      autoComplete="email"
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})} 
                      onBlur={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="correo@ejemplo.com"
                      required 
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="direccion">Dirección Completa *</Label>
                    <Input 
                      id="direccion" 
                      name="street-address"
                      autoComplete="street-address"
                      value={formData.direccion} 
                      onChange={(e) => setFormData({...formData, direccion: e.target.value})} 
                      onBlur={(e) => setFormData({...formData, direccion: e.target.value})}
                      placeholder="Calle, número, piso..." 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="municipio">Municipio *</Label>
                    <Input 
                      id="municipio" 
                      name="address-level2"
                      autoComplete="address-level2"
                      value={formData.municipio} 
                      onChange={(e) => setFormData({...formData, municipio: e.target.value})} 
                      onBlur={(e) => setFormData({...formData, municipio: e.target.value})}
                      placeholder="Bustarviejo" 
                      required 
                    />
                  </div>
                </div>
              </div>

              {/* Pago */}
              <div className="space-y-4 border-2 border-green-300 rounded-xl p-6 bg-gradient-to-br from-green-50 to-green-100">
                <h3 className="font-bold text-green-900 flex items-center gap-2 text-lg">
                  <CreditCard className="w-6 h-6" />
                  Pago: {CUOTA_SOCIO}€
                </h3>

                <div className="space-y-3">
                  <Label className="font-semibold">Método de Pago *</Label>
                  <RadioGroup value={formData.metodo_pago} onValueChange={(v) => setFormData({...formData, metodo_pago: v})} className="space-y-2">
                    <div className="flex items-center space-x-3 p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-green-400 transition-colors">
                      <RadioGroupItem value="Transferencia" id="transferencia" />
                      <Label htmlFor="transferencia" className="cursor-pointer flex-1">
                        <span className="font-semibold">🏦 Transferencia Bancaria</span>
                      </Label>
                    </div>
                    {seasonConfig?.bizum_activo && (
                      <div className="flex items-center space-x-3 p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-green-400 transition-colors">
                        <RadioGroupItem value="Bizum" id="bizum" />
                        <Label htmlFor="bizum" className="cursor-pointer flex-1">
                          <span className="font-semibold">📱 Bizum</span>
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>

                {formData.metodo_pago === "Transferencia" && (
                  <div className="bg-white rounded-xl p-4 border-2 border-green-200">
                    <p className="text-sm text-slate-700 mb-2 font-semibold">📋 Datos bancarios:</p>
                    <p className="text-lg font-mono bg-slate-100 p-2 rounded">ES12 1234 5678 1234 5678 9012</p>
                    <p className="text-sm text-slate-600 mt-3">
                      <strong>Concepto:</strong> SOCIO - {formData.nombre_completo || "Tu nombre"}
                    </p>
                  </div>
                )}

                {formData.metodo_pago === "Bizum" && seasonConfig?.bizum_telefono && (
                  <div className="bg-white rounded-xl p-4 border-2 border-green-200">
                    <p className="text-sm text-slate-700 mb-2 font-semibold">📱 Bizum al teléfono:</p>
                    <p className="text-2xl font-bold text-green-600">{seasonConfig.bizum_telefono}</p>
                    <p className="text-sm text-slate-600 mt-3">
                      <strong>Concepto:</strong> SOCIO - {formData.nombre_completo || "Tu nombre"}
                    </p>
                  </div>
                )}

                {/* Subir justificante */}
                <div className="space-y-2">
                  <Label className="font-semibold">Subir Justificante de Pago *</Label>
                  <p className="text-xs text-slate-600">Obligatorio: sube el comprobante de tu transferencia o Bizum</p>
                  <div className="flex items-center gap-2">
                    <input type="file" accept="image/*,application/pdf" onChange={handleJustificanteUpload} className="hidden" id="justificante-upload" required />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => document.getElementById('justificante-upload').click()} 
                      disabled={uploadingJustificante} 
                      className="flex-1"
                    >
                      {uploadingJustificante ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                      {formData.justificante_url ? "✅ Cambiar justificante" : "Subir justificante"}
                    </Button>
                    {formData.justificante_url && (
                      <a href={formData.justificante_url} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="ghost" size="icon"><Download className="w-4 h-4" /></Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="order-2 sm:order-1">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="order-1 sm:order-2 bg-gradient-to-r from-orange-600 to-green-600 hover:from-orange-700 hover:to-green-700 py-6 text-lg font-bold" 
                  disabled={createMembershipMutation.isPending}
                >
                  {createMembershipMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" />Enviando...</>
                  ) : (
                    <>🎉 Enviar Solicitud</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Historial de membresías */}
      {myMemberships.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Mi Historial de Membresías
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myMemberships.map(m => (
                <div key={m.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border">
                  <div>
                    <p className="font-semibold text-slate-900">{m.temporada}</p>
                    <p className="text-sm text-slate-600">{m.tipo_inscripcion}</p>
                    <p className="text-xs text-slate-500">{m.nombre_completo}</p>
                  </div>
                  <Badge className={`text-sm ${
                    m.estado_pago === "Pagado" ? "bg-green-600" :
                    m.estado_pago === "En revisión" ? "bg-yellow-600" : "bg-red-600"
                  }`}>
                    {m.estado_pago}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}