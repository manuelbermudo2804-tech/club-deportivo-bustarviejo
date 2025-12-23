import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, BarChart3, Eye, Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import UploadStandingsForm from "../components/standings/UploadStandingsForm";
import ReviewStandingsTable from "../components/standings/ReviewStandingsTable";
import StandingsDisplay from "../components/standings/StandingsDisplay";
import ResultsList from "../components/results/ResultsList";
import ScorersList from "../components/scorers/ScorersList";
import UploadScorersForm from "../components/scorers/UploadScorersForm";
import ReviewScorersTable from "../components/scorers/ReviewScorersTable";

const CATEGORIES = [
  { id: "benjamin", name: "Benjamín", fullName: "Fútbol Benjamín (Mixto)" },
  { id: "alevin", name: "Alevín", fullName: "Fútbol Alevín (Mixto)" },
  { id: "infantil", name: "Infantil", fullName: "Fútbol Infantil (Mixto)" },
  { id: "cadete", name: "Cadete", fullName: "Fútbol Cadete" },
  { id: "femenino", name: "Femenino", fullName: "Fútbol Femenino" },
  { id: "juvenil", name: "Juvenil", fullName: "Fútbol Juvenil" },
  { id: "aficionado", name: "Aficionado", fullName: "Fútbol Aficionado" }
];

