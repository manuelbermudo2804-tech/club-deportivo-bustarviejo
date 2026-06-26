import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Gift, Ticket, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import RafflePrizeConfig from "@/components/season/RafflePrizeConfig";

export default function ReferralConfigCard({ seasonConfig, onUpdate, isUpdating, updateSeasonMutation }) {
  const [expanded, setExpanded] = useState(false);

  const activo = seasonConfig?.programa_referidos_activo === true;
  const bonusFemenino = seasonConfig?.bonus_femenino_activo ?? false;

  const update = (data) => onUpdate(data);

  return (
    <Card className={`border-2 ${activo ? 'border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50' : 'border-slate-200'}`}>
      <CardHeader
        className="cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activo ? 'bg-purple-600' : 'bg-slate-300'}`}>
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Trae un Socio Amigo
                {activo && (
                  <Badge className="bg-purple-600 text-white">
                    <Sparkles className="w-3 h-3 mr-1" /> Activo
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-slate-600">Cada amigo que traigas = 1 papeleta para el sorteo del premio</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={activo}
              onCheckedChange={(checked) => onUpdate({ programa_referidos_activo: checked })}
              onClick={(e) => e.stopPropagation()}
            />
            {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6 pt-0">
          {/* Cómo funciona */}
          <div className="rounded-xl p-4 border-2 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 text-sm">Sistema sencillo y justo</p>
                <p className="text-sm text-blue-800 mt-1">
                  Por cada amigo que un socio traiga al club, recibe <strong>1 papeleta</strong> con un número único
                  para el sorteo del premio principal. Cuantos más amigos traiga, más opciones tiene de ganar.
                </p>
              </div>
            </div>
          </div>

          {/* Premio principal + umbral de rentabilidad */}
          <RafflePrizeConfig
            activeSeason={seasonConfig}
            updateSeasonMutation={updateSeasonMutation}
          />

          {/* BONUS FÚTBOL FEMENINO */}
          <div className="bg-gradient-to-r from-pink-50 to-fuchsia-50 rounded-xl p-4 border-2 border-pink-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge className={bonusFemenino ? "bg-pink-600" : "bg-slate-400"}>⚽👧 Bonus Fútbol Femenino</Badge>
                <span className="text-xs text-pink-700 font-medium">¡Papeletas extra!</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-600">Activar</Label>
                <Switch checked={bonusFemenino} onCheckedChange={(checked) => onUpdate({ bonus_femenino_activo: checked })} />
              </div>
            </div>
            {bonusFemenino && (
              <>
                <p className="text-xs text-pink-800 mb-3 bg-white/80 rounded-lg p-2">
                  💡 <strong>¡Incentivo especial!</strong> Los socios que traigan jugadoras al fútbol femenino reciben papeletas EXTRA en el sorteo.
                </p>
                <div className="flex items-center gap-3">
                  <Ticket className="w-5 h-5 text-fuchsia-600" />
                  <Label className="text-sm">Papeletas extra por jugadora femenina:</Label>
                  <Input
                    type="number"
                    min="0"
                    value={seasonConfig?.bonus_femenino_sorteos ?? 2}
                    onChange={(e) => onUpdate({ bonus_femenino_sorteos: Number(e.target.value) })}
                    className="w-20"
                  />
                </div>
                <p className="text-xs text-slate-600 mt-2 italic">
                  Ejemplo: por cada jugadora referida al fútbol femenino, suma {seasonConfig?.bonus_femenino_sorteos || 2} papeletas extra en el sorteo.
                </p>
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}