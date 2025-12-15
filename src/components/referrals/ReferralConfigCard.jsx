import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Gift, Shirt, Ticket, Hotel, Save, ChevronDown, ChevronUp, Sparkles, Trophy, Plus, Trash2, CheckCircle2 } from "lucide-react";

const DEFAULT_PRIZES = [
  { nombre: "Cena para dos", descripcion: "Cena en restaurante local", emoji: "🍽️" },
  { nombre: "Entradas fútbol", descripcion: "Entradas para partido profesional", emoji: "⚽" },
  { nombre: "Material deportivo", descripcion: "Balón, mochila o equipamiento", emoji: "🎒" },
  { nombre: "Experiencia aventura", descripcion: "Karting, escape room, etc.", emoji: "🎮" },
  { nombre: "Vale de compra", descripcion: "Vale en tiendas locales", emoji: "🛍️" }
];

export default function ReferralConfigCard({ seasonConfig, onUpdate, isUpdating }) {
  const [expanded, setExpanded] = useState(false);
  const [lastSeasonId, setLastSeasonId] = useState(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  
  const buildConfigFromSeason = (sc) => ({
    programa_referidos_activo: sc?.programa_referidos_activo === true,
    tier_1_activo: sc?.tier_1_activo ?? true,
    tier_3_activo: sc?.tier_3_activo ?? true,
    tier_5_activo: sc?.tier_5_activo ?? true,
    tier_10_activo: sc?.tier_10_activo ?? true,
    tier_15_activo: sc?.tier_15_activo ?? true,
    referidos_premio_1: sc?.referidos_premio_1 ?? 5,
    referidos_premio_3: sc?.referidos_premio_3 ?? 15,
    referidos_sorteo_3: sc?.referidos_sorteo_3 ?? 1,
    referidos_premio_5: sc?.referidos_premio_5 ?? 25,
    referidos_sorteo_5: sc?.referidos_sorteo_5 ?? 3,
    referidos_premio_10: sc?.referidos_premio_10 ?? 50,
    referidos_sorteo_10: sc?.referidos_sorteo_10 ?? 5,
    referidos_premio_15: sc?.referidos_premio_15 ?? 50,
    referidos_sorteo_15: sc?.referidos_sorteo_15 ?? 10,
    referidos_premio_hotel: sc?.referidos_premio_hotel ?? true,
    sorteo_premios: sc?.sorteo_premios || DEFAULT_PRIZES,
    bonus_femenino_activo: sc?.bonus_femenino_activo ?? false,
    bonus_femenino_credito: sc?.bonus_femenino_credito ?? 10,
    bonus_femenino_sorteos: sc?.bonus_femenino_sorteos ?? 2
  });

  const [localConfig, setLocalConfig] = useState(() => buildConfigFromSeason(seasonConfig));

  useEffect(() => {
    if (seasonConfig?.id && seasonConfig.id !== lastSeasonId) {
      setLocalConfig(buildConfigFromSeason(seasonConfig));
      setLastSeasonId(seasonConfig.id);
    }
  }, [seasonConfig?.id, lastSeasonId]);

  const [newPrize, setNewPrize] = useState({ nombre: "", descripcion: "", emoji: "🎁" });

  const addPrize = () => {
    if (!newPrize.nombre) return;
    setLocalConfig(prev => ({
      ...prev,
      sorteo_premios: [...(prev.sorteo_premios || []), { ...newPrize, activo: true }]
    }));
    setNewPrize({ nombre: "", descripcion: "", emoji: "🎁" });
  };

  const removePrize = (index) => {
    setLocalConfig(prev => ({
      ...prev,
      sorteo_premios: (prev.sorteo_premios || []).filter((_, i) => i !== index)
    }));
  };

  const updatePrize = (index, field, value) => {
    setLocalConfig(prev => ({
      ...prev,
      sorteo_premios: (prev.sorteo_premios || []).map((p, i) => i === index ? { ...p, [field]: value } : p)
    }));
  };

  const handleSave = () => {
    onUpdate(localConfig);
    setShowSuccessDialog(true);
  };

  const hasChanges = JSON.stringify(localConfig) !== JSON.stringify(buildConfigFromSeason(seasonConfig));

  return (
    <Card className={`border-2 ${localConfig.programa_referidos_activo ? 'border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50' : 'border-slate-200'}`}>
      <CardHeader 
        className="cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${localConfig.programa_referidos_activo ? 'bg-purple-600' : 'bg-slate-300'}`}>
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Trae un Socio Amigo
                {localConfig.programa_referidos_activo && (
                  <Badge className="bg-purple-600 text-white">
                    <Sparkles className="w-3 h-3 mr-1" /> Activo
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-slate-600">Incentivos para socios que traigan amigos (máx. 15)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={localConfig.programa_referidos_activo}
              onCheckedChange={(checked) => {
                setLocalConfig(prev => ({ ...prev, programa_referidos_activo: checked }));
                onUpdate({ programa_referidos_activo: checked });
              }}
              onClick={(e) => e.stopPropagation()}
            />
            {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6 pt-0">
          {/* Tier 1: 1 socio */}
          <div className={`rounded-xl p-4 border-2 transition-all ${localConfig.tier_1_activo ? 'bg-blue-50 border-blue-200' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <Badge className={localConfig.tier_1_activo ? "bg-blue-600" : "bg-slate-400"}>🎁 1 Socio</Badge>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-600">Activar</Label>
                <Switch checked={localConfig.tier_1_activo} onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, tier_1_activo: checked }))} />
              </div>
            </div>
            {localConfig.tier_1_activo && (
              <div className="flex items-center gap-3">
                <Shirt className="w-5 h-5 text-green-600" />
                <Label className="text-sm">Crédito en ropa (€):</Label>
                <Input type="number" value={localConfig.referidos_premio_1} onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_premio_1: Number(e.target.value) }))} className="w-20" />
              </div>
            )}
          </div>

          {/* Tier 2: 3 socios */}
          <div className={`rounded-xl p-4 border-2 transition-all ${localConfig.tier_3_activo ? 'bg-green-50 border-green-200' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <Badge className={localConfig.tier_3_activo ? "bg-green-600" : "bg-slate-400"}>⭐ 3 Socios</Badge>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-600">Activar</Label>
                <Switch checked={localConfig.tier_3_activo} onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, tier_3_activo: checked }))} />
              </div>
            </div>
            {localConfig.tier_3_activo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <Shirt className="w-5 h-5 text-green-600" />
                  <Label className="text-sm">Crédito (€):</Label>
                  <Input type="number" value={localConfig.referidos_premio_3} onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_premio_3: Number(e.target.value) }))} className="w-20" />
                </div>
                <div className="flex items-center gap-3">
                  <Ticket className="w-5 h-5 text-orange-600" />
                  <Label className="text-sm">Sorteos:</Label>
                  <Input type="number" value={localConfig.referidos_sorteo_3} onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_sorteo_3: Number(e.target.value) }))} className="w-20" />
                </div>
              </div>
            )}
          </div>

          {/* Tier 3: 5 socios */}
          <div className={`rounded-xl p-4 border-2 transition-all ${localConfig.tier_5_activo ? 'bg-orange-50 border-orange-200' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <Badge className={localConfig.tier_5_activo ? "bg-orange-600" : "bg-slate-400"}>🏆 5 Socios</Badge>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-600">Activar</Label>
                <Switch checked={localConfig.tier_5_activo} onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, tier_5_activo: checked }))} />
              </div>
            </div>
            {localConfig.tier_5_activo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <Shirt className="w-5 h-5 text-green-600" />
                  <Label className="text-sm">Crédito (€):</Label>
                  <Input type="number" value={localConfig.referidos_premio_5} onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_premio_5: Number(e.target.value) }))} className="w-20" />
                </div>
                <div className="flex items-center gap-3">
                  <Ticket className="w-5 h-5 text-orange-600" />
                  <Label className="text-sm">Sorteos:</Label>
                  <Input type="number" value={localConfig.referidos_sorteo_5} onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_sorteo_5: Number(e.target.value) }))} className="w-20" />
                </div>
              </div>
            )}
          </div>

          {/* Tier 4: 10 socios */}
          <div className={`rounded-xl p-4 border-2 transition-all ${localConfig.tier_10_activo ? 'bg-purple-50 border-purple-200' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge className={localConfig.tier_10_activo ? "bg-purple-600" : "bg-slate-400"}>👑 10 Socios</Badge>
                {localConfig.tier_10_activo && <span className="text-xs text-purple-600">+ Reconocimiento web</span>}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-600">Activar</Label>
                <Switch checked={localConfig.tier_10_activo} onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, tier_10_activo: checked }))} />
              </div>
            </div>
            {localConfig.tier_10_activo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <Shirt className="w-5 h-5 text-green-600" />
                  <Label className="text-sm">Crédito (€):</Label>
                  <Input type="number" value={localConfig.referidos_premio_10} onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_premio_10: Number(e.target.value) }))} className="w-20" />
                </div>
                <div className="flex items-center gap-3">
                  <Ticket className="w-5 h-5 text-orange-600" />
                  <Label className="text-sm">Sorteos:</Label>
                  <Input type="number" value={localConfig.referidos_sorteo_10} onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_sorteo_10: Number(e.target.value) }))} className="w-20" />
                </div>
              </div>
            )}
          </div>

          {/* Tier 5: 15 socios (MÁXIMO) */}
          <div className={`rounded-xl p-4 border-2 transition-all ${localConfig.tier_15_activo ? 'bg-pink-50 border-pink-300' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <Badge className={localConfig.tier_15_activo ? "bg-pink-600" : "bg-slate-400"}>🏨 15 Socios - MÁXIMO</Badge>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-600">Activar</Label>
                <Switch checked={localConfig.tier_15_activo} onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, tier_15_activo: checked }))} />
              </div>
            </div>
            {localConfig.tier_15_activo && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3">
                    <Shirt className="w-5 h-5 text-green-600" />
                    <Label className="text-sm">Crédito (€):</Label>
                    <Input type="number" value={localConfig.referidos_premio_15} onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_premio_15: Number(e.target.value) }))} className="w-20" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Ticket className="w-5 h-5 text-orange-600" />
                    <Label className="text-sm">Sorteos:</Label>
                    <Input type="number" value={localConfig.referidos_sorteo_15} onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_sorteo_15: Number(e.target.value) }))} className="w-20" />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-pink-200">
                  <Hotel className="w-5 h-5 text-pink-600" />
                  <Label className="text-sm font-medium">Incluir noche de hotel:</Label>
                  <Switch checked={localConfig.referidos_premio_hotel} onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, referidos_premio_hotel: checked }))} />
                </div>
              </div>
            )}
          </div>

          {/* BONUS FÚTBOL FEMENINO */}
          <div className="bg-gradient-to-r from-pink-50 to-fuchsia-50 rounded-xl p-4 border-2 border-pink-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge className={localConfig.bonus_femenino_activo ? "bg-pink-600" : "bg-slate-400"}>⚽👧 Bonus Fútbol Femenino</Badge>
                <span className="text-xs text-pink-700 font-medium">¡Doble premio!</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-600">Activar</Label>
                <Switch checked={localConfig.bonus_femenino_activo} onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, bonus_femenino_activo: checked }))} />
              </div>
            </div>
            {localConfig.bonus_femenino_activo && (
              <>
                <p className="text-xs text-pink-800 mb-3 bg-white/80 rounded-lg p-2">
                  💡 <strong>¡Incentivo especial!</strong> Los padres que inscriban jugadoras en el fútbol femenino reciben crédito EXTRA además del premio normal.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3">
                    <Shirt className="w-5 h-5 text-pink-600" />
                    <Label className="text-sm">Crédito Extra (€):</Label>
                    <Input type="number" value={localConfig.bonus_femenino_credito} onChange={(e) => setLocalConfig(prev => ({ ...prev, bonus_femenino_credito: Number(e.target.value) }))} className="w-20" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Ticket className="w-5 h-5 text-fuchsia-600" />
                    <Label className="text-sm">Sorteos Extra:</Label>
                    <Input type="number" value={localConfig.bonus_femenino_sorteos} onChange={(e) => setLocalConfig(prev => ({ ...prev, bonus_femenino_sorteos: Number(e.target.value) }))} className="w-20" />
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-2 italic">
                  Ejemplo: Si traes 1 jugadora femenina → {localConfig.referidos_premio_1}€ (normal) + {localConfig.bonus_femenino_credito}€ (bonus) = {(localConfig.referidos_premio_1 || 5) + (localConfig.bonus_femenino_credito || 10)}€ total
                </p>
              </>
            )}
          </div>

          {/* Premios del Sorteo */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border-2 border-yellow-300">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <h3 className="font-bold text-yellow-900">🎰 Premios del Sorteo</h3>
            </div>

            <div className="space-y-2 mb-4">
              {(localConfig.sorteo_premios || []).map((prize, index) => (
                <div key={index} className={`flex items-center gap-2 rounded-lg p-2 border transition-all ${prize.activo !== false ? 'bg-white border-yellow-300' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                  <Switch checked={prize.activo !== false} onCheckedChange={(checked) => updatePrize(index, 'activo', checked)} />
                  <Input value={prize.emoji} onChange={(e) => updatePrize(index, 'emoji', e.target.value)} className="w-14 text-center text-lg" maxLength={2} disabled={prize.activo === false} />
                  <Input value={prize.nombre} onChange={(e) => updatePrize(index, 'nombre', e.target.value)} placeholder="Nombre" className="flex-1" disabled={prize.activo === false} />
                  <Input value={prize.descripcion} onChange={(e) => updatePrize(index, 'descripcion', e.target.value)} placeholder="Descripción" className="flex-1" disabled={prize.activo === false} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removePrize(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-yellow-100 rounded-lg p-2 border-2 border-dashed border-yellow-400">
              <Input value={newPrize.emoji} onChange={(e) => setNewPrize(prev => ({ ...prev, emoji: e.target.value }))} placeholder="🎁" className="w-14 text-center text-lg bg-white" maxLength={2} />
              <Input value={newPrize.nombre} onChange={(e) => setNewPrize(prev => ({ ...prev, nombre: e.target.value }))} placeholder="Nombre" className="flex-1 bg-white" />
              <Input value={newPrize.descripcion} onChange={(e) => setNewPrize(prev => ({ ...prev, descripcion: e.target.value }))} placeholder="Descripción" className="flex-1 bg-white" />
              <Button type="button" onClick={addPrize} disabled={!newPrize.nombre} className="bg-yellow-600 hover:bg-yellow-700">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {hasChanges && (
            <Button onClick={handleSave} disabled={isUpdating} className="w-full bg-purple-600 hover:bg-purple-700">
              <Save className="w-4 h-4 mr-2" />
              Guardar Configuración
            </Button>
          )}
        </CardContent>
      )}

      {/* Dialog de éxito */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-center flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              ¡Configuración Guardada!
            </DialogTitle>
            <DialogDescription className="text-center">
              Los cambios se aplicarán inmediatamente al programa de referidos
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowSuccessDialog(false)} className="w-full bg-green-600 hover:bg-green-700 mt-4">
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </Card>
  );
}