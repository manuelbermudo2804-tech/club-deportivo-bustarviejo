import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#ea580c', '#16a34a', '#3b82f6', '#eab308', '#ec4899', '#8b5cf6'];

export function AttendanceChart({ data }) {
  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg">📊 Asistencia por Mes</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="presentes" fill="#16a34a" name="Presentes" />
            <Bar dataKey="ausentes" fill="#dc2626" name="Ausentes" />
            <Bar dataKey="justificados" fill="#3b82f6" name="Justificados" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function PaymentStatusChart({ data }) {
  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg">💰 Estado de Pagos</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CallupConfirmationChart({ data }) {
  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg">🏆 Confirmación de Convocatorias</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="categoria" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="confirmados" fill="#16a34a" name="Confirmados" />
            <Bar dataKey="pendientes" fill="#eab308" name="Pendientes" />
            <Bar dataKey="noAsistiran" fill="#dc2626" name="No asistirán" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}