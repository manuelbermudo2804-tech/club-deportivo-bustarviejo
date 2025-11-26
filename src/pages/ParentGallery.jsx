import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Redirección a la nueva página unificada de Galería
export default function ParentGallery() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate(createPageUrl("Gallery"), { replace: true });
  }, [navigate]);
  
  return null;
}