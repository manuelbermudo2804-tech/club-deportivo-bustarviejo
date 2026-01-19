import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useStaffCounters, useCoachCounters, useCoordinatorCounters, useFamilyCounters, usePrivateCounters, useAdminCounters } from "../chats/useChatCounters";
import { MessageCircle, ShieldAlert, Users, Briefcase } from "lucide-react";

const Chip = ({ label, count, color, onClick }) => {
  if (!count || count <= 0) return null;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white ${color} shadow-elegant btn-press`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
      {label}
      <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded-full bg-white/15">{count > 99 ? '99+' : count}</span>
    </button>
  );
};

export default function PendingTasksBar({ notifications }) {
  const navigate = useNavigate();
  const role = notifications?.role;
  const isCoordinator = notifications?.isCoordinator;
  const isCoach = notifications?.isCoach;

  // Counters independientes por chat
  const { total: staffTotal } = useStaffCounters({ refetchOnFocus: true });
  const { total: coachTotal } = useCoachCounters({ refetchOnFocus: true });
  const { total: coordTotal } = useCoordinatorCounters({ refetchOnFocus: true });
  const { total: familyTotal } = useFamilyCounters({ refetchOnFocus: true });
  const { total: privateTotal } = usePrivateCounters({ refetchOnFocus: true });
  const { total: adminTotal } = useAdminCounters({ refetchOnFocus: true });

  const total = coordTotal + coachTotal + staffTotal + adminTotal + privateTotal + familyTotal;
  const shouldShow = total > 0 || (role === 'admin' || isCoordinator || isCoach);
  if (!shouldShow) return null;

  return (
    <div className="sticky top-[52px] lg:top-0 z-30 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200/70">
      <div className="max-w-6xl mx-auto px-3 py-2 flex flex-wrap gap-2 items-center">
        <span className="text-[11px] font-bold text-slate-600 mr-2">Tareas pendientes</span>
        <Chip
          label="Coord."
          count={coordTotal}
          color="bg-blue-600"
          onClick={() => navigate(createPageUrl('FamilyChats'))}
        />
        <Chip
          label="Entrenador"
          count={coachTotal}
          color="bg-red-600"
          onClick={() => navigate(createPageUrl('CoachParentChat'))}
        />
        <Chip
          label="Staff"
          count={staffTotal}
          color="bg-purple-600"
          onClick={() => navigate(createPageUrl('StaffChat'))}
        />
        <Chip
          label="Administrador"
          count={n.unreadAdminMessages}
          color="bg-orange-600"
          onClick={() => navigate(createPageUrl('ParentAdminChat'))}
        />
        <Chip
          label="Privados"
          count={n.unreadPrivateMessages}
          color="bg-slate-700"
          onClick={() => navigate(createPageUrl('DirectMessages'))}
        />
      </div>
    </div>
  );
}