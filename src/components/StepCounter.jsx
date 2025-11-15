import React, { useState, useEffect } from "react";
import { Footprints } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function StepCounter() {
  const [steps, setSteps] = useState(0);
  const [input, setInput] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const user = await base44.auth.me();
        const today = new Date().toISOString().split('T')[0];
        if (user.steps_last_date !== today) {
          await base44.auth.updateMe({ steps_count: 0, steps_last_date: today });
          setSteps(0);
        } else {
          setSteps(user.steps_count || 0);
        }
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, []);

  const add = async () => {
    const val = parseInt(input) || 0;
    if (val > 0) {
      const newSteps = steps + val;
      await base44.auth.updateMe({ 
        steps_count: newSteps, 
        steps_last_date: new Date().toISOString().split('T')[0] 
      });
      setSteps(newSteps);
      setInput("");
    }
  };

  const msg = steps === 0 ? "🌅" : steps < 5000 ? "💪" : steps < 10000 ? "🔥" : "🏆";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 flex items-center gap-3">
      <Footprints className="w-4 h-4 text-orange-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500">Pasos {msg}</div>
        <div className="text-sm font-bold text-slate-900">{steps.toLocaleString()}</div>
      </div>
      <div className="flex gap-1">
        <Input
          type="number"
          placeholder="0"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && add()}
          className="w-16 h-7 text-xs"
        />
        <Button onClick={add} className="h-7 px-2 text-xs bg-orange-600 hover:bg-orange-700">+</Button>
      </div>
    </div>
  );
}