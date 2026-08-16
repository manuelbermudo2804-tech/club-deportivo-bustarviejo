import React from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export default function ConectaBuscador({ value, onChange }) {
  return (
    <div className="relative flex-1 min-w-[180px] max-w-xs">
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar por nombre..."
        className="pl-9 pr-8"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}