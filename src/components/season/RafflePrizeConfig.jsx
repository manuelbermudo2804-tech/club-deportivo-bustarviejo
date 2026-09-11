import React from "react";
import RafflePremioFields from "@/components/season/raffle/RafflePremioFields";
import RaffleSorteoFields from "@/components/season/raffle/RaffleSorteoFields";
import RaffleUmbralFields from "@/components/season/raffle/RaffleUmbralFields";

function Seccion({ numero, titulo, descripcion, children }) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <span className="w-6 h-6 shrink-0 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
          {numero}
        </span>
        <div>
          <p className="font-semibold text-slate-900 text-sm">{titulo}</p>
          {descripcion && <p className="text-xs text-slate-500 mt-0.5">{descripcion}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function RafflePrizeConfig({ activeSeason, updateSeasonMutation }) {
  if (!activeSeason) return null;

  const update = (data) => updateSeasonMutation.mutate({ id: activeSeason.id, data });

  return (
    <div className="space-y-3">
      <Seccion
        numero="1"
        titulo="El premio que se sortea"
        descripcion="Cada amigo traído = 1 papeleta con número único."
      >
        <RafflePremioFields activeSeason={activeSeason} update={update} />
      </Seccion>

      <Seccion numero="2" titulo="Cuándo y dónde se sortea">
        <RaffleSorteoFields activeSeason={activeSeason} update={update} />
      </Seccion>

      <Seccion
        numero="3"
        titulo="Mínimo de papeletas para sortear"
        descripcion="Para que el sorteo salga rentable al club."
      >
        <RaffleUmbralFields activeSeason={activeSeason} update={update} />
      </Seccion>
    </div>
  );
}