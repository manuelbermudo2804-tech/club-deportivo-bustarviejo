import React from "react";
import DashboardCanvas from "./DashboardCanvas";
import { adminWidgetRegistry, getAdminDefaultWidgets } from "./WidgetRegistry";

export default function AdminWidgetDashboard() {
  return (
    <div className="space-y-3">
      <DashboardCanvas registry={adminWidgetRegistry} getDefaultWidgets={getAdminDefaultWidgets} />
    </div>
  );
}