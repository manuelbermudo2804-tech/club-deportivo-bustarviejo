import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { List, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, CalendarCheck, Sparkles, ShieldCheck } from "lucide-react";
import {
  addDays, addMonths, subMonths, addWeeks, subWeeks,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, format,
} from "date-fns";
import { es } from "date-fns/locale";
import { useActiveSeason } from "../components/season/SeasonProvider";
import useAgendaItems from "@/hooks/useAgendaItems";
import AgendaListView from "../components/agenda/AgendaListView";
import AgendaWeekView from "../components/agenda/AgendaWeekView";
import AgendaMonthView from "../components/agenda/AgendaMonthView";
import AgendaItemCard, { KIND_STYLES } from "../components/agenda/AgendaItemCard";
import { fechaISO } from "@/lib/sinEntrenamiento";
import AgendaSubscribeButtons from "../components/agenda/AgendaSubscribeButtons";
import AgendaTeamFilter from "../components/agenda/AgendaTeamFilter";
import FechasLibresDialog from "../components/agenda/FechasLibresDialog";

const VISTAS = [
  { id: "lista", label: "Lista", icon: List },
  { id: "semana", label: "Semana", icon: CalendarRange },
  { id: "mes", label: "Mes", icon: CalendarDays },
];

const FILTROS_TIPO = [
  { id: "all", label: "Todo" },
  { id: "entrenamiento", label: "Entrenamientos" },
  { id: "partidos", label: "Partidos" },
  { id: "evento", label: "Eventos" },
];

