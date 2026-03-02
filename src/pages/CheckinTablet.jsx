import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ChevronDown, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import CheckinGrid from "../components/attendance/CheckinGrid";

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function CheckinTablet() {
  const urlParams = new URLSearchParams(window.location.search);
  const categoriaParam = urlParams.get('categoria');

  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(categoriaParam || "");
  const [sessionData, setSessionData] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(!categoriaParam);
  const [locked, setLocked] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      // Si es tablet y no tiene categoría seleccionada, ir al picker
      if (u?.role === 'tablet' && !categoriaParam) {
        setShowCategoryPicker(true);
      }
    }).catch(() => {});
  }, []);

  // Cargar categorías con check-in activo
  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ['categoryConfigs-checkin'],
    queryFn: async () => {
      const all = await base44.entities.CategoryConfig.filter({ activa: true });
      return all.filter(c => c.checkin_automatico);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Auto-seleccionar si solo hay una categoría con check-in
  useEffect(() => {
    if (!selectedCategory && categoryConfigs.length === 1) {
      setSelectedCategory(categoryConfigs[0].nombre);
      setShowCategoryPicker(false);
    }
  }, [categoryConfigs, selectedCategory]);

  const currentConfig = useMemo(() => 
    categoryConfigs.find(c => c.nombre === selectedCategory),
    [categoryConfigs, selectedCategory]
  );

  // Jugadores de la categoría
  const { data: players = [] } = useQuery({
    queryKey: ['players-checkin', selectedCategory],
    queryFn: async () => {
      const all = await base44.entities.Player.filter({ activo: true });
      return all.filter(p => 
        p.deporte === selectedCategory || 
        p.categoria_principal === selectedCategory ||
        (p.categorias || []).includes(selectedCategory)
      ).sort((a, b) => a.nombre.localeCompare(b.nombre));
    },
    enabled: !!selectedCategory,
    staleTime: 5 * 60 * 1000,
  });

  // Horario de hoy
  const { data: trainingSchedules = [] } = useQuery({
    queryKey: ['schedules-checkin', selectedCategory],
    queryFn: () => base44.entities.TrainingSchedule.filter({ activo: true, categoria: selectedCategory }),
    enabled: !!selectedCategory,
    staleTime: 5 * 60 * 1000,
  });

  const todaySchedule = useMemo(() => {
    const dayName = DAY_NAMES[new Date().getDay()];
    return trainingSchedules.find(s => s.dia_semana === dayName);
  }, [trainingSchedules]);

  // Asistencia existente de hoy
  const { data: existingAttendance } = useQuery({
    queryKey: ['attendance-today', selectedCategory, today],
    queryFn: async () => {
      const results = await base44.entities.Attendance.filter({ 
        categoria: selectedCategory, 
        fecha: today 
      });
      return results[0] || null;
    },
    enabled: !!selectedCategory,
    staleTime: 30 * 1000,
  });

  // Cargar datos existentes
  useEffect(() => {
    if (existingAttendance?.asistencias) {
      const data = {};
      existingAttendance.asistencias.forEach(a => {
        data[a.jugador_id] = {
          asistencia: a.estado,
          hora_checkin: a.hora_checkin,
          actitud: a.actitud,
          observaciones: a.observaciones
        };
      });
      setSessionData(data);
    } else {
      setSessionData({});
    }
    setHasUnsavedChanges(false);
  }, [existingAttendance]);

  // Guardar
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingAttendance) {
        return base44.entities.Attendance.update(existingAttendance.id, data);
      }
      return base44.entities.Attendance.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today', selectedCategory, today] });
      setHasUnsavedChanges(false);
      toast.success("✅ Guardado");
    },
    onError: () => toast.error("Error al guardar")
  });

  const handleCheckin = useCallback((playerId, estado, horaCheckin) => {
    if (locked) return;
    setSessionData(prev => {
      if (!estado) {
        const { [playerId]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [playerId]: { ...(prev[playerId] || {}), asistencia: estado, hora_checkin: horaCheckin }
      };
    });
    setHasUnsavedChanges(true);
  }, [locked]);

  const handleSave = useCallback(() => {
    if (!user || !selectedCategory) return;
    const asistencias = players.map(p => ({
      jugador_id: p.id,
      jugador_nombre: p.nombre,
      estado: sessionData[p.id]?.asistencia || "ausente",
      hora_checkin: sessionData[p.id]?.hora_checkin || null,
      actitud: sessionData[p.id]?.actitud || null,
      observaciones: sessionData[p.id]?.observaciones || ""
    }));
    saveMutation.mutate({
      fecha: today,
      categoria: selectedCategory,
      entrenador_email: user.email,
      entrenador_nombre: user.full_name,
      modo_checkin: true,
      asistencias,
      observaciones_generales: ""
    });
  }, [players, sessionData, user, selectedCategory, today]);

  // Autoguardado cada 20s
  useEffect(() => {
    if (!hasUnsavedChanges || !user) return;
    const timer = setTimeout(() => {
      handleSave();
      toast.info("💾 Autoguardado");
    }, 20000);
    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, sessionData]);

  // Real-time sync
  useEffect(() => {
    if (!selectedCategory) return;
    const unsub = base44.entities.Attendance.subscribe((event) => {
      if (event.data?.categoria === selectedCategory && event.data?.fecha === today) {
        queryClient.invalidateQueries({ queryKey: ['attendance-today', selectedCategory, today] });
      }
    });
    return unsub;
  }, [selectedCategory, today, queryClient]);

  // Pantalla de selección de categoría
  if (showCategoryPicker || !selectedCategory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <span className="text-6xl">📲</span>
            <h1 className="text-3xl font-black text-white mt-4">Check-in Tablet</h1>
            <p className="text-slate-400 mt-2">Selecciona la categoría para hoy</p>
          </div>

          {categoryConfigs.length === 0 ? (
            <div className="bg-slate-800 rounded-2xl p-6 text-center">
              <p className="text-slate-400">No hay categorías con check-in activo.</p>
              <p className="text-slate-500 text-sm mt-2">Actívalo en Temporadas → Categorías → Switch "📲 Check-in"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categoryConfigs.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.nombre);
                    setShowCategoryPicker(false);
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl p-5 text-left transition-all active:scale-[0.98]"
                >
                  <div className="text-lg font-bold">{cat.nombre}</div>
                  <div className="text-blue-200 text-sm mt-1">
                    Tardanza: {cat.checkin_minutos_tardanza || 10} min
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header compacto */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📲</span>
            <div>
              <h1 className="font-bold text-lg leading-tight">{selectedCategory}</h1>
              <p className="text-slate-400 text-xs">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {timeStr}
                {todaySchedule && ` · Entreno: ${todaySchedule.hora_inicio}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-xs text-orange-400 animate-pulse">● Sin guardar</span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocked(!locked)}
              className={`border-slate-600 ${locked ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : 'text-slate-300 hover:text-white'}`}
            >
              <Lock className="w-4 h-4 mr-1" />
              {locked ? 'Bloqueado' : 'Bloquear'}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : '💾 Guardar'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCategoryPicker(true)}
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {locked && (
        <div className="bg-red-600 text-white text-center py-2 text-sm font-medium">
          🔒 Pantalla bloqueada — Pulsa "Bloqueado" para desbloquear
        </div>
      )}

      {/* Contenido */}
      <div className="p-4 max-w-6xl mx-auto">
        {players.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl">👤</span>
            <p className="text-slate-500 mt-4">No hay jugadores activos en esta categoría</p>
          </div>
        ) : (
          <CheckinGrid
            players={players}
            sessionData={sessionData}
            trainingStartTime={todaySchedule?.hora_inicio}
            minutesTardanza={currentConfig?.checkin_minutos_tardanza || 10}
            onCheckin={handleCheckin}
          />
        )}
      </div>
    </div>
  );
}