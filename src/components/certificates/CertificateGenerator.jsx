import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, CheckCircle2, Award } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

const CLUB_LOGO_URL = "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png";

export default function CertificateGenerator({ certificate }) {
  const handleDownload = async () => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(244, 114, 24); // Orange
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(26);
      doc.text("CD BUSTARVIEJO", 105, 20, { align: "center" });
      doc.setFontSize(14);
      doc.text("Club Deportivo Bustarviejo", 105, 30, { align: "center" });
      
      // Certificate Type
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(20);
      doc.text(`CERTIFICADO DE ${certificate.tipo_certificado.toUpperCase()}`, 105, 60, { align: "center" });
      
      // Body
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      
      const startY = 80;
      const lineHeight = 10;
      let currentY = startY;
      
      doc.text("El Club Deportivo Bustarviejo certifica que:", 20, currentY);
      currentY += lineHeight * 2;
      
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(certificate.jugador_nombre, 105, currentY, { align: "center" });
      currentY += lineHeight * 1.5;
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      
      // Custom message based on type
      const mensaje = certificate.datos_certificado?.mensaje || "";
      const splitMsg = doc.splitTextToSize(mensaje, 170);
      doc.text(splitMsg, 20, currentY);
      currentY += (splitMsg.length * lineHeight) + lineHeight;
      
      // Additional details
      if (certificate.tipo_certificado === "Pagos al Día" && certificate.datos_certificado) {
        doc.text(`Pagos realizados: ${certificate.datos_certificado.pagos_realizados}`, 20, currentY);
        currentY += lineHeight;
        doc.text(`Total pagado: ${certificate.datos_certificado.total_pagado}€`, 20, currentY);
        currentY += lineHeight;
      } else if (certificate.tipo_certificado === "Asistencia" && certificate.datos_certificado) {
        doc.text(`Sesiones totales: ${certificate.datos_certificado.sesiones_totales}`, 20, currentY);
        currentY += lineHeight;
        doc.text(`Asistencias: ${certificate.datos_certificado.asistencias}`, 20, currentY);
        currentY += lineHeight;
        doc.text(`Porcentaje: ${certificate.datos_certificado.porcentaje_asistencia}%`, 20, currentY);
        currentY += lineHeight;
      }
      
      currentY += lineHeight;
      doc.text(`Categoría: ${certificate.categoria}`, 20, currentY);
      currentY += lineHeight;
      doc.text(`Temporada: ${certificate.temporada}`, 20, currentY);
      
      // Footer
      currentY = 240;
      doc.setFontSize(10);
      doc.text(`Fecha de emisión: ${format(new Date(certificate.fecha_emision), "dd 'de' MMMM 'de' yyyy", { locale: es })}`, 20, currentY);
      currentY += lineHeight / 2;
      doc.text(`Código de verificación: ${certificate.codigo_verificacion}`, 20, currentY);
      
      // Signature area
      currentY += lineHeight * 2;
      doc.setDrawColor(0);
      doc.line(130, currentY, 190, currentY);
      currentY += 5;
      doc.setFontSize(9);
      doc.text("Firma y sello del club", 160, currentY, { align: "center" });
      
      // Footer bar
      doc.setFillColor(244, 114, 24);
      doc.rect(0, 285, 210, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text("CD Bustarviejo | Bustarviejo, Madrid | CDBUSTARVIEJO@GMAIL.COM", 105, 292, { align: "center" });
      
      // Save
      doc.save(`certificado-${certificate.tipo_certificado}-${certificate.jugador_nombre}.pdf`);
      toast.success("✅ Certificado descargado");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    }
  };

  const typeIcons = {
    "Inscripción": FileText,
    "Pagos al Día": CheckCircle2,
    "Asistencia": Award
  };

  const typeColors = {
    "Inscripción": "bg-blue-100 text-blue-700",
    "Pagos al Día": "bg-green-100 text-green-700",
    "Asistencia": "bg-orange-100 text-orange-700"
  };

  const Icon = typeIcons[certificate.tipo_certificado];

  return (
    <Card className="border-2 border-slate-200 hover:border-orange-300 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-12 h-12 rounded-xl ${typeColors[certificate.tipo_certificado]} flex items-center justify-center`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-slate-900">{certificate.tipo_certificado}</h3>
              <p className="text-sm text-slate-600 mb-2">{certificate.jugador_nombre}</p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <Badge variant="outline">{certificate.temporada}</Badge>
                <Badge variant="outline">{certificate.categoria}</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Emitido: {format(new Date(certificate.fecha_emision), "dd MMM yyyy", { locale: es })}
              </p>
            </div>
          </div>
          <Button
            onClick={handleDownload}
            className="bg-orange-600 hover:bg-orange-700 flex-shrink-0"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}