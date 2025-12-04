import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Gift, Users, Shirt, Ticket, Hotel, Save, ChevronDown, ChevronUp, Sparkles, Trophy, Plus, Trash2, UtensilsCrossed, Gamepad2, ShoppingBag, Star, MessageCircle } from "lucide-react";

const DEFAULT_PRIZES = [
  { nombre: "Cena para dos", descripcion: "Cena en restaurante local", emoji: "🍽️" },
  { nombre: "Entradas fútbol", descripcion: "Entradas para partido profesional", emoji: "⚽" },
  { nombre: "Material deportivo", descripcion: "Balón, mochila o equipamiento", emoji: "🎒" },
  { nombre: "Experiencia aventura", descripcion: "Karting, escape room, etc.", emoji: "🎮" },
  { nombre: "Vale de compra", descripcion: "Vale en tiendas locales", emoji: "🛍️" }
];

export default function ReferralConfigCard({ seasonConfig, onUpdate, isUpdating }) {
  const [expanded, setExpanded] = useState(false);
  
  const getConfigFromSeason = () => {
    // Solo leer valores de seasonConfig, respetando explícitamente los false
    const config = {
      programa_referidos_activo: seasonConfig?.programa_referidos_activo === true,
      referidos_permitir_whatsapp_padres: seasonConfig?.referidos_permitir_whatsapp_padres ?? true,
      tier_1_activo: seasonConfig?.tier_1_activo ?? true,
      tier_3_activo: seasonConfig?.tier_3_activo ?? true,
      tier_5_activo: seasonConfig?.tier_5_activo ?? true,
      tier_10_activo: seasonConfig?.tier_10_activo ?? true,
      tier_15_activo: seasonConfig?.tier_15_activo ?? true,
      referidos_premio_1: seasonConfig?.referidos_premio_1 ?? 5,
      referidos_premio_3: seasonConfig?.referidos_premio_3 ?? 15,
      referidos_sorteo_3: seasonConfig?.referidos_sorteo_3 ?? 1,
      referidos_premio_5: seasonConfig?.referidos_premio_5 ?? 25,
      referidos_sorteo_5: seasonConfig?.referidos_sorteo_5 ?? 3,
      referidos_premio_10: seasonConfig?.referidos_premio_10 ?? 50,
      referidos_sorteo_10: seasonConfig?.referidos_sorteo_10 ?? 5,
      referidos_premio_15: seasonConfig?.referidos_premio_15 ?? 50,
      referidos_sorteo_15: seasonConfig?.referidos_sorteo_15 ?? 10,
      referidos_premio_hotel: seasonConfig?.referidos_premio_hotel ?? true,
      sorteo_premios: seasonConfig?.sorteo_premios || DEFAULT_PRIZES
    };
    return config;
  };

  const [localConfig, setLocalConfig] = useState(() => getConfigFromSeason());
  const [isInitialized, setIsInitialized] = useState(false);

  // Inicializar SOLO una vez cuando llega seasonConfig por primera vez
  useEffect(() => {
    if (seasonConfig?.id && !isInitialized) {
      setLocalConfig(getConfigFromSeason());
      setIsInitialized(true);
    }
  }, [seasonConfig?.id, isInitialized]);

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
  };

  const hasChanges = JSON.stringify(localConfig) !== JSON.stringify(getConfigFromSeason());

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
                <p className="text-xs text-slate-600">Incentivos para socios que traigan amigos y familiares</p>
              </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={localConfig.programa_referidos_activo}
              onCheckedChange={(checked) => {
                setLocalConfig(prev => ({ ...prev, programa_referidos_activo: checked }));
                // Guardar inmediatamente al cambiar el switch principal
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
          {/* Opción de WhatsApp para padres */}
          <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-green-600" />
                <div>
                  <Label className="font-semibold text-green-900">Permitir a padres compartir por WhatsApp</Label>
                  <p className="text-xs text-green-700">Si está desactivado, los padres no verán el botón de compartir su enlace por WhatsApp en la tarjeta de referidos</p>
                </div>
              </div>
              <Switch
                checked={localConfig.referidos_permitir_whatsapp_padres}
                onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, referidos_permitir_whatsapp_padres: checked }))}
              />
            </div>
          </div>

          {/* Tier 1: 1 socio */}
          <div className={`rounded-xl p-4 border-2 transition-all ${localConfig.tier_1_activo ? 'bg-blue-50 border-blue-200' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <Badge className={localConfig.tier_1_activo ? "bg-blue-600" : "bg-slate-400"}>🎁 1 Socio</Badge>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-600">Activar</Label>
                <Switch
                  checked={localConfig.tier_1_activo}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, tier_1_activo: checked }))}
                />
              </div>
            </div>
            {localConfig.tier_1_activo && (
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3">
                  <Shirt className="w-5 h-5 text-green-600" />
                  <Label className="text-sm">Crédito en ropa (€):</Label>
                  <Input
                    type="number"
                    value={localConfig.referidos_premio_1}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_premio_1: Number(e.target.value) }))}
                    className="w-20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tier 2: 3 socios */}
          <div className={`rounded-xl p-4 border-2 transition-all ${localConfig.tier_3_activo ? 'bg-green-50 border-green-200' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <Badge className={localConfig.tier_3_activo ? "bg-green-600" : "bg-slate-400"}>⭐ 3 Socios</Badge>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-600">Activar</Label>
                <Switch
                  checked={localConfig.tier_3_activo}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, tier_3_activo: checked }))}
                />
              </div>
            </div>
            {localConfig.tier_3_activo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <Shirt className="w-5 h-5 text-green-600" />
                  <Label className="text-sm">Crédito en ropa (€):</Label>
                  <Input
                    type="number"
                    value={localConfig.referidos_premio_3}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_premio_3: Number(e.target.value) }))}
                    className="w-20"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Ticket className="w-5 h-5 text-orange-600" />
                  <Label className="text-sm">Participaciones sorteo:</Label>
                  <Input
                    type="number"
                    value={localConfig.referidos_sorteo_3}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_sorteo_3: Number(e.target.value) }))}
                    className="w-20"
                  />
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
                <Switch
                  checked={localConfig.tier_5_activo}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, tier_5_activo: checked }))}
                />
              </div>
            </div>
            {localConfig.tier_5_activo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <Shirt className="w-5 h-5 text-green-600" />
                  <Label className="text-sm">Crédito en ropa (€):</Label>
                  <Input
                    type="number"
                    value={localConfig.referidos_premio_5}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_premio_5: Number(e.target.value) }))}
                    className="w-20"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Ticket className="w-5 h-5 text-orange-600" />
                  <Label className="text-sm">Participaciones sorteo:</Label>
                  <Input
                    type="number"
                    value={localConfig.referidos_sorteo_5}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_sorteo_5: Number(e.target.value) }))}
                    className="w-20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tier 4: 10 socios */}
          <div className={`rounded-xl p-4 border-2 transition-all ${localConfig.tier_10_activo ? 'bg-purple-50 border-purple-200' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge className={localConfig.tier_10_activo ? "bg-purple-600" : "bg-slate-400"}>👑 10 Socios</Badge>
                {localConfig.tier_10_activo && <span className="text-xs text-purple-600">+ Reconocimiento en la web</span>}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-600">Activar</Label>
                <Switch
                  checked={localConfig.tier_10_activo}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, tier_10_activo: checked }))}
                />
              </div>
            </div>
            {localConfig.tier_10_activo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3">
                  <Shirt className="w-5 h-5 text-green-600" />
                  <Label className="text-sm">Crédito en ropa (€):</Label>
                  <Input
                    type="number"
                    value={localConfig.referidos_premio_10}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_premio_10: Number(e.target.value) }))}
                    className="w-20"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Ticket className="w-5 h-5 text-orange-600" />
                  <Label className="text-sm">Participaciones sorteo:</Label>
                  <Input
                    type="number"
                    value={localConfig.referidos_sorteo_10}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_sorteo_10: Number(e.target.value) }))}
                    className="w-20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tier 5: 15 socios */}
          <div className={`rounded-xl p-4 border-2 transition-all ${localConfig.tier_15_activo ? 'bg-pink-50 border-pink-300' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <Badge className={localConfig.tier_15_activo ? "bg-pink-600" : "bg-slate-400"}>🏨 15 Socios - PREMIO ESTRELLA</Badge>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-600">Activar</Label>
                <Switch
                  checked={localConfig.tier_15_activo}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, tier_15_activo: checked }))}
                />
              </div>
            </div>
            {localConfig.tier_15_activo && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3">
                    <Shirt className="w-5 h-5 text-green-600" />
                    <Label className="text-sm">Crédito en ropa (€):</Label>
                    <Input
                      type="number"
                      value={localConfig.referidos_premio_15}
                      onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_premio_15: Number(e.target.value) }))}
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Ticket className="w-5 h-5 text-orange-600" />
                    <Label className="text-sm">Participaciones sorteo:</Label>
                    <Input
                      type="number"
                      value={localConfig.referidos_sorteo_15}
                      onChange={(e) => setLocalConfig(prev => ({ ...prev, referidos_sorteo_15: Number(e.target.value) }))}
                      className="w-20"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-pink-200">
                  <Hotel className="w-5 h-5 text-pink-600" />
                  <Label className="text-sm font-medium">Incluir noche de hotel para dos:</Label>
                  <Switch
                    checked={localConfig.referidos_premio_hotel}
                    onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, referidos_premio_hotel: checked }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Premios del Sorteo */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border-2 border-yellow-300">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <h3 className="font-bold text-yellow-900">🎰 Premios del Sorteo</h3>
            </div>
            <p className="text-xs text-yellow-700 mb-4">
              Estos son los premios que se sortearán entre los participantes. Puedes añadir, editar o eliminar premios.
            </p>

            {/* Lista de premios existentes */}
            <div className="space-y-2 mb-4">
              {(localConfig.sorteo_premios || []).map((prize, index) => (
                <div key={index} className={`flex items-center gap-2 rounded-lg p-2 border transition-all ${prize.activo !== false ? 'bg-white border-yellow-300' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                  <Switch
                    checked={prize.activo !== false}
                    onCheckedChange={(checked) => updatePrize(index, 'activo', checked)}
                  />
                  <Input
                    value={prize.emoji}
                    onChange={(e) => updatePrize(index, 'emoji', e.target.value)}
                    className="w-14 text-center text-lg"
                    maxLength={2}
                    disabled={prize.activo === false}
                  />
                  <Input
                    value={prize.nombre}
                    onChange={(e) => updatePrize(index, 'nombre', e.target.value)}
                    placeholder="Nombre del premio"
                    className="flex-1"
                    disabled={prize.activo === false}
                  />
                  <Input
                    value={prize.descripcion}
                    onChange={(e) => updatePrize(index, 'descripcion', e.target.value)}
                    placeholder="Descripción"
                    className="flex-1"
                    disabled={prize.activo === false}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePrize(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Añadir nuevo premio */}
            <div className="flex items-center gap-2 bg-yellow-100 rounded-lg p-2 border-2 border-dashed border-yellow-400">
              <Input
                value={newPrize.emoji}
                onChange={(e) => setNewPrize(prev => ({ ...prev, emoji: e.target.value }))}
                placeholder="🎁"
                className="w-14 text-center text-lg bg-white"
                maxLength={2}
              />
              <Input
                value={newPrize.nombre}
                onChange={(e) => setNewPrize(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Nombre del premio"
                className="flex-1 bg-white"
              />
              <Input
                value={newPrize.descripcion}
                onChange={(e) => setNewPrize(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Descripción"
                className="flex-1 bg-white"
              />
              <Button
                type="button"
                onClick={addPrize}
                disabled={!newPrize.nombre}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Botón guardar */}
          {hasChanges && (
            <Button 
              onClick={handleSave} 
              disabled={isUpdating}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Configuración de Referidos
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}