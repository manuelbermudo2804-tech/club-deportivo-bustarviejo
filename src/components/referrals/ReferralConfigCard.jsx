import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Gift, Ticket, ChevronDown, ChevronUp, Sparkles, FlaskConical, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import RafflePrizeConfig from "@/components/season/RafflePrizeConfig";

export default function ReferralConfigCard({ seasonConfig, onUpdate, isUpdating, updateSeasonMutation }) {
  const [expanded, setExpanded] = useState(false);
  const [users, setUsers] = useState([]);
  const activo = seasonConfig?.programa_referidos_activo === true;
  const modoPrueba = seasonConfig?.programa_referidos_modo_prueba === true;
  const bonusFemenino = seasonConfig?.bonus_femenino_activo ?? false;
  const testerEmail = seasonConfig?.programa_referidos_usuario_prueba_email || "";

  useEffect(() => {
    base44.entities.User.list().then(setUsers).catch(() => setUsers([]));
  }, []);

  const update = (data) => onUpdate(data);
  const tester = users.find(u => u.email?.toLowerCase() === testerEmail.toLowerCase());

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
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-blue-700" />
                <div>
                  <p className="font-semibold text-slate-900">Modo de pruebas</p>
                  <p className="text-xs text-slate-600">Permite probar el circuito sin activar el programa para las familias.</p>
                </div>
              </div>
              <Switch checked={modoPrueba} onCheckedChange={(checked) => update({ programa_referidos_modo_prueba: checked })} />
            </div>
            {modoPrueba && (
              <div className="space-y-2 border-t border-blue-200 pt-3">
                <Label>Único usuario autorizado</Label>
                <select
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={testerEmail}
                  onChange={(e) => update({ programa_referidos_usuario_prueba_email: e.target.value })}
                >
                  <option value="">Selecciona el usuario que hará las pruebas</option>
                  {users.filter(u => u.email).sort((a,b) => (a.full_name || a.email).localeCompare(b.full_name || b.email)).map(u => (
                    <option key={u.id} value={u.email}>{u.full_name || u.email} · {u.email}</option>
                  ))}
                </select>
                {testerEmail ? (
                  <div className="flex items-center gap-2 rounded-lg bg-white p-3 text-sm text-blue-900">
                    <UserRound className="h-4 w-4 shrink-0" />
                    <span>Autorizado: <strong>{tester?.full_name || testerEmail}</strong>. Solo esta cuenta podrá acceder al modo de pruebas.</span>
                  </div>
                ) : (
                  <p className="text-xs text-amber-800">Selecciona un usuario para habilitar el acceso de pruebas.</p>
                )}
                <p className="text-xs text-slate-600">El usuario seleccionado verá el programa real dentro de la app. Las altas de prueba no crearán socios oficiales ni pasarán por Stripe.</p>
              </div>
            )}
          </section>

          <RafflePrizeConfig activeSeason={seasonConfig} updateSeasonMutation={updateSeasonMutation} />

          <section className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">4</span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">Papeletas extra por fútbol femenino</p>
                    <p className="text-xs text-slate-500 mt-0.5">Opcional: premia más a quien traiga jugadoras.</p>
                  </div>
                  <Switch checked={bonusFemenino} onCheckedChange={(checked) => update({ bonus_femenino_activo: checked })} />
                </div>
                {bonusFemenino && (
                  <div className="mt-3 flex items-center gap-3">
                    <Ticket className="w-4 h-4 text-slate-500" />
                    <Label className="text-sm">Papeletas extra por jugadora:</Label>
                    <Input type="number" min="0" value={seasonConfig?.bonus_femenino_sorteos ?? 2} onChange={(e) => update({ bonus_femenino_sorteos: Number(e.target.value) })} className="w-20" />
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
