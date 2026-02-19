import React from "react";
import DashboardButtonCard from "./DashboardButtonCard";

/**
 * Renders dashboard buttons split into two visual sections (role vs club/family).
 * 
 * Props:
 *  - buttons: array of button objects (must have .section field)
 *  - roleSection: key to match for the "role" group (e.g. "coach", "treasurer")
 *  - roleSectionLabel: label shown above role buttons (e.g. "🏋️ Entrenador")
 *  - clubSectionLabel: label shown above club buttons (e.g. "👨‍👩‍👧 Club y Familia")
 *  - badgeMap: optional object { buttonId: { value, label } } for extra badges
 */
export default function SectionedButtonGrid({
  buttons = [],
  roleSection = "coach",
  roleSectionLabel = "🏋️ Entrenador",
  clubSectionLabel = "👨‍👩‍👧 Club y Familia",
  badgeMap = {},
}) {
  const roleButtons = buttons.filter(b => b.section === roleSection);
  const clubButtons = buttons.filter(b => b.section === "club");

  return (
    <div className="space-y-4">
      {/* Role section */}
      {roleButtons.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1 bg-blue-500/30" />
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider whitespace-nowrap">
              {roleSectionLabel}
            </span>
            <div className="h-px flex-1 bg-blue-500/30" />
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-4 stagger-animation">
            {roleButtons.map((item, i) => (
              <DashboardButtonCard
                key={item.id || i}
                item={item}
                extraBadge={badgeMap[item.id] || null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Club / Family section */}
      {clubButtons.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1 bg-orange-500/30" />
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider whitespace-nowrap">
              {clubSectionLabel}
            </span>
            <div className="h-px flex-1 bg-orange-500/30" />
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-4 stagger-animation">
            {clubButtons.map((item, i) => (
              <DashboardButtonCard
                key={item.id || i}
                item={item}
                extraBadge={badgeMap[item.id] || null}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}