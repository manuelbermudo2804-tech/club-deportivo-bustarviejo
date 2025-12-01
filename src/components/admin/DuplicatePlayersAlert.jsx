import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Users, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DuplicatePlayersAlert() {
  const [expanded, setExpanded] = useState(false);

  const { data: players = [] } = useQuery({
    queryKey: ['allPlayersForDuplicates'],
    queryFn: () => base44.entities.Player.list(),
    staleTime: 5 * 60 * 1000, // Cache 5 minutos
  });

  // Detectar duplicados por diferentes criterios
  const findDuplicates = () => {
    const duplicates = {
      byDni: [],
      byEmail: [],
      byName: []
    };

    const activePlayers = players.filter(p => p.activo);

    // Por DNI
    const dniMap = {};
    activePlayers.forEach(p => {
      if (p.dni_jugador) {
        const dni = p.dni_jugador.toUpperCase().replace(/\s/g, '');
        if (!dniMap[dni]) dniMap[dni] = [];
        dniMap[dni].push(p);
      }
    });
    Object.entries(dniMap).forEach(([dni, players]) => {
      if (players.length > 1) {
        duplicates.byDni.push({ dni, players });
      }
    });

    // Por Email
    const emailMap = {};
    activePlayers.forEach(p => {
      if (p.email_padre) {
        const email = p.email_padre.toLowerCase().trim();
        if (!emailMap[email]) emailMap[email] = [];
        emailMap[email].push(p);
      }
    });
    // No reportar emails duplicados si son hermanos del mismo padre (es normal)
    // Solo reportar si tienen el mismo nombre (posible duplicado real)
    Object.entries(emailMap).forEach(([email, players]) => {
      if (players.length > 1) {
        // Verificar si hay nombres muy similares (posible duplicado)
        const names = players.map(p => p.nombre?.toLowerCase().trim());
        const hasSimilarNames = names.some((name, i) => 
          names.some((other, j) => i !== j && (
            name === other || 
            levenshteinDistance(name, other) <= 3
          ))
        );
        if (hasSimilarNames) {
          duplicates.byEmail.push({ email, players });
        }
      }
    });

    // Por Nombre exacto + fecha nacimiento
    const nameMap = {};
    activePlayers.forEach(p => {
      if (p.nombre && p.fecha_nacimiento) {
        const key = `${p.nombre.toLowerCase().trim()}_${p.fecha_nacimiento}`;
        if (!nameMap[key]) nameMap[key] = [];
        nameMap[key].push(p);
      }
    });
    Object.entries(nameMap).forEach(([key, players]) => {
      if (players.length > 1) {
        duplicates.byName.push({ key, players });
      }
    });

    return duplicates;
  };

  // Función para calcular distancia de Levenshtein (similitud de nombres)
  const levenshteinDistance = (a, b) => {
    if (!a || !b) return 999;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  };

  const duplicates = findDuplicates();
  const totalDuplicates = duplicates.byDni.length + duplicates.byEmail.length + duplicates.byName.length;

  if (totalDuplicates === 0) return null;

  return (
    <Card className="border-2 border-amber-300 bg-amber-50 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertTriangle className="w-5 h-5" />
            ⚠️ Posibles Jugadores Duplicados
            <Badge className="bg-amber-600 text-white">{totalDuplicates}</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-amber-700"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          {/* Duplicados por DNI */}
          {duplicates.byDni.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-red-900 text-sm">🔴 Mismo DNI (Alta probabilidad de duplicado)</h4>
              {duplicates.byDni.map((dup, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border border-red-200">
                  <p className="text-xs text-slate-500 mb-2">DNI: <strong>{dup.dni}</strong></p>
                  <div className="space-y-1">
                    {dup.players.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span>{p.nombre} <Badge variant="outline" className="text-xs ml-2">{p.deporte}</Badge></span>
                        <Link to={createPageUrl("Players") + `?search=${encodeURIComponent(p.nombre)}`}>
                          <Button size="sm" variant="ghost" className="h-6 text-xs">
                            <Eye className="w-3 h-3 mr-1" />Ver
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Duplicados por Nombre + Fecha nacimiento */}
          {duplicates.byName.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-orange-900 text-sm">🟠 Mismo nombre y fecha de nacimiento</h4>
              {duplicates.byName.map((dup, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border border-orange-200">
                  <div className="space-y-1">
                    {dup.players.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span>{p.nombre} <Badge variant="outline" className="text-xs ml-2">{p.deporte}</Badge></span>
                        <Link to={createPageUrl("Players") + `?search=${encodeURIComponent(p.nombre)}`}>
                          <Button size="sm" variant="ghost" className="h-6 text-xs">
                            <Eye className="w-3 h-3 mr-1" />Ver
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Duplicados por Email con nombres similares */}
          {duplicates.byEmail.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-yellow-900 text-sm">🟡 Mismo email con nombres similares</h4>
              {duplicates.byEmail.map((dup, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border border-yellow-200">
                  <p className="text-xs text-slate-500 mb-2">Email: <strong>{dup.email}</strong></p>
                  <div className="space-y-1">
                    {dup.players.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span>{p.nombre} <Badge variant="outline" className="text-xs ml-2">{p.deporte}</Badge></span>
                        <Link to={createPageUrl("Players") + `?search=${encodeURIComponent(p.nombre)}`}>
                          <Button size="sm" variant="ghost" className="h-6 text-xs">
                            <Eye className="w-3 h-3 mr-1" />Ver
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800 text-xs">
              💡 Revisa estos casos y elimina o fusiona los duplicados desde la sección de <strong>Jugadores</strong>.
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
}