import React from "react";
import { CONTENT_TYPES, GROUPS } from "./contentTypes";

export default function ContentTypeGrid({ onSelect }) {
  return (
    <div className="space-y-4">
      {GROUPS.map(group => {
        const items = CONTENT_TYPES.filter(t => t.group === group.id);
        if (!items.length) return null;
        return (
          <div key={group.id}>
            <p className={`text-xs font-bold mb-2 ${group.color}`}>{group.label}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {items.map((type) => (
                <button
                  key={type.id}
                  onClick={() => onSelect(type.id)}
                  className={`bg-gradient-to-br ${type.gradient} rounded-2xl p-3 text-left text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.04] active:scale-95`}
                >
                  <type.icon className="w-5 h-5 mb-1 opacity-90" />
                  <p className="font-bold text-xs leading-tight">{type.title}</p>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}