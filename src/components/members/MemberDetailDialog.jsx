import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  User, Mail, Phone, MapPin, CreditCard, Calendar, 
  CheckCircle2, Clock, AlertCircle, FileText, Users, 
  Gift, Edit, X, ExternalLink, Image, RefreshCw
} from "lucide-react";

export default function MemberDetailDialog({ member, open, onClose, onEdit, referrals = [] }) {
  if (!member) return null;

  const getStatusConfig = (status) => {
    switch (status) {
      case "Pagado":
        return { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100", label: "Pagado" };
      case "En revisión":
        return { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100", label: "En Revisión" };
      default:
        return { icon: AlertCircle, color: "text-red-600", bg: "bg-red-100", label: "Pendiente" };
    }
  };

  const statusConfig = getStatusConfig(member.estado_pago);
  const StatusIcon = statusConfig.icon;

  // Buscar socios referidos por este socio
  const referredMembers = referrals.filter(r => 
    r.referido_por_email?.toLowerCase() === member.email?.toLowerCase()
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <User className="w-6 h-6 text-orange-600" />
              Detalle del Socio
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={() => onEdit(member)}>
              <Edit className="w-4 h-4 mr-1" /> Editar
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cabecera con estado */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{member.nombre_completo}</h2>
              <p className="text-sm text-slate-600">
                Socio #{member.numero_socio || "Sin número"} · {member.temporada}
              </p>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.bg}`}>
              <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
              <span className={`font-semibold ${statusConfig.color}`}>{statusConfig.label}</span>
            </div>
          </div>

          {/* Información de contacto */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-orange-600" /> Información de Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <a href={`mailto:${member.email}`} className="text-blue-600 hover:underline">
                    {member.email}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <a href={`tel:${member.telefono}`} className="text-blue-600 hover:underline">
                    {member.telefono}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm md:col-span-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{member.direccion}, {member.municipio}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>DNI: {member.dni}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información de pago */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-600" /> Información de Pago
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Cuota</p>
                  <p className="text-lg font-bold text-green-600">{member.cuota_socio || 25}€</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Método</p>
                  <p className="text-sm font-semibold">{member.metodo_pago || "Transferencia"}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Tipo</p>
                  <p className="text-sm font-semibold">{member.tipo_inscripcion}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500">Fecha Pago</p>
                  <p className="text-sm font-semibold">
                    {member.fecha_pago ? new Date(member.fecha_pago).toLocaleDateString('es-ES') : "-"}
                  </p>
                </div>
              </div>

              {/* Sección de suscripción y renovación */}
              {(member.origen_pago || member.fecha_vencimiento || member.renovacion_automatica) && (
                <div className="mt-3 p-3 rounded-lg border bg-gradient-to-r from-slate-50 to-blue-50 space-y-2">
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-600" /> Renovación y Suscripción
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    {member.origen_pago && (
                      <div>
                        <p className="text-xs text-slate-500">Origen pago</p>
                        <Badge variant="outline" className={
                          member.origen_pago === 'stripe_suscripcion' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          member.origen_pago === 'stripe_unico' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          member.origen_pago === 'transferencia' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          'bg-slate-50 text-slate-700'
                        }>
                          {member.origen_pago === 'stripe_suscripcion' ? '🔄 Suscripción Stripe' :
                           member.origen_pago === 'stripe_unico' ? '💳 Pago Único Stripe' :
                           member.origen_pago === 'transferencia' ? '🏦 Transferencia' :
                           member.origen_pago === 'socio_padre_auto' ? '👨‍👩‍👧 Auto (Padre)' :
                           member.origen_pago}
                        </Badge>
                      </div>
                    )}
                    {member.fecha_alta && (
                      <div>
                        <p className="text-xs text-slate-500">Fecha alta</p>
                        <p className="font-medium">{new Date(member.fecha_alta).toLocaleDateString('es-ES')}</p>
                      </div>
                    )}
                    {member.fecha_vencimiento && (
                      <div>
                        <p className="text-xs text-slate-500">Vencimiento</p>
                        <p className="font-medium">{new Date(member.fecha_vencimiento).toLocaleDateString('es-ES')}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-500">Renovación auto.</p>
                      <Badge className={member.renovacion_automatica ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
                        {member.renovacion_automatica ? '✅ Activa' : '❌ No'}
                      </Badge>
                    </div>
                    {member.stripe_subscription_status && (
                      <div>
                        <p className="text-xs text-slate-500">Estado suscripción</p>
                        <Badge className={
                          member.stripe_subscription_status === 'active' ? 'bg-green-100 text-green-700' :
                          member.stripe_subscription_status === 'past_due' ? 'bg-yellow-100 text-yellow-700' :
                          member.stripe_subscription_status === 'canceled' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-600'
                        }>
                          {member.stripe_subscription_status === 'active' ? '🟢 Activa' :
                           member.stripe_subscription_status === 'past_due' ? '🟡 Cobro pendiente' :
                           member.stripe_subscription_status === 'canceled' ? '🔴 Cancelada' :
                           member.stripe_subscription_status}
                        </Badge>
                      </div>
                    )}
                    {member.fecha_ultimo_cobro && (
                      <div>
                        <p className="text-xs text-slate-500">Último cobro</p>
                        <p className="font-medium">{new Date(member.fecha_ultimo_cobro).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    )}
                    {member.fecha_proximo_cobro && (
                      <div>
                        <p className="text-xs text-slate-500">Próximo cobro</p>
                        <p className="font-medium">{new Date(member.fecha_proximo_cobro).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    )}
                    {member.stripe_customer_id && (
                      <div>
                        <p className="text-xs text-slate-500">Customer Stripe</p>
                        <p className="font-medium text-xs text-slate-500 truncate">{member.stripe_customer_id}</p>
                      </div>
                    )}
                  </div>
                  {member.stripe_subscription_id && (
                    <p className="text-xs text-slate-400 mt-1">ID Suscripción: {member.stripe_subscription_id}</p>
                  )}
                </div>
              )}

              {/* Justificante */}
              {(member.justificante_url || member.justificante_base64) && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                    <Image className="w-4 h-4" /> Justificante de Pago
                  </p>
                  {member.justificante_base64 ? (
                    <img 
                      src={member.justificante_base64} 
                      alt="Justificante" 
                      className="max-w-full max-h-64 rounded-lg border shadow-sm"
                    />
                  ) : member.justificante_url && member.justificante_url !== "BASE64_ATTACHED" ? (
                    <a 
                      href={member.justificante_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" /> Ver justificante
                    </a>
                  ) : (
                    <p className="text-sm text-slate-500">Justificante adjunto (ver en email)</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Etiquetas y características */}
          <div className="flex flex-wrap gap-2">
            {member.es_segundo_progenitor && (
              <Badge className="bg-purple-100 text-purple-800">
                <Users className="w-3 h-3 mr-1" /> 2º Progenitor
              </Badge>
            )}
            {member.es_socio_externo && (
              <Badge className="bg-cyan-100 text-cyan-800">
                <User className="w-3 h-3 mr-1" /> Socio Externo
              </Badge>
            )}
            {member.carnet_enviado && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Carnet Enviado
              </Badge>
            )}
            {member.referido_por && (
              <Badge className="bg-orange-100 text-orange-800">
                <Gift className="w-3 h-3 mr-1" /> Referido por: {member.referido_por}
              </Badge>
            )}
          </div>

          {/* Socios referidos por este socio */}
          {referredMembers.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-green-900 flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4" /> Socios Referidos ({referredMembers.length})
                </h3>
                <div className="space-y-2">
                  {referredMembers.map(ref => (
                    <div key={ref.id} className="flex items-center justify-between bg-white rounded-lg p-2 text-sm">
                      <span className="font-medium">{ref.nombre_completo}</span>
                      <Badge variant="outline" className="text-xs">
                        {ref.estado_pago}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notas */}
          {member.notas && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-slate-900 mb-2">📝 Notas</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{member.notas}</p>
              </CardContent>
            </Card>
          )}

          {/* Fechas */}
          <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-2 border-t">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> 
              Registrado: {new Date(member.created_date).toLocaleDateString('es-ES', { 
                day: 'numeric', month: 'long', year: 'numeric' 
              })}
            </span>
            {member.fecha_carnet_enviado && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" /> 
                Carnet enviado: {new Date(member.fecha_carnet_enviado).toLocaleDateString('es-ES')}
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}