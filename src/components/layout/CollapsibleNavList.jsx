import React, { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, X } from "lucide-react";

/**
 * Renders navigation items grouped into collapsible sections, with a search box.
 * Used for the admin sidebar to tame the ~50-item menu.
 * Items before the first `section: true` entry render as fixed (always visible) top items.
 * Pure presentation — no business logic, same item shape as the flat list.
 */
export default function CollapsibleNavList({ navigationItems }) {
  const location = useLocation();
  const [query, setQuery] = useState("");

  // Split items into: fixed top items (before first section) + grouped sections
  const { topItems, sections } = useMemo(() => {
    const top = [];
    const groups = [];
    let current = null;
    for (const item of navigationItems) {
      if (item.section) {
        current = { title: item.title, items: [] };
        groups.push(current);
      } else if (current) {
        current.items.push(item);
      } else {
        top.push(item);
      }
    }
    return { topItems: top, sections: groups };
  }, [navigationItems]);

  // Open/closed state per section title. All start collapsed.
  const [openMap, setOpenMap] = useState({});
  const toggle = (title) => setOpenMap((m) => ({ ...m, [title]: !m[title] }));

  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;

  // When searching, auto-expand sections that have matches
  const sectionMatches = (items) => items.filter((it) => it.title.toLowerCase().includes(q));

  const renderItem = (item) => {
    const active = location.pathname === item.url;
    const content = (
      <>
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span className="font-semibold flex-1 text-center">{item.title}</span>
        {item.badge && (
          <Badge className={`${item.urgentBadge ? 'bg-red-500 text-white animate-pulse ring-2 ring-green-400' : 'bg-green-500 text-white'}`}>
            {item.urgentBadge && '🔴'} {item.badge}
          </Badge>
        )}
      </>
    );
    const cls = `flex items-center justify-center gap-4 p-4 rounded-2xl transition-all group ${item.highlight ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-600/50 ring-2 ring-green-400 animate-pulse' : active ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-600/50' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`;
    return item.externalUrl ? (
      <a key={item.title} href={item.externalUrl} target="_blank" rel="noopener noreferrer" className={cls}>{content}</a>
    ) : (
      <Link key={item.title} to={item.url} className={cls}>{content}</Link>
    );
  };

  return (
    <div className="space-y-2">
      {/* Buscador */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en el menú…"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/10 text-white placeholder-slate-400 text-sm border border-slate-600 focus:border-green-500 focus:outline-none"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Items fijos (Inicio, Asistente Virtual...) — siempre visibles, también filtran al buscar */}
      {topItems
        .filter((it) => !isSearching || it.title.toLowerCase().includes(q))
        .map(renderItem)}

      {/* Secciones colapsables */}
      {sections.map((sec) => {
        const matches = isSearching ? sectionMatches(sec.items) : sec.items;
        if (isSearching && matches.length === 0) return null;
        const open = isSearching || !!openMap[sec.title];
        const cleanTitle = sec.title.replace(/─/g, "").trim();
        return (
          <div key={sec.title} className="border-t border-slate-700/50 pt-1">
            <button
              onClick={() => toggle(sec.title)}
              className="w-full flex items-center justify-between px-2 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white transition-colors"
            >
              <span>{cleanTitle}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <div className="space-y-2 pb-2">{matches.map(renderItem)}</div>}
          </div>
        );
      })}

      {isSearching && topItems.filter((it) => it.title.toLowerCase().includes(q)).length === 0 &&
        sections.every((sec) => sectionMatches(sec.items).length === 0) && (
        <p className="text-center text-slate-400 text-sm py-6">Sin resultados para "{query}"</p>
      )}
    </div>
  );
}