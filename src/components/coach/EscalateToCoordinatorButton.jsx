import React from "react";
import { Shield } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function EscalateToCoordinatorButton({ isCoach = false }) {
  if (isCoach) return null;

  return (
    <button
      onClick={() => { window.location.href = createPageUrl("ParentCoordinatorChat"); }}
      title="Hablar con el coordinador"
      className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-white/20 text-white"
    >
      <Shield className="w-4 h-4" />
    </button>
  );
}