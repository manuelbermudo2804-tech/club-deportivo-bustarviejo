import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { isMultiPanelUser } from "@/lib/multiPanelUsers";
import usePanelData from "@/hooks/usePanelData";
import { buildUnifiedAgenda } from "@/components/panel/panelAgenda";
import { buildAtencion } from "@/components/panel/panelAtencion";
import { buildAccesos } from "@/components/panel/panelAccesos";
import PanelAtencion from "@/components/panel/PanelAtencion";
import PanelAgenda from "@/components/panel/PanelAgenda";
import PanelInbox from "@/components/panel/PanelInbox";
import PanelAccesos from "@/components/panel/PanelAccesos";

const saludo = () => {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
};

export default function MiPanel() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then((u) => {
      if (!isMultiPanelUser(u?.email)) {
        window.location.href = createPageUrl("Home");
        return;
      }
      setUser(u);
    });
  }, []);

  const { myPlayers, schedules, callups, payments } = usePanelData(user);

  const agenda = useMemo(
    () => (user ? buildUnifiedAgenda({ myPlayers, schedules, callups, email: user.email }) : []),
    [user, myPlayers, schedules, callups]
  );

  const atencion = useMemo(
    () => (user ? buildAtencion({ myPlayers, callups, payments, email: user.email }) : []),
    [user, myPlayers, callups, payments]
  );

  const accesos = useMemo(() => {
    if (!user) return [];
    return buildAccesos({
      hasPlayers: myPlayers.length > 0,
      loteriaVisible: false,
      isCoachToo: user.es_entrenador === true,
      canManageSignatures: user.es_coordinador === true,
      isPlayer: user.es_jugador === true,
    });
  }, [user, myPlayers]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
      </div>
    );
  }

  const roles = [];
  if (user.es_coordinador) roles.push("🎓 Coordinadora");
  if (user.es_entrenador) roles.push("🧢 Entrenadora");
  if (myPlayers.length > 0) roles.push("👨‍👩‍👧 Familia");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black pt-4 lg:pt-0">
      <div className="px-4 lg:px-8 py-6 space-y-5">
        <div>
          <h1 className="text-white text-2xl lg:text-3xl font-bold">
            {saludo()}, {(user.full_name || "").split(" ")[0]} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">{roles.join(" · ")}</p>
        </div>

        <PanelAtencion items={atencion} />

        <PanelAgenda items={agenda} />

        <PanelInbox
          isCoordinator={user.es_coordinador === true}
          isCoach={user.es_entrenador === true}
          hasPlayers={myPlayers.length > 0}
        />

        <PanelAccesos secciones={accesos} />
      </div>
    </div>
  );
}