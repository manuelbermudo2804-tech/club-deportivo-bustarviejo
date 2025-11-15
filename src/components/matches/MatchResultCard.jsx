import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Pencil } from "lucide-react";

export default function MatchResultCard({ result, onEdit, isAdmin }) {
  const resultColor = {
    Victoria: "bg-green-100 text-green-800 border-green-300",
    Empate: "bg-orange-100 text-orange-800 border-orange-300",
    Derrota: "bg-red-100 text-red-800 border-red-300"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className={`border-2 ${resultColor[result.resultado]}`}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-slate-900 text-white">{result.categoria}</Badge>
              <Badge className={resultColor[result.resultado]}>
                {result.resultado}
              </Badge>
              {result.local_visitante && (
                <Badge variant="outline">{result.local_visitante}</Badge>
              )}
            </div>
            <h3 className="text-xl font-bold">{result.titulo_partido}</h3>
            <p className="text-slate-600 mt-1">vs {result.rival}</p>
          </div>
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={() => onEdit(result)}>
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-4 py-6">
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-1">CD Bustarviejo</p>
                <p className="text-5xl font-bold text-slate-900">{result.goles_favor}</p>
              </div>
              <div className="text-3xl font-bold text-slate-400">-</div>
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-1">{result.rival}</p>
                <p className="text-5xl font-bold text-slate-900">{result.goles_contra}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4" />
              <span>{new Date(result.fecha_partido).toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>

            {result.observaciones && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-700">{result.observaciones}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}