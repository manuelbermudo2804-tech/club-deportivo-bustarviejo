import React from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

export function TrendChart({ data = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>📈 Tendencia de Alertas (7 días)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="critical" stroke={COLORS[0]} strokeWidth={2} />
            <Line type="monotone" dataKey="high" stroke={COLORS[2]} strokeWidth={2} />
            <Line type="monotone" dataKey="medium" stroke={COLORS[3]} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CategoryChart({ data = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>🎯 Alertas por Categoría</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill={COLORS[0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function SeverityChart({ data = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>⚠️ Distribución por Severidad</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ComparisonChart({ currentPeriod = [], previousPeriod = [] }) {
  const data = currentPeriod.map((item, idx) => ({
    name: item.name,
    current: item.value,
    previous: previousPeriod[idx]?.value || 0
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Comparativa Período</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="current" fill={COLORS[0]} name="Actual" />
            <Bar dataKey="previous" fill={COLORS[1]} name="Anterior" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}