import React from "react";

const COLOR_MAP = {
  blue: {
    iconBg: "from-blue-600 to-blue-700",
    title: "text-blue-900",
    subtitle: "text-blue-700",
  },
  cyan: {
    iconBg: "from-cyan-600 to-cyan-700",
    title: "text-cyan-900",
    subtitle: "text-cyan-700",
  },
  green: {
    iconBg: "from-green-600 to-green-700",
    title: "text-green-900",
    subtitle: "text-green-700",
  },
  orange: {
    iconBg: "from-orange-600 to-orange-700",
    title: "text-orange-900",
    subtitle: "text-orange-700",
  },
};

export default function RoleAlertBlock({ color = "blue", icon, title, subtitle, children }) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;
  return (
    <div className="p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 bg-gradient-to-br ${c.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          {typeof icon === "string" ? (
            <span className="text-white text-sm">{icon}</span>
          ) : (
            icon
          )}
        </div>
        <div>
          <h3 className={`font-bold text-sm ${c.title}`}>{title}</h3>
          {subtitle && <p className={`text-[10px] ${c.subtitle}`}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}