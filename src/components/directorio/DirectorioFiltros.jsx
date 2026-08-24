import React from "react";
import { Button } from "@/components/ui/button";

export default function DirectorioFiltros({ origenes = [], activo, onChange, consent, onConsentChange }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={activo === "todos" ? "default" : "outline"} onClick={() => onChange("todos")}>
          Todos
        </Button>
        {origenes.map((o) => (
          <Button key={o} size="sm" variant={activo === o ? "default" : "outline"} onClick={() => onChange(o)}>
            {o}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={consent === "todos" ? "secondary" : "ghost"}
          onClick={() => onConsentChange("todos")}
        >
          Cualquier permiso
        </Button>
        <Button size="sm" variant={consent === "si" ? "secondary" : "ghost"} onClick={() => onConsentChange("si")}>
          Con consentimiento
        </Button>
        <Button size="sm" variant={consent === "no" ? "secondary" : "ghost"} onClick={() => onConsentChange("no")}>
          Sin consentimiento
        </Button>
      </div>
    </div>
  );
}