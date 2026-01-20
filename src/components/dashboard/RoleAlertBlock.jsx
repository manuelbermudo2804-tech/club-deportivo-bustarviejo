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
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${c.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
          {typeof icon === "string" ? (
            <span className="text-white text-lg">{icon}</span>
          ) : (
            icon
          )}
        </div>
        <div>
          <h3 className={`font-bold ${c.title}`}>{title}</h3>
          {subtitle && <p className={`text-xs ${c.subtitle}`}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}