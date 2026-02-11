import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Settings, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CoachChatWindow from "../components/coach/CoachChatWindow";
import CoachAwayMode from "../components/coach/CoachAwayMode";
import { useChatUnreadCounts } from "../components/chat/useChatUnreadCounts";

export default function CoachParentChat({ embedded = false }) {
  const navigate = useNavigate();
   const [user, setUser] = useState(null);
   const [allPlayers, setAllPlayers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [lockedCategory, setLockedCategory] = useState(null); // Si viene de URL, ocultar pestañas
  const [showSettings, setShowSettings] = useState(false);
  const [unreadByCategory, setUnreadByCategory] = useState({});

  // Contadores y helpers de lectura (debe ir ANTES de usarlos en efectos)
  const { counts: chatCounts, markRead, clearActiveChat } = useChatUnreadCounts(user);

  // Normalización consistente con backend y useChatUnreadCounts
  const toGroupId = (s = "") =>
    s.toString()
      .replace(/\(.*?\)/g, "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .toLowerCase();

  const normalizeCategory = (cat) => {
   if (!cat) return '';
   return cat.toLowerCase().trim().replace(/\s+/g, ' ');
  };

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Vista de ENTRENADOR: mostrar SOLO sus categorías como entrenador
      let categories;
      if (currentUser.role === "admin") {
        categories = ["Todas las categorías"];
      } else {
        const coachCats = currentUser.categorias_entrena || [];
        categories = [...new Set(coachCats)];
      }
      
      if (categories.length > 0 && !selectedCategory) {
        setSelectedCategory(categories[0]);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchPlayers = async () => {
      const players = await base44.entities.Player.list();
      setAllPlayers(players);
    };
    fetchPlayers();
  }, []);

  // Asegurar que siempre haya una categoría válida seleccionada para ENTRENADOR
  useEffect(() => {
    if (!user) return;
    const coachCats = user.categorias_entrena || [];
    if (coachCats.length > 0 && (!selectedCategory || !coachCats.includes(selectedCategory))) {
      setSelectedCategory(coachCats[0]);
    }
  }, [user, selectedCategory]);

  // Contar mensajes no leídos por categoría (desde ChatMessage)
  const { data: messages = [] } = useQuery({
    queryKey: ['coachGroupMessagesAll'],
    queryFn: async () => {
      const list = await base44.entities.ChatMessage.list('-created_date', 200);
      return list.filter(m => m.tipo === 'padre_a_grupo' || m.tipo === 'entrenador_a_grupo');
    },
    initialData: [],
    staleTime: 60000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // Usar contadores del backend en vez de calcular localmente
  useEffect(() => {
    if (!chatCounts || !user) return;
    const teamChats = chatCounts.team_chats || {};
    const allCats = [...new Set(user.categorias_entrena || [])];
    const unreadCounts = {};
    for (const cat of allCats) {
      const gid = toGroupId(cat);
      unreadCounts[cat] = teamChats[gid] || 0;
    }
    setUnreadByCategory(unreadCounts);
  }, [chatCounts, user]);

  // Si hay ?category= o ?categoria= en la URL, abrir directamente esa categoría y ocultar pestañas
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category') || params.get('categoria');
    if (cat && !selectedCategory) {
      setSelectedCategory(cat);
      setLockedCategory(cat);
    }
  }, [selectedCategory]);
  
  // Marcar como leído via backend persistente
  useEffect(() => {
    if (!selectedCategory || !user?.email) return;
    const gid = toGroupId(selectedCategory);
    if (gid) markRead('team', gid);
  }, [selectedCategory, user?.email]);
  
  // Al salir del chat, limpiar para que vuelvan a contar los +1
  useEffect(() => {
    return () => { try { clearActiveChat(); } catch {} };
  }, []);

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const isCoach = user?.es_entrenador === true || user?.role === "admin";
  const isCoordinator = user?.es_coordinador === true;

  if (!isCoach && !isCoordinator) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Solo entrenadores y coordinadores pueden acceder a esta sección</p>
      </div>
    );
  }

  const categories = user?.role === "admin" 
    ? ["Todas las categorías", ...new Set(allPlayers.map(p => p.categoria_principal || p.deporte).filter(Boolean))]
    : [...new Set([...(user?.categorias_entrena || [])])] ;

  if (categories.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">No tienes categorías de entrenador asignadas. Contacta con el administrador.</p>
      </div>
    );
  }

  if (embedded) {
    return (
      <>
        {/* Modal de configuración */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                ⚙️ Configuración Chat Entrenador
              </DialogTitle>
            </DialogHeader>
            
            <div className="mt-4">
              <CoachAwayMode user={user} />
            </div>
          </DialogContent>
        </Dialog>

        <Card className="h-full flex flex-col overflow-hidden min-h-0 border-green-200 shadow-lg rounded-none">
           {/* Header con pestañas de categorías */}
           <div className="bg-gradient-to-r from-green-600 to-green-700 text-white flex-shrink-0">
             <div className="p-2 flex items-center justify-between border-b border-green-500/30">
               <div>
                 <h1 className="text-base font-bold flex items-center gap-2">
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => navigate(-1)}
                     className="text-white hover:bg-white/20 h-8 w-8 p-0"
                     title="Volver atrás"
                   >
                     <ChevronLeft className="w-4 h-4" />
                   </Button>
                   <MessageCircle className="w-5 h-5" />
                   Chat con Familias
                 </h1>
               </div>
               <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
                title="Configuración"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          
          {/* Banner de avisos y pestañas - solo si NO viene con categoría fija */}
          {!lockedCategory && Object.values(unreadByCategory).some(count => count > 0) && (
            <div className="px-2 py-1.5 bg-yellow-50 border-b border-yellow-200 flex gap-2 overflow-x-auto flex-wrap">
              <span className="text-xs font-semibold text-yellow-800 whitespace-nowrap">🔔 Nuevos mensajes:</span>
              {categories.filter(cat => unreadByCategory[cat] > 0).map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setSelectedCategory(cat)}
                  className="bg-yellow-200 border border-yellow-400 rounded-full px-2 py-0.5 text-xs font-semibold text-yellow-900 hover:bg-yellow-300 transition-colors whitespace-nowrap"
                >
                  {cat === "Todas las categorías" ? "📋 Todas" : cat.replace('Fútbol ', '').replace(' (Mixto)', '')} 
                  <Badge className="ml-1 bg-red-500 text-white text-[10px] px-1 py-0 h-4 animate-pulse">
                    {unreadByCategory[cat]}
                  </Badge>
                </button>
              ))}
            </div>
          )}

         {/* Pestañas de categorías - solo si NO viene con categoría fija */}
          {!lockedCategory && (
          <div className="flex gap-1 px-2 pb-2 overflow-x-auto">
            {categories.map(cat => {
              const catKey = typeof cat === 'string' ? cat : (cat?.nombre || String(cat));
              const categoryPlayers = cat === "Todas las categorías" 
                ? allPlayers 
                : allPlayers.filter(p => (p.deporte === cat || p.categoria_principal === cat || (p.categorias || []).includes(cat)));
              
              const parentCount = new Set(categoryPlayers.flatMap(p => 
                [p.email_padre, p.email_tutor_2].filter(Boolean)
              )).size;

              const unreadCount = unreadByCategory[cat] || 0;

              return (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap text-xs px-2 py-1 h-7 relative ${
                    selectedCategory === cat 
                      ? 'bg-white text-green-700 hover:bg-white/90' 
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  {cat === "Todas las categorías" ? "📋 Todas" : catKey.replace?.('Fútbol ', '').replace?.(' (Mixto)', '') || String(catKey)}
                  <span className="ml-1.5 text-xs opacity-70">({parentCount})</span>
                  {unreadCount > 0 && (
                    <Badge className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0 h-4 animate-pulse">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
          )}
        </div>

        {/* Ventana de chat */}
        <div className="flex-1 overflow-hidden min-h-0">
          {selectedCategory && (unreadByCategory[selectedCategory] > 0) && (
            <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-xs px-3 py-2">
              Tienes {unreadByCategory[selectedCategory]} mensajes nuevos en {selectedCategory}
            </div>
          )}
          {selectedCategory ? (
            <CoachChatWindow
              selectedCategory={selectedCategory}
              user={user}
              allPlayers={allPlayers}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Selecciona una categoría para empezar</p>
              </div>
            </div>
          )}
        </div>
      </Card>
      </>
    );
  }

  return (
    <div className="fixed inset-0 lg:inset-auto lg:absolute lg:top-0 lg:left-0 lg:right-0 lg:bottom-0 flex flex-col overflow-hidden min-h-0 pt-[100px] lg:pt-0 pb-0">
      {/* Modal de configuración */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              ⚙️ Configuración Chat Entrenador
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            <CoachAwayMode user={user} />
          </div>
        </DialogContent>
      </Dialog>

      <Card className="h-full flex flex-col overflow-hidden min-h-0 lg:rounded-lg rounded-none border-green-200 shadow-lg">
         {/* Header con pestañas de categorías */}
         <div className="bg-gradient-to-r from-green-600 to-green-700 text-white flex-shrink-0">
           <div className="p-2 flex items-center justify-between border-b border-green-500/30">
             <div>
               <h1 className="text-base font-bold flex items-center gap-2">
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => navigate(-1)}
                   className="text-white hover:bg-white/20 h-8 w-8 p-0"
                   title="Volver atrás"
                 >
                   <ChevronLeft className="w-4 h-4" />
                 </Button>
                 <MessageCircle className="w-5 h-5" />
                 Chat Entrenador-Familias
                 {lockedCategory && (
                   <span className="text-xs font-normal opacity-80 ml-1">
                     · {lockedCategory.replace('Fútbol ', '').replace(' (Mixto)', '')}
                   </span>
                 )}
               </h1>
             </div>
             <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
              title="Configuración"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        
        {/* Banner de avisos y pestañas - solo si NO viene con categoría fija */}
        {!lockedCategory && Object.values(unreadByCategory).some(count => count > 0) && (
          <div className="px-2 py-1.5 bg-yellow-50 border-b border-yellow-200 flex gap-2 overflow-x-auto flex-wrap">
            <span className="text-xs font-semibold text-yellow-800 whitespace-nowrap">🔔 Nuevos mensajes:</span>
            {categories.filter(cat => unreadByCategory[cat] > 0).map(cat => (
              <button 
                key={cat} 
                onClick={() => setSelectedCategory(cat)}
                className="bg-yellow-200 border border-yellow-400 rounded-full px-2 py-0.5 text-xs font-semibold text-yellow-900 hover:bg-yellow-300 transition-colors whitespace-nowrap"
              >
                {cat === "Todas las categorías" ? "📋 Todas" : cat.replace('Fútbol ', '').replace(' (Mixto)', '')} 
                <Badge className="ml-1 bg-red-500 text-white text-[10px] px-1 py-0 h-4 animate-pulse">
                  {unreadByCategory[cat]}
                </Badge>
              </button>
            ))}
          </div>
        )}

        {/* Pestañas de categorías - solo si NO viene con categoría fija */}
        {!lockedCategory && (
        <div className="flex gap-1 px-2 pb-2 overflow-x-auto">
          {categories.map(cat => {
            const categoryPlayers = cat === "Todas las categorías" 
              ? allPlayers 
              : allPlayers.filter(p => (p.deporte === cat || p.categoria_principal === cat || (p.categorias || []).includes(cat)));
            
            const parentCount = new Set(categoryPlayers.flatMap(p => 
              [p.email_padre, p.email_tutor_2].filter(Boolean)
            )).size;

            const unreadCount = unreadByCategory[cat] || 0;

            return (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap text-xs px-2 py-1 h-7 relative ${
                  selectedCategory === cat 
                    ? 'bg-white text-green-700 hover:bg-white/90' 
                    : 'text-white hover:bg-white/20'
                }`}
              >
                {cat === "Todas las categorías" ? "📋 Todas" : cat.replace('Fútbol ', '').replace(' (Mixto)', '')}
                <span className="ml-1.5 text-xs opacity-70">({parentCount})</span>
                {unreadCount > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0 h-4 animate-pulse">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
        )}
      </div>

      {/* Ventana de chat */}
      <div className="flex-1 overflow-hidden min-h-0">
        {selectedCategory && (unreadByCategory[selectedCategory] > 0) && (
          <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-xs px-3 py-2">
            Tienes {unreadByCategory[selectedCategory]} mensajes nuevos en {selectedCategory}
          </div>
        )}
        {selectedCategory ? (
          <CoachChatWindow
            selectedCategory={selectedCategory}
            user={user}
            allPlayers={allPlayers}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Selecciona una categoría para empezar</p>
            </div>
          </div>
        )}
      </div>
    </Card>
    </div>
  );
}