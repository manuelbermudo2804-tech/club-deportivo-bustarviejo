import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { globalThrottler, debounce, retryWithBackoff } from '@/components/utils/requestThrottler';

/**
 * Hook para trackear errores automáticamente
 * Envuelve toda la app para capturar excepciones
 */
export function useErrorTracking(userEmail, userRole) {
  useEffect(() => {
    // Capturar errores no manejados
    const handleError = (event) => {
      trackError({
        titulo: event.error?.name || 'Error',
        mensaje: event.error?.message || event.message,
        stack: event.error?.stack,
        pagina: window.location.pathname,
        email: userEmail,
        rol: userRole,
        severidad: 'critical',
        tipo: 'error'
      });
    };

    // Capturar promesas rechazadas
    const handleUnhandledRejection = (event) => {
      trackError({
        titulo: 'Unhandled Promise Rejection',
        mensaje: event.reason?.message || String(event.reason),
        pagina: window.location.pathname,
        email: userEmail,
        rol: userRole,
        severidad: 'high',
        tipo: 'error'
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [userEmail, userRole]);
}

/**
 * Trackea un evento de error manualmente
 */
export async function trackError(errorData) {
  try {
    const navData = detectarNavegador();

    await retryWithBackoff(async () => {
      return await globalThrottler.execute(async () => {
        return await base44.functions.invoke('analyticsCollector', {
          tipo: 'error',
          email: errorData.email,
          rol: errorData.rol,
          pagina: errorData.pagina,
          severidad: errorData.severidad || 'error',
          titulo: errorData.titulo,
          mensaje: errorData.mensaje,
          detalles: {
            stack: errorData.stack,
            url: window.location.href,
            timestamp: new Date().toISOString()
          },
          navegador: navData.navegador,
          dispositivo: navData.dispositivo,
          so: navData.so
        });
      });
    });
  } catch (e) {
    console.error('Error tracking failed:', e);
  }
}

/**
 * Trackea performance
 */
export async function trackPerformance(pagina, duracion, userEmail, userRole) {
  try {
    const navData = detectarNavegador();

    await base44.functions.invoke('analyticsCollector', {
      tipo: 'performance',
      email: userEmail,
      rol: userRole,
      pagina,
      duracion,
      detalles: {
        timestamp: new Date().toISOString()
      },
      navegador: navData.navegador,
      dispositivo: navData.dispositivo,
      so: navData.so
    });
  } catch (e) {
    console.error('Performance tracking failed:', e);
  }
}

/**
 * Trackea acciones del usuario
 */
export async function trackAction(pagina, accion, userEmail, userRole) {
  try {
    const navData = detectarNavegador();

    await base44.functions.invoke('analyticsCollector', {
      tipo: 'user_action',
      email: userEmail,
      rol: userRole,
      pagina,
      accion,
      navegador: navData.navegador,
      dispositivo: navData.dispositivo,
      so: navData.so
    });
  } catch (e) {
    console.error('Action tracking failed:', e);
  }
}

function detectarNavegador() {
  const ua = navigator.userAgent;
  let navegador = 'Unknown';
  let dispositivo = 'desktop';
  let so = 'Unknown';

  // Detectar SO
  if (ua.indexOf('Win') > -1) so = 'Windows';
  else if (ua.indexOf('Mac') > -1) so = 'MacOS';
  else if (ua.indexOf('Linux') > -1) so = 'Linux';
  else if (ua.indexOf('Android') > -1) so = 'Android';
  else if (ua.indexOf('like Mac') > -1) so = 'iOS';

  // Detectar dispositivo
  if (/mobile|android|iphone|ipad|phone/i.test(ua)) dispositivo = 'mobile';
  else if (/tablet|ipad/i.test(ua)) dispositivo = 'tablet';

  // Detectar navegador
  if (ua.indexOf('Firefox') > -1) navegador = 'Firefox';
  else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) navegador = 'Safari';
  else if (ua.indexOf('Chrome') > -1) navegador = 'Chrome';
  else if (ua.indexOf('Edge') > -1) navegador = 'Edge';
  else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) navegador = 'Opera';

  return { navegador, dispositivo, so };
}