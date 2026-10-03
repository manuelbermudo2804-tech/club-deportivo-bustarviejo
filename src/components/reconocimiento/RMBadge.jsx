import React from "react";
import { Stethoscope } from "lucide-react";
import useReconocimientos from "@/hooks/useReconocimientos";
import { estadoRM } from "@/lib/reconocimiento";

export default function RMBadge({ playerId, className = "" }) {
  const { byJugador, isLoading } = useReconocimientos();
  if (isLoading) return null;
  const rm = byJugador[playerId];
  if (!rm) return null;
  const e = estadoRM(rm.fecha_vencimiento);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${e.cls} ${className}`}>
      <Stethoscope className="w-3 h-3" /> {e.label}
    </span>
  );
}