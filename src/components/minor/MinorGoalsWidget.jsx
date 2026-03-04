import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Check, Target, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const CATEGORIAS = [
  { value: "Técnica", emoji: "⚽", color: "from-blue-500 to-cyan-500" },
  { value: "Táctica", emoji: "🧠", color: "from-violet-500 to-purple-500" },
  { value: "Física", emoji: "💪", color: "from-emerald-500 to-green-500" },
  { value: "Mental", emoji: "🎯", color: "from-orange-500 to-amber-500" },
  { value: "Actitud", emoji: "❤️", color: "from-rose-500 to-pink-500" },
];

function NewGoalForm({ playerId, playerName, userEmail, userName, onCreated, onCancel }) {
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PlayerGoal.create(data),
    onSuccess: () => {
      toast.success("✅ ¡Meta guardada!", {
        description: `"${titulo}" se ha añadido a tus metas`,
        duration: 4000,
      });
      onCreated(titulo, categoria);
    },
    onError: (err) => {
      toast.error("❌ No se pudo guardar", {
        description: "Inténtalo de nuevo",
        duration: 4000,
      });
    },
  });

  const handleSubmit = () => {
    if (!titulo.trim() || !categoria) return;
    createMutation.mutate({
      jugador_id: playerId,
      jugador_nombre: playerName,
      creado_por_email: userEmail,
      creado_por_nombre: userName,
      titulo: titulo.trim(),
      categoria,
      es_personal: true,
      estado: "En progreso",
      temporada: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="bg-white border-2 border-dashed border-orange-300 rounded-2xl p-4 space-y-3">
        <p className="text-xs text-slate-500 font-medium">📝 Escribe tu meta y elige una categoría:</p>
        <Input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej: Mejorar el disparo con la izquierda"
          className="border-slate-200 rounded-xl text-sm"
          maxLength={100}
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoria(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                categoria === cat.value
                  ? `bg-gradient-to-r ${cat.color} text-white shadow-md scale-105`
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.emoji} {cat.value}
            </button>
          ))}
        </div>
        {!categoria && titulo.trim() && (
          <p className="text-[11px] text-amber-600 font-medium">👆 Elige una categoría para poder guardar</p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} className="flex-1 rounded-xl" disabled={createMutation.isPending}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!titulo.trim() || !categoria || createMutation.isPending}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold"
          >
            {createMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Guardando...</>
            ) : (
              "✅ Guardar meta"
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function SuccessBanner({ titulo, categoria, onDone }) {
  const catInfo = CATEGORIAS.find(c => c.value === categoria) || CATEGORIAS[0];

  React.useEffect(() => {
    const timer = setTimeout(onDone, 3500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      transition={{ type: "spring", bounce: 0.5 }}
    >
      <Card className="border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 shadow-xl overflow-hidden">
        <CardContent className="p-4 relative">
          <div className="absolute top-1 right-2">
            <motion.span
              className="text-2xl"
              animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.3, 1] }}
              transition={{ duration: 0.6 }}
            >
              🎉
            </motion.span>
          </div>
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1, bounce: 0.6 }}
              className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0"
            >
              <Check className="w-6 h-6 text-white" strokeWidth={3} />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-green-800 text-sm">¡Meta guardada! 🚀</p>
              <p className="text-xs text-green-700 truncate mt-0.5">"{titulo}"</p>
              <Badge className={`mt-1 bg-gradient-to-r ${catInfo.color} text-white border-none text-[10px]`}>
                {catInfo.emoji} {categoria}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function MinorGoalsWidget({ playerId, playerName, userEmail, userName }) {
  const [showForm, setShowForm] = useState(false);
  const [justCreated, setJustCreated] = useState(null); // { titulo, categoria }
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["minorGoals", playerId],
    queryFn: () => base44.entities.PlayerGoal.filter(
      { jugador_id: playerId },
      "-created_date",
      20
    ),
    enabled: !!playerId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completada }) =>
      base44.entities.PlayerGoal.update(id, {
        completada,
        estado: completada ? "Completado" : "En progreso",
        fecha_completada: completada ? new Date().toISOString() : null,
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["minorGoals"] });
      if (vars.completada) {
        toast.success("🏆 ¡Meta completada!", { duration: 3000 });
      }
    },
  });

  const activeGoals = goals.filter((g) => !g.completada);
  const completedGoals = goals.filter((g) => g.completada);
  const getCatInfo = (cat) => CATEGORIAS.find((c) => c.value === cat) || CATEGORIAS[0];

  const handleGoalCreated = (titulo, categoria) => {
    setShowForm(false);
    setJustCreated({ titulo, categoria });
    queryClient.invalidateQueries({ queryKey: ["minorGoals"] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-orange-500" />
          <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Mis Metas</h2>
          {activeGoals.length > 0 && (
            <Badge variant="secondary" className="text-xs">{activeGoals.length} activas</Badge>
          )}
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200 hover:bg-orange-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva meta
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {justCreated && (
          <SuccessBanner
            key="success"
            titulo={justCreated.titulo}
            categoria={justCreated.categoria}
            onDone={() => setJustCreated(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <NewGoalForm
            playerId={playerId}
            playerName={playerName}
            userEmail={userEmail}
            userName={userName}
            onCreated={handleGoalCreated}
            onCancel={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      {activeGoals.length === 0 && completedGoals.length === 0 && !showForm && !justCreated && (
        <Card className="border-2 border-dashed border-orange-200 shadow-md">
          <CardContent className="p-6 text-center">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl mb-3"
            >
              🎯
            </motion.div>
            <p className="text-slate-700 font-bold text-base">¡Ponte tu primera meta!</p>
            <p className="text-slate-500 text-xs mt-1">
              Escribe qué quieres mejorar y haz seguimiento de tu progreso
            </p>
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="mt-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-bold px-6"
            >
              <Sparkles className="w-4 h-4 mr-1" /> Crear mi primera meta
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lista de metas activas */}
      {activeGoals.length > 0 && (
        <div className="space-y-2">
          {activeGoals.map((goal, i) => {
            const catInfo = getCatInfo(goal.categoria);
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                layout
              >
                <Card className="border-none shadow-md overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleMutation.mutate({ id: goal.id, completada: true })}
                        className="w-14 h-14 flex items-center justify-center bg-slate-50 hover:bg-green-50 active:bg-green-100 transition-colors border-r border-slate-100 flex-shrink-0"
                        title="Marcar como completada"
                      >
                        <div className="w-7 h-7 rounded-full border-2 border-slate-300 hover:border-green-500 transition-colors flex items-center justify-center">
                          <Check className="w-4 h-4 text-slate-300 hover:text-green-500" />
                        </div>
                      </button>
                      <div className="flex-1 px-3 py-2.5 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{goal.titulo}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`bg-gradient-to-r ${catInfo.color} text-white border-none text-[10px] px-2 py-0`}>
                            {catInfo.emoji} {goal.categoria}
                          </Badge>
                          {goal.es_personal && (
                            <span className="text-[10px] text-slate-400">✍️ Mi meta</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Metas completadas */}
      {completedGoals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-green-600 uppercase tracking-wider px-1 flex items-center gap-1">
            🏆 Completadas ({completedGoals.length})
          </p>
          {completedGoals.slice(0, 3).map((goal) => {
            const catInfo = getCatInfo(goal.categoria);
            return (
              <motion.div key={goal.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout>
                <Card className="border-none shadow-sm bg-green-50/50">
                  <CardContent className="p-0">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleMutation.mutate({ id: goal.id, completada: false })}
                        className="w-14 h-14 flex items-center justify-center bg-green-100 flex-shrink-0"
                        title="Desmarcar"
                      >
                        <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" strokeWidth={3} />
                        </div>
                      </button>
                      <div className="flex-1 px-3 py-2.5">
                        <p className="text-sm font-medium text-green-700 line-through truncate">{goal.titulo}</p>
                        <span className="text-[10px] text-green-500">
                          ✅ {goal.fecha_completada ? new Date(goal.fecha_completada).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Completada'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          {completedGoals.length > 3 && (
            <p className="text-[11px] text-slate-400 text-center">
              +{completedGoals.length - 3} más completadas
            </p>
          )}
        </div>
      )}
    </div>
  );
}