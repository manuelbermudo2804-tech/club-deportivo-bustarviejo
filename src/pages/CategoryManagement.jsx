import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Redirección a la nueva página unificada
export default function CategoryManagement() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate(createPageUrl("FinancialConfiguration"), { replace: true });
  }, [navigate]);
  
  return null;
}