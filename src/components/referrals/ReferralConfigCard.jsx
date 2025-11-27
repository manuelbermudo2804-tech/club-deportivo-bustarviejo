import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Gift, Users, Shirt, Ticket, Hotel, Save, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

export default function ReferralConfigCard({ seasonConfig, onUpdate, isUpdating }) {
  const [expanded, setExpanded] = useState(false);
  const [localConfig, setLocalConfig] = useState({
    programa_referidos_activo: seasonConfig?.programa_referidos_activo || false,
    referidos_premio_1: seasonConfig?.referidos_premio_1 || 5,
    referidos_premio_3: seasonConfig?.referidos_premio_3 || 15,
    referidos_sorteo_3: seasonConfig?.referidos_sorteo_3 || 1,
    referidos_premio_5: seasonConfig?.referidos_premio_5 || 25,
    referidos_sorteo_5: seasonConfig?.referidos_sorteo_5 || 3,
    referidos_premio_10: seasonConfig?.referidos_premio_10 || 50,
    referidos_sorteo_10: seasonConfig?.referidos_sorteo_10 || 5,
    referidos_premio_15: seasonConfig?.referidos_premio_15 || 50,
    referidos_sorteo_15: seasonConfig?.referidos_sorteo_15 || 10,
    referidos_premio_hotel: seasonConfig?.referidos_premio_hotel !== false
  });

  const handleSave = () => {
    onUpdate(localConfig);
  };

  const hasChanges = JSON.stringify(localConfig) !== JSON.stringify({
    programa_referidos_activo: seasonConfig?.programa_referidos_activo || false,
    referidos_premio_1: seasonConfig?.referidos_premio_1 || 5,
    referidos_premio_3: seasonConfig?.referidos_premio_3 || 15,
    referidos_sorteo_3: seasonConfig?.referidos_sorteo_3 || 1,
    referidos_premio_5: seasonConfig?.referidos_premio_5 || 25,
    referidos_sorteo_5: seasonConfig?.referidos_sorteo_5 || 3,
    referidos_premio_10: seasonConfig?.referidos_premio_10 || 50,
    referidos_sorteo_10: seasonConfig?.referidos_sorteo_10 || 5,
    referidos_premio_15: seasonConfig?.referidos_premio_15 || 50,
    referidos_sorteo_15: seasonConfig?.referidos_sorteo_15 || 10,
    referidos_premio_hotel: seasonConfig?.referidos_premio_hotel !== false
  });

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
                Programa de Referidos
                {localConfig.programa_referidos_activo && (
                  <Badge className="bg-purple-600 text-white">
                    <Sparkles className="w-3 h-3 mr-1" /> Activo
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-slate-600">Incentivos para socios que traigan nuevos miembros</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={localConfig.programa_referidos_activo}
              onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, programa_referidos_activo: checked }))}
              onClick={(e) => e.stopPropagation()}
            />
            {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6 pt-0">
          {/* Tier 1: 1 socio */}
          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-blue-600">🎁 1 Socio</Badge>
            </div>
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
          </div>

          {/* Tier 2: 3 socios */}
          <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-green-600">⭐ 3 Socios</Badge>
            </div>
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
          </div>

          {/* Tier 3: 5 socios */}
          <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-orange-600">🏆 5 Socios</Badge>
            </div>
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
          </div>

          {/* Tier 4: 10 socios */}
          <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-purple-600">👑 10 Socios</Badge>
              <span className="text-xs text-purple-600">+ Reconocimiento en la web</span>
            </div>
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
          </div>

          {/* Tier 5: 15 socios */}
          <div className="bg-pink-50 rounded-xl p-4 border-2 border-pink-300">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-pink-600">🏨 15 Socios - PREMIO ESTRELLA</Badge>
            </div>
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