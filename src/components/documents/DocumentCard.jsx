import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { FileText, Download, ExternalLink, Edit, Trash2, CheckCircle, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function DocumentCard({ document, players, onEdit, onDelete, isAdmin }) {
  const typeColors = {
    "Estatutos": "bg-purple-100 text-purple-800",
    "Reglamentación": "bg-blue-100 text-blue-800",
    "Normativa Federación": "bg-green-100 text-green-800",
    "Autorización": "bg-orange-100 text-orange-800",
    "Consentimiento": "bg-red-100 text-red-800",
    "Información General": "bg-slate-100 text-slate-800",
    "Otro": "bg-gray-100 text-gray-800"
  };

  const signedCount = document.firmas?.filter(f => f.firmado).length || 0;
  const totalRequired = document.firmas?.length || 0;
  const signatureProgress = totalRequired > 0 ? (signedCount / totalRequired) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-2 hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className={typeColors[document.tipo]}>
                  {document.tipo}
                </Badge>
                {document.requiere_firma && (
                  <Badge className="bg-orange-500 text-white">
                    📝 Requiere Firma
                  </Badge>
                )}
                {!document.publicado && (
                  <Badge variant="outline">
                    No Publicado
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {document.tipo_destinatario === "individual" 
                    ? `${document.jugadores_destino?.length || 0} jugador${(document.jugadores_destino?.length || 0) !== 1 ? 'es' : ''}`
                    : document.categoria_destino
                  }
                </Badge>
              </div>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                {document.titulo}
              </CardTitle>
              {document.descripcion && (
                <p className="text-sm text-slate-600 mt-2">{document.descripcion}</p>
              )}
            </div>
            {isAdmin && onEdit && onDelete && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(document)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(document)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {document.codigo_qr_url && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-4">
              <img 
                src={document.codigo_qr_url} 
                alt="Código QR" 
                className="w-24 h-24 border-2 border-white rounded-lg shadow"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900">Código QR disponible</p>
                <p className="text-xs text-blue-700">Las familias pueden escanearlo para firmar</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            {document.archivo_url && (
              <a
                href={document.archivo_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
              </a>
            )}
            
            {document.enlace_firma_externa && (
              <a
                href={document.enlace_firma_externa}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Plataforma de Firma
                </Button>
              </a>
            )}
          </div>

          {document.fecha_limite_firma && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              Fecha límite: {format(new Date(document.fecha_limite_firma), "d 'de' MMMM 'de' yyyy", { locale: es })}
            </div>
          )}

          {document.requiere_firma && isAdmin && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold text-slate-900">Estado de Firmas:</span>
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  {signedCount} / {totalRequired}
                </span>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${signatureProgress}%` }}
                />
              </div>

              {signatureProgress === 100 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Todos han firmado</span>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-slate-500 pt-2 border-t">
            Publicado el {format(new Date(document.created_date), "d/MM/yyyy HH:mm", { locale: es })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}