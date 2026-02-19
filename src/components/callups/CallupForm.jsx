import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Users, Send, Sparkles, MapPin, AlertTriangle } from "lucide-react";
import PlayerSuggestionEngine from "./PlayerSuggestionEngine";

export default function CallupForm({ callup, players, coachName, coachEmail, category, onSubmit, onCancel, isSubmitting, userSuggestionsEnabled = true, onToggleSuggestions }) {
  const getInitialState = () => ({
    titulo: "",
    categoria: category,
    tipo: "Partido",
    rival: "",
    fecha_partido: "",
    hora_partido: "",
    hora_concentracion: "",
    ubicacion: "",
    enlace_ubicacion: "",
    local_visitante: "Local",
    descripcion: "",
    jugadores_convocados: [],
    entrenador_email: coachEmail,
    entrenador_nombre: coachName,
    entrenador_telefono: "",
    publicada: false,
    notificaciones_enviadas: false,
    cerrada: false
  });

  const [currentCallup, setCurrentCallup] = useState(callup || getInitialState());
  const [selectedPlayers, setSelectedPlayers] = useState(
    callup?.jugadores_convocados?.map(j => j.jugador_id) || []
  );
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(userSuggestionsEnabled);
  const [rivalTeams, setRivalTeams] = useState([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [useManualInput, setUseManualInput] = useState(false);
  const [manualLocationEdit, setManualLocationEdit] = useState(false);

  // Cargar equipos rivales desde clasificaciones Y resultados
  useEffect(() => {
    const loadTeams = async () => {
      setIsLoadingTeams(true);
      try {
        const { base44 } = await import("@/api/base44Client");
        
        // Obtener temporada activa
        const seasonConfigs = await base44.entities.SeasonConfig.filter({ activa: true });
        const activeSeasonRaw = seasonConfigs[0]?.temporada || "";
        
        // Normalizar temporada (2026-2027 -> 2026/2027 y viceversa)
        const normalizeTemp = (t) => (t || "").replace(/-/g, "/");
        const activeSeason = normalizeTemp(activeSeasonRaw);
        
        // 1) Buscar en Clasificacion por categoría
        const allClasif = await base44.entities.Clasificacion.filter({ categoria: category });
        
        // Intentar temporada activa primero, si no hay datos usar la más reciente disponible
        let clasificaciones = allClasif.filter(c => normalizeTemp(c.temporada) === activeSeason);
        if (clasificaciones.length === 0 && allClasif.length > 0) {
          // Obtener la temporada más reciente disponible
          const temps = [...new Set(allClasif.map(c => normalizeTemp(c.temporada)))].sort().reverse();
          if (temps[0]) {
            clasificaciones = allClasif.filter(c => normalizeTemp(c.temporada) === temps[0]);
            console.log(`[CallupForm] Sin datos en ${activeSeason}, usando temporada ${temps[0]}`);
          }
        }
        
        let teamNames = [];
        
        if (clasificaciones.length > 0) {
          // Obtener solo la jornada más reciente para evitar duplicados
          const maxJornada = Math.max(...clasificaciones.map(c => c.jornada || 0));
          const latestRound = clasificaciones.filter(c => (c.jornada || 0) === maxJornada);
          
          teamNames = latestRound
            .map(c => c.nombre_equipo?.trim())
            .filter(Boolean)
            .filter(name => !name.toLowerCase().includes('bustarviejo'));
        }
        
        // 2) También buscar en Resultados para complementar
        try {
          const allResults = await base44.entities.Resultado.filter({ categoria: category });
          let resultados = allResults.filter(r => normalizeTemp(r.temporada) === activeSeason);
          if (resultados.length === 0 && allResults.length > 0) {
            const temps = [...new Set(allResults.map(r => normalizeTemp(r.temporada)))].sort().reverse();
            if (temps[0]) resultados = allResults.filter(r => normalizeTemp(r.temporada) === temps[0]);
          }
          
          resultados.forEach(r => {
            if (r.local && !r.local.toLowerCase().includes('bustarviejo')) teamNames.push(r.local.trim());
            if (r.visitante && !r.visitante.toLowerCase().includes('bustarviejo') && !/^\d{2}\/\d{2}\/\d{4}$/.test(r.visitante)) {
              teamNames.push(r.visitante.trim());
            }
          });
        } catch {}
        
        // Equipos únicos y ordenados
        const uniqueTeams = [...new Set(teamNames)].sort();
        setRivalTeams(uniqueTeams);
      } catch (error) {
        console.log("No se pudieron cargar equipos:", error);
        setRivalTeams([]);
      } finally {
        setIsLoadingTeams(false);
      }
    };
    
    if (category && category !== "all" && category !== "admin") {
      loadTeams();
    }
  }, [category]);

  // Auto-rellenar ubicación según Local/Visitante
  useEffect(() => {
    if (!manualLocationEdit) {
      if (currentCallup.local_visitante === "Local") {
        // Partido LOCAL - siempre en el mismo sitio
        setCurrentCallup(prev => ({
          ...prev,
          ubicacion: "Campo Municipal CD Bustarviejo",
          enlace_ubicacion: "https://maps.app.goo.gl/qZKDqVyS6YuH8uZV8"
        }));
      } else if (currentCallup.local_visitante === "Visitante" && currentCallup.rival) {
        // Partido VISITANTE - campo del rival
        const searchQuery = encodeURIComponent(`campo ${currentCallup.rival} Madrid`);
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${searchQuery}`;
        
        setCurrentCallup(prev => ({
          ...prev,
          ubicacion: `Campo del ${currentCallup.rival}`,
          enlace_ubicacion: mapsUrl
        }));
      }
    }
  }, [currentCallup.local_visitante, currentCallup.rival, manualLocationEdit]);

  // Filtrar jugadores no disponibles (lesionados/sancionados)
  const availablePlayers = players.filter(p => !p.lesionado && !p.sancionado);
  const unavailablePlayers = players.filter(p => p.lesionado || p.sancionado);

  // Reset form when callup changes (editing different callup or creating new one)
  useEffect(() => {
    if (callup) {
      setCurrentCallup(callup);
      setSelectedPlayers(callup.jugadores_convocados?.map(j => j.jugador_id) || []);
    } else {
      setCurrentCallup(getInitialState());
      setSelectedPlayers([]);
    }
  }, [callup?.id, category]);

  const handlePlayerToggle = (player) => {
    setSelectedPlayers(prev => {
      if (prev.includes(player.id)) {
        return prev.filter(id => id !== player.id);
      } else {
        return [...prev, player.id];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPlayers.length === availablePlayers.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(availablePlayers.map(p => p.id));
    }
  };

  const handleSuggestPlayers = (suggestedIds) => {
    setSelectedPlayers(suggestedIds);
  };

  const handleToggleSuggestions = (enabled) => {
    setSuggestionsEnabled(enabled);
    if (onToggleSuggestions) {
      onToggleSuggestions(enabled);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (selectedPlayers.length === 0) {
      alert("Debes seleccionar al menos un jugador");
      return;
    }
    
    const jugadoresConvocados = selectedPlayers.map(playerId => {
      const player = players.find(p => p.id === playerId);
      const existing = callup?.jugadores_convocados?.find(j => j.jugador_id === playerId);
      
      return {
        jugador_id: player.id,
        jugador_nombre: player.nombre,
        email_padre: player.email_padre,
        email_tutor_2: player.email_tutor_2,
        email_jugador: player.email_jugador,
        confirmacion: existing?.confirmacion || "pendiente",
        fecha_confirmacion: existing?.fecha_confirmacion || null,
        comentario: existing?.comentario || ""
      };
    });
    
    onSubmit({
      ...currentCallup,
      jugadores_convocados: jugadoresConvocados
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-2xl text-slate-900">
            {callup ? "Editar Convocatoria" : "Nueva Convocatoria"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Alert className="bg-blue-50 border-blue-300">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>Categoría:</strong> {currentCallup.categoria} • <strong>Jugadores disponibles:</strong> {players.length}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Título */}
              <div className="space-y-2 md:col-span-2">
                <Label>Título de la Convocatoria *</Label>
                <Input
                  placeholder="Ej: Partido vs Real Madrid"
                  value={currentCallup.titulo}
                  onChange={(e) => setCurrentCallup({ ...currentCallup, titulo: e.target.value })}
                  required
                />
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={currentCallup.tipo}
                  onValueChange={(value) => setCurrentCallup({ ...currentCallup, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Partido">⚽ Partido</SelectItem>
                    <SelectItem value="Entrenamiento Especial">🏃 Entrenamiento Especial</SelectItem>
                    <SelectItem value="Torneo">🏆 Torneo</SelectItem>
                    <SelectItem value="Amistoso">🤝 Amistoso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rival */}
              <div className="space-y-2">
                <Label>Equipo Rival</Label>
                {rivalTeams.length > 0 && !useManualInput ? (
                  <div className="space-y-2">
                    <Select
                      value={currentCallup.rival || ""}
                      onValueChange={(value) => {
                        if (value === "__manual__") {
                          setUseManualInput(true);
                          setCurrentCallup({ ...currentCallup, rival: "" });
                        } else {
                          setCurrentCallup({ ...currentCallup, rival: value });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona rival..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__manual__">
                          ✏️ Escribir manualmente
                        </SelectItem>
                        {rivalTeams.map(team => (
                          <SelectItem key={team} value={team}>
                            ⚽ {team}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isLoadingTeams && (
                      <p className="text-xs text-slate-500">
                        <Loader2 className="w-3 h-3 inline animate-spin" /> Cargando equipos...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Nombre del rival"
                      value={currentCallup.rival || ""}
                      onChange={(e) => setCurrentCallup({ ...currentCallup, rival: e.target.value })}
                    />
                    {rivalTeams.length > 0 && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setUseManualInput(false)}
                        className="text-xs text-blue-600 p-0 h-auto"
                      >
                        Volver a lista de equipos
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Fecha */}
              <div className="space-y-2">
                <Label className="text-base font-semibold text-orange-700">📅 Fecha del Partido *</Label>
                <Input
                  type="date"
                  value={currentCallup.fecha_partido}
                  onChange={(e) => setCurrentCallup({ ...currentCallup, fecha_partido: e.target.value })}
                  required
                  className="text-base font-medium border-2 border-orange-200 focus:border-orange-500"
                />
                <p className="text-xs text-orange-600 font-medium">
                  ⚠️ Selecciona la fecha en la que se jugará el partido
                </p>
              </div>

              {/* Hora Partido */}
              <div className="space-y-2">
                <Label>Hora del Partido *</Label>
                <Input
                  type="time"
                  value={currentCallup.hora_partido}
                  onChange={(e) => setCurrentCallup({ ...currentCallup, hora_partido: e.target.value })}
                  required
                />
              </div>

              {/* Hora Concentración */}
              <div className="space-y-2">
                <Label>Hora de Concentración</Label>
                <Input
                  type="time"
                  value={currentCallup.hora_concentracion || ""}
                  onChange={(e) => setCurrentCallup({ ...currentCallup, hora_concentracion: e.target.value })}
                />
              </div>

              {/* Local/Visitante */}
              <div className="space-y-2">
                <Label>Local / Visitante</Label>
                <Select
                  value={currentCallup.local_visitante}
                  onValueChange={(value) => {
                    setCurrentCallup({ ...currentCallup, local_visitante: value });
                    setManualLocationEdit(false);
                    // Si cambia a Local, limpiar ubicación auto
                    if (value === "Local" && currentCallup.ubicacion?.startsWith("Campo del")) {
                      setCurrentCallup(prev => ({
                        ...prev,
                        ubicacion: "",
                        enlace_ubicacion: ""
                      }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Local">🏠 Local</SelectItem>
                    <SelectItem value="Visitante">✈️ Visitante</SelectItem>
                  </SelectContent>
                </Select>
                {currentCallup.local_visitante === "Local" && (
                  <Alert className="bg-green-50 border-green-200">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 text-xs">
                      🏠 Se ha auto-rellenado el campo local. Puedes editarlo si es necesario.
                    </AlertDescription>
                  </Alert>
                )}
                {currentCallup.local_visitante === "Visitante" && currentCallup.rival && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-xs">
                      ✈️ Se ha auto-sugerido la ubicación del rival. Puedes editarla si es necesario.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Ubicación */}
              <div className="space-y-2 md:col-span-2">
                <Label>Ubicación *</Label>
                <Input
                  placeholder="Campo municipal, pabellón..."
                  value={currentCallup.ubicacion}
                  onChange={(e) => {
                    setCurrentCallup({ ...currentCallup, ubicacion: e.target.value });
                    setManualLocationEdit(true);
                  }}
                  required
                />
              </div>

              {/* Enlace Google Maps */}
              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-600" />
                  Enlace de Google Maps (opcional)
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://maps.google.com/..."
                    value={currentCallup.enlace_ubicacion || ""}
                    onChange={(e) => setCurrentCallup({ ...currentCallup, enlace_ubicacion: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const ubicacion = currentCallup.ubicacion || "";
                      const searchQuery = encodeURIComponent(ubicacion);
                      window.open(`https://www.google.com/maps/search/?api=1&query=${searchQuery}`, '_blank');
                    }}
                    className="shrink-0 bg-green-50 border-green-300 hover:bg-green-100 text-green-700"
                    disabled={!currentCallup.ubicacion}
                  >
                    <MapPin className="w-4 h-4 mr-1" />
                    Buscar en Maps
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  💡 Busca la ubicación en Google Maps, copia el enlace y pégalo aquí para que los padres puedan ver la ubicación exacta
                </p>
              </div>

              {/* Teléfono del entrenador */}
              <div className="space-y-2 md:col-span-2">
                <Label>Teléfono de Contacto del Entrenador</Label>
                <Input
                  type="tel"
                  placeholder="Ej: 612 34 56 78"
                  value={currentCallup.entrenador_telefono || ""}
                  onChange={(e) => setCurrentCallup({ ...currentCallup, entrenador_telefono: e.target.value })}
                />
                <p className="text-xs text-slate-500">
                  📞 Los padres verán este teléfono para contactarte en caso de dudas
                </p>
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label>Instrucciones Adicionales</Label>
              <Textarea
                placeholder="Equipación, material necesario, otras indicaciones..."
                value={currentCallup.descripcion || ""}
                onChange={(e) => setCurrentCallup({ ...currentCallup, descripcion: e.target.value })}
                rows={3}
              />
            </div>

            {/* Sistema de Sugerencias */}
            <PlayerSuggestionEngine
              players={players}
              category={category}
              matchDate={currentCallup.fecha_partido}
              onSuggestPlayers={handleSuggestPlayers}
              selectedPlayers={selectedPlayers}
              isEnabled={suggestionsEnabled}
              onToggleEnabled={handleToggleSuggestions}
            />

            {/* Jugadores No Disponibles */}
            {unavailablePlayers.length > 0 && (
              <Alert className="bg-amber-50 border-amber-300">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  <strong>Jugadores no disponibles ({unavailablePlayers.length}):</strong>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {unavailablePlayers.map(p => (
                      <Badge key={p.id} variant="outline" className="bg-amber-100 border-amber-400 text-amber-800">
                        {p.nombre} - {p.lesionado ? "🤕 Lesionado" : "🚫 Sancionado"}
                      </Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Jugadores Convocados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Jugadores Convocados *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedPlayers.length === availablePlayers.length ? "Deseleccionar Todos" : "Seleccionar Todos"}
                </Button>
              </div>
              
              <div className="border-2 border-slate-200 rounded-lg p-4 max-h-96 overflow-y-auto bg-slate-50">
                {availablePlayers.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No hay jugadores disponibles en esta categoría</p>
                ) : (
                  <div className="space-y-2">
                    {availablePlayers.map((player) => (
                      <div
                        key={player.id}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          selectedPlayers.includes(player.id)
                            ? "bg-green-50 border-2 border-green-300"
                            : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <Checkbox
                          checked={selectedPlayers.includes(player.id)}
                          onCheckedChange={() => handlePlayerToggle(player)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{player.nombre}</p>
                            {player.posicion && player.posicion !== "Sin asignar" && (
                              <Badge variant="outline" className="text-xs">{player.posicion}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{player.email_padre || player.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <p className="text-sm text-slate-600">
                <Users className="w-4 h-4 inline mr-1" />
                {selectedPlayers.length} de {availablePlayers.length} jugadores seleccionados
                {unavailablePlayers.length > 0 && (
                  <span className="text-amber-600 ml-2">
                    ({unavailablePlayers.length} no disponibles)
                  </span>
                )}
              </p>
            </div>

            {/* Publicar */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border-2 border-green-200">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-green-700" />
                <div>
                  <Label className="text-base font-medium text-green-900">Publicar y Enviar Notificaciones</Label>
                  <p className="text-sm text-green-700">
                    {currentCallup.publicada 
                      ? "✅ Se enviará por email y aparecerá en Convocatorias" 
                      : "⏸️ Borrador (no se enviará nada)"}
                  </p>
                </div>
              </div>
              <Switch
                checked={currentCallup.publicada}
                onCheckedChange={(checked) => setCurrentCallup({ ...currentCallup, publicada: checked })}
                className="data-[state=checked]:bg-green-600"
              />
            </div>

            {currentCallup.publicada && (
              <Alert className="bg-blue-50 border-blue-200">
                <Send className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>📧 Se enviará:</strong> Email a cada jugador + Aparecerá en la sección "Convocatorias" de la app
                </AlertDescription>
              </Alert>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700"
                disabled={isSubmitting || selectedPlayers.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  callup ? "Actualizar Convocatoria" : "Crear Convocatoria"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}