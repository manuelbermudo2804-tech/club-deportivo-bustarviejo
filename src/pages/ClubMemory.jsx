import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FileText, Download, Users, Trophy, Heart, CreditCard, Calendar,
  Handshake, Image as ImageIcon, Loader2, Sparkles, ShieldCheck,
} from "lucide-react";
import { generateClubMemoryPDF } from "@/components/memory/clubMemoryPdfGenerator";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

const getCurrentSeason = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const inicio = m >= 9 ? y : y - 1;
  return `${inicio}-${inicio + 1}`;
};

const seasonOptions = () => {
  const current = parseInt(getCurrentSeason().split("-")[0], 10);
  const opts = [];
  for (let y = current; y >= current - 4; y--) opts.push(`${y}-${y + 1}`);
  return opts;
};

const yearOptions = () => {
  const cy = new Date().getFullYear();
  const opts = [];
  for (let y = cy; y >= cy - 4; y--) opts.push(y);
  return opts;
};

export default function ClubMemory() {
  const [modo, setModo] = useState("temporada");
  const [temporada, setTemporada] = useState(getCurrentSeason());
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === "admin")).catch(() => setIsAdmin(false));
  }, []);

  const loadData = async () => {
    setLoading(true);
    setData(null);
    try {
      const payload = modo === "natural" ? { modo, anio } : { modo, temporada };
      const res = await base44.functions.invoke("generateClubMemory", payload);
      setData(res.data);
    } catch (e) {
      toast.error("No se pudieron cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [modo, temporada, anio]);

  const handleDownload = async () => {
    if (!data) return;
    setGenerating(true);
    try {
      await generateClubMemoryPDF(data, CLUB_LOGO_URL);
      toast.success("Memoria generada y descargada");
    } catch (e) {
      toast.error("Error al generar el PDF");
    } finally {
      setGenerating(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <ShieldCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-600">Esta sección es solo para administradores.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 lg:p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
            <FileText className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Memoria del Club</h1>
            <p className="text-slate-300 text-sm">PDF listo para Ayuntamiento, subvenciones y asamblea</p>
          </div>
        </div>
      </div>

      {/* Controles */}
      <Card className="rounded-2xl border-slate-200">
        <CardContent className="p-4 lg:p-6 space-y-4">
          <Tabs value={modo} onValueChange={setModo}>
            <TabsList className="grid grid-cols-2 w-full max-w-xs">
              <TabsTrigger value="temporada">Por temporada</TabsTrigger>
              <TabsTrigger value="natural">Año natural</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-3">
            {modo === "temporada" ? (
              <Select value={temporada} onValueChange={setTemporada}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {seasonOptions().map(s => <SelectItem key={s} value={s}>Temporada {s}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Select value={String(anio)} onValueChange={(v) => setAnio(parseInt(v, 10))}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions().map(y => <SelectItem key={y} value={String(y)}>Año {y}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            <Button
              onClick={handleDownload}
              disabled={!data || generating || loading}
              className="bg-orange-600 hover:bg-orange-700 ml-auto"
            >
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Generar memoria PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vista previa */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      )}

      {!loading && data && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Kpi icon={Users} label="Jugadores" value={data.jugadores?.total} color="orange" />
            <Kpi icon={Trophy} label="Equipos" value={data.jugadores?.equipos} color="green" />
            <Kpi icon={Heart} label="Fútbol femenino" value={data.jugadores?.femenino} color="pink" sub="jugadoras" />
            <Kpi icon={Users} label="Socios" value={data.socios?.total} color="blue" />
            <Kpi icon={Calendar} label="Eventos" value={data.eventos?.total} color="purple" />
            <Kpi icon={Handshake} label="Patrocinadores" value={(data.patrocinadores || []).length} color="teal" />
          </div>

          {/* Ingresos */}
          <Card className="rounded-2xl border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-5 text-white">
              <div className="flex items-center gap-2 text-sm opacity-90"><CreditCard className="w-4 h-4" /> Ingresos del periodo</div>
              <p className="text-3xl font-bold mt-1">{(data.ingresos?.total || 0).toLocaleString("es-ES")} €</p>
            </div>
            <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-500">Cuotas y pagos</p>
                <p className="font-bold text-slate-800 text-lg">{(data.ingresos?.cuotas || 0).toLocaleString("es-ES")} €</p>
                <p className="text-xs text-slate-400">{data.ingresos?.num_pagos || 0} pagos</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-500">Patrocinios</p>
                <p className="font-bold text-slate-800 text-lg">{(data.ingresos?.patrocinio || 0).toLocaleString("es-ES")} €</p>
              </div>
            </CardContent>
          </Card>

          {/* Categorías */}
          {(data.jugadores?.categorias || []).length > 0 && (
            <Card className="rounded-2xl border-slate-200">
              <CardContent className="p-4">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-orange-500" /> Jugadores por categoría</h3>
                <div className="space-y-2">
                  {data.jugadores.categorias.map((c) => {
                    const max = data.jugadores.categorias[0].count || 1;
                    return (
                      <div key={c.nombre} className="flex items-center gap-3">
                        <span className="text-sm text-slate-600 w-44 truncate">{c.nombre}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-orange-500 h-full rounded-full" style={{ width: `${(c.count / max) * 100}%` }} />
                        </div>
                        <span className="text-sm font-bold text-slate-800 w-8 text-right">{c.count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Patrocinadores */}
          {(data.patrocinadores || []).length > 0 && (
            <Card className="rounded-2xl border-slate-200">
              <CardContent className="p-4">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Handshake className="w-4 h-4 text-teal-500" /> Patrocinadores</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {data.patrocinadores.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2.5">
                      {s.logo_url
                        ? <img src={s.logo_url} alt={s.nombre} className="w-10 h-10 object-contain rounded bg-white" />
                        : <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center"><Handshake className="w-4 h-4 text-slate-400" /></div>}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{s.nombre}</p>
                        {s.nivel && <p className="text-xs text-slate-400">{s.nivel}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Eventos */}
          {(data.eventos?.lista || []).length > 0 && (
            <Card className="rounded-2xl border-slate-200">
              <CardContent className="p-4">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-500" /> Eventos del periodo</h3>
                <div className="space-y-1.5">
                  {data.eventos.lista.slice(0, 15).map((e, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-slate-100 last:border-0">
                      <span className="text-slate-400 text-xs w-24 flex-shrink-0">{e.fecha}</span>
                      <span className={`flex-1 truncate ${e.importante ? "font-semibold text-orange-600" : "text-slate-700"}`}>{e.titulo}</span>
                      <span className="text-xs text-slate-400">{e.tipo}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Galería */}
          {(data.fotos?.destacadas || []).length > 0 && (
            <Card className="rounded-2xl border-slate-200">
              <CardContent className="p-4">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-indigo-500" /> Galería destacada <span className="text-xs font-normal text-slate-400">({data.fotos.albumes} álbumes · {data.fotos.total} fotos)</span></h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {data.fotos.destacadas.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-400 justify-center pt-2">
            <Sparkles className="w-3.5 h-3.5" />
            Esta vista previa muestra los datos que se incluirán en el PDF
          </div>
        </div>
      )}
    </div>
  );
}

const COLORS = {
  orange: "bg-orange-50 text-orange-600",
  green: "bg-green-50 text-green-600",
  pink: "bg-pink-50 text-pink-600",
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-purple-50 text-purple-600",
  teal: "bg-teal-50 text-teal-600",
};

function Kpi({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col items-center text-center">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${COLORS[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-slate-800">{value ?? 0}</p>
      <p className="text-xs text-slate-500">{label}{sub ? ` · ${sub}` : ""}</p>
    </div>
  );
}