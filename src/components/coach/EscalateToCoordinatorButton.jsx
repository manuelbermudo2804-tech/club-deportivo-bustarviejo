import React from "react";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function EscalateToCoordinatorButton({ 
  user, 
  categoria, 
  isCoach = false,
  recentMessages = [] 
}) {
  // Simple redirect button for parents to contact coordinator
  const handleClick = () => {
    window.location.href = createPageUrl("ParentCoordinatorChat");
  };

  // No escalation button for coaches anymore
  if (isCoach) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="border-orange-300 text-orange-700 hover:bg-orange-50 gap-2"
    >
      <Shield className="w-4 h-4" />
      ¿Necesitas ayuda del Coordinador?
    </Button>
  );
}