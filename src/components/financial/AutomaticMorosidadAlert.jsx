import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AutomaticMorosidadAlert({ totalIngresos, totalPendiente, totalEsperado }) {
  useEffect(() => {
    const checkMorosidad = async () => {
      if (totalEsperado === 0) return;

      const delinquencyRate = (totalPendiente / totalEsperado) * 100;
      
      // Alerta crítica si morosidad > 40%
      if (delinquencyRate > 40) {
        const lastAlert = localStorage.getItem('last_morosidad_alert');
        const now = Date.now();
        
        // Solo enviar alerta si no se envió en las últimas 24 horas
        if (!lastAlert || (now - parseInt(lastAlert)) > 24 * 60 * 60 * 1000) {
          try {
            const user = await base44.auth.me();
            
            // Enviar email al tesorero
            await base44.integrations.Core.SendEmail({
              to: user.email,
              subject: "⚠️ ALERTA: Morosidad superior al 40%",
              body: `
                <h2>⚠️ Alerta de Morosidad Crítica</h2>
                <p>La tasa de morosidad ha superado el <strong>40%</strong></p>
                
                <h3>📊 Datos Actuales:</h3>
                <ul>
                  <li><strong>Morosidad:</strong> ${delinquencyRate.toFixed(1)}%</li>
                  <li><strong>Total Pendiente:</strong> ${totalPendiente.toFixed(2)}€</li>
                  <li><strong>Total Esperado:</strong> ${totalEsperado.toFixed(2)}€</li>
                  <li><strong>Total Cobrado:</strong> ${totalIngresos.toFixed(2)}€</li>
                </ul>
                
                <h3>🎯 Acciones Recomendadas:</h3>
                <ul>
                  <li>Revisar familias con deuda más alta</li>
                  <li>Enviar recordatorios personalizados</li>
                  <li>Implementar plan de recuperación de deudas</li>
                  <li>Evaluar opciones de fraccionamiento adicional</li>
                </ul>
                
                <p><strong>Accede al panel para más detalles:</strong> <a href="https://app.cdbustarviejo.com">Panel Financiero</a></p>
              `
            });

            localStorage.setItem('last_morosidad_alert', now.toString());
            
            toast.error(`⚠️ Morosidad crítica: ${delinquencyRate.toFixed(1)}%`, {
              description: "Se ha enviado un email con los detalles",
              duration: 10000
            });
          } catch (error) {
            console.error("Error enviando alerta de morosidad:", error);
          }
        }
      }
    };

    checkMorosidad();
  }, [totalIngresos, totalPendiente, totalEsperado]);

  return null;
}