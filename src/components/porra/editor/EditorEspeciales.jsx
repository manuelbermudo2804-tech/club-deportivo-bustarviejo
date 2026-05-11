import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Trophy, Shield, Sparkles, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const ESPECIALES = [
  {
    key: 'mejor_jugador',
    titulo: 'Mejor jugador del torneo',
    icono: '⭐',
    desc: 'El "Balón de Oro" del Mundial. Eliges la selección a la que pertenece.',
    color: 'from-yellow-400 to-orange-500',
  },
  {
    key: 'maximo_goleador',
    titulo: 'Máximo goleador',
    icono: '⚽',
    desc: 'El "Bota de Oro". Eliges la selección del jugador con más goles.',
    color: 'from-green-500 to-emerald-600',
  },
  {
    key: 'mejor_portero',
    titulo: 'Mejor portero',
    icono: '🧤',
    desc: 'El "Guante de Oro". Eliges la selección del mejor portero del torneo.',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    key: 'mejor_joven',
    titulo: 'Mejor joven',
    icono: '🌟',
    desc: 'El mejor sub-21. Eliges la selección del joven más destacado.',
    color: 'from-purple-500 to-pink-600',
  },
];

// Editor de predicciones especiales: 4 categorías, cada una recibe 10 puntos
export default function EditorEspeciales({ participante, equipos, isBlocked, onSetEspecial }) {
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(null);

  const equiposFiltrados = equipos.filter(e => 
    !busqueda || 
    e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.codigo.toLowerCase().includes(busqueda.toLowerCase())
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className="space-y-4">
      <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-4 text-sm">
        <p className="font-bold text-pink-900 mb-1">⭐ Predicciones especiales</p>
        <p className="text-pink-800 text-xs">
          Elige la <strong>selección</strong> a la que pertenecerá el jugador ganador de cada premio individual. 
          Cada acierto te da <strong>10 puntos</strong>. Total: <strong>40 puntos extra</strong>.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {ESPECIALES.map(esp => {
          const codigoSel = participante.predicciones_especiales?.[esp.key];
          const equipoSel = equipos.find(e => e.codigo === codigoSel);
          const isOpen = abierto === esp.key;

          return (
            <Card key={esp.key} className={`border-2 transition-all ${equipoSel ? 'border-green-400 shadow-lg' : 'border-slate-200'}`}>
              <button
                onClick={() => { setAbierto(isOpen ? null : esp.key); setBusqueda(''); }}
                className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className={`bg-gradient-to-br ${esp.color} text-white rounded-lg p-3 mb-3 text-center`}>
                  <div className="text-4xl mb-1">{esp.icono}</div>
                  <p className="font-black text-sm">{esp.titulo}</p>
                </div>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">{esp.desc}</p>

                {equipoSel ? (
                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 flex items-center gap-2">
                    <span className="text-2xl">{equipoSel.bandera_emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-green-700 font-bold">Tu apuesta:</p>
                      <p className="font-bold text-slate-900 truncate">{equipoSel.nombre}</p>
                    </div>
                    <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full font-bold">Cambiar</span>
                  </div>
                ) : (
                  <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg p-3 text-center text-sm text-slate-500">
                    Click para elegir selección
                  </div>
                )}
              </button>

              {isOpen && (
                <CardContent className="border-t pt-3 space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Buscar selección..."
                      value={busqueda}
                      onChange={e => setBusqueda(e.target.value)}
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto grid grid-cols-2 gap-1.5">
                    {equiposFiltrados.map(eq => {
                      const seleccionado = codigoSel === eq.codigo;
                      return (
                        <button
                          key={eq.codigo}
                          disabled={isBlocked}
                          onClick={() => { onSetEspecial(esp.key, eq.codigo); setAbierto(null); }}
                          className={`p-2 rounded-lg text-xs flex items-center gap-2 transition-all ${
                            seleccionado
                              ? 'bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-lg'
                              : 'bg-white border hover:bg-orange-50 hover:border-orange-300'
                          }`}
                        >
                          <span className="text-base">{eq.bandera_emoji}</span>
                          <span className="truncate font-medium">{eq.nombre}</span>
                        </button>
                      );
                    })}
                  </div>
                  {equiposFiltrados.length === 0 && (
                    <p className="text-center text-xs text-slate-500 py-3">No se encontraron selecciones</p>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}