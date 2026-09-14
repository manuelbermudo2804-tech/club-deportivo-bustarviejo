import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import usePlayerEvolution from "./evolution/usePlayerEvolution";
import EvolutionSummary from "./evolution/EvolutionSummary";
import EvolutionCharts from "./evolution/EvolutionCharts";
import EvolutionGoals from "./evolution/EvolutionGoals";
import EvolutionNotes from "./evolution/EvolutionNotes";
import EvolutionHistory from "./evolution/EvolutionHistory";

/**
 * Evolución del jugador: asistencia, valoraciones del entrenador, objetivos y notas.
 * isStaff = true muestra también lo no marcado como visible para las familias.
 */
export default function PlayerEvolutionTab({ player, isStaff = false }) {
  const { evaluations, goals, notes, attendanceByMonth, evaluationChart, stats } = usePlayerEvolution(player, isStaff);

  if (!player) return null;

  return (
    <div className="space-y-4">
      <EvolutionSummary stats={stats} />

      <Tabs defaultValue="graficas" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="graficas">📊 Progreso</TabsTrigger>
          <TabsTrigger value="objetivos">🎯 Objetivos</TabsTrigger>
          <TabsTrigger value="notas">📝 Notas</TabsTrigger>
          <TabsTrigger value="historial">📅 Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="graficas" className="mt-4">
          <EvolutionCharts attendanceByMonth={attendanceByMonth} evaluationChart={evaluationChart} />
        </TabsContent>
        <TabsContent value="objetivos" className="mt-4">
          <EvolutionGoals goals={goals} />
        </TabsContent>
        <TabsContent value="notas" className="mt-4">
          <EvolutionNotes notes={notes} />
        </TabsContent>
        <TabsContent value="historial" className="mt-4">
          <EvolutionHistory evaluations={evaluations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}