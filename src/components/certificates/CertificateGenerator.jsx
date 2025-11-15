import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, CheckCircle2, Award, Printer } from "lucide-react";

export default function CertificateGenerator({ certificate }) {
  const generateHTML = () => {
    const fecha = new Date(certificate.fecha_emision).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificado ${certificate.tipo_certificado}</title>
  <style>
    @page { size: A4; margin: 0; }
    body { margin: 0; padding: 40px; font-family: Arial, sans-serif; }
    .certificate { width: 100%; max-width: 800px; margin: 0 auto; border: 8px solid #ea580c; padding: 60px; background: white; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { width: 120px; height: 120px; margin: 0 auto 20px; background: #ea580c; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 48px; font-weight: bold; }
    .title { font-size: 48px; font-weight: bold; color: #0f172a; margin: 20px 0; }
    .subtitle { font-size: 32px; color: #ea580c; margin: 10px 0; }
    .divider { height: 2px; background: #ea580c; margin: 30px 0; }
    .club-name { font-size: 24px; font-weight: bold; margin: 30px 0; }
    .content { font-size: 18px; line-height: 1.8; text-align: center; margin: 40px 0; }
    .player-name { font-size: 28px; font-weight: bold; color: #ea580c; margin: 20px 0; }
    .category { font-size: 16px; color: #64748b; margin: 10px 0; }
    .footer { margin-top: 60px; text-align: center; font-size: 14px; color: #64748b; }
    .seal { display: inline-block; border: 3px solid #ea580c; border-radius: 50%; padding: 20px; margin: 20px; }
    .verification { font-size: 12px; color: #94a3b8; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logo">CD</div>
      <div class="title">CERTIFICADO</div>
      <div class="subtitle">DE ${certificate.tipo_certificado.toUpperCase()}</div>
    </div>
    <div class="divider"></div>
    <div class="club-name">CD BUSTARVIEJO</div>
    <div class="content">
      ${certificate.datos_certificado?.mensaje || ''}
    </div>
    <div class="player-name">${certificate.jugador_nombre}</div>
    <div class="category">${certificate.categoria}</div>
    <div class="footer">
      <p>Expedido en Bustarviejo, ${fecha}</p>
      <div class="seal">SELLO OFICIAL</div>
      <div class="verification">Código de verificación: ${certificate.codigo_verificacion}</div>
    </div>
  </div>
</body>
</html>`;
  };

  const printCertificate = () => {
    const html = generateHTML();
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const downloadHTML = () => {
    const html = generateHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificado_${certificate.tipo_certificado}_${certificate.jugador_nombre}.html`;
    a.click();
    window.URL.revokeObjectURL(url);
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
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500 text-white">Válido</Badge>
            <Button
              onClick={printCertificate}
              variant="outline"
              size="sm"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button
              onClick={downloadHTML}
              className="bg-orange-600 hover:bg-orange-700"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}