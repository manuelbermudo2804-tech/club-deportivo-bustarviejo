import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, ExternalLink, BookOpen, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function HealthTipCard({ tip, onEdit }) {
  const [showDetail, setShowDetail] = useState(false);

  const categoryEmojis = {
    "Nutrición": "🥗",
    "Ejercicios": "💪",
    "Hidratación": "💧",
    "Descanso": "😴",
    "Pre-partido": "⚽",
    "Post-partido": "🏁",
    "Lesiones": "🏥"
  };

  const categoryColors = {
    "Nutrición": "bg-green-100 text-green-700",
    "Ejercicios": "bg-blue-100 text-blue-700",
    "Hidratación": "bg-cyan-100 text-cyan-700",
    "Descanso": "bg-purple-100 text-purple-700",
    "Pre-partido": "bg-orange-100 text-orange-700",
    "Post-partido": "bg-red-100 text-red-700",
    "Lesiones": "bg-pink-100 text-pink-700"
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white overflow-hidden group cursor-pointer h-full">
          {/* Imagen */}
          {tip.imagen_url && (
            <div className="relative h-48 overflow-hidden">
              <img
                src={tip.imagen_url}
                alt={tip.titulo}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              {tip.destacado && (
                <div className="absolute top-3 left-3">
                  <Badge className="bg-orange-600 text-white">⭐ Destacado</Badge>
                </div>
              )}
            </div>
          )}

          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <Badge className={categoryColors[tip.categoria]}>
                {categoryEmojis[tip.categoria]} {tip.categoria}
              </Badge>
              {!tip.publicado && (
                <Badge variant="outline" className="text-xs">
                  Borrador
                </Badge>
              )}
            </div>

            <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2">
              {tip.titulo}
            </h3>
            
            <p className="text-sm text-slate-600 mb-3 line-clamp-3">
              {tip.contenido}
            </p>

            {tip.para_quien && tip.para_quien !== "Todos" && (
              <p className="text-xs text-slate-500 mb-3">
                👥 Para: {tip.para_quien}
              </p>
            )}

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetail(true)}
                className="hover:bg-green-50"
              >
                <BookOpen className="w-4 h-4 mr-1" />
                Leer más
              </Button>
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(tip)}
                  className="hover:bg-orange-50"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Modal de detalle */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl pr-8">{tip.titulo}</DialogTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={categoryColors[tip.categoria]}>
                {categoryEmojis[tip.categoria]} {tip.categoria}
              </Badge>
              {tip.para_quien && tip.para_quien !== "Todos" && (
                <Badge variant="outline">
                  👥 {tip.para_quien}
                </Badge>
              )}
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            {tip.imagen_url && (
              <img
                src={tip.imagen_url}
                alt={tip.titulo}
                className="w-full h-64 object-cover rounded-lg"
              />
            )}

            <div className="prose prose-slate max-w-none">
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {tip.contenido}
              </p>
            </div>

            {tip.fuente && (
              <div className="bg-slate-50 rounded-lg p-4 border-l-4 border-orange-600">
                <p className="text-sm text-slate-600">
                  <strong>Fuente:</strong> {tip.fuente}
                </p>
              </div>
            )}

            {tip.link_externo && (
              <div className="pt-4 border-t">
                <a
                  href={tip.link_externo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Más información
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}