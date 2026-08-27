import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { getPanelTabs, isMultiPanelUser } from "@/lib/multiPanelUsers";
import useRolePanel from "@/hooks/useRolePanel";
import RolePanelTabs from "@/components/panels/RolePanelTabs";
import CoordinatorDashboard from "./CoordinatorDashboard";
import CoachDashboard from "./CoachDashboard";
import ParentDashboard from "./ParentDashboard";

export default function MiPanel() {
  const [user, setUser] = useState(null);
  const [panel, setPanel] = useRolePanel();

  useEffect(() => {
    base44.auth.me().then((u) => {
      if (!isMultiPanelUser(u?.email)) {
        window.location.href = createPageUrl("Home");
        return;
      }
      setUser(u);
      const tabs = getPanelTabs(u);
      if (!tabs.includes(panel)) setPanel(tabs[0]);
    });
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
      </div>
    );
  }

  const tabs = getPanelTabs(user);
  const active = tabs.includes(panel) ? panel : tabs[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <RolePanelTabs tabs={tabs} value={active} onChange={setPanel} />
      {active === "coordinador" && <CoordinatorDashboard embedded />}
      {active === "entrenador" && <CoachDashboard embedded />}
      {active === "familia" && <ParentDashboard embedded />}
    </div>
  );
}