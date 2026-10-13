import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DirectorioFiltros({ origenes = [], activo, onChange, consent, onConsentChange }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(280px,1.3fr)]">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Procedencia</p>
        <Select value={activo} onValueChange={onChange}>
          <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-slate-50">
            <SelectValue placeholder="Todas las procedencias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las procedencias</SelectItem>
            {origenes.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Consentimiento comercial</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="rounded-lg" variant={consent === "todos" ? "default" : "outline"} onClick={() => onConsentChange("todos")}>
            Todos
          </Button>
          <Button size="sm" className="rounded-lg" variant={consent === "si" ? "default" : "outline"} onClick={() => onConsentChange("si")}>
            Con consentimiento
          </Button>
          <Button size="sm" className="rounded-lg" variant={consent === "no" ? "default" : "outline"} onClick={() => onConsentChange("no")}>
            Sin consentimiento
          </Button>
        </div>
      </div>
    </div>
  );
}