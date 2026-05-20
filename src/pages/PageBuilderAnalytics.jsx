import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Eye, Users, CreditCard, TrendingUp, Globe } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#ea580c", "#15803d", "#0ea5e9", "#a855f7", "#f59e0b", "#ef4444"];

// Analytics propias de una landing: embudo de conversión, fuentes de tráfico, evolución diaria.
export default function PageBuilderAnalytics() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const pageId = params.get("id");
  const [page, setPage] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pageId) { navigate("/PageBuilder"); return; }
    (async () => {
      try {
        const p = await base44.entities.LandingPage.get(pageId);
        const subs = await base44.entities.LandingSubmission.filter(
          { landing_page_id: pageId }, "-created_date", 2000
        );
        setPage(p);
        setSubmissions(subs || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [pageId, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  if (!page) return null;

  const visitas = page.estadisticas?.visitas || 0;
  const inscripciones = submissions.filter((s) => s.estado !== "lista_espera").length;
  const pagadas = submissions.filter((s) => s.pago_estado === "pagado").length;
  const tienePago = !!page.config?.pago?.activo;
  const recaudado = submissions.filter((s) => s.pago_estado === "pagado")
    .reduce((sum, s) => sum + (s.pago_importe_total || 0), 0);
  const conversion = visitas > 0 ? ((inscripciones / visitas) * 100).toFixed(1) : 0;

  // Embudo
  const funnel = [
    { etapa: "Visitas", valor: visitas },
    { etapa: "Inscripciones", valor: inscripciones },
    ...(tienePago ? [{ etapa: "Pagadas", valor: pagadas }] : []),
  ];

  // Por día (últimos 30)
  const porDia = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    porDia[key] = 0;
  }
  submissions.forEach((s) => {
    const k = s.created_date?.slice(0, 10);
    if (k && k in porDia) porDia[k]++;
  });
  const dataDia = Object.entries(porDia).map(([fecha, total]) => ({
    fecha: fecha.slice(5),
    total,
  }));

  // UTM sources
  const porFuente = {};
  submissions.forEach((s) => {
    const src = s.utm_source || (s.referrer ? new URL(s.referrer.startsWith("http") ? s.referrer : `https://${s.referrer}`).hostname.replace(/^www\./, "") : "directo");
    porFuente[src] = (porFuente[src] || 0) + 1;
  });
  const dataFuentes = Object.entries(porFuente)
    .map(([nombre, valor]) => ({ nombre, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/PageBuilder")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900">📈 Analytics · {page.nombre}</h1>
          <p className="text-sm text-slate-500">/l/{page.slug}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KPI icon={<Eye className="w-5 h-5" />} label="Visitas" valor={visitas} color="#0ea5e9" />
        <KPI icon={<Users className="w-5 h-5" />} label="Inscritos" valor={inscripciones} color="#ea580c" />
        <KPI icon={<TrendingUp className="w-5 h-5" />} label="Conversión" valor={`${conversion}%`} color="#15803d" />
        {tienePago ? (
          <KPI icon={<CreditCard className="w-5 h-5" />} label="Recaudado" valor={`${recaudado.toFixed(0)}€`} color="#a855f7" />
        ) : (
          <KPI icon={<Globe className="w-5 h-5" />} label="Fuentes" valor={dataFuentes.length} color="#a855f7" />
        )}
      </div>

      {/* Embudo */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
        <h2 className="font-bold text-slate-900 mb-4">Embudo de conversión</h2>
        <div className="space-y-2">
          {funnel.map((f, i) => {
            const pct = funnel[0].valor > 0 ? (f.valor / funnel[0].valor) * 100 : 0;
            return (
              <div key={i}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-semibold text-slate-700">{f.etapa}</span>
                  <span className="font-bold text-slate-900">{f.valor} ({pct.toFixed(1)}%)</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Por día */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
        <h2 className="font-bold text-slate-900 mb-4">Inscripciones (últimos 30 días)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dataDia}>
            <XAxis dataKey="fecha" fontSize={11} />
            <YAxis fontSize={11} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="total" fill="#ea580c" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Fuentes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-bold text-slate-900 mb-4">Origen del tráfico</h2>
        {dataFuentes.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay datos suficientes.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={dataFuentes} dataKey="valor" nameKey="nombre" cx="50%" cy="50%" outerRadius={90} label>
                {dataFuentes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function KPI({ icon, label, valor, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
        <span style={{ color }}>{icon}</span> {label}
      </div>
      <div className="text-2xl font-black text-slate-900">{valor}</div>
    </div>
  );
}