import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useStaffCounters, useCoachCounters, useCoordinatorCounters, useFamilyCounters, usePrivateCounters, useAdminCounters } from "../chats/useChatCounters";
import { MessageCircle, ShieldAlert, Users, Briefcase } from "lucide-react"; // icons kept for future use

const Chip = ({ label, count = 0, color, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white ${color} shadow-elegant btn-press opacity-95`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
      {label}
      <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded-full bg-white/15">{count > 99 ? '99+' : count}</span>
    </button>
  );
};

export default function PendingTasksBar({ notifications, forceShow = false }) {
  const navigate = useNavigate();
  const role = notifications?.role;
  const isCoordinator = notifications?.isCoordinator;
  const isCoach = notifications?.isCoach;

  console.log('🟢 [PendingTasksBar] Renderizando con:', { role, isCoordinator, isCoach });

  // Counters independientes por chat
  const { total: staffTotal } = useStaffCounters({ refetchOnFocus: false });
  const { total: coachTotal } = useCoachCounters({ refetchOnFocus: false });
  const { total: coordTotal } = useCoordinatorCounters({ refetchOnFocus: false });
  const { total: familyTotal } = useFamilyCounters({ refetchOnFocus: false });
  const { total: privateTotal } = usePrivateCounters({ refetchOnFocus: false });
  const { total: adminTotal } = useAdminCounters({ refetchOnFocus: false });

  console.log('🟢 [PendingTasksBar] Contadores:', { staffTotal, coachTotal, coordTotal, familyTotal, privateTotal, adminTotal });

  const total = coordTotal + coachTotal + staffTotal + adminTotal + privateTotal + familyTotal;
  
  // SIEMPRE mostrar para admin, coordinador y entrenador (aunque no haya mensajes)
  const shouldShow = (forceShow === true) || (role === 'admin' || isCoordinator === true || isCoach === true || total > 0);
  
  console.log('🟢 [PendingTasksBar] shouldShow:', shouldShow, 'total:', total);
  
  if (!shouldShow) return null;

  return (
    <div className="sticky top-[100px] lg:top-0 z-30 bg-gradient-to-r from-green-600 to-green-700 border-b border-green-700/50 text-white">
      <div className="max-w-6xl mx-auto px-3 py-2 flex flex-wrap gap-2 items-center">
        <span className="text-sm font-semibold mr-2">Tareas pendientes</span>
        <Chip
          label="Coord."
          count={coordTotal}
          color="bg-green-800/40"
          onClick={() => navigate(createPageUrl('FamilyChats'))}
        />
        <Chip
          label="Entrenador"
          count={coachTotal}
          color="bg-green-800/40"
          onClick={() => navigate(createPageUrl('CoachParentChat'))}
        />
        <Chip
          label="Staff"
          count={staffTotal}
          color="bg-green-800/40"
          onClick={() => navigate(createPageUrl('StaffChat'))}
        />
        <Chip
          label="Administrador"
          count={adminTotal}
          color="bg-green-800/40"
          onClick={() => navigate(createPageUrl('ParentAdminChat'))}
        />
        <Chip
          label="Privados"
          count={privateTotal}
          color="bg-green-800/40"
          onClick={() => navigate(createPageUrl('DirectMessages'))}
        />
      </div>
    </div>
  );
}