import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Gift, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import RafflePrizeConfig from "@/components/season/RafflePrizeConfig";

export default function ReferralConfigCard({ seasonConfig, onUpdate, isUpdating, updateSeasonMutation }) {
  const [expanded, setExpanded] = useState(false);
  const activo = seasonConfig?.programa_referidos_activo === true;

  const update = (data) => onUpdate(data);

  return (
    <Card className={`border-2 ${activo ? 'border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50' : 'border-slate-200'}`}>
      <CardHeader className="cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activo ? 'bg-purple-600' : 'bg-slate-300'}`}>
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Trae un Socio Amigo
                {activo && <Badge className="bg-purple-600 text-white"><Sparkles className="w-3 h-3 mr-1" />Activo</Badge>}
              </CardTitle>
              <p className="text-xs text-slate-600">Cada amigo validado = 1 papeleta para el sorteo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={activo} onCheckedChange={(checked) => update({ programa_referidos_activo: checked })} onClick={(e) => e.stopPropagation()} />
            {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          <RafflePrizeConfig activeSeason={seasonConfig} updateSeasonMutation={updateSeasonMutation} />

        </CardContent>
      )}
    </Card>
  );
}
