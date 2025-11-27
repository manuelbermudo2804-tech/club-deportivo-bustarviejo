import React from "react";
import { Input } from "@/components/ui/input";

/**
 * AutocompleteInput - Componente Input que maneja correctamente el autocompletado en móviles
 * El problema es que el autocompletado del navegador móvil no dispara onChange, solo cambia el valor
 * Este componente usa onBlur para capturar el valor después del autocompletado
 */
export default function AutocompleteInput({ 
  value, 
  onChange, 
  onBlur,
  autoComplete,
  name,
  ...props 
}) {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  const handleBlur = (e) => {
    // Capturar el valor del autocompletado al perder foco
    if (onChange && e.target.value !== value) {
      onChange(e);
    }
    if (onBlur) {
      onBlur(e);
    }
  };

  return (
    <Input
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      autoComplete={autoComplete}
      name={name}
      {...props}
    />
  );
}