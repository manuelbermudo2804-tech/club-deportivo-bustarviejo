import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { FileText, Download, ExternalLink, Edit, Trash2, CheckCircle, Clock, Users, AlertCircle, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function DocumentSignatureList({ firmas }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = firmas.filter(f => {
    const matchesSearch = f.jugador_nombre.toLowerCase().includes(search.toLowerCase()) || 
                          f.email_padre.toLowerCase().includes(search.toLowerCase());
    
    if (filter === "all") return matchesSearch;
    if (filter === "firmado") return matchesSearch && f.firmado;
    if (filter === "confirmado") return matchesSearch && f.confirmado_firma_externa && !f.firmado;
    if (filter === "pendiente") return matchesSearch && !f.firmado && !f.confirmado_firma_externa;
    return matchesSearch;
  });

  const counts = {
    firmado: firmas.filter(f => f.firmado).length,
    confirmado: firmas.filter(f => f.confirmado_firma_externa && !f.firmado).length,
    pendiente: firmas.filter(f => !f.firmado && !f.confirmado_firma_externa).length
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar jugador o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({firmas.length})</SelectItem>
            <SelectItem value="firmado">✅ Firmado ({counts.firmado})</SelectItem>
            <SelectItem value="confirmado">🔵 Confirmado ({counts.confirmado})</SelectItem>
            <SelectItem value="pendiente">⏳ Pendiente ({counts.pendiente})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-4 text-sm text-slate-500">
            No hay resultados
          </div>
        ) : (
          filtered.map((firma, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {firma.firmado ? (
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : firma.confirmado_firma_externa ? (
                  <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-orange-600 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 text-xs truncate">{firma.jugador_nombre}</p>
                  <p className="text-[10px] text-slate-500 truncate">{firma.email_padre}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {firma.firmado ? (
                  <div>
                    <p className="text-green-700 font-semibold text-[10px]">✅ Firmado</p>
                    <p className="text-[9px] text-slate-500">{format(new Date(firma.fecha_firma), "d/MM HH:mm")}</p>
                  </div>
                ) : firma.confirmado_firma_externa ? (
                  <div>
                    <p className="text-blue-700 font-semibold text-[10px]">🔵 Confirmado</p>
                    <p className="text-[9px] text-slate-500">{format(new Date(firma.fecha_confirmacion_externa), "d/MM HH:mm")}</p>
                  </div>
                ) : (
                  <p className="text-orange-600 font-semibold text-[10px]">⏳ Pendiente</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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
  const confirmedExternalCount = document.firmas?.filter(f => f.confirmado_firma_externa && !f.firmado).length || 0;
  const totalRequired = document.firmas?.length || 0;
  const totalCompleted = signedCount + confirmedExternalCount;
  const signatureProgress = totalRequired > 0 ? (totalCompleted / totalRequired) * 100 : 0;

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
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold text-green-700">
                    ✅ {signedCount} firmados
                  </span>
                  {confirmedExternalCount > 0 && (
                    <span className="font-semibold text-blue-700">
                      🔵 {confirmedExternalCount} confirmaron firma externa
                    </span>
                  )}
                  <span className="font-semibold text-orange-600">
                    ⏳ {totalRequired - signedCount - confirmedExternalCount} pendientes
                  </span>
                </div>
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

              <div className="bg-slate-50 border-l-4 border-orange-500 p-3 rounded mb-3">
                <p className="text-xs text-slate-700 font-semibold mb-2">
                  ℹ️ Leyenda: ✅ Firmado en app | 🔵 Confirmó firma externa | ⏳ Pendiente
                </p>
              </div>

              <DocumentSignatureList firmas={document.firmas || []} />
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