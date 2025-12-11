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
import { Loader2, Upload, AlertCircle, CheckCircle2, Users, CreditCard, Download, Heart, Star, PartyPopper, Sparkles, UserPlus, Trophy, Gift, CreditCard as CardIcon, Share2, MessageCircle } from "lucide-react";
import { sendMemberCard } from "../components/members/MemberCardEmail";
import ReferralProgramCard from "../components/referrals/ReferralProgramCard";
import { CombinedSuccessAnimation } from "../components/animations/SuccessAnimation";
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
  const [isRenewal, setIsRenewal] = useState(false);
  const [renewalMember, setRenewalMember] = useState(null);
  const [loadingRenewal, setLoadingRenewal] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isPublicAccess, setIsPublicAccess] = useState(false); // Nuevo: si es acceso público sin login

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

  // Función para generar código de renovación (igual que en ReferralManagement)
  const generateRenewalCode = (memberId) => {
    let hash = 0;
    const str = memberId + "renewal";
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).toUpperCase().slice(0, 8);
  };

  // Leer parámetros de la URL: "ref" (referido) o "renew" (renovación)
  // Solo ejecutar después de verificar autenticación
  useEffect(() => {
    // Esperar a que termine la verificación de auth
    if (isCheckingAuth) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    const renewCode = urlParams.get('renew');
    
    if (renewCode) {
      // Modo renovación: buscar el socio por código
      setLoadingRenewal(true);
      const fetchMemberForRenewal = async () => {
        try {
          const allMembers = await base44.entities.ClubMember.list();
          // Buscar el socio cuyo código de renovación coincida
          const member = allMembers.find(m => generateRenewalCode(m.id) === renewCode);
          if (member) {
            setRenewalMember(member);
            setIsRenewal(true);
            setShowForm(true);
            // Precargar datos del socio
            setFormData({
              tipo_inscripcion: "Renovación",
              nombre_completo: member.nombre_completo || "",
              dni: member.dni || "",
              telefono: member.telefono || "",
              email: member.email || "",
              direccion: member.direccion || "",
              municipio: member.municipio || "",
              metodo_pago: member.metodo_pago || "Transferencia",
              justificante_url: "",
              es_segundo_progenitor: member.es_segundo_progenitor || false,
              referido_por: ""
            });
          }
        } catch (error) {
          console.error("Error fetching member for renewal:", error);
        } finally {
          setLoadingRenewal(false);
        }
      };
      fetchMemberForRenewal();
    } else if (refCode) {
      // Buscar el usuario que tiene ese código de referido Y que sea padre con hijos en el club
      const fetchInviter = async () => {
        try {
          const [allUsers, allPlayers, allMembers] = await Promise.all([
            base44.entities.User.list(),
            base44.entities.Player.list(),
            base44.entities.ClubMember.list()
          ]);
          
          // Obtener emails de padres con jugadores activos
          const parentEmails = new Set();
          allPlayers.forEach(p => {
            if (p.email_padre) parentEmails.add(p.email_padre.toLowerCase());
            if (p.email_tutor_2) parentEmails.add(p.email_tutor_2.toLowerCase());
          });
          
          // Buscar el usuario cuyo código coincida Y sea padre con hijos
          const inviter = allUsers.find(u => 
            generateReferralCode(u.email) === refCode && 
            parentEmails.has(u.email.toLowerCase())
          );
          
          if (inviter) {
            // Verificar que el inviter no haya alcanzado el máximo de 15 referidos
            const currentCount = inviter.referrals_count || 0;
            if (currentCount >= 15) {
              // Ha alcanzado el límite, no mostrar como invitador válido
              console.log("El invitador ha alcanzado el máximo de 15 referidos");
              setInvitadoPor(null);
              // No establecer el referido_por
            } else {
              setInvitadoPor(inviter);
              setFormData(prev => ({ ...prev, referido_por: inviter.full_name }));
            }
          } else {
            // El código no corresponde a un padre con hijos en el club
            // Esto ocurre cuando un socio externo reenvía el enlace
            console.log("Código de referido no válido o no es padre con hijos en el club");
            setInvitadoPor(null);
          }
        } catch (error) {
          console.error("Error fetching inviter:", error);
        }
      };
      fetchInviter();
    }
  }, [isCheckingAuth, user]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isAuthenticated) {
          try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
          } catch (userError) {
            // Token existe pero usuario no está en BD - acceso público
            console.log("Usuario con token pero no en BD, acceso público");
            setUser(null);
            setIsPublicAccess(true);
          }
        } else {
          // No autenticado - marcar como acceso público
          setUser(null);
          setIsPublicAccess(true);
        }
      } catch (error) {
        // Error general - permitir acceso público
        console.log("Error auth, permitiendo acceso público:", error);
        setUser(null);
        setIsPublicAccess(true);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    fetchUser();
  }, []);

  const { data: myMemberships = [], isLoading } = useQuery({
    queryKey: ['myMemberships', user?.email],
    queryFn: async () => {
      try {
        return user ? await base44.entities.ClubMember.filter({ email: user.email }) : [];
      } catch (error) {
        console.error("Error loading my memberships:", error);
        return [];
      }
    },
    enabled: !!user?.email,
  });

  const { data: allMemberships = [] } = useQuery({
    queryKey: ['allMemberships'],
    queryFn: async () => {
      try {
        return await base44.entities.ClubMember.list();
      } catch (error) {
        console.error("Error loading memberships:", error);
        return [];
      }
    },
    enabled: !isCheckingAuth,
  });

  // Detectar si el email ya fue socio en temporadas anteriores (para auto-marcar como renovación)
  const previousMemberships = allMemberships.filter(m => 
    m.email?.toLowerCase() === formData.email?.toLowerCase() && 
    m.temporada !== seasonConfig?.temporada
  );
  const wasPreviousMember = previousMemberships.length > 0;

  // Auto-detectar renovación cuando cambia el email
  useEffect(() => {
    if (formData.email && wasPreviousMember && formData.tipo_inscripcion === "Nueva Inscripción") {
      setFormData(prev => ({ ...prev, tipo_inscripcion: "Renovación" }));
      toast.info("📋 Detectamos que ya fuiste socio. Marcado como renovación.");
    }
  }, [formData.email, wasPreviousMember]);

  const { data: myPlayers = [] } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      try {
        if (!user) return [];
        const allPlayers = await base44.entities.Player.list();
        return allPlayers.filter(p => p.email_padre === user.email || p.email_tutor_2 === user.email);
      } catch (error) {
        console.error("Error loading my players:", error);
        return [];
      }
    },
    enabled: !!user?.email,
  });

  // Determinar si es un usuario externo (sin autenticación o sin hijos en el club)
  const isExternalUser = !user || myPlayers.length === 0;

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      try {
        const configs = await base44.entities.SeasonConfig.list();
        return configs.find(c => c.activa === true);
      } catch (error) {
        console.error("Error loading season config:", error);
        return null;
      }
    },
    enabled: !isCheckingAuth,
  });

  // Refetch user data para mantener crédito actualizado
  const { data: freshUser, refetch: refetchUser } = useQuery({
    queryKey: ['freshUser'],
    queryFn: () => base44.auth.me(),
    enabled: !!user,
    staleTime: 0,
    refetchInterval: 5000, // Refrescar cada 5 segundos para ver cambios de crédito
  });

  // Usar datos frescos del usuario si están disponibles
  const currentUser = freshUser || user;

  // Función para generar número de socio único
  const generateNumeroSocio = async () => {
    const allMembers = await base44.entities.ClubMember.list();
    const currentYear = new Date().getFullYear();
    const membersThisYear = allMembers.filter(m => m.numero_socio?.includes(`CDB-${currentYear}`));
    const nextNumber = membersThisYear.length + 1;
    return `CDB-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
  };

  const createMembershipMutation = useMutation({
    mutationFn: async (data) => {
      // Generar número de socio único
      const numeroSocio = await generateNumeroSocio();
      
      const membership = await base44.entities.ClubMember.create({
        ...data,
        numero_socio: numeroSocio,
        cuota_socio: CUOTA_SOCIO,
        estado_pago: data.justificante_url ? "En revisión" : "Pendiente",
        temporada: seasonConfig?.temporada || new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
        jugadores_relacionados: myPlayers.map(p => ({ jugador_id: p.id, jugador_nombre: p.nombre })),
        activo: true
      });

      // NOTA: El carnet virtual se enviará cuando el admin apruebe el pago (estado_pago = "Pagado")
      // NO enviamos carnet automáticamente aquí - solo cuando el pago sea confirmado

      // Procesar programa de referidos
      let referrer = null;
      if (seasonConfig?.programa_referidos_activo) {
      try {
      const allPlayersForRef = await base44.entities.Player.list();
          
          // Obtener emails de padres con jugadores activos
          const parentEmails = new Set();
          allPlayersForRef.forEach(p => {
            if (p.email_padre) parentEmails.add(p.email_padre.toLowerCase().trim());
            if (p.email_tutor_2) parentEmails.add(p.email_tutor_2.toLowerCase().trim());
          });

          const currentUserEmail = user?.email?.toLowerCase().trim();

          console.log("🔍 DEBUG Referidos:", {
            currentUserEmail,
            myPlayersCount: myPlayers.length,
            parentEmailsCount: parentEmails.size,
            isParent: currentUserEmail ? parentEmails.has(currentUserEmail) : false,
            referidoPor: data.referido_por,
            userId: user?.id
          });

          // CASO 1: Usuario logueado con hijos en el club → ÉL es el referidor automático
          // Usamos directamente el objeto user en lugar de buscar en User.list() (que requiere permisos de admin)
          if (user && currentUserEmail && myPlayers.length > 0 && parentEmails.has(currentUserEmail)) {
            referrer = user; // Usar el usuario actual directamente
            console.log("🎯 Referido automático por user actual:", currentUserEmail, "->", referrer?.full_name);
          }
          // CASO 2: Usuario externo con referido_por manual - NO podemos procesar sin permisos de admin
          // El referido manual se procesará cuando un admin apruebe el pago
          else if (data.referido_por) {
            console.log("⚠️ Referido manual detectado pero no se puede procesar sin permisos. Se guardará para revisión admin.");
            // Guardamos el nombre del referidor en el socio para que el admin lo procese manualmente
          }
          
          console.log("📊 Referrer final:", referrer ? `${referrer.full_name} (${referrer.email})` : "NINGUNO");
          
          if (referrer) {
            // Verificar que el referrer no haya alcanzado el máximo de 15 referidos
            const currentCount = referrer.referrals_count || 0;
            if (currentCount >= 15) {
              console.log("Referrer ha alcanzado el máximo de 15 referidos, no se añaden más premios");
              await base44.entities.ReferralReward.create({
                referrer_email: referrer.email,
                referrer_name: referrer.full_name,
                referred_member_id: membership.id,
                referred_member_name: data.nombre_completo,
                temporada: seasonConfig?.temporada,
                clothing_credit_earned: 0,
                limite_alcanzado: true
              });
            } else {
              // Registrar la referencia con premio
              const creditEarned = seasonConfig.referidos_premio_1 || 5;
              await base44.entities.ReferralReward.create({
                referrer_email: referrer.email,
                referrer_name: referrer.full_name,
                referred_member_id: membership.id,
                referred_member_name: data.nombre_completo,
                temporada: seasonConfig?.temporada,
                clothing_credit_earned: creditEarned
              });

              // REGISTRAR GANANCIA DE CRÉDITO EN HISTÓRICO
              try {
                const saldoAntes = referrer.clothing_credit_balance || 0;
                await base44.entities.CreditoRopaHistorico.create({
                  user_email: referrer.email,
                  user_nombre: referrer.full_name,
                  tipo: "ganado",
                  cantidad: creditEarned,
                  concepto: `Socio referido: ${data.nombre_completo}`,
                  temporada: seasonConfig?.temporada || "",
                  referido_nombre: data.nombre_completo,
                  saldo_antes: saldoAntes,
                  saldo_despues: saldoAntes + creditEarned,
                  fecha_movimiento: new Date().toISOString()
                });
              } catch (error) {
                console.error("Error registrando crédito ganado:", error);
              }

              // Actualizar contador del usuario (máximo 15)
              const newCount = Math.min(currentCount + 1, 15);
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
                newRaffles += (seasonConfig.referidos_sorteo_10 || 5) - (seasonConfig.referids_sorteo_5 || 3);
              } else if (newCount === 15) {
                newCredit += (seasonConfig.referidos_premio_15 || 50) - (seasonConfig.referidos_premio_10 || 50);
                newRaffles += (seasonConfig.referidos_sorteo_15 || 10) - (seasonConfig.referidos_sorteo_10 || 5);
              }

              // Usar updateMe en lugar de User.update para el usuario actual (no requiere permisos de admin)
              await base44.auth.updateMe({
                referrals_count: newCount,
                clothing_credit_balance: newCredit,
                raffle_entries_total: newRaffles
              });

              console.log(`✅ Referido procesado: ${referrer.full_name} ahora tiene ${newCount} referidos`);
              console.log(`💰 Nuevos valores: ${newCount} referidos, ${newCredit}€ crédito, ${newRaffles} participaciones`);
            }
          }
        } catch (error) {
          console.error("Error processing referral:", error);
        }
      }

      // REGISTRAR EN HISTÓRICO DE REFERIDOS (después de procesar el programa)
      if ((data.referido_por || referrer) && seasonConfig?.programa_referidos_activo) {
        try {
          await base44.entities.ReferralHistory.create({
            temporada: seasonConfig?.temporada || "",
            referidor_email: referrer?.email || "",
            referidor_nombre: referrer?.full_name || data.referido_por || "",
            referido_email: data.email,
            referido_nombre: data.nombre_completo,
            referido_id: membership.id,
            estado: "activo",
            credito_otorgado: referrer ? (seasonConfig.referidos_premio_1 || 5) : 0,
            sorteos_otorgados: 0,
            fecha_referido: new Date().toISOString()
          });
          console.log("✅ ReferralHistory creado correctamente");
        } catch (error) {
          console.error("Error guardando histórico de referido:", error);
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
    onSuccess: async () => {
      try {
        queryClient.invalidateQueries({ queryKey: ['myMemberships'] });
        queryClient.invalidateQueries({ queryKey: ['allMemberships'] });
        queryClient.invalidateQueries({ queryKey: ['allUsers'] });
        queryClient.invalidateQueries({ queryKey: ['freshUser'] });
        
        // Forzar recarga inmediata de los datos del usuario
        if (refetchUser) {
          await refetchUser();
        }
        
        // Guardar nombre y mostrar mensaje de éxito
        setLastRegisteredName(formData.nombre_completo);
        
        // Cerrar el formulario y volver arriba INMEDIATAMENTE
        setShowForm(false);
        
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

        // Si era renovación, limpiar estado
        if (isRenewal) {
          setIsRenewal(false);
          setRenewalMember(null);
        }
        
        // Scroll al principio
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Mostrar éxito DESPUÉS de limpiar todo
        setTimeout(() => {
          setShowSuccess(true);
          
          // Ocultar mensaje de éxito después de 5 segundos
          setTimeout(() => {
            setShowSuccess(false);
          }, 5000);
        }, 200);
        
      } catch (error) {
        console.error("Error en onSuccess:", error);
        toast.error("Registro exitoso pero hubo un error al actualizar la vista");
      }
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

  if (isCheckingAuth || loadingRenewal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      <CombinedSuccessAnimation 
        show={showSuccess} 
        onComplete={() => setShowSuccess(false)}
        message={`✅ ¡${lastRegisteredName} registrado correctamente!\n\nSi quieres, puedes registrar otra persona`}
        withConfetti={true}
      />
      {/* Header festivo */}
      <div className="text-center space-y-2">
        <div className="flex justify-center gap-2 text-4xl animate-bounce">
          <span>🎉</span>
          <span>⚽</span>
          <span>🏀</span>
          <span>🎉</span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-orange-600 via-green-600 to-orange-600 bg-clip-text text-transparent">
          {isRenewal ? `¡Renueva tu Membresía!` : `¡Hazte Socio del CD Bustarviejo!`}
        </h1>
        <p className="text-slate-600 text-sm lg:text-base">
          {isRenewal 
            ? `Hola ${renewalMember?.nombre_completo}, renueva tu membresía para la nueva temporada` 
            : `Forma parte de nuestra gran familia deportiva`}
        </p>
      </div>

      {/* Banner de renovación */}
      {isRenewal && renewalMember && (
        <Card className="border-2 border-green-400 bg-gradient-to-r from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-green-900 text-xl">
                  🔄 Renovación de Membresía
                </h3>
                <p className="text-green-700">
                  Tus datos ya están guardados. Solo revísalos, sube el justificante y ¡listo!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contador de socios + Stats del usuario */}
      <div className="bg-gradient-to-r from-orange-500 via-green-500 to-orange-500 rounded-2xl p-1">
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Users className="w-8 h-8 text-orange-600" />
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900">{totalSocios}</p>
              <p className="text-sm text-slate-600">socios esta temporada</p>
            </div>
            <Heart className="w-8 h-8 text-red-500 animate-pulse" />
          </div>
          
          {/* Stats de referidos del usuario - Solo para padres con hijos */}
          {currentUser && myPlayers.length > 0 && seasonConfig?.programa_referidos_activo && (
            <div className="border-t pt-4 mt-2">
              <p className="text-center text-sm font-semibold text-slate-700 mb-3">🎁 Tu Programa "Trae un Socio Amigo"</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                  <p className="text-2xl font-bold text-purple-700">{currentUser.referrals_count || 0}</p>
                  <p className="text-xs text-purple-600">Amigos referidos</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                  <p className="text-2xl font-bold text-green-700">{currentUser.clothing_credit_balance || 0}€</p>
                  <p className="text-xs text-green-600">Crédito en ropa</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
                  <p className="text-2xl font-bold text-orange-700">{currentUser.raffle_entries_total || 0}</p>
                  <p className="text-xs text-orange-600">Participaciones</p>
                </div>
              </div>
              {(currentUser.referrals_count || 0) > 0 && (
                <p className="text-center text-xs text-green-600 mt-2 font-medium">
                  🎉 ¡Gracias por traer amigos al club!
                </p>
              )}
            </div>
          )}
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

      {/* Botón para hacerse socio - PRIMERO para que sea lo más visible */}
      {!showForm && !isRenewal && (
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
      )}

      {/* Programa Trae un Socio Amigo - Solo visible para padres con hijos en el club */}
      {!isExternalUser && (
        <ReferralProgramCard 
          seasonConfig={seasonConfig}
          userReferrals={currentUser?.referrals_count || 0}
          userCredit={currentUser?.clothing_credit_balance || 0}
          userRaffleEntries={currentUser?.raffle_entries_total || 0}
          userFemeninoReferrals={currentUser?.femenino_referrals_count || 0}
          userEmail={currentUser?.email || ""}
          userName={currentUser?.full_name || ""}
          hasPlayersInClub={myPlayers.length > 0}
        />
      )}

      {/* Invitar familiares y amigos - Solo para usuarios con hijos */}
      {!isExternalUser && (
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
      )}



      {/* Formulario de inscripción */}
      {(showForm || isRenewal) ? (
        <Card className="border-none shadow-xl">
            <CardHeader className={`${isRenewal ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-orange-600 to-green-600'} text-white rounded-t-xl`}>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {isRenewal ? 'Renovar Membresía de Socio' : 'Formulario de Inscripción como Socio'}
              </CardTitle>
            </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tipo */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Tipo de Inscripción *</Label>
                <RadioGroup value={formData.tipo_inscripcion} onValueChange={(v) => setFormData({...formData, tipo_inscripcion: v})} className="space-y-2">
                  <div className={`flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border-2 ${formData.tipo_inscripcion === "Nueva Inscripción" ? "border-green-400 ring-2 ring-green-200" : "border-green-200"} hover:border-green-400 transition-colors`}>
                    <RadioGroupItem value="Nueva Inscripción" id="nueva" />
                    <Label htmlFor="nueva" className="cursor-pointer flex-1">
                      <span className="font-semibold">🆕 Nueva Inscripción</span>
                      <p className="text-xs text-slate-600">Primera vez como socio del club</p>
                    </Label>
                  </div>
                  <div className={`flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-2 ${formData.tipo_inscripcion === "Renovación" ? "border-blue-400 ring-2 ring-blue-200" : "border-blue-200"} hover:border-blue-400 transition-colors`}>
                    <RadioGroupItem value="Renovación" id="renovacion" />
                    <Label htmlFor="renovacion" className="cursor-pointer flex-1">
                      <span className="font-semibold">🔄 Renovación</span>
                      <p className="text-xs text-slate-600">Ya fui socio en temporadas anteriores</p>
                    </Label>
                    {wasPreviousMember && (
                      <Badge className="bg-blue-500 text-white text-xs">Detectado</Badge>
                    )}
                  </div>
                </RadioGroup>
                {wasPreviousMember && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-sm">
                      ✅ Detectamos que <strong>{formData.email}</strong> ya fue socio en temporada(s) anterior(es). ¡Gracias por renovar!
                    </AlertDescription>
                  </Alert>
                )}
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

              {/* Campo de quién te invitó - SOLO para usuarios externos (sin login o sin hijos) */}
              {/* Si el usuario está logueado y tiene hijos, el referido se asocia automáticamente a él */}
              {seasonConfig?.programa_referidos_activo && isExternalUser && (
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

              {/* Mensaje informativo para padres con hijos - el socio se asocia a ellos automáticamente */}
              {seasonConfig?.programa_referidos_activo && !isExternalUser && (
                <div className="p-4 rounded-xl border-2 bg-gradient-to-r from-green-50 to-green-100 border-green-300">
                  <div className="flex items-start gap-3">
                    <Gift className="w-6 h-6 mt-1 flex-shrink-0 text-green-600" />
                    <div className="flex-1">
                      <Label className="font-semibold text-green-900 flex items-center gap-2">
                        🎁 ¡Este socio se sumará a tu programa de referidos!
                      </Label>
                      <p className="text-xs text-green-700 mt-1">
                        Al registrar este nuevo socio desde tu panel, recibirás automáticamente tu crédito en ropa y participaciones en sorteos 🎉
                      </p>
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
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-mono bg-slate-100 p-2 rounded flex-1">ES12 1234 5678 1234 5678 9012</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText("ES12 1234 5678 1234 5678 9012");
                          toast.success("IBAN copiado al portapapeles");
                        }}
                        className="flex-shrink-0"
                      >
                        📋 Copiar
                      </Button>
                    </div>
                    <p className="text-sm text-slate-600 mt-3">
                      <strong>Concepto:</strong> SOCIO - {formData.nombre_completo || "Tu nombre"}
                    </p>
                  </div>
                )}

                {formData.metodo_pago === "Bizum" && seasonConfig?.bizum_telefono && (
                  <div className="bg-white rounded-xl p-4 border-2 border-green-200">
                    <p className="text-sm text-slate-700 mb-2 font-semibold">📱 Bizum al teléfono:</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-green-600 flex-1">{seasonConfig.bizum_telefono}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(seasonConfig.bizum_telefono);
                          toast.success("Teléfono copiado al portapapeles");
                        }}
                        className="flex-shrink-0"
                      >
                        📋 Copiar
                      </Button>
                    </div>
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

              {/* Aviso de Protección de Datos */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">🔒 Protección de Datos:</strong> Al enviar este formulario, consientes el tratamiento de tus datos personales por parte del CD Bustarviejo con la finalidad de gestionar tu membresía como socio del club. Tus datos serán tratados de forma confidencial conforme al Reglamento General de Protección de Datos (RGPD). Puedes ejercer tus derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición enviando un email a <a href="mailto:cdbustarviejo@gmail.com" className="text-orange-600 underline">cdbustarviejo@gmail.com</a>. Los datos se conservarán mientras dure la relación de socio y posteriormente durante el tiempo necesario para cumplir con obligaciones legales.
                </p>
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                {!isRenewal && (
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="order-2 sm:order-1">
                    Cancelar
                  </Button>
                )}
                <Button 
                  type="submit" 
                  className={`order-1 sm:order-2 ${isRenewal ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800' : 'bg-gradient-to-r from-orange-600 to-green-600 hover:from-orange-700 hover:to-green-700'} py-6 text-lg font-bold`} 
                  disabled={createMembershipMutation.isPending}
                >
                  {createMembershipMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" />Enviando...</>
                  ) : isRenewal ? (
                    <>🔄 Renovar Membresía</>
                  ) : (
                    <>🎉 Enviar Solicitud</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
          </Card>
          ) : null}

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
  );
}