import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Check, Target, X } from "lucide-react";

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
    onSuccess: () => onCreated(),
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} className="flex-1 rounded-xl">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!titulo.trim() || !categoria || createMutation.isPending}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl"
          >
            {createMutation.isPending ? "..." : "✅ Añadir"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function MinorGoalsWidget({ playerId, playerName, userEmail, userName }) {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery({
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["minorGoals"] }),
  });

  const activeGoals = goals.filter((g) => !g.completada);
  const completedGoals = goals.filter((g) => g.completada);

  const getCatInfo = (cat) => CATEGORIAS.find((c) => c.value === cat) || CATEGORIAS[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-orange-500" />
          <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Mis Metas</h2>
          {activeGoals.length > 0 && (
            <Badge variant="secondary" className="text-xs">{activeGoals.length}</Badge>
          )}
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <NewGoalForm
            playerId={playerId}
            playerName={playerName}
            userEmail={userEmail}
            userName={userName}
            onCreated={() => {
              setShowForm(false);
              queryClient.invalidateQueries({ queryKey: ["minorGoals"] });
            }}
            onCancel={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      {activeGoals.length === 0 && completedGoals.length === 0 && !showForm && (
        <Card className="border-none shadow-md">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-slate-500 text-sm font-medium">¡Ponte tu primera meta!</p>
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="mt-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl"
            >
              <Plus className="w-4 h-4 mr-1" /> Crear meta
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {activeGoals.map((goal, i) => {
          const catInfo = getCatInfo(goal.categoria);
          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-none shadow-md overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleMutation.mutate({ id: goal.id, completada: true })}
                      className="w-14 h-14 flex items-center justify-center bg-slate-50 hover:bg-green-50 transition-colors border-r border-slate-100 flex-shrink-0"
                    >
                      <div className="w-6 h-6 rounded-full border-2 border-slate-300 hover:border-green-500 transition-colors" />
                    </button>
                    <div className="flex-1 px-3 py-2.5 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{goal.titulo}</p>
                      <Badge className={`mt-1 bg-gradient-to-r ${catInfo.color} text-white border-none text-[10px] px-2 py-0`}>
                        {catInfo.emoji} {goal.categoria}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {completedGoals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            ✅ Completadas ({completedGoals.length})
          </p>
          {completedGoals.slice(0, 3).map((goal, i) => {
            const catInfo = getCatInfo(goal.categoria);
            return (
              <motion.div key={goal.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="border-none shadow-sm bg-green-50/50">
                  <CardContent className="p-0">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleMutation.mutate({ id: goal.id, completada: false })}
                        className="w-14 h-14 flex items-center justify-center bg-green-100 flex-shrink-0"
                      >
                        <Check className="w-5 h-5 text-green-600" />
                      </button>
                      <div className="flex-1 px-3 py-2.5">
                        <p className="text-sm font-medium text-slate-500 line-through truncate">{goal.titulo}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}