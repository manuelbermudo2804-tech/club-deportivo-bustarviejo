import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export default function ExerciseShareDialog({ exercises, selectedCategory, user, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [sending, setSending] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [intensityFilter, setIntensityFilter] = useState("");
  const [durationFilter, setDurationFilter] = useState("");

  // Detectar deporte del chat
  const sport = selectedCategory.includes("Baloncesto") ? "Baloncesto" : "Fútbol";

  const filteredExercises = exercises
    .filter(ex => {
      // Filtrar por deporte automáticamente
      if (ex.deporte !== sport) return false;
      
      const matchesSearch = ex.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            ex.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (categoryFilter && ex.categoria_ejercicio !== categoryFilter) return false;
      if (intensityFilter && ex.intensidad !== intensityFilter) return false;
      if (durationFilter) {
        const duration = ex.duracion_minutos;
        if (durationFilter === "corto" && duration > 15) return false;
        if (durationFilter === "medio" && (duration <= 15 || duration > 30)) return false;
        if (durationFilter === "largo" && duration <= 30) return false;
      }

      return true;
    })
    .slice(0, 30);

  // Extraer categorías únicas del deporte
  const availableCategories = [...new Set(exercises
    .filter(e => e.deporte === sport)
    .map(e => e.categoria_ejercicio)
    .filter(Boolean)
  )].sort();

  const toggleExercise = (exercise) => {
    setSelectedExercises(prev => {
      const exists = prev.find(e => e.id === exercise.id);
      if (exists) {
        return prev.filter(e => e.id !== exercise.id);
      }
      return [...prev, exercise];
    });
  };

  const calculateTotalDuration = () => {
    return selectedExercises.reduce((sum, ex) => sum + (ex.duracion_minutos || 0), 0);
  };

  const handleShare = async () => {
    if (selectedExercises.length === 0) return;

    setSending(true);

    try {
      const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
      
      let messageContent = "";

      if (selectedExercises.length === 1) {
        const ex = selectedExercises[0];
        messageContent = `💪 **${ex.nombre}**

📋 ${ex.descripcion}

⏱️ Duración: ${ex.duracion_minutos} min
🎯 Intensidad: ${ex.intensidad}
👥 Jugadores: ${ex.jugadores_min}-${ex.jugadores_max}

📝 **Instrucciones:**
${ex.instrucciones}

${ex.variaciones ? `🔄 **Variaciones:**
${ex.variaciones}` : ''}

${ex.consejos ? `💡 **Consejos:**
${ex.consejos}` : ''}

${ex.diagrama_ascii ? `\`\`\`
${ex.diagrama_ascii}
\`\`\`` : ''}`;
      } else {
        const totalDuration = calculateTotalDuration();
        messageContent = `🏋️ **RUTINA DE ENTRENAMIENTO**
⏱️ Duración total: ${totalDuration} minutos
📝 ${selectedExercises.length} ejercicios

---
`;
        selectedExercises.forEach((ex, idx) => {
          messageContent += `
**${idx + 1}. ${ex.nombre}** (${ex.duracion_minutos} min - ${ex.intensidad})
📋 ${ex.descripcion}

👥 Jugadores: ${ex.jugadores_min}-${ex.jugadores_max}
${ex.materiales?.length > 0 ? `🎯 Materiales: ${ex.materiales.join(', ')}` : ''}

📝 **Instrucciones:**
${ex.instrucciones}

${ex.consejos ? `💡 **Consejos:** ${ex.consejos}` : ''}

---
`;
        });
      }

      await base44.entities.ChatMessage.create({
        grupo_id,
        deporte: selectedCategory,
        tipo: "entrenador_a_grupo",
        remitente_email: user.email,
        remitente_nombre: user.full_name,
        mensaje: messageContent,
        archivos_adjuntos: [],
        prioridad: "Normal",
        leido: false,
        reacciones: []
      });

      // Crear notificaciones para cada padre
      const allPlayers = await base44.entities.Player.list();
      const categoryPlayers = allPlayers.filter(p => p.deporte === selectedCategory && p.activo === true);
      const parentEmails = [...new Set(categoryPlayers.flatMap(p => 
        [p.email_padre, p.email_tutor_2].filter(Boolean)
      ))];
      
      const categoryShort = selectedCategory.replace('Fútbol ', '').replace(' (Mixto)', '');
      const notifTitle = selectedExercises.length === 1 
        ? `💪 ${categoryShort}: Ejercicio compartido`
        : `🏋️ ${categoryShort}: Rutina compartida`;
      const notifMessage = selectedExercises.length === 1
        ? selectedExercises[0].nombre
        : `${selectedExercises.length} ejercicios (${calculateTotalDuration()} min)`;
      
      for (const email of parentEmails) {
        await base44.entities.AppNotification.create({
          usuario_email: email,
          titulo: notifTitle,
          mensaje: notifMessage,
          tipo: "importante",
          icono: selectedExercises.length === 1 ? "💪" : "🏋️",
          enlace: "ParentCoachChat",
          vista: false
        });
      }

      toast.success(selectedExercises.length === 1 ? "✅ Ejercicio compartido" : `✅ Rutina de ${selectedExercises.length} ejercicios compartida`);
      onClose();
    } catch (error) {
      console.error("Error al compartir:", error);
      toast.error("Error al compartir el ejercicio");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-4">
        <p className="text-sm text-green-800 font-medium mb-2">
          {sport === "Fútbol" ? "⚽" : "🏀"} <strong>{selectedCategory}</strong>
        </p>
        <p className="text-xs text-green-700">
          Selecciona uno o varios ejercicios. Si seleccionas varios, se enviará como rutina completa.
        </p>
      </div>

      {selectedExercises.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-blue-900">
              {selectedExercises.length} {selectedExercises.length === 1 ? "ejercicio" : "ejercicios"} • {calculateTotalDuration()} min
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedExercises([])}
              className="h-6 text-blue-700 hover:text-blue-900"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {selectedExercises.map((ex, idx) => (
              <Badge key={ex.id} variant="outline" className="text-xs bg-white">
                {idx + 1}. {ex.nombre}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar ejercicio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs border rounded-lg p-2"
        >
          <option value="">Todas las categorías</option>
          {availableCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={intensityFilter}
          onChange={(e) => setIntensityFilter(e.target.value)}
          className="text-xs border rounded-lg p-2"
        >
          <option value="">Intensidad</option>
          <option value="Baja">Baja</option>
          <option value="Media">Media</option>
          <option value="Alta">Alta</option>
          <option value="Muy Alta">Muy Alta</option>
        </select>

        <select
          value={durationFilter}
          onChange={(e) => setDurationFilter(e.target.value)}
          className="text-xs border rounded-lg p-2"
        >
          <option value="">Duración</option>
          <option value="corto">Corto (&lt;15min)</option>
          <option value="medio">Medio (15-30min)</option>
          <option value="largo">Largo (&gt;30min)</option>
        </select>
      </div>

      <div className="max-h-[400px] overflow-y-auto space-y-2 border rounded-lg p-2">
        {filteredExercises.length === 0 ? (
          <p className="text-center text-slate-500 py-8">
            No hay ejercicios de {sport} disponibles con estos filtros
          </p>
        ) : (
          filteredExercises.map(exercise => {
            const isSelected = selectedExercises.find(e => e.id === exercise.id);
            const selectionIndex = selectedExercises.findIndex(e => e.id === exercise.id);
            
            return (
              <div
                key={exercise.id}
                onClick={() => toggleExercise(exercise)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 hover:border-green-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{exercise.nombre}</p>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{exercise.descripcion}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        ⏱️ {exercise.duracion_minutos}min
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {exercise.intensidad}
                      </Badge>
                      {exercise.categoria_ejercicio && (
                        <Badge variant="outline" className="text-xs">
                          {exercise.categoria_ejercicio}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">{selectionIndex + 1}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1"
          disabled={sending}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleShare}
          disabled={selectedExercises.length === 0 || sending}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              {selectedExercises.length === 0 && "Selecciona ejercicio(s)"}
              {selectedExercises.length === 1 && "💪 Compartir Ejercicio"}
              {selectedExercises.length > 1 && `🏋️ Compartir Rutina (${selectedExercises.length})`}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}