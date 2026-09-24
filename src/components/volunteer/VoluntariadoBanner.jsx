import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { HeartHandshake, X } from "lucide-react";
import useVolunteerPending, { readIds, writeIds } from "@/hooks/useVolunteerPending";

const DISMISS_KEY = "vol_dismissed_ids";

// Aviso fino y descartable: solo aparece si hay oportunidades abiertas a las que
// el usuario no se ha apuntado y que no ha cerrado ya con la X.
export default function VoluntariadoBanner({ user }) {
  const { pending } = useVolunteerPending(user);
  const [dismissed, setDismissed] = useState(() => readIds(DISMISS_KEY));

  const visibles = pending.filter((o) => !dismissed.includes(o.id));
  if (visibles.length === 0) return null;

  const una = visibles.length === 1 ? visibles[0] : null;
  const url = createPageUrl("Voluntariado") + (una ? `?opp_id=${una.id}` : "");

  const handleDismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const ids = [...new Set([...dismissed, ...visibles.map((o) => o.id)])];
    writeIds(DISMISS_KEY, ids);
    setDismissed(ids);
  };

  return (
    <Link to={url} className="block">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-600/15 px-3 py-2 hover:bg-emerald-600/25 transition-colors">
        <HeartHandshake className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <p className="flex-1 min-w-0 text-sm text-white truncate">
          {una
            ? <>🤝 El club necesita ayuda: <strong>{una.titulo}</strong></>
            : <>🤝 Hay <strong>{visibles.length} oportunidades</strong> de voluntariado abiertas</>}
        </p>
        <span className="text-xs font-bold text-emerald-300 flex-shrink-0">Ver →</span>
        <button
          onClick={handleDismiss}
          aria-label="Cerrar aviso"
          className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    </Link>
  );
}