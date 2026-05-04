import React from "react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Componente reutilizable para estados vacíos.
 * Muestra un icono, título y mensaje cálido y útil.
 *
 * Props:
 * - icon: componente lucide-react (ej: Trophy, FileText)
 * - emoji: alternativa al icono (ej: "📢")
 * - title: título principal (corto)
 * - message: mensaje explicativo (cálido, útil)
 * - action: nodo opcional (ej: <Button>...</Button>)
 * - variant: "card" (default) | "plain"
 */
export default function EmptyState({ icon: Icon, emoji, title, message, action, variant = "card" }) {
  const content = (
    <div className="text-center py-10 px-4">
      {emoji ? (
        <div className="text-5xl mb-3">{emoji}</div>
      ) : Icon ? (
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center">
          <Icon className="w-8 h-8 text-orange-400" />
        </div>
      ) : null}
      {title && (
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      )}
      {message && (
        <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">{message}</p>
      )}
      {action && (
        <div className="mt-4 flex justify-center">{action}</div>
      )}
    </div>
  );

  if (variant === "plain") return content;

  return (
    <Card className="border-none shadow-lg bg-white">
      <CardContent className="p-0">{content}</CardContent>
    </Card>
  );
}