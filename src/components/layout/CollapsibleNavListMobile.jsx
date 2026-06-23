import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, X } from "lucide-react";

/**
 * Mobile version of the collapsible, searchable nav list (admin sidebar).
 * Matches the mobile menu styling (left-aligned items, closes on navigate).
 * Pure presentation — same item shape as the flat list.
 */
export default function CollapsibleNavListMobile({ navigationItems, location, onClose }) {
  const [query, setQuery] = useState("");

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

  const [openMap, setOpenMap] = useState({});
  const toggle = (title) => setOpenMap((m) => ({ ...m, [title]: !m[title] }));

  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;
  const sectionMatches = (items) => items.filter((it) => it.title.toLowerCase().includes(q));

  const renderItem = (item) => {
    const active = location.pathname === item.url;
    const content = (
      <>
        <item.icon className="w-6 h-6 flex-shrink-0" />
        <span className="font-semibold text-base flex-1">{item.title}</span>
        {item.badge && (
          <Badge className={`${item.urgentBadge ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}>{item.badge}</Badge>
        )}
      </>
    );
    const cls = `flex items-center gap-4 p-4 rounded-2xl transition-all ${item.highlight ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg ring-2 ring-green-400 animate-pulse' : active ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}`;
    return item.externalUrl ? (
      <a key={item.title} href={item.externalUrl} target="_blank" rel="noopener noreferrer" onClick={onClose} className={cls}>{content}</a>
    ) : (
      <Link key={item.title} to={item.url} onClick={onClose} className={cls}>{content}</Link>
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en el menú…"
          className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/10 text-white placeholder-slate-400 text-base border border-slate-600 focus:border-green-500 focus:outline-none"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {topItems
        .filter((it) => !isSearching || it.title.toLowerCase().includes(q))
        .map(renderItem)}

      {sections.map((sec) => {
        const matches = isSearching ? sectionMatches(sec.items) : sec.items;
        if (isSearching && matches.length === 0) return null;
        const open = isSearching || !!openMap[sec.title];
        const cleanTitle = sec.title.replace(/─/g, "").trim();
        return (
          <div key={sec.title} className="pt-1">
            <button
              onClick={() => toggle(sec.title)}
              className="w-full flex items-center justify-between px-2 py-3 text-xs font-semibold text-white/60 uppercase tracking-wider hover:text-white transition-colors"
            >
              <span>{cleanTitle}</span>
              <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <div className="space-y-2 pb-2">{matches.map(renderItem)}</div>}
          </div>
        );
      })}

      {isSearching && topItems.filter((it) => it.title.toLowerCase().includes(q)).length === 0 &&
        sections.every((sec) => sectionMatches(sec.items).length === 0) && (
        <p className="text-center text-slate-400 text-base py-6">Sin resultados para "{query}"</p>
      )}
    </div>
  );
}