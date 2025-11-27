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
    <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-orange-700 text-white">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <MessageCircle className="w-6 h-6" />
          ¿Necesitas ayuda? Contacta con el Club
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <p className="text-sm text-orange-100 mb-3">
            📧 Para cualquier consulta, duda o incidencia, escríbenos directamente:
          </p>
          
          <a 
            href="mailto:CDBUSTARVIEJO@GMAIL.COM"
            className="flex items-center justify-center gap-2 bg-white text-orange-700 hover:bg-orange-50 transition-colors font-bold text-lg py-3 px-4 rounded-lg shadow-lg w-full"
          >
            <Mail className="w-5 h-5" />
            CDBUSTARVIEJO@GMAIL.COM
          </a>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <p className="text-xs text-orange-100 mb-3">Accesos rápidos por tema:</p>
          <div className="grid grid-cols-2 gap-2">
            {emailSubjects.map((item) => (
              <a
                key={item.label}
                href={`mailto:CDBUSTARVIEJO@GMAIL.COM?subject=${encodeURIComponent(item.subject)}`}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-lg p-2 text-xs font-medium"
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </a>
            ))}
          </div>
        </div>
        
        <div className="text-xs text-orange-100 pt-2 border-t border-white/20 text-center">
          <p>📞 Respondemos en menos de 24-48 horas</p>
        </div>
      </CardContent>
    </Card>
  );
}