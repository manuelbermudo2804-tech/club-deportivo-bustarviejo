import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import DashboardButtonSelector from "../components/dashboard/DashboardButtonSelector";
import { ALL_TREASURER_BUTTONS, DEFAULT_TREASURER_BUTTONS, MIN_BUTTONS, MAX_BUTTONS } from "../components/dashboard/TreasurerDashboardButtons";

import { 
  MessageCircle,
  Sparkles
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ContactCard from "../components/ContactCard";
import AlertCenter from "../components/dashboard/AlertCenter";
import SocialLinks from "../components/SocialLinks";

export default function TreasurerDashboard() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [hasPlayers, setHasPlayers] = useState(false);
  const [myPlayers, setMyPlayers] = useState([]);
  const [loteriaVisible, setLoteriaVisible] = useState(false);

  const getCurrentSeason = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  };

  const currentSeason = getCurrentSeason();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        // Verificar que sea tesorero
        if (currentUser.es_tesorero !== true) {
          console.error('❌ Usuario no es tesorero, redirigiendo...');
          window.location.href = createPageUrl('Home');
          return;
        }
        
        setUser(currentUser);
        
        const tienehijos = currentUser.tiene_hijos_jugando === true;
        setHasPlayers(tienehijos);
        
        // Si tiene hijos, cargar sus jugadores
        if (tienehijos) {
          const allPlayers = await base44.entities.Player.list();
          const myPlayersList = allPlayers.filter(p => 
            (p.email_padre === currentUser.email || p.email_tutor_2 === currentUser.email) && 
            p.activo === true
          );
          setMyPlayers(myPlayersList);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // Fetch season config
  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list('-created_date');
      const activeConfig = configs.find(c => c.activa === true);
      setLoteriaVisible(activeConfig?.loteria_navidad_abierta === true);
      return configs;
    },
  });

  // Fetch payments
  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const allPayments = await base44.entities.Payment.list('-created_date');
      return allPayments.filter(p => p.is_deleted !== true);
    },
  });

  // Fetch button configuration
  const { data: buttonConfigs = [] } = useQuery({
    queryKey: ['dashboardButtonConfig', user?.email],
    queryFn: async () => {
      const configs = await base44.entities.DashboardButtonConfig.filter({ 
        user_email: user?.email,
        panel_type: "treasurer"
      });
      return configs;
    },
    staleTime: 600000,
    enabled: !!user,
  });

  const userButtonConfig = buttonConfigs[0];

  const saveButtonConfigMutation = useMutation({
    mutationFn: async (selectedButtonIds) => {
      if (userButtonConfig) {
        return await base44.entities.DashboardButtonConfig.update(userButtonConfig.id, {
          selected_buttons: selectedButtonIds
        });
      } else {
        return await base44.entities.DashboardButtonConfig.create({
          user_email: user?.email,
          panel_type: "treasurer",
          selected_buttons: selectedButtonIds
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardButtonConfig'] });
      toast.success("✅ Configuración guardada");
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        <SocialLinks />
        
        {/* Header */}
        <div className="text-center lg:text-left">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            💰 Panel Tesorero
          </h1>
          <p className="text-slate-400 text-sm lg:text-base">
            {user?.full_name} - Gestión financiera del club
          </p>
        </div>

        {/* Banner de Mensajes */}
        <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-purple-900">💬 Mensajes</h3>
                <p className="text-xs text-purple-700">Comunicación del club</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Link to={createPageUrl("Chatbot")} className="flex-1">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg relative h-full flex flex-col justify-center">
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm font-bold text-center mb-1">🤖 Asistente</p>
                  <p className="text-xs text-indigo-100 text-center">Consulta IA</p>
                </div>
              </Link>

              {hasPlayers && (
                <>
                  <Link to={createPageUrl("ParentCoordinatorChat")} className="flex-1">
                    <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
                      <p className="text-sm font-bold text-center mb-1">💬 Coordinador</p>
                      <p className="text-xs text-cyan-100 text-center">Chat categoría</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("ParentCoachChat")} className="flex-1 col-span-2">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-full flex flex-col justify-center">
                      <p className="text-sm font-bold text-center mb-1">⚽ Entrenador</p>
                      <p className="text-xs text-blue-100 text-center">Chat equipo</p>
                    </div>
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AlertCenter - Solo si tiene hijos */}
        {hasPlayers && myPlayers && myPlayers.length > 0 && payments && payments.length >= 0 && (() => {
          const normalizeSeason = (season) => {
            if (!season) return currentSeason;
            return season.replace(/-/g, '/');
          };
          
          const myPayments = payments.filter(p => 
            myPlayers.some(pl => pl.id === p.jugador_id) && 
            p.is_deleted !== true &&
            normalizeSeason(p.temporada) === normalizeSeason(currentSeason)
          );
          
          const pendientesCount = myPayments.filter(p => p.estado === "Pendiente").length;
          const revisionCount = myPayments.filter(p => p.estado === "En revisión").length;
          
          const now = new Date();
          let vencidosCount = 0;
          myPayments.forEach(payment => {
            if (payment.estado !== "Pagado") {
              const mes = payment.mes;
              const year = parseInt(currentSeason.split('/')[0]);
              let vencimiento;
              
              if (mes === "Junio") vencimiento = new Date(year, 5, 30);
              else if (mes === "Septiembre") vencimiento = new Date(year, 8, 15);
              else if (mes === "Diciembre") vencimiento = new Date(year, 11, 15);
              
              if (vencimiento && now >= vencimiento) vencidosCount++;
            }
          });
          
          const calcularEdad = (fechaNac) => {
            if (!fechaNac) return null;
            const hoy = new Date();
            const nacimiento = new Date(fechaNac);
            let edad = hoy.getFullYear() - nacimiento.getFullYear();
            const m = hoy.getMonth() - nacimiento.getMonth();
            if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
            return edad;
          };
          
          let firmasCount = 0;
          myPlayers.forEach(player => {
            if (player.enlace_firma_jugador && !player.firma_jugador_completada) firmasCount++;
            const esMayor = calcularEdad(player.fecha_nacimiento) >= 18;
            if (player.enlace_firma_tutor && !player.firma_tutor_completada && !esMayor) firmasCount++;
          });
          
          const userSports = [...new Set(myPlayers.map(p => p.deporte).filter(Boolean))];
          
          return (
            <AlertCenter 
              pendingCallups={0}
              pendingSignatures={firmasCount}
              pendingPayments={pendientesCount}
              paymentsInReview={revisionCount}
              overduePayments={vencidosCount}
              isParent={true}
              isTreasurer={true}
              userEmail={user?.email}
              userSports={userSports}
            />
          );
        })()}

        {/* Botón personalizar dashboard */}
        <div className="flex justify-end">
          <DashboardButtonSelector
            allButtons={ALL_TREASURER_BUTTONS.filter(b => !b.conditional || (b.conditionKey === "loteriaVisible" && loteriaVisible))}
            selectedButtonIds={userButtonConfig?.selected_buttons || DEFAULT_TREASURER_BUTTONS}
            onSave={(newConfig) => saveButtonConfigMutation.mutate(newConfig)}
            minButtons={MIN_BUTTONS}
            maxButtons={MAX_BUTTONS}
            defaultButtons={DEFAULT_TREASURER_BUTTONS}
            panelName="Panel Tesorero"
          />
        </div>

        {/* GRID DE BOTONES CENTRALES */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 stagger-animation">
          {(userButtonConfig?.selected_buttons || DEFAULT_TREASURER_BUTTONS)
            .map(id => ALL_TREASURER_BUTTONS.find(b => b.id === id))
            .filter(Boolean)
            .filter(b => !b.conditional || (b.conditionKey === "loteriaVisible" && loteriaVisible))
            .map((item, index) => (
            <Link key={index} to={item.url} className="group">
              <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-elegant-xl card-hover-glow transition-all duration-300 active:scale-95 border-2 border-slate-700 hover:border-orange-500 btn-hover-shine">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
                <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl ${item.gradient} opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-50`}></div>
                <div className={`absolute top-0 left-0 w-24 h-24 bg-gradient-to-br ${item.gradient} opacity-20 blur-xl transition-opacity duration-300 group-hover:opacity-40`}></div>
                <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                  <div className={`w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-3 lg:mb-4 shadow-2xl icon-hover-bounce transition-all duration-300`}>
                    <item.icon className="w-6 h-6 lg:w-10 lg:h-10 text-white transition-transform duration-300" />
                  </div>
                  <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">{item.title}</h3>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <ContactCard />

      </div>
    </div>
  );
}