export default function Clasificaciones() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [selectedView, setSelectedView] = useState(null);
  const [userCategories, setUserCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("");
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        setIsAdmin(user.role === "admin");

        // Si no es admin, obtener categorías de sus jugadores
        if (user.role !== "admin") {
          const allPlayers = await base44.entities.Player.list();
          const myPlayers = allPlayers.filter(p => 
            p.email_padre === user.email || 
            p.email_tutor_2 === user.email ||
            (p.email_jugador === user.email && p.acceso_jugador_autorizado)
          );
          const categories = [...new Set(myPlayers.map(p => p.deporte).filter(Boolean))];
          setUserCategories(categories);

          // Establecer pestaña activa a la primera categoría disponible
          if (categories.length > 0) {
            const firstCat = CATEGORIES.find(c => categories.includes(c.fullName));
            if (firstCat) {
              setActiveTab(firstCat.id);
            }
          }
        } else {
          // Para admin, empezar en la primera categoría
          setActiveTab(CATEGORIES[0].id);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setIsLoadingUser(false);
      }
    };
    checkAdmin();
  }, []);

  const { data: standings } = useQuery({
    queryKey: ['clasificaciones'],
    queryFn: () => base44.entities.Clasificacion.list('-updated_date', 500),
    initialData: [],
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  // Config RFEF (URL por categoría+grupo)
  const { data: standingsConfigs = [] } = useQuery({
    queryKey: ['standings_config'],
    queryFn: () => base44.entities.StandingsConfig.list(),
    initialData: [],
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
  const [rfefUrl, setRfefUrl] = useState("");
  const [rfefResultsUrl, setRfefResultsUrl] = useState("");
  const [rfefScorersUrl, setRfefScorersUrl] = useState("");
  const [grupoText, setGrupoText] = useState("");
  const [configId, setConfigId] = useState(null);
  const [viewMode, setViewMode] = useState("standings");
  const [showScorersForm, setShowScorersForm] = useState(false);
  const [scorersReviewData, setScorersReviewData] = useState(null);
  const [savingScorers, setSavingScorers] = useState(false);

  React.useEffect(() => {
    if (!activeTab) return;
    const catFull = CATEGORIES.find(c => c.id === activeTab)?.fullName;
    if (!catFull) return;
    const cfg = standingsConfigs.find(c => c.categoria === catFull);
    setRfefUrl(cfg?.rfef_url || "");
    setRfefResultsUrl(cfg?.rfef_results_url || "");
    setRfefScorersUrl(cfg?.rfef_scorers_url || "");
    setGrupoText(cfg?.grupo || "");
    setConfigId(cfg?.id || null);
  }, [activeTab, standingsConfigs]);

  const saveConfigMutation = useMutation({
    mutationFn: ({ id, data }) => id ? base44.entities.StandingsConfig.update(id, data) : base44.entities.StandingsConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standings_config'] });
      toast.success("Guardado");
    }
  });

  // Agrupar clasificaciones por categoría
  const standingsByCategory = CATEGORIES.reduce((acc, cat) => {
    const categoryStandings = standings.filter(s => s.categoria === cat.fullName);
    
    // Agrupar por temporada/jornada dentro de cada categoría
    const grouped = categoryStandings.reduce((groupAcc, standing) => {
      const key = `${standing.temporada}|${standing.jornada}`;
      if (!groupAcc[key]) {
        groupAcc[key] = {
          temporada: standing.temporada,
          categoria: standing.categoria,
          jornada: standing.jornada,
          fecha_actualizacion: standing.fecha_actualizacion,
          data: []
        };
      }
      groupAcc[key].data.push(standing);
      return groupAcc;
    }, {});

    acc[cat.id] = Object.values(grouped).sort((a, b) => 
      new Date(b.fecha_actualizacion) - new Date(a.fecha_actualizacion)
    );
    
    return acc;
  }, {});



  const saveStandingsMutation = useMutation({
    mutationFn: async (data) => {
      const { temporada, categoria, jornada, standings } = data;

      console.log('[SAVE MUTATION] Iniciando guardado:', { temporada, categoria, jornada, count: standings.length });

      // Normalizar valores para evitar no-coincidencias y duplicados
      const temporadaNorm = String(temporada).trim();
      const categoriaNorm = String(categoria).trim();
      const jornadaKey = Number(jornada) && !Number.isNaN(Number(jornada)) ? Number(jornada) : 1;

      // Borrar de forma robusta todas las filas previas de esa jornada
      console.log('[SAVE MUTATION] Buscando registros previos...');
      const preList = await base44.entities.Clasificacion.filter({ 
        temporada: temporadaNorm, 
        categoria: categoriaNorm,
        jornada: jornadaKey
      });
      console.log(`[SAVE MUTATION] Encontrados ${preList.length} registros previos`);

      if (preList.length > 0) {
        console.log('[SAVE MUTATION] Borrando registros previos...');
        await Promise.all(preList.map(r => base44.entities.Clasificacion.delete(r.id)));
        console.log('[SAVE MUTATION] Registros previos borrados');
      }

      // Crear filas nuevas ya normalizadas
      const nowIso = new Date().toISOString();
      const toNum = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));
      const recordsToCreate = standings.map(s => {
        const base = {
          temporada: temporadaNorm,
          categoria: categoriaNorm,
          jornada: jornadaKey,
          posicion: Number(s.posicion) || 0,
          nombre_equipo: String(s.nombre_equipo || '').trim(),
          puntos: Number(s.puntos) || 0,
          fecha_actualizacion: nowIso
        };
        const pj = toNum(s.partidos_jugados);
        const g = toNum(s.ganados);
        const e = toNum(s.empatados);
        const p = toNum(s.perdidos);
        const gf = toNum(s.goles_favor);
        const gc = toNum(s.goles_contra);
        return {
          ...base,
          ...(pj !== undefined && { partidos_jugados: pj }),
          ...(g !== undefined && { ganados: g }),
          ...(e !== undefined && { empatados: e }),
          ...(p !== undefined && { perdidos: p }),
          ...(gf !== undefined && { goles_favor: gf }),
          ...(gc !== undefined && { goles_contra: gc })
        };
      });

      console.log('[SAVE MUTATION] Creando nuevos registros:', recordsToCreate);
      await base44.entities.Clasificacion.bulkCreate(recordsToCreate);
      console.log('[SAVE MUTATION] Registros creados exitosamente');
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['clasificaciones'] });
      const { temporada, categoria, standings } = variables || {};
      try {
        if (temporada && categoria) {
          const t = String(temporada).trim();
          const c = String(categoria).trim();
          const j = (variables && Number(variables.jornada)) || 1;

          // Optimistic cache update usando lo confirmado en el formulario
          const nowIso = new Date().toISOString();
          const optimisticRows = (standings || []).map(s => ({
            temporada: t,
            categoria: c,
            jornada: j,
            posicion: Number(s.posicion) || 0,
            nombre_equipo: String(s.nombre_equipo || '').trim(),
            puntos: Number(s.puntos) || 0,
            ...(s.partidos_jugados !== undefined ? { partidos_jugados: Number(s.partidos_jugados) } : {}),
            ...(s.ganados !== undefined ? { ganados: Number(s.ganados) } : {}),
            ...(s.empatados !== undefined ? { empatados: Number(s.empatados) } : {}),
            ...(s.perdidos !== undefined ? { perdidos: Number(s.perdidos) } : {}),
            ...(s.goles_favor !== undefined ? { goles_favor: Number(s.goles_favor) } : {}),
            ...(s.goles_contra !== undefined ? { goles_contra: Number(s.goles_contra) } : {}),
            fecha_actualizacion: nowIso,
            id: `optimistic-${Math.random().toString(36).slice(2)}`
          }));

          queryClient.setQueryData(['clasificaciones'], (prev) => {
            const safePrev = Array.isArray(prev) ? prev : [];
            const filteredPrev = safePrev.filter(r => !(String(r.temporada).trim() === t && String(r.categoria).trim() === c));
            return [...filteredPrev, ...optimisticRows];
          });

          // Double-check desde BD para confirmar
          const check = await base44.entities.Clasificacion.filter({ temporada: t, categoria: c, jornada: j });
          const rows = check;

          if (rows.length > 0) {
            toast.success(`✅ Clasificación reescrita (${rows.length} filas)`);
          } else {
            toast.error('⚠️ No se encontraron filas guardadas tras guardar.');
          }
        }
      } catch (e) {
        console.log('[Clasificaciones] Post-save check error', e);
      }
      setReviewData(null);
      setShowUploadForm(false);
      setSelectedCategory(null);
    },
    onError: (error) => {
      const msg = (error && (error.message || error.error || JSON.stringify(error))) || 'Error desconocido';
      toast.error(`Error al guardar: ${msg}`);
      console.error('[Clasificaciones] Save error:', error);
    }
  });

  const deleteStandingsMutation = useMutation({
    mutationFn: async ({ temporada, categoria, jornada }) => {
      const toDelete = await base44.entities.Clasificacion.filter({ 
        temporada, 
        categoria, 
        jornada 
      });
      
      for (const record of toDelete) {
        await base44.entities.Clasificacion.delete(record.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clasificaciones'] });
      toast.success("Clasificación eliminada");
    }
  });

  const handleConfirmStandings = (data) => {
    console.log('[CLASIFICACIONES] Confirmando datos:', data);

    if (!data?.categoria || !data?.temporada) {
      toast.error('Faltan datos obligatorios (categoría/temporada)');
      return;
    }

    if (!Array.isArray(data?.standings) || data.standings.length === 0) {
      toast.error('No hay equipos para guardar');
      return;
    }

    // Validar que cada equipo tenga los campos requeridos
    const validStandings = data.standings.filter(s => 
      s && 
      s.nombre_equipo && 
      String(s.nombre_equipo).trim() !== '' &&
      typeof s.posicion === 'number' &&
      typeof s.puntos === 'number'
    );

    if (validStandings.length === 0) {
      toast.error('No hay equipos válidos para guardar');
      return;
    }

    console.log(`[CLASIFICACIONES] Guardando ${validStandings.length} equipos válidos`);

    // Reescribe siempre la jornada "Actual"
    saveStandingsMutation.mutate({ 
      temporada: data.temporada,
      categoria: data.categoria,
      jornada: data.jornada,
      standings: validStandings 
    });
  };

  const handleNewUpload = (categoryFullName, prefillData = null) => {
    setSelectedCategory(categoryFullName);
    setReviewData(null);
    setShowUploadForm(true);
    
    // Si hay datos pre-rellenados, pasarlos al formulario
    if (prefillData) {
      setReviewData({ ...prefillData, isPrefilled: true });
    }
  };

  // Filtrar categorías según permisos de usuario
  const visibleCategories = isAdmin 
    ? CATEGORIES 
    : CATEGORIES.filter(cat => userCategories.includes(cat.fullName));

  if (isLoadingUser) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="text-slate-600 mt-2 text-sm">Cargando clasificaciones...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin && visibleCategories.length === 0) {
    return (
      <div className="p-6">
        <Card className="border-2 border-slate-300">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-700 mb-2">
              No hay datos disponibles todavía
            </h2>
            <p className="text-slate-500">
              Aún no tienes jugadores registrados o no hay datos subidos para tus equipos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista Resultados
  if (viewMode === 'results') {
    const catFull = CATEGORIES.find(c => c.id === activeTab)?.fullName;
    return (
      <div className="p-6 space-y-6">
        <Card className="border-2 border-orange-500 bg-gradient-to-r from-orange-50 to-orange-100">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-orange-700">Resultados · {CATEGORIES.find(c => c.id === activeTab)?.name}</h2>
              <p className="text-slate-600">Actualiza desde URL de RFFM (sin fechas públicas)</p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    let url = rfefResultsUrl;
                    if (!url) {
                      url = window.prompt('Pega la URL de Resultados/Jornadas de la RFFM para esta categoría');
                      if (!url) return;
                      saveConfigMutation.mutate({ id: configId, data: { categoria: catFull, rfef_results_url: url } });
                      setRfefResultsUrl(url);
                    }
                    const defSeason = (() => { const d=new Date(); const y=d.getFullYear(); const m=d.getMonth()+1; return m>=9 ? `${y}/${y+1}` : `${y-1}/${y}`; })();
                    const temporada = window.prompt('Temporada (ej 2024/2025)', defSeason) || defSeason;
                    const jStr = window.prompt('Número de jornada a guardar (ej 9)');
                    const jornada = Number(jStr);
                    if (!Number.isFinite(jornada)) { toast.error('Jornada inválida'); return; }
                    const { data } = await base44.functions.invoke('fetchRfefResults', { url });
                    const matches = (data?.matches || []).map(m => ({ ...m, local: String(m.local||'').trim(), visitante: String(m.visitante||'').trim() }));
                    if (matches.length === 0) { toast.error('No se detectaron partidos'); return; }
                    // Guardar
                    // borrar previos y crear
                    const prev = await base44.entities.Resultado.filter({ temporada, categoria: catFull, jornada });
                    await Promise.all(prev.map(r => base44.entities.Resultado.delete(r.id)));
                    const nowIso = new Date().toISOString();
                    await base44.entities.Resultado.bulkCreate(matches.map(m => ({
                      temporada,
                      categoria: catFull,
                      jornada,
                      local: m.local,
                      visitante: m.visitante,
                      ...(Number.isFinite(m.goles_local) ? { goles_local: Number(m.goles_local) } : {}),
                      ...(Number.isFinite(m.goles_visitante) ? { goles_visitante: Number(m.goles_visitante) } : {}),
                      estado: (Number.isFinite(m.goles_local) && Number.isFinite(m.goles_visitante)) ? 'finalizado' : 'pendiente',
                      acta_url: m.acta_url || undefined,
                      fecha_actualizacion: nowIso,
                    })));
                    await queryClient.invalidateQueries({ queryKey: ['resultados', catFull] });
                    toast.success('Resultados guardados');
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Actualizar Resultados (URL)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 h-auto bg-white p-2 rounded-xl shadow-sm mb-6">
            {visibleCategories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-lg py-3">
                <div className="flex flex-col items-center gap-1">
                  <span className="font-semibold text-sm">{cat.name}</span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {visibleCategories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="space-y-6">
              <ResultsList categoryFullName={cat.fullName} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  // Vista Goleadores
  if (viewMode === 'scorers') {
    const catFull = CATEGORIES.find(c => c.id === activeTab)?.fullName;
    return (
      <div className="p-6 space-y-6">
        <Card className="border-2 border-orange-500 bg-gradient-to-r from-orange-50 to-orange-100">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-orange-700">Goleadores · {CATEGORIES.find(c => c.id === activeTab)?.name}</h2>
              <p className="text-slate-600">Top goleadores por categoría</p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    let url = rfefScorersUrl;
                    if (!url) {
                      url = window.prompt('Pega la URL de Goleadores de la RFFM para esta categoría');
                      if (!url) return;
                      saveConfigMutation.mutate({ id: configId, data: { categoria: catFull, rfef_scorers_url: url } });
                      setRfefScorersUrl(url);
                    }
                    const defSeason = (() => { const d=new Date(); const y=d.getFullYear(); const m=d.getMonth()+1; return m>=9 ? `${y}/${y+1}` : `${y-1}/${y}`; })();
                    const temporada = window.prompt('Temporada (ej 2024/2025)', defSeason) || defSeason;
                    const { data } = await base44.functions.invoke('fetchRfefScorers', { url });
                    const players = (data?.players || []).filter(p => p.jugador_nombre && p.equipo && Number.isFinite(Number(p.goles)));
                    if (players.length === 0) { toast.error('No se detectaron goleadores'); return; }
                    const prev = await base44.entities.Goleador.filter({ temporada, categoria: catFull });
                    await Promise.all(prev.map(r => base44.entities.Goleador.delete(r.id)));
                    const nowIso = new Date().toISOString();
                    await base44.entities.Goleador.bulkCreate(players.map((p, idx) => ({
                      temporada,
                      categoria: catFull,
                      jugador_nombre: String(p.jugador_nombre).trim(),
                      equipo: String(p.equipo).trim(),
                      goles: Number(p.goles),
                      posicion: idx + 1,
                      fecha_actualizacion: nowIso,
                    })));
                    await queryClient.invalidateQueries({ queryKey: ['goleadores', catFull] });
                    toast.success('Goleadores guardados');
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Actualizar Goleadores (URL)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowScorersForm(true)}
                >
                  Subir desde imagen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {showScorersForm && (
          <UploadScorersForm
            categoria={catFull}
            onDataExtracted={(data) => {
              setScorersReviewData(data);
              setShowScorersForm(false);
            }}
            onCancel={() => setShowScorersForm(false)}
          />
        )}

        {scorersReviewData && (
          <ReviewScorersTable
            data={scorersReviewData}
            onCancel={() => setScorersReviewData(null)}
            isSubmitting={savingScorers}
            onConfirm={async ({ temporada, categoria, players }) => {
              try {
                setSavingScorers(true);
                const prev = await base44.entities.Goleador.filter({ temporada, categoria });
                await Promise.all(prev.map(r => base44.entities.Goleador.delete(r.id)));
                const nowIso = new Date().toISOString();
                await base44.entities.Goleador.bulkCreate(players.map((p, idx) => ({
                  temporada,
                  categoria,
                  jugador_nombre: String(p.jugador_nombre).trim(),
                  equipo: String(p.equipo).trim(),
                  goles: Number(p.goles),
                  posicion: idx + 1,
                  fecha_actualizacion: nowIso,
                })));
                await queryClient.invalidateQueries({ queryKey: ['goleadores', categoria] });
                setScorersReviewData(null);
                toast.success('Goleadores guardados');
              } finally {
                setSavingScorers(false);
              }
            }}
          />
        )}

        {!showScorersForm && !scorersReviewData && (
          {showScorersForm && (
            <UploadScorersForm
              categoria={catFull}
              onDataExtracted={(data) => {
                setScorersReviewData(data);
                setShowScorersForm(false);
              }}
              onCancel={() => setShowScorersForm(false)}
            />
          )}

          {scorersReviewData && (
            <ReviewScorersTable
              data={scorersReviewData}
              onCancel={() => setScorersReviewData(null)}
              isSubmitting={savingScorers}
              onConfirm={async ({ temporada, categoria, players }) => {
                try {
                  setSavingScorers(true);
                  const prev = await base44.entities.Goleador.filter({ temporada, categoria });
                  await Promise.all(prev.map(r => base44.entities.Goleador.delete(r.id)));
                  const nowIso = new Date().toISOString();
                  await base44.entities.Goleador.bulkCreate(players.map((p, idx) => ({
                    temporada,
                    categoria,
                    jugador_nombre: String(p.jugador_nombre).trim(),
                    equipo: String(p.equipo).trim(),
                    goles: Number(p.goles),
                    posicion: idx + 1,
                    fecha_actualizacion: nowIso,
                  })));
                  await queryClient.invalidateQueries({ queryKey: ['goleadores', categoria] });
                  setScorersReviewData(null);
                  toast.success('Goleadores guardados');
                } finally {
                  setSavingScorers(false);
                }
              }}
            />
          )}

          {!showScorersForm && !scorersReviewData && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 h-auto bg-white p-2 rounded-xl shadow-sm mb-6">
                {visibleCategories.map((cat) => (
                  <TabsTrigger key={cat.id} value={cat.id} className="data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-lg py-3">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold text-sm">{cat.name}</span>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>

              {visibleCategories.map((cat) => (
                <TabsContent key={cat.id} value={cat.id} className="space-y-6">
                  <ScorersList categoryFullName={cat.fullName} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        )}
      </div>
    );
  }

  // Si hay una clasificación seleccionada, mostrar solo esa vista
  if (selectedView) {
    return (
      <div className="p-6 space-y-6">
        <Button
          onClick={() => setSelectedView(null)}
          variant="outline"
          className="mb-4"
        >
          ← Volver a clasificaciones
        </Button>
        <StandingsDisplay
          data={selectedView}
          onClose={() => setSelectedView(null)}
          fullPage={true}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-orange-600" />
          Clasificaciones, Resultados y Goleadores
        </h1>
        <p className="text-slate-600 mt-1">Gestión y consulta unificada para familias, entrenadores y admin</p>
        <div className="mt-4 flex gap-2">
          <Button variant={viewMode === 'standings' ? 'default' : 'outline'} onClick={() => setViewMode('standings')}>Clasificaciones</Button>
          <Button variant={viewMode === 'results' ? 'default' : 'outline'} onClick={() => setViewMode('results')}>Resultados</Button>
          <Button variant={viewMode === 'scorers' ? 'default' : 'outline'} onClick={() => setViewMode('scorers')}>Goleadores</Button>
        </div>
      </div>

      {viewMode === 'standings' && showUploadForm && (
        <UploadStandingsForm
           onDataExtracted={(data) => {
             setReviewData(data);
             setShowUploadForm(false);
           }}
           onCancel={() => {
             setShowUploadForm(false);
             setSelectedCategory(null);
             setReviewData(null);
           }}
           preselectedCategory={selectedCategory}
           prefillData={reviewData?.isPrefilled ? reviewData : null}
           rfefUrl={rfefUrl}
         />
      )}

      {viewMode === 'standings' && reviewData && !reviewData.isPrefilled && (
        <ReviewStandingsTable
          data={reviewData}
          onConfirm={handleConfirmStandings}
          onCancel={() => {
            setReviewData(null);
            setSelectedCategory(null);
          }}
          isSubmitting={saveStandingsMutation.isPending}
        />
      )}

      {viewMode === 'standings' && !showUploadForm && !reviewData && activeTab && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 h-auto bg-white p-2 rounded-xl shadow-sm mb-6">
            {visibleCategories.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-lg py-3"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="font-semibold text-sm">{cat.name}</span>
                  {standingsByCategory[cat.id]?.length > 0 && (
                    <Badge className="bg-green-500 text-white text-xs">
                      {standingsByCategory[cat.id].length}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {visibleCategories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="space-y-6">
              {/* Header con botón de subir */}
              <Card className="border-2 border-orange-500 bg-gradient-to-r from-orange-50 to-orange-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-orange-700">{cat.name}</h2>
                      <p className="text-slate-600 mt-1">
                        {standingsByCategory[cat.id]?.length || 0} clasificaciones guardadas
                      </p>
                    </div>
                    {isAdmin && (
                     <Button
                       onClick={() => handleNewUpload(cat.fullName)}
                       className="bg-orange-600 hover:bg-orange-700"
                     >
                       <Upload className="w-4 h-4 mr-2" />
                       Actualizar Clasificación
                     </Button>
                    )}
                    </div>
                    </CardContent>
                    </Card>



              {/* Lista de clasificaciones */}
              {standingsByCategory[cat.id]?.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {standingsByCategory[cat.id].map((group, index) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="text-lg">Jornada {group.jornada}</span>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("¿Eliminar esta clasificación?")) {
                                  deleteStandingsMutation.mutate({
                                    temporada: group.temporada,
                                    categoria: group.categoria,
                                    jornada: group.jornada
                                  });
                                }
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </CardTitle>
                        <div className="text-sm text-slate-600 space-y-1">
                          <p>Temporada: {group.temporada}</p>
                          <p className="text-xs">Actualizado: {new Date(group.fecha_actualizacion).toLocaleDateString('es-ES')}</p>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setSelectedView(group)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver
                          </Button>
                          {isAdmin && (
                            <Button
                              onClick={() => {
                                handleNewUpload(cat.fullName, {
                                  temporada: group.temporada,
                                  categoria: group.categoria,
                                  jornada: group.jornada
                                });
                              }}
                              variant="outline"
                              size="icon"
                              className="border-orange-500 text-orange-600 hover:bg-orange-50"
                              title="Editar esta jornada"
                            >
                              ✏️
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-2 border-dashed border-slate-300">
                  <CardContent className="p-12 text-center">
                    <p className="text-slate-500 text-lg mb-4">
                      No hay clasificaciones para {cat.name} todavía
                    </p>
                    {isAdmin && (
                      <Button
                        onClick={() => handleNewUpload(cat.fullName)}
                        variant="outline"
                        className="border-orange-500 text-orange-600 hover:bg-orange-50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Subir Primera Clasificación
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}