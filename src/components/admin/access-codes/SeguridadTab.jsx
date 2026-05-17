import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, SendHorizonal, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AccessAuditPanel from "@/components/admin/AccessAuditPanel";

/**
 * Pestaña Seguridad: alertas de actividad sospechosa + auditoría comparativa.
 */
export default function SeguridadTab({
  securityAlerts, unauthorizedScreenVisits, accessAttempts, accessCodes, allUsers,
  generateMutation, resendMutation,
}) {
  const queryClient = useQueryClient();
  const [clearingAlerts, setClearingAlerts] = useState(false);

  const hasAlerts = securityAlerts.length > 0 || unauthorizedScreenVisits.length > 0;

  return (
    <div className="space-y-6">
      {/* Alertas de seguridad */}
      {hasAlerts ? (
        <Card className="border-2 border-red-400 bg-red-50">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-red-800 text-lg">
                  <ShieldAlert className="w-5 h-5" />
                  Alertas de Seguridad
                </CardTitle>
                <p className="text-sm text-red-700 mt-1">
                  Actividad sospechosa detectada. Estos usuarios pueden estar intentando acceder sin invitación.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100 whitespace-nowrap"
                disabled={clearingAlerts}
                onClick={async () => {
                  if (!confirm(`¿Borrar todas las alertas de seguridad? Se eliminarán ${accessAttempts.length} registros de intentos.`)) return;
                  setClearingAlerts(true);
                  try {
                    for (let i = 0; i < accessAttempts.length; i += 10) {
                      const batch = accessAttempts.slice(i, i + 10);
                      await Promise.all(batch.map(a => base44.entities.AccessCodeAttempt.delete(a.id)));
                    }
                    queryClient.invalidateQueries({ queryKey: ['accessAttempts'] });
                    toast.success('Alertas de seguridad borradas');
                  } catch {
                    toast.error('Error al borrar alertas');
                  } finally {
                    setClearingAlerts(false);
                  }
                }}
              >
                {clearingAlerts ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                Limpiar alertas
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            {/* Accesos sin invitación */}
            {unauthorizedScreenVisits.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-700 uppercase mb-2">🔍 Accesos sin invitación ({unauthorizedScreenVisits.length})</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {unauthorizedScreenVisits.map(u => (
                    <div key={u.email} className="flex items-center justify-between gap-3 bg-white rounded-xl p-3 border border-red-200">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">{u.user?.full_name || u.email}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">Sin invitación</Badge>
                          {u.failedAttempts > 0 && (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px]">
                              {u.failedAttempts} intento{u.failedAttempts !== 1 ? 's' : ''} fallido{u.failedAttempts !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {u.lastVisit ? new Date(u.lastVisit).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap"
                        onClick={() => {
                          const previous = accessCodes
                            .filter(c => c.email?.toLowerCase() === u.email)
                            .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
                          if (previous?.id) {
                            resendMutation.mutate(previous.id);
                          } else {
                            generateMutation.mutate({ email: u.email, nombre_destino: u.user?.full_name || '', tipo: 'padre_nuevo' });
                          }
                        }}
                        disabled={generateMutation.isPending}
                      >
                        <SendHorizonal className="w-3 h-3 mr-1" />
                        Enviar Código
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-100 whitespace-nowrap"
                        onClick={async () => {
                          if (!confirm(`¿Borrar los registros de ${u.email}?`)) return;
                          const toDelete = accessAttempts.filter(a => a.user_email?.toLowerCase() === u.email);
                          for (const a of toDelete) { try { await base44.entities.AccessCodeAttempt.delete(a.id); } catch {} }
                          queryClient.invalidateQueries({ queryKey: ['accessAttempts'] });
                          toast.success('Registros borrados');
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Intentos sospechosos */}
            {securityAlerts.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-700 uppercase mb-2">⚠️ Intentos sospechosos ({securityAlerts.length})</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {securityAlerts.map(alert => (
                    <div key={alert.email} className="flex items-center justify-between gap-3 bg-white rounded-xl p-3 border border-red-200">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">{alert.email}</p>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {alert.blocked > 0 && (
                            <Badge className="bg-red-500 text-white text-[10px]">🔒 Bloqueado {alert.blocked}x</Badge>
                          )}
                          {alert.wrongEmail > 0 && (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px]">📧 Email incorrecto {alert.wrongEmail}x</Badge>
                          )}
                          {alert.invalidCodes > 0 && (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px]">🔑 Códigos inválidos: {alert.invalidCodes}</Badge>
                          )}
                          <Badge variant="outline" className="text-[10px]">Total fallos: {alert.failures}</Badge>
                          <Badge variant="outline" className="text-[10px]">
                            Último: {alert.lastAttempt ? new Date(alert.lastAttempt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-100 whitespace-nowrap"
                        onClick={async () => {
                          if (!confirm(`¿Borrar los registros de ${alert.email}?`)) return;
                          const toDelete = accessAttempts.filter(a => a.user_email?.toLowerCase() === alert.email);
                          for (const a of toDelete) { try { await base44.entities.AccessCodeAttempt.delete(a.id); } catch {} }
                          queryClient.invalidateQueries({ queryKey: ['accessAttempts'] });
                          toast.success('Registros borrados');
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            <ShieldAlert className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No hay alertas de seguridad activas</p>
            <p className="text-xs text-slate-400 mt-1">Todo está tranquilo por aquí ✅</p>
          </CardContent>
        </Card>
      )}

      {/* Auditoría comparativa */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            🔍 Auditoría: Códigos vs Intentos de Acceso
          </CardTitle>
          <p className="text-sm text-slate-500">Comparativa detallada entre códigos enviados e intentos registrados.</p>
        </CardHeader>
        <CardContent>
          <AccessAuditPanel
            accessCodes={accessCodes}
            accessAttempts={accessAttempts}
            allUsers={allUsers}
          />
        </CardContent>
      </Card>
    </div>
  );
}