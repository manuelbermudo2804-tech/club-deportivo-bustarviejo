import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, Loader2, SendHorizonal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AccessRequestsPanel from "@/components/admin/AccessRequestsPanel";
import AssistedRegistrationPanel from "@/components/admin/AssistedRegistrationPanel.jsx";

/**
 * Pestaña Bandeja: todo lo que requiere acción del admin.
 * - Solicitudes públicas (formulario web)
 * - Solicitudes de alta asistida
 * - Usuarios atascados (registrados sin código validado)
 */
export default function BandejaTab({ stuckUsersWithStatus, accessCodes, generateMutation, resendMutation }) {
  const queryClient = useQueryClient();

  return (
    <div className="space-y-6">
      {/* 📬 SOLICITUDES PÚBLICAS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            📬 Solicitudes desde formulario público
            <Badge className="bg-orange-100 text-orange-700 text-xs ml-2">Familias</Badge>
          </CardTitle>
          <p className="text-sm text-slate-500">Solicitudes recibidas desde el enlace público que comparte el club.</p>
        </CardHeader>
        <CardContent>
          <AccessRequestsPanel />
        </CardContent>
      </Card>

      {/* 📞 ALTA ASISTIDA */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            📞 Alta asistida
            <Badge className="bg-blue-100 text-blue-700 text-xs ml-2">Por teléfono / presencial</Badge>
          </CardTitle>
          <p className="text-sm text-slate-500">Familias que han pedido ayuda para darse de alta sin usar el formulario.</p>
        </CardHeader>
        <CardContent>
          <AssistedRegistrationPanel />
        </CardContent>
      </Card>

      {/* ⚠️ USUARIOS ATASCADOS */}
      {stuckUsersWithStatus.length > 0 && (() => {
        const withCode = stuckUsersWithStatus.filter(u => u.existingCode).length;
        const withoutCode = stuckUsersWithStatus.length - withCode;
        return (
          <Card className="border-2 border-amber-400 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-amber-800 text-lg">
                <AlertCircle className="w-5 h-5" />
                {stuckUsersWithStatus.length} usuario{stuckUsersWithStatus.length !== 1 ? 's' : ''} sin validar código de acceso
              </CardTitle>
              <div className="text-sm text-amber-700 space-y-1 mt-1">
                {withCode > 0 && (
                  <p>⏳ <strong>{withCode}</strong> ya {withCode === 1 ? 'recibió' : 'recibieron'} el código pero aún no lo {withCode === 1 ? 'ha' : 'han'} introducido en la app.</p>
                )}
                {withoutCode > 0 && (
                  <p>📤 <strong>{withoutCode}</strong> aún no {withoutCode === 1 ? 'tiene' : 'tienen'} código. Envíaselo para que {withoutCode === 1 ? 'pueda' : 'puedan'} acceder.</p>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stuckUsersWithStatus.map(u => (
                  <div key={u.id} className="flex items-center justify-between gap-3 bg-white rounded-xl p-3 border border-amber-200">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">{u.full_name || u.email}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                      <p className="text-xs text-amber-600">
                        Registrado: {new Date(u.created_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {u.existingCode ? (
                        <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 text-xs whitespace-nowrap">
                          <Clock className="w-3 h-3 mr-1" />
                          Código enviado: {u.existingCode.codigo}
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap"
                          onClick={() => {
                            const previous = accessCodes
                              .filter(c => c.email?.toLowerCase() === u.email?.toLowerCase())
                              .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
                            if (previous?.id) {
                              resendMutation.mutate(previous.id);
                            } else {
                              generateMutation.mutate({ email: u.email, nombre_destino: u.full_name || '', tipo: 'padre_nuevo' });
                            }
                          }}
                          disabled={generateMutation.isPending}
                        >
                          {generateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <SendHorizonal className="w-3 h-3 mr-1" />}
                          Enviar Código
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-100"
                        onClick={async () => {
                          if (!confirm(`¿Eliminar a ${u.full_name || u.email} de esta lista? (Esto marca su código como validado)`)) return;
                          try {
                            await base44.entities.User.update(u.id, { codigo_acceso_validado: true });
                            if (u.existingCode) {
                              await base44.entities.AccessCode.update(u.existingCode.id, { estado: 'cancelado' });
                            }
                            queryClient.invalidateQueries({ queryKey: ['allUsersAccessCodes'] });
                            queryClient.invalidateQueries({ queryKey: ['accessCodes'] });
                            toast.success('Usuario eliminado de la lista');
                          } catch { toast.error('Error'); }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}