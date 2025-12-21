import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Trash2, Trophy, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function FinancialGoalsTracker({ totalIngresos, totalPendiente, totalEsperado, activeSeason }) {
  const [goals, setGoals] = useState([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ titulo: "", objetivo: "", fecha_limite: "" });

  useEffect(() => {
    const savedGoals = localStorage.getItem(`financial_goals_${activeSeason?.temporada}`);
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    } else {
      // Metas predefinidas
      const defaultGoals = [
        { 
          id: '1', 
          titulo: "Cobro 80% antes de Diciembre", 
          objetivo: totalEsperado * 0.8, 
          fecha_limite: `${activeSeason?.temporada?.split('/')[0]}-12-15`,
          tipo: "porcentaje"
        },
        { 
          id: '2', 
          titulo: "Cerrar Septiembre al 50%", 
          objetivo: totalEsperado * 0.5, 
          fecha_limite: `${activeSeason?.temporada?.split('/')[0]}-09-30`,
          tipo: "porcentaje"
        },
        { 
          id: '3', 
          titulo: "Morosidad menor al 20%", 
          objetivo: 20, 
          fecha_limite: `${activeSeason?.temporada?.split('/')[1]}-06-30`,
          tipo: "morosidad"
        }
      ];
      setGoals(defaultGoals);
    }
  }, [activeSeason, totalEsperado]);

  const saveGoals = (updatedGoals) => {
    setGoals(updatedGoals);
    localStorage.setItem(`financial_goals_${activeSeason?.temporada}`, JSON.stringify(updatedGoals));
  };

  const handleAddGoal = () => {
    if (!newGoal.titulo || !newGoal.objetivo) {
      toast.error("Completa todos los campos");
      return;
    }
    const goal = {
      id: Date.now().toString(),
      ...newGoal,
      objetivo: parseFloat(newGoal.objetivo),
      tipo: "monto"
    };
    saveGoals([...goals, goal]);
    setNewGoal({ titulo: "", objetivo: "", fecha_limite: "" });
    setShowAddGoal(false);
    toast.success("Meta agregada");
  };

  const handleDeleteGoal = (id) => {
    saveGoals(goals.filter(g => g.id !== id));
    toast.success("Meta eliminada");
  };

  const getProgress = (goal) => {
    if (goal.tipo === "morosidad") {
      const currentMorosidad = totalEsperado > 0 ? (totalPendiente / totalEsperado) * 100 : 0;
      const progress = Math.max(0, 100 - (currentMorosidad / goal.objetivo * 100));
      return { progress, achieved: currentMorosidad <= goal.objetivo, current: currentMorosidad };
    } else if (goal.tipo === "porcentaje") {
      const currentPercentage = totalEsperado > 0 ? (totalIngresos / totalEsperado) * 100 : 0;
      const targetPercentage = (goal.objetivo / totalEsperado) * 100;
      const progress = (currentPercentage / targetPercentage) * 100;
      return { progress, achieved: totalIngresos >= goal.objetivo, current: totalIngresos };
    } else {
      const progress = (totalIngresos / goal.objetivo) * 100;
      return { progress, achieved: totalIngresos >= goal.objetivo, current: totalIngresos };
    }
  };

  const getDaysRemaining = (fecha) => {
    if (!fecha) return null;
    const now = new Date();
    const target = new Date(fecha);
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-600" />
            Metas y Objetivos Financieros
          </CardTitle>
          <Button 
            size="sm"
            onClick={() => setShowAddGoal(!showAddGoal)}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Meta
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {showAddGoal && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-3 border-2 border-orange-200">
            <Input 
              placeholder="Título de la meta (ej: Cobrar 15,000€ antes de Navidad)"
              value={newGoal.titulo}
              onChange={(e) => setNewGoal({...newGoal, titulo: e.target.value})}
            />
            <Input 
              type="number"
              placeholder="Objetivo en euros"
              value={newGoal.objetivo}
              onChange={(e) => setNewGoal({...newGoal, objetivo: e.target.value})}
            />
            <Input 
              type="date"
              value={newGoal.fecha_limite}
              onChange={(e) => setNewGoal({...newGoal, fecha_limite: e.target.value})}
            />
            <div className="flex gap-2">
              <Button onClick={handleAddGoal} className="bg-green-600 hover:bg-green-700">
                Guardar Meta
              </Button>
              <Button onClick={() => setShowAddGoal(false)} variant="outline">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {goals.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No hay metas configuradas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map(goal => {
              const { progress, achieved, current } = getProgress(goal);
              const daysLeft = getDaysRemaining(goal.fecha_limite);
              
              return (
                <div key={goal.id} className={`rounded-xl p-4 border-2 ${
                  achieved ? 'bg-green-50 border-green-300' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-slate-900">{goal.titulo}</h4>
                        {achieved && (
                          <Badge className="bg-green-600">
                            <Trophy className="w-3 h-3 mr-1" />
                            ¡Completado!
                          </Badge>
                        )}
                      </div>
                      {goal.fecha_limite && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                          <Calendar className="w-3 h-3" />
                          {daysLeft !== null && (
                            daysLeft > 0 ? (
                              <span className={daysLeft <= 7 ? 'text-red-600 font-semibold' : ''}>
                                {daysLeft} días restantes
                              </span>
                            ) : (
                              <span className="text-red-600 font-semibold">Fecha límite vencida</span>
                            )
                          )}
                        </div>
                      )}
                    </div>
                    <Button 
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {goal.tipo === "morosidad" ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Morosidad actual</span>
                          <span className="font-bold text-slate-900">{current.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-600">Meta</span>
                          <span className="font-bold text-green-700">{'<'} {goal.objetivo}%</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Actual</span>
                          <span className="font-bold text-slate-900">{current.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-600">Meta</span>
                          <span className="font-bold text-green-700">{goal.objetivo.toFixed(2)}€</span>
                        </div>
                      </>
                    )}
                    <Progress value={Math.min(progress, 100)} className="h-3" />
                    <p className="text-xs text-right text-slate-500">{Math.min(progress, 100).toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}