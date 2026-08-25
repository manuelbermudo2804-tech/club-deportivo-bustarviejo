import React from "react";
import { Search } from "lucide-react";

export default function ContentTypeSearch({ value, onChange }) {
  return (
    <div className="relative">
      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar qué publicar (lotería, resultados, socios...)"
        className="w-full pl-9 pr-3 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
      />
    </div>
  );
}