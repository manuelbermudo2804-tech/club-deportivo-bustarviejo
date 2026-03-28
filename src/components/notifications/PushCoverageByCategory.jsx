import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function PushCoverageByCategory({ data }) {
  if (!data?.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">📊 Cobertura por categoría</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="categoria" width={120} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `${v}%`} labelFormatter={(l) => `${l}`} />
            <Bar dataKey="porcentaje" name="Cobertura" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.porcentaje >= 70 ? '#10b981' : entry.porcentaje >= 40 ? '#f59e0b' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Detail list below chart */}
        <div className="mt-4 space-y-1">
          {data.map(cat => (
            <div key={cat.categoriaFull} className="flex items-center justify-between text-sm px-2 py-1.5 rounded hover:bg-slate-50">
              <span className="text-slate-700">{cat.categoriaFull}</span>
              <div className="flex items-center gap-3">
                <span className="text-green-700 font-medium">{cat.conPush} ✓</span>
                {cat.sinPush > 0 && <span className="text-red-600 font-medium">{cat.sinPush} ✗</span>}
                <span className={`font-bold text-sm px-2 py-0.5 rounded-full ${cat.porcentaje >= 70 ? 'bg-green-100 text-green-700' : cat.porcentaje >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  {cat.porcentaje}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}