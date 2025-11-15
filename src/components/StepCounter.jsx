import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Footprints, Flame } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Progress } from "@/components/ui/progress";

export default function StepCounter() {
  const [steps, setSteps] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addStepsInput, setAddStepsInput] = useState("");

  const DAILY_GOAL = 10000;
  const CALORIES_PER_STEP = 0.04;

  useEffect(() => {
    loadSteps();
  }, []);

  const loadSteps = async () => {
    try {
      const user = await base44.auth.me();
      const today = new Date().toISOString().split('T')[0];
      const lastDate = user.steps_last_date;
      
      // Reset if it's a new day
      if (lastDate !== today) {
        await base44.auth.updateMe({
          steps_count: 0,
          steps_last_date: today
        });
        setSteps(0);
      } else {
        setSteps(user.steps_count || 0);
      }
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
        steps_count: newSteps,
        steps_last_date: today
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

  const calories = Math.round(steps * CALORIES_PER_STEP);
  const progress = Math.min((steps / DAILY_GOAL) * 100, 100);
  
  const getMessage = () => {
    if (steps === 0) return { text: "¡Empieza tu día! 🌅", color: "text-slate-600" };
    if (steps < 2000) return { text: "¡Buen inicio! 💪", color: "text-blue-600" };
    if (steps < 5000) return { text: "¡Sigue así! 🚀", color: "text-green-600" };
    if (steps < 8000) return { text: "¡Genial! 🔥", color: "text-orange-600" };
    if (steps < 10000) return { text: "¡Casi! 🎯", color: "text-orange-700" };
    if (steps < 15000) return { text: "¡Campeón! 🏆", color: "text-yellow-600" };
    return { text: "¡LEYENDA! 👑", color: "text-purple-600" };
  };

  const message = getMessage();

  if (loading) return null;

  return (
    <Card className="border-none shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Footprints className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-semibold text-slate-900">Pasos Hoy</span>
          </div>
          <span className={`text-xs font-medium ${message.color}`}>{message.text}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-orange-100 rounded-lg p-2 text-center">
            <div className="text-xl font-bold text-orange-700">{steps.toLocaleString()}</div>
            <div className="text-xs text-orange-600">pasos</div>
          </div>
          <div className="bg-green-100 rounded-lg p-2 text-center">
            <div className="text-xl font-bold text-green-700">{calories}</div>
            <div className="text-xs text-green-600">kcal</div>
          </div>
        </div>

        <Progress value={progress} className="h-2 mb-3" />

        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Añadir pasos"
            value={addStepsInput}
            onChange={(e) => setAddStepsInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addSteps()}
            className="text-sm h-8"
          />
          <Button 
            onClick={addSteps}
            className="bg-orange-600 hover:bg-orange-700 h-8 px-3 text-xs"
            disabled={!addStepsInput || parseInt(addStepsInput) <= 0}
          >
            +
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}