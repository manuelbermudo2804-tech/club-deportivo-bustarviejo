import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Save, Star, Medal, Award } from "lucide-react";
import { toast } from "sonner";

// Panel admin para introducir resultados FINALES del Mundial:
// - Campeón, Subcampeón, Tercer puesto
// - Predicciones especiales reales (mejor jugador, goleador, portero, joven)
// Esto es lo que el motor de puntuación usa para puntuar a los participantes.
export default function PorraAdminResultadosFinales({ config, equipos, onUpdate }) {
  const [form, setForm] = useState({
    campeon_real: '',
    subcampeon_real: '',
    tercer_puesto_real: '',
    mejor_jugador: '',
    maximo_goleador: '',
    mejor_portero: '',
    mejor_joven: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setForm({
        campeon_real: config.campeon_real || '',
        subcampeon_real: config.subcampeon_real || '',
        tercer_puesto_real: config.tercer_puesto_real || '',
        mejor_jugador: config.resultados_especiales_reales?.mejor_jugador || '',
        maximo_goleador: config.resultados_especiales_reales?.maximo_goleador || '',
        mejor_portero: config.resultados_especiales_reales?.mejor_portero || '',
        mejor_joven: config.resultados_especiales_reales?.mejor_joven || '',
      });
    }
  }, [config]);

  const equiposOrdenados = [...(equipos || [])].sort((a, b) => a.nombre.localeCompare(b.nombre));

  const guardar = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await base44.entities.PorraConfig.update(config.id, {
        campeon_real: form.campeon_real || null,
        subcampeon_real: form.subcampeon_real || null,
        tercer_puesto_real: form.tercer_puesto_real || null,
        resultados_especiales_reales: {
          mejor_jugador: form.mejor_jugador || '',
          maximo_goleador: form.maximo_goleador || '',
          mejor_portero: form.mejor_portero || '',
          mejor_joven: form.mejor_joven || '',
        },
      });
      toast.success('✅ Resultados finales guardados');
      onUpdate?.();
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const SelectEquipo = ({ value, onChange, placeholder }) => (
    <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? '' : v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value="none">— Sin definir —</SelectItem>
        {equiposOrdenados.map(eq => (
          <SelectItem key={eq.codigo} value={eq.codigo}>
            {eq.bandera_emoji} {eq.nombre} ({eq.codigo})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-4">
      <Card className="border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Trophy className="w-8 h-8 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-black text-yellow-900 text-lg">Resultados Finales del Mundial</h3>
              <p className="text-sm text-yellow-800 mt-1">
                Aquí introduces los <strong>resultados oficiales</strong> que el sistema usará para puntuar a los participantes:
                campeón, subcampeón, 3º puesto y las predicciones especiales.
                Tras guardar, recuerda ejecutar <strong>"Recalcular puntos"</strong> desde la pestaña Participantes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Podio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="w-5 h-5 text-yellow-600" />
            🏆 Podio final
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-bold">🥇 Campeón ({config?.puntos_campeon || 25} pts)</Label>
            <SelectEquipo
              value={form.campeon_real}
              onChange={(v) => setForm({ ...form, campeon_real: v })}
              placeholder="Selecciona el campeón..."
            />
          </div>
          <div>
            <Label className="text-sm font-bold">🥈 Subcampeón ({config?.puntos_final || 20} pts si acertaron finalistas)</Label>
            <SelectEquipo
              value={form.subcampeon_real}
              onChange={(v) => setForm({ ...form, subcampeon_real: v })}
              placeholder="Selecciona el subcampeón..."
            />
          </div>
          <div>
            <Label className="text-sm font-bold">🥉 Tercer puesto ({config?.puntos_tercer_puesto_ganador || 14} pts)</Label>
            <SelectEquipo
              value={form.tercer_puesto_real}
              onChange={(v) => setForm({ ...form, tercer_puesto_real: v })}
              placeholder="Selecciona el 3er puesto..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Especiales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-purple-600" />
            ⭐ Predicciones especiales — {config?.puntos_prediccion_especial || 10} pts cada acierto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
            <strong>Ojo:</strong> los participantes predicen <strong>equipos</strong> (no jugadores), así que aquí también seleccionas el equipo al que pertenece el premiado (ej: si el mejor jugador es Lamine Yamal, eliges España).
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-bold">⭐ Mejor jugador (equipo)</Label>
              <SelectEquipo
                value={form.mejor_jugador}
                onChange={(v) => setForm({ ...form, mejor_jugador: v })}
                placeholder="Equipo del mejor jugador..."
              />
            </div>
            <div>
              <Label className="text-sm font-bold">⚽ Máximo goleador (equipo)</Label>
              <SelectEquipo
                value={form.maximo_goleador}
                onChange={(v) => setForm({ ...form, maximo_goleador: v })}
                placeholder="Equipo del máximo goleador..."
              />
            </div>
            <div>
              <Label className="text-sm font-bold">🧤 Mejor portero (equipo)</Label>
              <SelectEquipo
                value={form.mejor_portero}
                onChange={(v) => setForm({ ...form, mejor_portero: v })}
                placeholder="Equipo del mejor portero..."
              />
            </div>
            <div>
              <Label className="text-sm font-bold">🌟 Mejor jugador joven (equipo)</Label>
              <SelectEquipo
                value={form.mejor_joven}
                onChange={(v) => setForm({ ...form, mejor_joven: v })}
                placeholder="Equipo del mejor joven..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end sticky bottom-4">
        <Button
          onClick={guardar}
          disabled={saving}
          size="lg"
          className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white shadow-xl"
        >
          {saving ? <Award className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
          Guardar resultados finales
        </Button>
      </div>
    </div>
  );
}