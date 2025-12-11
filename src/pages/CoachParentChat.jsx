import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import CoachChatWindow from "../components/coach/CoachChatWindow";

export default function CoachParentChat() {
  const [user, setUser] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const categories = currentUser.role === "admin" 
        ? ["Todas las categorías"]
        : (currentUser.categorias_entrena || []);
      
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

  if (!user) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const isCoach = user?.es_entrenador === true || user?.role === "admin";

  if (!isCoach) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Solo entrenadores pueden acceder a esta sección</p>
      </div>
    );
  }

  const categories = user?.role === "admin" 
    ? ["Todas las categorías", ...new Set(allPlayers.map(p => p.deporte).filter(Boolean))]
    : (user?.categorias_entrena || []);

  if (categories.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">No tienes categorías asignadas. Contacta con el administrador.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] lg:h-[calc(100vh-110px)] flex flex-col lg:flex-row">
      {/* Lista de categorías */}
      <div className={`${selectedCategory ? 'hidden lg:flex' : 'flex'} w-full lg:w-96 border-r bg-slate-50 flex-col h-full overflow-hidden`}>
        <div className="p-4 bg-gradient-to-r from-green-600 to-green-700 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <MessageCircle className="w-6 h-6" />
                Chat con Familias
              </h1>
              <p className="text-xs text-green-100">
                Comunícate con los padres de tus jugadores
              </p>
            </div>
            <Link to={createPageUrl("CoachChatSettings")}>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                title="Configuración"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {categories.map(cat => {
            const categoryPlayers = cat === "Todas las categorías" 
              ? allPlayers 
              : allPlayers.filter(p => p.deporte === cat);
            
            const parentCount = new Set(categoryPlayers.flatMap(p => 
              [p.email_padre, p.email_tutor_2].filter(Boolean)
            )).size;

            return (
              <Card
                key={cat}
                className={`p-4 cursor-pointer hover:shadow-md transition-all ${
                  selectedCategory === cat ? 'ring-2 ring-green-500 bg-green-50' : ''
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{cat === "Todas las categorías" ? "Todas" : cat.replace('Fútbol ', '').replace(' (Mixto)', '')}</p>
                    <p className="text-xs text-slate-500">
                      {categoryPlayers.length} jugadores • {parentCount} familias
                    </p>
                  </div>
                  {selectedCategory === cat && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Ventana de chat */}
      <div className={`${selectedCategory ? 'flex' : 'hidden lg:flex'} flex-1 h-full`}>
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
    </div>
  );
}