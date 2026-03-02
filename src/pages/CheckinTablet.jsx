import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import CheckinGrid from "../components/attendance/CheckinGrid";
import TabletIdleScreen from "../components/attendance/TabletIdleScreen";
import TabletAdminPanel from "../components/attendance/TabletAdminPanel";

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MINUTES_BEFORE_OPEN = 15;

function parseTime(str) {
  if (!str) return null;
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

function nowMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

export default function CheckinTablet() {
  const [user, setUser] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null); // auto-determined
  const [sessionDataMap, setSessionDataMap] = useState({}); // { [categoria]: { [playerId]: data } }
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [now, setNow] = useState(new Date());
  const longPressTimer = useRef(null);
  const today = new Date().toISOString().split('T')[0];
  const queryClient = useQueryClient();

  // Tick every 15s to check schedule
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Keep screen awake via wake lock API
  useEffect(() => {
    let wakeLock = null;
    const request = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {}
    };
    request();
    const onVis = () => { if (document.visibilityState === 'visible') request(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  // Prevent screen from sleeping - play invisible video trick as fallback
  useEffect(() => {
    // NoSleep via invisible user interaction re-engagement
    const onTouch = () => {
      try { if ('wakeLock' in navigator) navigator.wakeLock.request('screen').catch(() => {}); } catch {}
    };
    document.addEventListener('touchstart', onTouch, { passive: true });
    return () => document.removeEventListener('touchstart', onTouch);
  }, []);

  // Categories with checkin enabled
  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ['categoryConfigs-checkin-tablet'],
    queryFn: async () => {
      const all = await base44.entities.CategoryConfig.filter({ activa: true });
      return all.filter(c => c.checkin_automatico);
    },
    staleTime: 5 * 60 * 1000,
  });

  // ALL training schedules for today
  const { data: allSchedules = [] } = useQuery({
    queryKey: ['all-schedules-checkin-tablet'],
    queryFn: async () => {
      const all = await base44.entities.TrainingSchedule.filter({ activo: true });
      const dayName = DAY_NAMES[new Date().getDay()];
      return all.filter(s => s.dia_semana === dayName);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Build today's schedule for checkin-enabled categories, sorted by start time
  const todaySessions = useMemo(() => {
    const checkinCategories = new Set(categoryConfigs.map(c => c.nombre));
    return allSchedules
      .filter(s => checkinCategories.has(s.categoria))
      .sort((a, b) => parseTime(a.hora_inicio) - parseTime(b.hora_inicio))
      .map(s => {
        const config = categoryConfigs.find(c => c.nombre === s.categoria);
        return {
          ...s,
          minutesTardanza: config?.checkin_minutos_tardanza || 10,
          _openTime: (() => {
            const t = parseTime(s.hora_inicio) - MINUTES_BEFORE_OPEN;
            return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
          })(),
          _startMinutes: parseTime(s.hora_inicio),
          _endMinutes: parseTime(s.hora_fin),
          _openMinutes: parseTime(s.hora_inicio) - MINUTES_BEFORE_OPEN,
          _passed: nowMinutes() > parseTime(s.hora_fin),
        };
      });
  }, [allSchedules, categoryConfigs, now]);

  // Determine active session: the one whose window is open (15 min before start until next one opens or end+15)
  const currentSession = useMemo(() => {
    const currentMin = nowMinutes();
    // Find the session that should be active NOW
    for (let i = todaySessions.length - 1; i >= 0; i--) {
      const s = todaySessions[i];
      if (currentMin >= s._openMinutes) {
        // Check if it hasn't ended too long ago (end + 15 min grace)
        if (currentMin <= s._endMinutes + 15) {
          return s;
        }
        // If it ended but no next session, still show idle
        return null;
      }
    }
    return null;
  }, [todaySessions, now]);

  // Next upcoming session (for idle screen)
  const nextSession = useMemo(() => {
    const currentMin = nowMinutes();
    return todaySessions.find(s => s._openMinutes > currentMin) || null;
  }, [todaySessions, now]);

  // Auto-switch active category
  useEffect(() => {
    if (currentSession) {
      setActiveCategory(currentSession.categoria);
    } else {
      // Auto-save before going idle
      if (activeCategory) {
        autoSaveCategory(activeCategory);
      }
      setActiveCategory(null);
    }
  }, [currentSession?.categoria]);

  // Players for active category
  const { data: players = [] } = useQuery({
    queryKey: ['players-tablet', activeCategory],
    queryFn: async () => {
      const all = await base44.entities.Player.filter({ activo: true });
      return all.filter(p =>
        p.deporte === activeCategory ||
        p.categoria_principal === activeCategory ||
        (p.categorias || []).includes(activeCategory)
      ).sort((a, b) => a.nombre.localeCompare(b.nombre));
    },
    enabled: !!activeCategory,
    staleTime: 5 * 60 * 1000,
  });

  // Existing attendance for active category today
  const { data: existingAttendance } = useQuery({
    queryKey: ['attendance-tablet', activeCategory, today],
    queryFn: async () => {
      const results = await base44.entities.Attendance.filter({
        categoria: activeCategory,
        fecha: today
      });
      return results[0] || null;
    },
    enabled: !!activeCategory,
    staleTime: 30 * 1000,
  });

  // Load existing attendance into session data
  useEffect(() => {
    if (!activeCategory) return;
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
      setSessionDataMap(prev => ({ ...prev, [activeCategory]: data }));
    } else if (!sessionDataMap[activeCategory]) {
      setSessionDataMap(prev => ({ ...prev, [activeCategory]: {} }));
    }
  }, [existingAttendance, activeCategory]);

  const currentSessionData = sessionDataMap[activeCategory] || {};

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ categoria, sessionData: sd, playersList }) => {
      const asistencias = playersList.map(p => ({
        jugador_id: p.id,
        jugador_nombre: p.nombre,
        estado: sd[p.id]?.asistencia || "ausente",
        hora_checkin: sd[p.id]?.hora_checkin || null,
        actitud: sd[p.id]?.actitud || null,
        observaciones: sd[p.id]?.observaciones || ""
      }));
      const payload = {
        fecha: today,
        categoria,
        entrenador_email: user?.email || 'tablet',
        entrenador_nombre: user?.full_name || 'Tablet Check-in',
        modo_checkin: true,
        asistencias,
        observaciones_generales: ""
      };
      // Check if attendance record exists for this category today
      const existing = await base44.entities.Attendance.filter({ categoria, fecha: today });
      if (existing[0]) {
        return base44.entities.Attendance.update(existing[0].id, payload);
      }
      return base44.entities.Attendance.create(payload);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-tablet', vars.categoria, today] });
    },
  });

  const autoSaveCategory = useCallback((cat) => {
    if (!user || !sessionDataMap[cat]) return;
    // Need players list - we'll save what we have
    const sd = sessionDataMap[cat];
    if (Object.keys(sd).length === 0) return;
    // Build minimal player list from session data
    const playersList = Object.entries(sd).map(([id, data]) => ({ id, nombre: '' }));
    // Actually we need proper players - only save if we have active players loaded
    if (cat === activeCategory && players.length > 0) {
      saveMutation.mutate({ categoria: cat, sessionData: sd, playersList: players });
    }
  }, [user, sessionDataMap, activeCategory, players]);

  // Checkin handler - NO toggle, only mark
  const handleCheckin = useCallback((playerId, estado, horaCheckin) => {
    if (!activeCategory || !estado) return;
    setSessionDataMap(prev => ({
      ...prev,
      [activeCategory]: {
        ...(prev[activeCategory] || {}),
        [playerId]: { ...(prev[activeCategory]?.[playerId] || {}), asistencia: estado, hora_checkin: horaCheckin }
      }
    }));
  }, [activeCategory]);

  // Auto-save every 15 seconds when there are changes
  const lastSavedRef = useRef('');
  useEffect(() => {
    if (!activeCategory || !user || players.length === 0) return;
    const sd = sessionDataMap[activeCategory] || {};
    const key = JSON.stringify(sd);
    if (key === lastSavedRef.current || key === '{}') return;

    const timer = setTimeout(() => {
      saveMutation.mutate({ categoria: activeCategory, sessionData: sd, playersList: players });
      lastSavedRef.current = key;
    }, 10000);
    return () => clearTimeout(timer);
  }, [sessionDataMap, activeCategory, players, user]);

  // Long press on top-left corner → admin panel (3 seconds)
  const handleCornerTouchStart = () => {
    longPressTimer.current = setTimeout(() => setShowAdminPanel(true), 3000);
  };
  const handleCornerTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // Real-time sync
  useEffect(() => {
    if (!activeCategory) return;
    const unsub = base44.entities.Attendance.subscribe((event) => {
      if (event.data?.categoria === activeCategory && event.data?.fecha === today) {
        queryClient.invalidateQueries({ queryKey: ['attendance-tablet', activeCategory, today] });
      }
    });
    return unsub;
  }, [activeCategory, today, queryClient]);

  // --- RENDER ---

  // Admin panel overlay
  const adminPanel = showAdminPanel ? (
    <TabletAdminPanel
      onSave={() => {
        if (activeCategory && players.length > 0) {
          saveMutation.mutate({ categoria: activeCategory, sessionData: currentSessionData, playersList: players });
          toast.success("✅ Guardado manualmente");
        }
        setShowAdminPanel(false);
      }}
      onGoIdle={() => { setActiveCategory(null); setShowAdminPanel(false); }}
      onForceRefresh={() => { queryClient.invalidateQueries(); setShowAdminPanel(false); }}
      saving={saveMutation.isPending}
    />
  ) : null;

  // IDLE MODE - no active session
  if (!activeCategory) {
    return (
      <>
        <TabletIdleScreen todaySchedules={todaySessions} nextSession={nextSession} />
        {adminPanel}
      </>
    );
  }

  // ACTIVE SESSION
  const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 select-none">
      {/* Header - zona secreta arriba-izquierda para admin */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Zona secreta: mantener pulsado 3s */}
            <div
              onTouchStart={handleCornerTouchStart}
              onTouchEnd={handleCornerTouchEnd}
              onMouseDown={handleCornerTouchStart}
              onMouseUp={handleCornerTouchEnd}
              onMouseLeave={handleCornerTouchEnd}
              className="text-2xl cursor-default"
            >
              ⚽
            </div>
            <div>
              <h1 className="font-bold text-xl leading-tight">{activeCategory}</h1>
              <p className="text-slate-400 text-xs">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {timeStr}
                {currentSession && ` · Entreno: ${currentSession.hora_inicio}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Stats compactas */}
            <div className="flex gap-2 text-xs">
              <span>😊 {Object.values(currentSessionData).filter(v => v.asistencia === 'presente').length}</span>
              <span>😅 {Object.values(currentSessionData).filter(v => v.asistencia === 'tardanza').length}</span>
              <span>⬜ {players.length - Object.values(currentSessionData).filter(v => v.asistencia === 'presente' || v.asistencia === 'tardanza').length}</span>
            </div>
            {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-green-400" />}
          </div>
        </div>
      </div>

      {/* Texto grande para que los jugadores entiendan */}
      <div className="text-center py-3 bg-green-50 border-b border-green-200">
        <p className="text-green-800 font-bold text-lg">👆 ¡Toca tu foto al llegar!</p>
      </div>

      {/* Grid de jugadores */}
      <div className="p-4 max-w-6xl mx-auto">
        {players.length === 0 ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
            <p className="text-slate-500 mt-4">Cargando jugadores...</p>
          </div>
        ) : (
          <CheckinGrid
            players={players}
            sessionData={currentSessionData}
            trainingStartTime={currentSession?.hora_inicio}
            minutesTardanza={currentSession?.minutesTardanza || 10}
            onCheckin={handleCheckin}
            categoryName={activeCategory}
          />
        )}
      </div>

      {adminPanel}
    </div>
  );
}