import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export default function MySignupsHistory({ signups, opportunities }) {
  if (!signups || signups.length === 0) return null;

  const oppMap = {};
  (opportunities || []).forEach(o => { oppMap[o.id] = o; });

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-bold text-base mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" /> Mis inscripciones
        </h3>
        <div className="space-y-2">
          {signups.map(s => {
            const opp = oppMap[s.opportunity_id];
            return (
              <div key={s.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 flex-shrink-0">
                  ✅
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{opp?.titulo || "Oportunidad"}</span>
                  {opp?.fecha && <span className="text-xs text-slate-500 ml-2">📅 {opp.fecha}</span>}
                  {s.por_quien && s.por_quien !== "yo" && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">Para: {s.volunteer_nombre}</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}