import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Users, GraduationCap, ChevronRight } from "lucide-react";

// Chats como FAMILIA para staff (entrenador/coordinador) que además tiene hijos en el club
function Row({ title, subtitle, url, Icon, iconBg }) {
  return (
    <Link to={url} className="block">
      <Card className="group min-w-0 rounded-2xl border border-slate-200/80 border-l-4 border-l-green-500 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} sm:h-12 sm:w-12`}>
            <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-bold text-slate-900">{title}</h3>
            <p className="truncate text-xs text-slate-600 sm:text-sm">{subtitle}</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  );
}

const normCat = (s = "") =>
  s.toString().replace(/\(.*?\)/g, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

// excludeCategories: categorías que el usuario ya ve como entrenador (evita chats duplicados)
// hideCoordinator: ocultar "Chat Coordinador" (p.ej. si el usuario ya es el coordinador)
export default function MyKidsChatsSection({ user, excludeCategories = [], hideCoordinator = false }) {
  const { data: players = [] } = useQuery({
    queryKey: ["myKidsChats", user?.email],
    queryFn: () => base44.entities.Player.filter({
      $or: [{ email_padre: user.email }, { email_tutor_2: user.email }, { email_jugador: user.email }],
      activo: true,
    }),
    enabled: !!user?.email,
  });

  if (players.length === 0) return null;
  const excluded = new Set(excludeCategories.map(normCat));
  const cats = [...new Set(players.map(p => p.categoria_principal || p.deporte).filter(Boolean))]
    .filter(c => !excluded.has(normCat(c)));
  if (cats.length === 0 && hideCoordinator) return null;
  const soyYo = (p) => (p.email_jugador || "").toLowerCase() === (user.email || "").toLowerCase();
  const soloJugador = players.every(soyYo);

  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 ring-1 ring-orange-100">
          <Users className="h-5 w-5 text-orange-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-slate-900">
            {soloJugador ? "Como jugador" : "Como familia / jugador"}
          </h2>
          <p className="text-xs text-slate-500 sm:text-sm">Tus conversaciones personales dentro del club</p>
        </div>
      </div>
      {cats.map(cat => (
        <Row
          key={cat}
          title={`⚽ ${cat}`}
          subtitle={players.filter(p => (p.categoria_principal || p.deporte) === cat).map(p => soyYo(p) ? "Yo (jugador)" : p.nombre.split(" ")[0]).join(", ")}
          url={`${createPageUrl("ParentCoachChat")}?category=${encodeURIComponent(cat)}`}
          Icon={Users}
          iconBg="bg-green-600"
        />
      ))}
      {!hideCoordinator && (
        <Row
          title="🎓 Chat Coordinador"
          subtitle="Habla con la coordinación como familia"
          url={createPageUrl("ParentCoordinatorChat")}
          Icon={GraduationCap}
          iconBg="bg-cyan-600"
        />
      )}
    </section>
  );
}