export default function AgendaClub() {
  const [vista, setVista] = useState("lista");
  const [referencia, setReferencia] = useState(new Date());
  const [filtroTipo, setFiltroTipo] = useState("all");
  const [filtroCategoria, setFiltroCategoria] = useState("all");
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [user, setUser] = useState(null);
  const [showLibres, setShowLibres] = useState(false);

  const { activeSeason } = useActiveSeason();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const isAdmin = user?.role === "admin";
  const isStaff = !!(user?.es_entrenador || user?.es_coordinador);

  const { data: players = [] } = useQuery({
    queryKey: ["agenda-players"],
    queryFn: () => base44.entities.Player.list(),
    enabled: !!user,
  });

  const myCategories = useMemo(() => {
    if (!user) return [];
    const cats = new Set();
    players
      .filter(
        (p) =>
          p.activo &&
          (p.email_padre === user.email ||
            p.email_tutor_2 === user.email ||
            p.email_jugador === user.email ||
            (p.acceso_menor_email === user.email && p.acceso_menor_autorizado))
      )
      .forEach((p) => {
        if (p.deporte) cats.add(p.deporte);
        if (p.categoria_principal) cats.add(p.categoria_principal);
        (p.categorias || []).forEach((c) => cats.add(c));
      });
    (user.categorias_entrena || []).forEach((c) => cats.add(c));
    return [...cats].filter(Boolean);
  }, [players, user]);

  const { start, end } = useMemo(() => {
    if (vista === "semana") {
      return { start: startOfWeek(referencia, { weekStartsOn: 1 }), end: endOfWeek(referencia, { weekStartsOn: 1 }) };
    }
    if (vista === "mes") {
      return { start: startOfMonth(referencia), end: endOfMonth(referencia) };
    }
    return { start: new Date(), end: addDays(new Date(), 60) };
  }, [vista, referencia]);

  const { items, isLoading } = useAgendaItems({
    start,
    end,
    temporada: activeSeason,
    myCategories,
    verTodo: isAdmin || isStaff,
    user,
  });

  const categoriasDisponibles = useMemo(
    () => [...new Set(items.map((i) => i.categoria).filter((c) => c && c !== "Todo el club"))].sort(),
    [items]
  );

  const visibles = useMemo(
    () =>
      items.filter((i) => {
        const tipoOk =
          filtroTipo === "all" ||
          (filtroTipo === "partidos" ? i.kind === "convocatoria" || i.kind === "partido" : i.kind === filtroTipo);
        const catOk = filtroCategoria === "all" || i.categoria === filtroCategoria;
        return tipoOk && catOk;
      }),
    [items, filtroTipo, filtroCategoria]
  );

  const itemsDelDia = diaSeleccionado
    ? visibles.filter((i) => i.date === fechaISO(diaSeleccionado))
    : [];

  const navegar = (direccion) => {
    if (vista === "semana") setReferencia(direccion > 0 ? addWeeks(referencia, 1) : subWeeks(referencia, 1));
    if (vista === "mes") setReferencia(direccion > 0 ? addMonths(referencia, 1) : subMonths(referencia, 1));
  };

  const tituloRango =
    vista === "semana"
      ? `${format(start, "d MMM", { locale: es })} – ${format(end, "d MMM yyyy", { locale: es })}`
      : vista === "mes"
        ? format(referencia, "MMMM yyyy", { locale: es })
        : "Próximos 60 días";

  return (
    <div className="mx-auto box-border w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-8 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7 [&_*]:min-w-0">
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14"><CalendarCheck className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" /></div>
          <div className="min-w-0 flex-1"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Club deportivo · Calendario y actividades</p><h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Agenda del club</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Entrenamientos, partidos y eventos en un único sitio, ordenados por fecha.</p></div>
        </div>
      </section>

      <AgendaSubscribeButtons categoria={filtroCategoria === "all" ? "" : filtroCategoria} />

      {(isAdmin || isStaff) && (
        <>
          <Button onClick={() => setShowLibres(true)} className="w-full rounded-xl bg-orange-600 font-semibold hover:bg-orange-700 sm:w-auto">
            <Sparkles className="mr-1.5 h-4 w-4" /> Buscar fines de semana libres
          </Button>
          <FechasLibresDialog open={showLibres} onOpenChange={setShowLibres} temporada={activeSeason} user={user} />
        </>
      )}

      {/* Selector de vista + navegación */}
      <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid w-full grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
          {VISTAS.map((v) => (
            <Button
              key={v.id}
              size="sm"
              variant={vista === v.id ? "default" : "ghost"}
              onClick={() => { setVista(v.id); setReferencia(new Date()); }}
              className={vista === v.id ? "rounded-lg bg-orange-600 text-white shadow-sm hover:bg-orange-700" : "rounded-lg text-slate-600 hover:bg-white"}
            >
              <v.icon className="w-4 h-4 mr-1.5" />
              {v.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 w-full min-w-0">
          {vista !== "lista" && (
            <Button size="sm" variant="outline" onClick={() => navegar(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <span className="flex-1 text-xs sm:text-sm font-semibold text-slate-700 capitalize text-center break-words">
            {tituloRango}
          </span>
          {vista !== "lista" && (
            <Button size="sm" variant="outline" onClick={() => navegar(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-4 sm:p-4">
        {FILTROS_TIPO.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filtroTipo === f.id ? "default" : "outline"}
            onClick={() => setFiltroTipo(f.id)}
            className={filtroTipo === f.id ? "h-9 rounded-xl bg-slate-900 text-xs text-white shadow-sm hover:bg-slate-800" : "h-9 rounded-xl border-slate-200 bg-white text-xs text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <AgendaTeamFilter
        categorias={categoriasDisponibles}
        valor={filtroCategoria}
        onChange={setFiltroCategoria}
      />

      {/* Leyenda */}
      <div className="flex flex-wrap gap-x-3 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
        {Object.entries(KIND_STYLES).map(([kind, style]) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
            {style.label}
          </span>
        ))}
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent" /><p className="mt-3 text-sm text-slate-500">Cargando agenda del club...</p></div>
      ) : vista === "lista" ? (
        <AgendaListView items={visibles} />
      ) : vista === "semana" ? (
        <AgendaWeekView items={visibles} referenceDate={referencia} onSelectDay={setDiaSeleccionado} />
      ) : (
        <AgendaMonthView items={visibles} referenceDate={referencia} onSelectDay={setDiaSeleccionado} />
      )}

      {/* Detalle de un día */}
      <Dialog open={!!diaSeleccionado} onOpenChange={(open) => !open && setDiaSeleccionado(null)}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="capitalize text-slate-900">
              {diaSeleccionado && format(diaSeleccionado, "EEEE d 'de' MMMM", { locale: es })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {itemsDelDia.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">Nada programado este día</p>
            ) : (
              itemsDelDia.map((item) => <AgendaItemCard key={item.id} item={item} />)
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}