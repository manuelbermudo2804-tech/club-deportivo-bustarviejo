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
      <Card className="p-4 hover:shadow-md transition-all border-l-4 border-l-green-500">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 truncate">{title}</h3>
            <p className="text-sm text-slate-600 truncate">{subtitle}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
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
    <div className="space-y-4 mt-6">
      <h2 className="text-lg font-bold text-slate-800 px-2">
        {soloJugador ? "⚽ Como jugador" : "👨‍👩‍👧 Como familia / jugador"}
      </h2>
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
    </div>
  );
}