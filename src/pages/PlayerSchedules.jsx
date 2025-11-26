import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Redirección a la nueva página unificada de Horarios
export default function PlayerSchedules() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate(createPageUrl("Schedules"), { replace: true });
  }, [navigate]);
  
  return null;
}