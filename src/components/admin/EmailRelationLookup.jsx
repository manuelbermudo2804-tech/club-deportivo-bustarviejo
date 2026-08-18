import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle2, XCircle } from "lucide-react";

const calcularEdad = (fechaNac) => {
  if (!fechaNac) return null;
  const hoy = new Date();
  const n = new Date(fechaNac);
  let edad = hoy.getFullYear() - n.getFullYear();
  const m = hoy.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) edad--;
  return edad;
};

const ROLES = [
  { key: "email_padre", label: "👤 Tutor 1 (principal)" },
  { key: "email_tutor_2", label: "👥 Segundo progenitor" },
  { key: "email_jugador", label: "🎽 Jugador/a +18" },
  { key: "acceso_menor_email", label: "🧒 Acceso juvenil (menor)" },
];

export default function EmailRelationLookup({ players = [], users = [] }) {
  const [email, setEmail] = useState("");
  const term = email.trim().toLowerCase();

  const result = useMemo(() => {
    if (!term.includes("@")) return null;
    const matches = [];
    players.forEach((p) => {
      ROLES.forEach(({ key, label }) => {
        if ((p[key] || "").trim().toLowerCase() === term) {
          matches.push({ player: p, rol: label });
        }
      });
    });
    const cuenta = users.find((u) => (u.email || "").trim().toLowerCase() === term);
    return { matches, cuenta };
  }, [term, players, users]);

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="w-4 h-4 text-orange-600" />
          Comprobar un correo
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <Input
          type="email"
          placeholder="correo@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {!result && (
          <p className="text-sm text-slate-500">
            Escribe un correo para ver al instante si está relacionado con algún jugador.
          </p>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              {result.cuenta ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>
                    Tiene cuenta en la app: <strong>{result.cuenta.full_name || result.cuenta.email}</strong>
                    {result.cuenta.tipo_panel && ` · panel ${result.cuenta.tipo_panel}`}
                    {result.cuenta.codigo_acceso_validado ? " · validado" : " · sin validar"}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">Todavía no ha iniciado sesión con este correo</span>
                </>
              )}
            </div>

            {result.matches.length === 0 ? (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                ❌ Este correo no aparece en ninguna ficha de jugador. Necesitará código de acceso.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-green-700">
                  ✅ Relacionado con {result.matches.length} ficha(s) — entraría sin código
                </p>
                {result.matches.map(({ player, rol }, i) => {
                  const edad = calcularEdad(player.fecha_nacimiento);
                  return (
                    <div key={i} className="rounded-lg border border-slate-200 p-3 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{player.nombre}</span>
                      <Badge variant="secondary">{rol}</Badge>
                      {player.categoria_principal && (
                        <Badge variant="outline">{player.categoria_principal}</Badge>
                      )}
                      {edad !== null && (
                        <Badge variant="outline">{edad} años {edad >= 18 ? "(+18)" : ""}</Badge>
                      )}
                      <Badge className={player.activo ? "bg-green-600" : "bg-slate-400"}>
                        {player.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}