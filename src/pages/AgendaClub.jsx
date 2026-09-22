import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { List, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, FlaskConical } from "lucide-react";
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
import CalendarSubscribeCard from "../components/calendar/CalendarSubscribeCard";

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
    <div className="p-4 lg:p-6 space-y-4 max-w-6xl mx-auto">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Agenda del club</h1>
          <Badge className="bg-purple-100 text-purple-800 border-0">
            <FlaskConical className="w-3 h-3 mr-1" />
            En pruebas
          </Badge>
        </div>
        <p className="text-slate-600 mt-1 text-sm">
          Entrenamientos, partidos y eventos en un único sitio, ordenados por fecha.
        </p>
      </div>

      <CalendarSubscribeCard categories={categoriasDisponibles} />

      {/* Selector de vista + navegación */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex bg-white rounded-lg border border-slate-200 p-1">
          {VISTAS.map((v) => (
            <Button
              key={v.id}
              size="sm"
              variant={vista === v.id ? "default" : "ghost"}
              onClick={() => { setVista(v.id); setReferencia(new Date()); }}
              className={vista === v.id ? "bg-orange-600 hover:bg-orange-700" : ""}
            >
              <v.icon className="w-4 h-4 mr-1.5" />
              {v.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {vista !== "lista" && (
            <Button size="sm" variant="outline" onClick={() => navegar(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <span className="text-sm font-semibold text-slate-700 capitalize min-w-[150px] text-center">
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
      <div className="flex flex-wrap gap-1.5">
        {FILTROS_TIPO.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filtroTipo === f.id ? "default" : "outline"}
            onClick={() => setFiltroTipo(f.id)}
            className={filtroTipo === f.id ? "bg-slate-800 hover:bg-slate-900 h-8 text-xs" : "h-8 text-xs"}
          >
            {f.label}
          </Button>
        ))}
        {categoriasDisponibles.length > 1 && (
          <>
            <div className="h-8 w-px bg-slate-300 mx-1" />
            <Button
              size="sm"
              variant={filtroCategoria === "all" ? "default" : "outline"}
              onClick={() => setFiltroCategoria("all")}
              className={filtroCategoria === "all" ? "bg-blue-600 hover:bg-blue-700 h-8 text-xs" : "h-8 text-xs"}
            >
              Todos los equipos
            </Button>
            {categoriasDisponibles.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={filtroCategoria === c ? "default" : "outline"}
                onClick={() => setFiltroCategoria(c)}
                className={filtroCategoria === c ? "bg-blue-600 hover:bg-blue-700 h-8 text-xs" : "h-8 text-xs"}
              >
                {c}
              </Button>
            ))}
          </>
        )}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        {Object.entries(KIND_STYLES).map(([kind, style]) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
            {style.label}
          </span>
        ))}
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent" />
        </div>
      ) : vista === "lista" ? (
        <AgendaListView items={visibles} />
      ) : vista === "semana" ? (
        <AgendaWeekView items={visibles} referenceDate={referencia} onSelectDay={setDiaSeleccionado} />
      ) : (
        <AgendaMonthView items={visibles} referenceDate={referencia} onSelectDay={setDiaSeleccionado} />
      )}

      {/* Detalle de un día */}
      <Dialog open={!!diaSeleccionado} onOpenChange={(open) => !open && setDiaSeleccionado(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize">
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