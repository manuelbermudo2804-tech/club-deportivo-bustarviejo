import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ExerciseShareDialog({ exercises, selectedCategory, user, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [sending, setSending] = useState(false);

  const filteredExercises = exercises
    .filter(ex => {
      const matchesSearch = ex.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            ex.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .slice(0, 20);

  const handleShare = async () => {
    if (!selectedExercise) return;

    setSending(true);

    try {
      const grupo_id = selectedCategory.toLowerCase().replace(/\s+/g, '_');
      
      const messageContent = `💪 **${selectedExercise.nombre}**

📋 ${selectedExercise.descripcion}

⏱️ Duración: ${selectedExercise.duracion_minutos} min
🎯 Intensidad: ${selectedExercise.intensidad}
👥 Jugadores: ${selectedExercise.jugadores_necesarios || `${selectedExercise.jugadores_min}-${selectedExercise.jugadores_max}`}

📝 **Instrucciones:**
${selectedExercise.instrucciones}

${selectedExercise.variaciones ? `🔄 **Variaciones:**
${selectedExercise.variaciones}` : ''}

${selectedExercise.consejos ? `💡 **Consejos:**
${selectedExercise.consejos}` : ''}

${selectedExercise.diagrama_ascii ? `
\`\`\`
${selectedExercise.diagrama_ascii}
\`\`\`
` : ''}`;

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
      
      for (const email of parentEmails) {
        await base44.entities.AppNotification.create({
          usuario_email: email,
          titulo: `💪 ${categoryShort}: Ejercicio compartido`,
          mensaje: selectedExercise.nombre,
          tipo: "importante",
          icono: "💪",
          enlace: "ParentCoachChat",
          vista: false
        });
      }

      toast.success("✅ Ejercicio compartido en el chat");
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
        <p className="text-sm text-green-800">
          💪 Selecciona un ejercicio para enviarlo al grupo de <strong>{selectedCategory}</strong>
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar ejercicio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="max-h-[400px] overflow-y-auto space-y-2 border rounded-lg p-2">
        {filteredExercises.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No hay ejercicios disponibles</p>
        ) : (
          filteredExercises.map(exercise => (
            <div
              key={exercise.id}
              onClick={() => setSelectedExercise(exercise)}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedExercise?.id === exercise.id
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
                    <Badge variant="outline" className="text-xs">
                      {exercise.deporte}
                    </Badge>
                  </div>
                </div>
                {selectedExercise?.id === exercise.id && (
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">✓</span>
                  </div>
                )}
              </div>
            </div>
          ))
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
          disabled={!selectedExercise || sending}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              💪 Compartir Ejercicio
            </>
          )}
        </Button>
      </div>
    </div>
  );
}