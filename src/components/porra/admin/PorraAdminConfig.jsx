import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Save, Megaphone, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function PorraAdminConfig({ config, onUpdate }) {
  const [form, setForm] = useState(config || {});
  const [saving, setSaving] = useState(false);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (form.id) {
        await base44.entities.PorraConfig.update(form.id, form);
      } else {
        await base44.entities.PorraConfig.create(form);
      }
      toast.success('Configuración guardada');
      onUpdate?.();
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>No hay configuración. Recarga la página.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Activación */}
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-green-600" />
            Activación y visibilidad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div>
              <Label className="font-bold">Porra activa</Label>
              <p className="text-xs text-slate-500">Si está activa, la URL /Porra funciona y los usuarios pueden apuntarse</p>
            </div>
            <Switch checked={!!form.activa} onCheckedChange={v => update('activa', v)} />
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div>
              <Label className="font-bold">Banner promocional en la app</Label>
              <p className="text-xs text-slate-500">Muestra un banner llamativo en toda la app del club</p>
            </div>
            <Switch checked={!!form.banner_promocional_activo} onCheckedChange={v => update('banner_promocional_activo', v)} />
          </div>
          <div className={`flex items-center justify-between p-3 rounded-lg border-2 ${form.modo_test ? 'bg-yellow-50 border-yellow-400' : 'bg-white border-slate-200'}`}>
            <div className="flex-1 pr-3">
              <Label className="font-bold flex items-center gap-2">
                🧪 Modo TEST (sin cobro Stripe)
                {form.modo_test && <span className="text-[10px] bg-yellow-500 text-white px-2 py-0.5 rounded-full font-black">ACTIVO</span>}
              </Label>
              <p className="text-xs text-slate-600 mt-1">
                Cuando está activo, las porras se crean <strong>directamente como pagadas (0€)</strong> sin pasar por Stripe.
                Útil para hacer pruebas (te llega el email, rellenas la porra, etc.).
                <strong className="text-red-700"> ¡DESACTIVA esto antes del lanzamiento oficial!</strong>
              </p>
            </div>
            <Switch checked={!!form.modo_test} onCheckedChange={v => update('modo_test', v)} />
          </div>
          <div>
            <Label>Texto del banner</Label>
            <Textarea
              value={form.banner_texto || ''}
              onChange={e => update('banner_texto', e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Datos del torneo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-600" />
            Datos del torneo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nombre del torneo</Label>
            <Input value={form.nombre_torneo || ''} onChange={e => update('nombre_torneo', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Precio entrada (€)</Label>
              <Input type="number" value={form.precio_entrada || 15} onChange={e => update('precio_entrada', Number(e.target.value))} />
            </div>
            <div>
              <Label>Comisión club (%)</Label>
              <Input type="number" value={form.comision_club_porcentaje || 10} onChange={e => update('comision_club_porcentaje', Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>💰 Aporte inicial del club al bote (€)</Label>
            <Input
              type="number"
              min="0"
              value={form.aporte_inicial_club || 0}
              onChange={e => update('aporte_inicial_club', Number(e.target.value))}
              placeholder="Ej: 100"
            />
            <p className="text-xs text-slate-500 mt-1">
              💡 Cantidad que el club pone "de propina" al bote para generar interés desde el día 1.
              Se suma al bote total mostrado en la landing y ranking.
            </p>
          </div>
          <div>
            <Label>Destino de la comisión</Label>
            <Input value={form.destino_comision_club || ''} onChange={e => update('destino_comision_club', e.target.value)} placeholder="Ej: Equipación cantera CD Bustarviejo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha límite predicciones</Label>
              <Input 
                type="datetime-local" 
                value={form.fecha_limite_predicciones ? form.fecha_limite_predicciones.slice(0, 16) : ''} 
                onChange={e => update('fecha_limite_predicciones', e.target.value)} 
              />
            </div>
            <div>
              <Label>Fecha inicio Mundial</Label>
              <Input 
                type="datetime-local" 
                value={form.fecha_inicio_mundial ? form.fecha_inicio_mundial.slice(0, 16) : ''} 
                onChange={e => update('fecha_inicio_mundial', e.target.value)} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reparto premios */}
      <Card>
        <CardHeader>
          <CardTitle>🥇 Reparto del bote</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>🥇 1º (%)</Label>
              <Input
                type="number"
                value={form.reparto_premios?.primero_porcentaje || 60}
                onChange={e => update('reparto_premios', { ...(form.reparto_premios || {}), primero_porcentaje: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>🥈 2º (%)</Label>
              <Input
                type="number"
                value={form.reparto_premios?.segundo_porcentaje || 25}
                onChange={e => update('reparto_premios', { ...(form.reparto_premios || {}), segundo_porcentaje: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>🥉 3º (%)</Label>
              <Input
                type="number"
                value={form.reparto_premios?.tercero_porcentaje || 15}
                onChange={e => update('reparto_premios', { ...(form.reparto_premios || {}), tercero_porcentaje: Number(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full bg-orange-600 hover:bg-orange-700">
        <Save className="w-4 h-4 mr-2" />
        {saving ? 'Guardando...' : 'Guardar configuración'}
      </Button>
    </div>
  );
}