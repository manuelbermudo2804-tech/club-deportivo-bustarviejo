import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Footprints, Flame, TrendingUp, Target, Award, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function StepCounter() {
  const [steps, setSteps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addStepsInput, setAddStepsInput] = useState("");

  const DAILY_GOAL = 10000;
  const CALORIES_PER_STEP = 0.04; // Aproximadamente

  useEffect(() => {
    loadSteps();
  }, []);

  const loadSteps = async () => {
    try {
      const user = await base44.auth.me();
      const today = new Date().toISOString().split('T')[0];
      const storedSteps = user[`steps_${today}`] || 0;
      setSteps(storedSteps);
    } catch (error) {
      console.error("Error loading steps:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSteps = async (newSteps) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await base44.auth.updateMe({
        [`steps_${today}`]: newSteps
      });
      setSteps(newSteps);
    } catch (error) {
      console.error("Error saving steps:", error);
    }
  };

  const addSteps = () => {
    const additionalSteps = parseInt(addStepsInput) || 0;
    if (additionalSteps > 0) {
      const newTotal = steps + additionalSteps;
      saveSteps(newTotal);
      setAddStepsInput("");
    }
  };

  const resetSteps = () => {
    if (confirm("¿Estás seguro de que quieres reiniciar el contador?")) {
      saveSteps(0);
    }
  };

  const calories = Math.round(steps * CALORIES_PER_STEP);
  const progress = Math.min((steps / DAILY_GOAL) * 100, 100);
  
  const getMessage = () => {
    if (steps === 0) {
      return { text: "¡Empieza tu día activo! 🌅", icon: Target, color: "text-slate-600" };
    } else if (steps < 2000) {
      return { text: "¡Buen comienzo! Sigue así 💪", icon: Zap, color: "text-blue-600" };
    } else if (steps < 5000) {
      return { text: "¡Vas por buen camino! 🚀", icon: TrendingUp, color: "text-green-600" };
    } else if (steps < 8000) {
      return { text: "¡Increíble progreso! 🔥", icon: Flame, color: "text-orange-600" };
    } else if (steps < 10000) {
      return { text: "¡Casi llegas a la meta! 🎯", icon: Target, color: "text-orange-700" };
    } else if (steps < 15000) {
      return { text: "¡Meta superada! ¡Eres un campeón! 🏆", icon: Award, color: "text-yellow-600" };
    } else {
      return { text: "¡LEYENDA! Nivel extraordinario 👑", icon: Award, color: "text-purple-600" };
    }
  };

  const message = getMessage();
  const MessageIcon = message.icon;

  if (loading) {
    return null;
  }

  return (
    <Card className="border-none shadow-xl bg-gradient-to-br from-orange-50 via-white to-green-50">
      <CardHeader className="border-b border-orange-100">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Footprints className="w-6 h-6 text-orange-600" />
          Contador de Pasos
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Stats principales */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Footprints className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Pasos</span>
            </div>
            <div className="text-4xl font-bold">{steps.toLocaleString()}</div>
            <div className="text-xs opacity-80 mt-1">de {DAILY_GOAL.toLocaleString()}</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Calorías</span>
            </div>
            <div className="text-4xl font-bold">{calories}</div>
            <div className="text-xs opacity-80 mt-1">kcal quemadas</div>
          </div>
        </div>

        {/* Progreso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Progreso del día</span>
            <Badge className="bg-orange-100 text-orange-700">{Math.round(progress)}%</Badge>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Mensaje motivacional */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 border-2 border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full bg-white shadow-md ${message.color}`}>
              <MessageIcon className="w-6 h-6" />
            </div>
            <p className={`text-lg font-bold ${message.color}`}>
              {message.text}
            </p>
          </div>
        </div>

        {/* Añadir pasos */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Registra tus pasos</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Ej: 1000"
              value={addStepsInput}
              onChange={(e) => setAddStepsInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSteps()}
              className="text-lg"
            />
            <Button 
              onClick={addSteps}
              className="bg-orange-600 hover:bg-orange-700 px-6"
              disabled={!addStepsInput || parseInt(addStepsInput) <= 0}
            >
              Añadir
            </Button>
          </div>
        </div>

        {/* Botón reset */}
        <Button
          variant="outline"
          onClick={resetSteps}
          className="w-full text-slate-600 hover:text-red-600 hover:border-red-600"
          size="sm"
        >
          Reiniciar contador
        </Button>

        {/* Info adicional */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {(steps / 1000).toFixed(1)}
            </div>
            <div className="text-xs text-slate-600 mt-1">km aprox.</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.round(steps * 0.7)}
            </div>
            <div className="text-xs text-slate-600 mt-1">minutos activo</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}