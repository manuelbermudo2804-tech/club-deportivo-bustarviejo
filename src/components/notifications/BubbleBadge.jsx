import React from "react";

export default function BubbleBadge({ count, color = "red", position = "right", onClick, title }) {
  if (!count || count <= 0) return null;
  const colorClasses = {
    red: "bg-red-600",
    blue: "bg-blue-600",
    green: "bg-green-600",
    purple: "bg-purple-600",
    orange: "bg-orange-600",
    slate: "bg-slate-700",
  };
  const side = position === "left" ? "left-2" : "right-2";
  return (
    <button
      title={title}
      onClick={onClick}
      className={`absolute top-3 ${side} z-20 min-w-[22px] h-[22px] px-1.5 rounded-full ${colorClasses[color] || colorClasses.red} text-white text-xs font-bold shadow-glow-orange flex items-center justify-center`}
      style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,.25))" }}
    >
      {count > 99 ? '99+' : count}
    </button>
  );
}