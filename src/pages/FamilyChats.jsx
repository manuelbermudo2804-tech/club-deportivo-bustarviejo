import React, { useState, useEffect, lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import FamilyChatsWithTabs from "../components/messaging/FamilyChatsWithTabs";

const CoordinatorChat = lazy(() => import("./CoordinatorChat"));
const CoachParentChat = lazy(() => import("./CoachParentChat"));

export default function FamilyChats() {
  const [user, setUser] = useState(null);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [isCoach, setIsCoach] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsCoordinator(currentUser.es_coordinador === true);
      setIsCoach(currentUser.es_entrenador === true);
    };
    fetchUser();
  }, []);

  if (!user) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <FamilyChatsWithTabs 
        isCoordinator={isCoordinator}
        isCoach={isCoach}
        CoordinatorChatPage={CoordinatorChat}
        CoachParentChatPage={CoachParentChat}
      />
    </Suspense>
  );
}