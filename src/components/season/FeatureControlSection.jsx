import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings, RefreshCw, Smartphone, CreditCard, Clover, Users, Mail, Image,
  Shield, Lock, Trash2, Info, ChevronDown, ChevronUp
} from "lucide-react";

export default function FeatureControlSection({
  activeSeason,
  expanded,
  onToggleExpanded,
  toggleFeature,
  updateSeasonMutation,
}) {
  if (!activeSeason) return null;

  const update = (data) => updateSeasonMutation.mutate({ id: activeSeason.id, data });

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggleExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-orange-600" />
            <CardTitle className="text-lg">Control de Características</CardTitle>
          </div>
          {expanded ? <ChevronUp /> : <ChevronDown />}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          {/* Renovaciones */}
          <FeatureRow icon={<RefreshCw className="w-5 h-5 text-blue-600" />} title="Permitir Renovaciones" subtitle="Los padres pueden renovar jugadores de temporadas anteriores" extra={<p className="text-xs text-blue-600 font-medium mt-1">⚠️ Activar DESPUÉS de resetear la temporada</p>} checked={activeSeason.permitir_renovaciones || false} onChange={(v) => toggleFeature('permitir_renovaciones', v)} />

          {/* Bizum */}
          <FeatureRow icon={<Smartphone className="w-5 h-5 text-purple-600" />} title="Bizum Activo" subtitle="Permitir pagos con Bizum" checked={activeSeason.bizum_activo || false} onChange={(v) => toggleFeature('bizum_activo', v)} />
          {activeSeason.bizum_activo && (
            <div className="ml-8 flex items-center gap-2">
              <Label className="text-sm">Teléfono Bizum:</Label>
              <Input value={activeSeason.bizum_telefono || ""} onChange={(e) => update({ bizum_telefono: e.target.value })} placeholder="Ej: 612345678" className="w-40" />
            </div>
          )}

          {/* URLs Tienda */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-lg border-l-4 border-orange-600">
            <div>
              <Label className="text-sm font-medium">🛍️ URL Tienda Equipación</Label>
              <Input value={activeSeason.tienda_ropa_url || ""} onChange={(e) => update({ tienda_ropa_url: e.target.value })} placeholder="https://..." className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium">🎁 URL Merchandising</Label>
              <Input value={activeSeason.tienda_merch_url || ""} onChange={(e) => update({ tienda_merch_url: e.target.value })} placeholder="https://..." className="mt-1" />
            </div>
          </div>

          {/* Lotería */}
          <FeatureRow icon={<Clover className="w-5 h-5 text-green-600" />} title="Lotería de Navidad" subtitle="Permitir pedidos de lotería" checked={activeSeason.loteria_navidad_abierta || false} onChange={(v) => toggleFeature('loteria_navidad_abierta', v)} />
          {activeSeason.loteria_navidad_abierta && (
            <>
              <div className="ml-8 flex items-center justify-between p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Lotería: Requiere Pago Adelantado</p>
                    <p className="text-xs text-slate-600">{activeSeason.loteria_requiere_pago_adelantado ? "Los padres deben pagar y subir justificante" : "Los padres pagan al entrenador cuando reciben los décimos"}</p>
                  </div>
                </div>
                <Switch checked={activeSeason.loteria_requiere_pago_adelantado || false} onCheckedChange={(v) => toggleFeature('loteria_requiere_pago_adelantado', v)} />
              </div>
              <div className="ml-8 space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Precio del décimo (€):</Label>
                  <Input type="number" value={activeSeason.precio_decimo_loteria || 22} onChange={(e) => update({ precio_decimo_loteria: Number(e.target.value) })} placeholder="22" className="w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Décimos disponibles:</Label>
                  <Input type="number" min="0" value={activeSeason.loteria_max_decimos ?? ""} onChange={(e) => update({ loteria_max_decimos: e.target.value === "" ? null : parseInt(e.target.value, 10) })} placeholder="Sin límite" className="w-32" />
                  <Info className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 ml-2">💡 La lotería se cerrará automáticamente cuando se alcance este límite.</p>
              </div>
            </>
          )}

          {/* Plan Mensual */}
          <FeatureRow icon={<CreditCard className="w-5 h-5 text-emerald-600" />} title="Plan Mensual (Domiciliación Tarjeta)" subtitle="Permite pago inicial + mensualidades automáticas por tarjeta" checked={activeSeason.permitir_plan_mensual || false} onChange={(v) => toggleFeature('permitir_plan_mensual', v)} />
          {activeSeason.permitir_plan_mensual && (
            <div className="ml-8 space-y-3 bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">💰 % Pago Inicial (Junio):</Label>
                <Input type="number" min={10} max={90} value={activeSeason.plan_mensual_porcentaje_inicial || 60} onChange={(e) => update({ plan_mensual_porcentaje_inicial: Number(e.target.value) })} className="w-20" />
                <span className="text-sm text-slate-600">%</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">📅 Último mes de cobro:</Label>
                <select value={activeSeason.plan_mensual_mes_fin || "Mayo"} onChange={(e) => update({ plan_mensual_mes_fin: e.target.value })} className="border rounded px-2 py-1 text-sm">
                  {["Enero","Febrero","Marzo","Abril","Mayo","Junio"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <p className="text-xs text-emerald-700">💡 El padre paga el {activeSeason.plan_mensual_porcentaje_inicial || 60}% en Junio. El resto se divide en mensualidades automáticas.</p>

              <div className="mt-4 pt-4 border-t border-emerald-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="font-medium text-sm">🧪 Modo Test</p>
                      <p className="text-xs text-slate-600">Solo los emails de la lista podrán ver el Plan Mensual</p>
                    </div>
                  </div>
                  <Switch checked={activeSeason.plan_mensual_modo_test || false} onCheckedChange={(v) => toggleFeature('plan_mensual_modo_test', v)} />
                </div>
                {activeSeason.plan_mensual_modo_test && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 space-y-2">
                    <Label className="text-xs font-bold text-amber-900">📧 Emails autorizados para test:</Label>
                    <Textarea value={(activeSeason.plan_mensual_emails_test || []).join('\n')} onChange={(e) => { const emails = e.target.value.split('\n').map(s => s.trim()).filter(Boolean); update({ plan_mensual_emails_test: emails }); }} placeholder={"padre1@gmail.com\nmadre2@hotmail.com"} className="text-sm h-24 font-mono" />
                    <p className="text-xs text-amber-800">✅ <strong>{(activeSeason.plan_mensual_emails_test || []).length}</strong> email(s) en la lista</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bloqueo convocatorias por impago */}
          <FeatureRow
            icon={<Lock className="w-5 h-5 text-red-600" />}
            title="🔒 Bloqueo por impago en convocatorias"
            subtitle="Los jugadores con pagos vencidos aparecen marcados y excluidos por defecto al crear convocatorias"
            checked={activeSeason.bloqueo_convocatorias_impago || false}
            onChange={(v) => toggleFeature('bloqueo_convocatorias_impago', v)}
          />
          {activeSeason.bloqueo_convocatorias_impago && (
            <div className="ml-8 flex items-center gap-2 p-3 bg-red-50 rounded-lg border-2 border-red-200">
              <Label className="text-sm font-medium">⏰ Días de gracia tras vencimiento:</Label>
              <Input type="number" min={0} max={60} value={activeSeason.dias_gracia_convocatoria ?? 14} onChange={(e) => update({ dias_gracia_convocatoria: Number(e.target.value) })} className="w-20" />
              <span className="text-xs text-slate-600">días</span>
              <Info className="w-4 h-4 text-slate-400" title="Tras este periodo el jugador aparece marcado como moroso" />
            </div>
          )}

          {/* Patrocinadores */}
          <FeatureRow icon={<Image className="w-5 h-5 text-indigo-600" />} title="Banner Patrocinadores" subtitle="Mostrar patrocinadores en la app" checked={activeSeason.mostrar_patrocinadores || false} onChange={(v) => toggleFeature('mostrar_patrocinadores', v)} />

          {/* Fecha límite patrocinios */}
          <div className="ml-8 flex items-center gap-2 p-3 bg-indigo-50 rounded-lg border-2 border-indigo-200">
            <Label className="text-sm font-medium whitespace-nowrap">📅 Fecha límite patrocinios:</Label>
            <Input
              type="date"
              value={activeSeason.fecha_limite_patrocinios || ""}
              onChange={(e) => update({ fecha_limite_patrocinios: e.target.value || null })}
              className="w-44"
            />
            {activeSeason.fecha_limite_patrocinios && (
              <Button size="sm" variant="ghost" className="text-red-500 text-xs" onClick={() => update({ fecha_limite_patrocinios: null })}>
                <Trash2 className="w-3 h-3 mr-1" /> Quitar
              </Button>
            )}
            <p className="text-xs text-slate-500 hidden sm:block">Se muestra en la web pública de patrocinadores</p>
          </div>

          {/* Notificaciones Email */}
          <FeatureRow icon={<Mail className="w-5 h-5 text-red-600" />} title="Notificaciones por Email" subtitle="Enviar emails automáticos al admin" checked={activeSeason.notificaciones_admin_email || false} onChange={(v) => toggleFeature('notificaciones_admin_email', v)} />

          {/* Programa de Socios */}
          <FeatureRow icon={<Users className="w-5 h-5 text-green-600" />} title="Programa de Socios" subtitle="Carnets digitales con descuentos en comercios" checked={activeSeason.programa_socios_activo || false} onChange={(v) => toggleFeature('programa_socios_activo', v)} />
          {activeSeason.programa_socios_activo && (
            <div className="ml-8">
              <FeatureRow
                icon={<Mail className="w-5 h-5 text-cyan-600" />}
                title="🌐 Carnet Público (Socios Externos)"
                subtitle="Permite enviar un enlace con el carnet digital a socios que NO tienen la app (web, externos)"
                checked={activeSeason.carnet_publico_activo || false}
                onChange={(v) => toggleFeature('carnet_publico_activo', v)}
              />
            </div>
          )}
          {activeSeason.programa_socios_activo && (
            <div className="ml-8 space-y-4 bg-green-50 rounded-xl p-4 border-2 border-green-200">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">💰 Precio anual socio (€):</Label>
                <Input type="number" value={activeSeason.precio_socio || 25} onChange={(e) => update({ precio_socio: Number(e.target.value) })} className="w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">⏰ Días de gracia:</Label>
                <Input type="number" value={activeSeason.dias_gracia_carnet || 15} onChange={(e) => update({ dias_gracia_carnet: Number(e.target.value) })} className="w-24" />
                <Info className="w-4 h-4 text-slate-400" />
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-bold text-green-900">🏪 Comercios con Descuentos</Label>
                  <Button size="sm" onClick={() => { const updated = [...(activeSeason.comercios_descuento || []), { nombre: "", descuento: "", direccion: "", telefono: "", categoria: "Restaurantes" }]; update({ comercios_descuento: updated }); }} className="bg-green-600 hover:bg-green-700">+ Añadir Comercio</Button>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {(activeSeason.comercios_descuento || []).map((comercio, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border shadow-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <Input placeholder="Nombre comercio" value={comercio.nombre} onChange={(e) => { const updated = [...activeSeason.comercios_descuento]; updated[index].nombre = e.target.value; update({ comercios_descuento: updated }); }} className="flex-1" />
                        <Input placeholder="10%" value={comercio.descuento} onChange={(e) => { const updated = [...activeSeason.comercios_descuento]; updated[index].descuento = e.target.value; update({ comercios_descuento: updated }); }} className="w-24" />
                        <Button size="sm" variant="ghost" onClick={() => { const updated = activeSeason.comercios_descuento.filter((_, i) => i !== index); update({ comercios_descuento: updated }); }} className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                      <select value={comercio.categoria || "Restaurantes"} onChange={(e) => { const updated = [...activeSeason.comercios_descuento]; updated[index].categoria = e.target.value; update({ comercios_descuento: updated }); }} className="w-full text-sm border rounded px-2 py-1">
                        {["Restaurantes","Tiendas","Servicios","Ocio","Salud","Otro"].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <Input placeholder="Dirección (opcional)" value={comercio.direccion || ""} onChange={(e) => { const updated = [...activeSeason.comercios_descuento]; updated[index].direccion = e.target.value; update({ comercios_descuento: updated }); }} className="text-sm" />
                      <Input placeholder="Teléfono (opcional)" value={comercio.telefono || ""} onChange={(e) => { const updated = [...activeSeason.comercios_descuento]; updated[index].telefono = e.target.value; update({ comercios_descuento: updated }); }} className="text-sm" />
                      <div className="bg-blue-50 rounded-lg p-2 space-y-1.5 border border-blue-200">
                        <Input placeholder="Código descuento (ej: CDBUSTARVIEJO10)" value={comercio.codigo_descuento || ""} onChange={(e) => { const updated = [...activeSeason.comercios_descuento]; updated[index].codigo_descuento = e.target.value; update({ comercios_descuento: updated }); }} className="text-sm font-mono bg-white" />
                        <Input placeholder="Instrucciones (ej: Usa este código en el checkout)" value={comercio.instrucciones_codigo || ""} onChange={(e) => { const updated = [...activeSeason.comercios_descuento]; updated[index].instrucciones_codigo = e.target.value; update({ comercios_descuento: updated }); }} className="text-sm bg-white" />
                      </div>
                    </div>
                  ))}
                </div>
                {(activeSeason.comercios_descuento || []).length === 0 && (
                  <p className="text-center text-sm text-slate-500 py-4">No hay comercios añadidos. Pulsa "+ Añadir Comercio"</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function FeatureRow({ icon, title, subtitle, extra, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-xs text-slate-600">{subtitle}</p>
          {extra}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}