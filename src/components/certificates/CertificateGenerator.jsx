import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, CheckCircle2, Award, Printer } from "lucide-react";

export default function CertificateGenerator({ certificate }) {
  const printCertificate = () => {
    const printContent = document.getElementById(`cert-${certificate.id}`);
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Certificado - ${certificate.jugador_nombre}</title>
          <style>
            @page { 
              size: A4;
              margin: 0;
            }
            body { 
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }
            @media print {
              body { 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
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
    <>
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
                onClick={printCertificate}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificado oculto para imprimir */}
      <div id={`cert-${certificate.id}`} className="hidden">
        <div style={{
          width: '210mm',
          height: '297mm',
          padding: '20mm',
          backgroundColor: 'white',
          fontFamily: 'Arial, sans-serif'
        }}>
          {/* Borde */}
          <div style={{
            border: '3px solid #ea580c',
            padding: '15mm',
            height: '257mm',
            position: 'relative'
          }}>
            <div style={{
              border: '1px solid #ea580c',
              padding: '10mm',
              height: '237mm',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              {/* Logo */}
              <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '32px',
                  fontWeight: 'bold'
                }}>
                  CD
                </div>
              </div>

              {/* Título */}
              <h1 style={{ 
                fontSize: '48px', 
                fontWeight: 'bold', 
                margin: '20px 0 10px',
                textAlign: 'center'
              }}>
                CERTIFICADO
              </h1>
              <h2 style={{ 
                fontSize: '32px', 
                margin: '0 0 30px',
                textAlign: 'center'
              }}>
                DE {certificate.tipo_certificado.toUpperCase()}
              </h2>

              {/* Línea decorativa */}
              <div style={{
                width: '60%',
                height: '2px',
                backgroundColor: '#ea580c',
                margin: '20px 0'
              }}></div>

              {/* Club */}
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold',
                margin: '20px 0',
                textAlign: 'center'
              }}>
                CD BUSTARVIEJO
              </h3>

              {/* Mensaje */}
              <p style={{
                fontSize: '18px',
                lineHeight: '1.8',
                textAlign: 'center',
                margin: '30px 0',
                maxWidth: '80%'
              }}>
                {certificate.datos_certificado?.mensaje}
              </p>

              {/* Datos adicionales */}
              {certificate.tipo_certificado === "Pagos al Día" && (
                <p style={{ fontSize: '16px', textAlign: 'center', margin: '10px 0' }}>
                  Total Pagado: {certificate.datos_certificado.total_pagado}€
                </p>
              )}
              {certificate.tipo_certificado === "Asistencia" && (
                <p style={{ fontSize: '16px', textAlign: 'center', margin: '10px 0' }}>
                  Sesiones: {certificate.datos_certificado.asistencias}/{certificate.datos_certificado.sesiones_totales}
                </p>
              )}

              {/* Jugador */}
              <div style={{ marginTop: '40px', textAlign: 'center' }}>
                <p style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold',
                  margin: '10px 0'
                }}>
                  {certificate.jugador_nombre}
                </p>
                <p style={{ fontSize: '16px', color: '#666' }}>
                  {certificate.categoria}
                </p>
              </div>

              {/* Fecha */}
              <div style={{ 
                position: 'absolute',
                bottom: '40px',
                left: '0',
                right: '0',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '14px', color: '#666' }}>
                  Expedido en Bustarviejo, {new Date(certificate.fecha_emision).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
                <p style={{ 
                  fontSize: '10px', 
                  color: '#999',
                  marginTop: '20px'
                }}>
                  Código de verificación: {certificate.codigo_verificacion}
                </p>
              </div>

              {/* Sello */}
              <div style={{
                position: 'absolute',
                bottom: '50px',
                left: '50px',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: '2px solid #ea580c',
                backgroundColor: '#fff5e6',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ea580c',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                <span>SELLO</span>
                <span>OFICIAL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}