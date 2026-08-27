import React from "react";
import DashboardButtonCard from "@/components/dashboard/DashboardButtonCard";

export default function PanelAccesos({ secciones = [] }) {
  return (
    <div className="space-y-5">
      {secciones.map((sec) => (
        <div key={sec.titulo} className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className={`font-bold text-sm uppercase tracking-wide ${sec.color}`}>{sec.titulo}</h2>
            <div className="flex-1 h-px bg-slate-700" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {sec.items.map((item) => (
              <DashboardButtonCard
                key={item.id}
                item={item}
                isExternal={typeof item.url === "string" && item.url.startsWith("http")}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}