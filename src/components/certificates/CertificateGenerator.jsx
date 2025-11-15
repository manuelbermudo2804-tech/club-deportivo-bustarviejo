import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, CheckCircle2, Award } from "lucide-react";
import jsPDF from "jspdf";
import QRCode from "qrcode";

export default function CertificateGenerator({ certificate }) {
  const generatePDF = async () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Fondo
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, 210, 297, 'F');

    // Borde decorativo
    pdf.setDrawColor(234, 88, 12);
    pdf.setLineWidth(3);
    pdf.rect(10, 10, 190, 277);
    pdf.setLineWidth(1);
    pdf.rect(15, 15, 180, 267);

    // Logo (simulado)
    pdf.setFillColor(234, 88, 12);
    pdf.circle(105, 40, 15, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.text('CD', 105, 43, { align: 'center' });

    // Título
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(32);
    pdf.setFont(undefined, 'bold');
    pdf.text('CERTIFICADO', 105, 70, { align: 'center' });

    pdf.setFontSize(24);
    pdf.text(`DE ${certificate.tipo_certificado.toUpperCase()}`, 105, 80, { align: 'center' });

    // Línea decorativa
    pdf.setDrawColor(234, 88, 12);
    pdf.setLineWidth(0.5);
    pdf.line(40, 90, 170, 90);

    // Club
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.text('CD BUSTARVIEJO', 105, 105, { align: 'center' });

    // Contenido
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'normal');
    
    const mensaje = certificate.datos_certificado?.mensaje || '';
    const lines = pdf.splitTextToSize(mensaje, 160);
    let yPos = 130;
    
    lines.forEach(line => {
      pdf.text(line, 105, yPos, { align: 'center' });
      yPos += 7;
    });

    // Datos adicionales
    if (certificate.tipo_certificado === "Pagos al Día") {
      yPos += 10;
      pdf.setFontSize(12);
      pdf.text(`Total Pagado: ${certificate.datos_certificado.total_pagado}€`, 105, yPos, { align: 'center' });
    } else if (certificate.tipo_certificado === "Asistencia") {
      yPos += 10;
      pdf.setFontSize(12);
      pdf.text(`Sesiones: ${certificate.datos_certificado.asistencias}/${certificate.datos_certificado.sesiones_totales}`, 105, yPos, { align: 'center' });
    }

    // Datos jugador
    yPos += 20;
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.text(certificate.jugador_nombre, 105, yPos, { align: 'center' });
    
    yPos += 7;
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'normal');
    pdf.text(certificate.categoria, 105, yPos, { align: 'center' });

    // Fecha y firma
    yPos = 240;
    pdf.setFontSize(11);
    const fecha = new Date(certificate.fecha_emision).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    pdf.text(`Expedido en Bustarviejo, ${fecha}`, 105, yPos, { align: 'center' });

    // Código de verificación
    yPos += 15;
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Código de verificación: ${certificate.codigo_verificacion}`, 105, yPos, { align: 'center' });

    // QR Code
    const qrDataUrl = await QRCode.toDataURL(certificate.codigo_verificacion);
    pdf.addImage(qrDataUrl, 'PNG', 170, 255, 25, 25);

    // Sello
    pdf.setDrawColor(234, 88, 12);
    pdf.setFillColor(255, 237, 213);
    pdf.circle(40, 265, 12, 'FD');
    pdf.setTextColor(234, 88, 12);
    pdf.setFontSize(8);
    pdf.text('SELLO', 40, 263, { align: 'center' });
    pdf.text('OFICIAL', 40, 268, { align: 'center' });

    pdf.save(`certificado_${certificate.tipo_certificado}_${certificate.jugador_nombre}.pdf`);
  };

  const iconMap = {
    "Inscripción": FileText,
    "Pagos al Día": CheckCircle2,
    "Asistencia": Award
  };

  const colorMap = {
    "Inscripción": "bg-blue-100 text-blue-700",
    "Pagos al Día": "bg-green-100 text-green-700",
    "Asistencia": "bg-orange-100 text-orange-700"
  };

  const Icon = iconMap[certificate.tipo_certificado] || FileText;

  return (
    <Card className="border-2 border-orange-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${colorMap[certificate.tipo_certificado]}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">{certificate.tipo_certificado}</h3>
              <p className="text-sm text-slate-600">{certificate.jugador_nombre}</p>
              <p className="text-xs text-slate-500">
                {new Date(certificate.fecha_emision).toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-green-500 text-white">Válido</Badge>
            <Button
              onClick={generatePDF}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}