import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";

export default function EvolutionCharts({ attendanceByMonth, evaluationChart }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            Asistencia a entrenamientos (últimos 6 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceByMonth.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Todavía no hay asistencias registradas</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={attendanceByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Line type="monotone" dataKey="asistencia" name="Asistencia" stroke="#f97316" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Valoración del entrenador (1 a 5)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {evaluationChart.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Todavía no hay evaluaciones</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={evaluationChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="media" name="Media" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}