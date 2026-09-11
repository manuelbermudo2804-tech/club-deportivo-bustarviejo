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
        <CardContent className="space-y-3 pt-0">
          {/* Premio principal + umbral de rentabilidad */}
          <RafflePrizeConfig
            activeSeason={seasonConfig}
            updateSeasonMutation={updateSeasonMutation}
          />

          {/* BONUS FÚTBOL FEMENINO */}
          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                4
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Papeletas extra por fútbol femenino</p>
                    <p className="text-xs text-slate-500 mt-0.5">Opcional: premia más a quien traiga jugadoras.</p>
                  </div>
                  <Switch checked={bonusFemenino} onCheckedChange={(checked) => onUpdate({ bonus_femenino_activo: checked })} />
                </div>
                {bonusFemenino && (
                  <div className="mt-3 flex items-center gap-3">
                    <Ticket className="w-4 h-4 text-slate-500" />
                    <Label className="text-sm">Papeletas extra por jugadora:</Label>
                    <Input
                      type="number"
                      min="0"
                      value={seasonConfig?.bonus_femenino_sorteos ?? 2}
                      onChange={(e) => onUpdate({ bonus_femenino_sorteos: Number(e.target.value) })}
                      className="w-20"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>
        </CardContent>
      )}
    </Card>
  );
}