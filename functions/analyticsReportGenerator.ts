import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import jsPDF from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { reportType = 'daily', format = 'pdf' } = await req.json();

    // Obtener datos
    const [alerts, payments, events, users] = await Promise.all([
      base44.asServiceRole.entities.SystemAlert.filter({ estado: 'activo' }),
      base44.asServiceRole.entities.Payment.list(),
      base44.asServiceRole.entities.AnalyticsEvent.list(),
      base44.asServiceRole.entities.User.list()
    ]);

    const reportData = {
      generatedAt: new Date().toLocaleString('es-ES'),
      period: reportType,
      criticalAlerts: alerts.filter(a => a.severidad === 'critical').length,
      highAlerts: alerts.filter(a => a.severidad === 'high').length,
      totalPayments: (payments || []).length,
      failedPayments: (payments || []).filter(p => p.estado === 'Anulado').length,
      pendingPayments: (payments || []).filter(p => p.estado === 'Pendiente').length,
      activeUsers: (users || []).length,
      totalEvents: (events || []).length,
      errorEvents: (events || []).filter(e => e.severidad === 'error').length
    };

    if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text('Reporte de Análisis del Sistema', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Generado: ${reportData.generatedAt}`, 20, 35);
      doc.text(`Período: ${reportType}`, 20, 45);

      doc.setFontSize(14);
      doc.text('Alertas', 20, 60);
      doc.setFontSize(11);
      doc.text(`Críticas: ${reportData.criticalAlerts}`, 25, 70);
      doc.text(`Altas: ${reportData.highAlerts}`, 25, 80);

      doc.setFontSize(14);
      doc.text('Pagos', 20, 100);
      doc.setFontSize(11);
      doc.text(`Total: ${reportData.totalPayments}`, 25, 110);
      doc.text(`Fallidos: ${reportData.failedPayments}`, 25, 120);
      doc.text(`Pendientes: ${reportData.pendingPayments}`, 25, 130);

      doc.setFontSize(14);
      doc.text('Sistema', 20, 150);
      doc.setFontSize(11);
      doc.text(`Usuarios: ${reportData.activeUsers}`, 25, 160);
      doc.text(`Eventos: ${reportData.totalEvents}`, 25, 170);
      doc.text(`Errores: ${reportData.errorEvents}`, 25, 180);

      const pdf = doc.output('arraybuffer');
      return new Response(pdf, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="analytics-${reportType}-${Date.now()}.pdf"`
        }
      });
    }

    // CSV
    const csv = `Reporte de Análisis
Generado,${reportData.generatedAt}
Período,${reportType}

Alertas
Críticas,${reportData.criticalAlerts}
Altas,${reportData.highAlerts}

Pagos
Total,${reportData.totalPayments}
Fallidos,${reportData.failedPayments}
Pendientes,${reportData.pendingPayments}

Sistema
Usuarios,${reportData.activeUsers}
Eventos,${reportData.totalEvents}
Errores,${reportData.errorEvents}`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="analytics-${reportType}-${Date.now()}.csv"`
      }
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});