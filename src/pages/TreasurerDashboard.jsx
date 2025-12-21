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
import SocialLinks from "../components/SocialLinks";
import CoachClassificationsMatchesBanner from "../components/dashboard/CoachClassificationsMatchesBanner";

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

  // Fetch clasificaciones y partidos si tiene hijos
  const { data: standings = [] } = useQuery({
    queryKey: ['standings'],
    queryFn: () => base44.entities.Clasificacion.list('-jornada', 50),
    enabled: hasPlayers,
  });

  const { data: callups = [] } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido', 100),
    enabled: hasPlayers,
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
            
            <div className="grid grid-cols-3 gap-2">
              <Link to={createPageUrl("Chatbot")}>
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg relative h-20 flex flex-col justify-center">
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm font-bold text-center mb-1">🤖</p>
                  <p className="text-xs text-indigo-100 text-center">Asistente</p>
                </div>
              </Link>

              {hasPlayers ? (
                <>
                  <Link to={createPageUrl("ParentCoordinatorChat")}>
                    <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-20 flex flex-col justify-center">
                      <p className="text-sm font-bold text-center mb-1">💬</p>
                      <p className="text-xs text-cyan-100 text-center">Coordinador</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("ParentCoachChat")}>
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-3 text-white hover:scale-105 transition-all shadow-lg h-20 flex flex-col justify-center">
                      <p className="text-sm font-bold text-center mb-1">⚽</p>
                      <p className="text-xs text-blue-100 text-center">Entrenador</p>
                    </div>
                  </Link>
                </>
              ) : (
                <div className="col-span-2"></div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Banner de Clasificaciones + Próximo Partido */}
        {hasPlayers && myPlayers && myPlayers.length > 0 && standings && callups && (
          <CoachClassificationsMatchesBanner 
            standings={standings}
            callups={callups}
            myPlayers={myPlayers}
          />
        )}

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