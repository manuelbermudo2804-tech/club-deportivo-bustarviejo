import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageCircle, HelpCircle, CreditCard, Users, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContactCard() {
  const emailSubjects = [
    { icon: HelpCircle, label: "Consulta General", subject: "Consulta General" },
    { icon: CreditCard, label: "Pagos y Cuotas", subject: "Consulta sobre Pagos" },
    { icon: Users, label: "Inscripciones", subject: "Consulta sobre Inscripciones" },
    { icon: AlertTriangle, label: "Incidencia", subject: "Reportar Incidencia" },
  ];

  return (
    <Card className="border border-orange-200 shadow-md bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="w-4 h-4 flex-shrink-0" />
          <p className="font-bold text-sm">¿Necesitas ayuda?</p>
        </div>
        
        <a 
          href="mailto:info@cdbustarviejo.com"
          className="flex items-center justify-center gap-2 bg-white text-orange-700 hover:bg-orange-50 transition-colors font-bold text-sm py-2 px-3 rounded-lg shadow w-full mb-2"
        >
          <Mail className="w-4 h-4" />
          info@cdbustarviejo.com
        </a>

        <div className="grid grid-cols-4 gap-1.5">
          {emailSubjects.map((item) => (
            <a
              key={item.label}
              href={`mailto:info@cdbustarviejo.com?subject=${encodeURIComponent(item.subject)}`}
              className="flex flex-col items-center gap-1 bg-white/15 hover:bg-white/25 transition-colors rounded-lg p-1.5 text-center"
            >
              <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[9px] font-medium leading-tight">{item.label}</span>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}