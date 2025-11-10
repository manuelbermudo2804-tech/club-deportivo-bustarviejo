import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactCard() {
  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-orange-700 text-white">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Mail className="w-6 h-6" />
          Contacto del Club
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-100 mb-1">Email</p>
              <a 
                href="mailto:C.D.BUSTARVIEJO@HOTMAIL.ES"
                className="text-white hover:text-orange-100 transition-colors font-medium text-lg break-all"
              >
                C.D.BUSTARVIEJO@HOTMAIL.ES
              </a>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-orange-100 pt-2 border-t border-white/20">
          <p>Para cualquier consulta sobre pagos, jugadores o actividades del club, no dudes en contactarnos.</p>
        </div>
      </CardContent>
    </Card>
  );
}