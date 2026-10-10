import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
import AutorizacionImagenRow from "./AutorizacionImagenRow";

// Buscar cualquier jugador (también los que ya autorizan) para cambiar su autorización
export default function BuscarJugadorAutorizacion({ players, onChanged }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const res = term.length < 2 ? [] : players.filter((p) => (p.nombre || "").toLowerCase().includes(term)).slice(0, 8);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cualquier jugador para cambiar su autorización..." className="pl-9" />
      </div>
      {term.length >= 2 && (
        <Card className="overflow-hidden">
          {res.length === 0 ? (
            <p className="text-sm text-slate-500 px-4 py-3">Sin resultados</p>
          ) : (
            <ul className="divide-y">
              {res.map((p) => <AutorizacionImagenRow key={p.id} player={p} onChanged={onChanged} />)}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}