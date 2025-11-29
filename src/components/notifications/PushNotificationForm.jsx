import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Send, X, Link as LinkIcon } from "lucide-react";
import { motion } from "framer-motion";

const PAGINAS_DESTINO = [
  { value: "", label: "Sin enlace" },
  { value: "ParentDashboard", label: "🏠 Inicio Padres" },
  { value: "Home", label: "🏠 Inicio Admin" },
  { value: "ParentPayments", label: "💳 Pagos" },
  { value: "ParentCallups", label: "🏆 Convocatorias" },
  { value: "Announcements", label: "📢 Anuncios" },
  { value: "Surveys", label: "📋 Encuestas" },
  { value: "ParentPlayers", label: "👥 Mis Jugadores" },
  { value: "ClothingOrders", label: "🛍️ Pedidos Ropa" },
  { value: "ParentLottery", label: "🍀 Lotería" },
  { value: "CalendarAndSchedules", label: "📅 Calendario" },
  { value: "ParentEventRSVP", label: "🎉 Eventos" },
  { value: "FederationSignatures", label: "🖊️ Firmas" },
  { value: "PlayerRenewal", label: "🔄 Renovaciones" },
  { value: "ClubMembership", label: "🎫 Hacerse Socio" },
];

const ICONOS = ["📢", "🔔", "⚠️", "🚨", "💬", "📋", "💳", "🏆", "🎉", "📅", "👥", "🛍️"];

const CATEGORIAS = [
  "Fútbol Pre-Benjamín (Mixto)",
  "Fútbol Benjamín (Mixto)",
  "Fútbol Alevín (Mixto)",
  "Fútbol Infantil (Mixto)",
  "Fútbol Cadete",
  "Fútbol Juvenil",
  "Fútbol Aficionado",
  "Fútbol Femenino",
  "Baloncesto (Mixto)"
];

export default function PushNotificationForm({ onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    titulo: "",
    mensaje: "",
    enlace_destino: "",
    tipo_destinatario: "todos",
    categoria_destino: "",
    prioridad: "normal",
    icono: "📢"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.titulo.trim() || !formData.mensaje.trim()) return;
    onSubmit(formData);
  };

  const prioridadColors = {
    normal: "bg-blue-100 text-blue-800 border-blue-300",
    importante: "bg-orange-100 text-orange-800 border-orange-300",
    urgente: "bg-red-100 text-red-800 border-red-300"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-2 border-orange-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5 text-orange-600" />
            Nueva Notificación Push
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Icono y Título */}
            <div className="flex gap-3">
              <div className="w-20">
                <Label className="text-xs">Icono</Label>
                <Select 
                  value={formData.icono} 
                  onValueChange={(v) => setFormData({...formData, icono: v})}
                >
                  <SelectTrigger className="text-2xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICONOS.map(icon => (
                      <SelectItem key={icon} value={icon} className="text-2xl">
                        {icon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs">Título *</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                  placeholder="Ej: Recordatorio importante"
                  maxLength={60}
                />
              </div>
            </div>

            {/* Mensaje */}
            <div>
              <Label className="text-xs">Mensaje *</Label>
              <Textarea
                value={formData.mensaje}
                onChange={(e) => setFormData({...formData, mensaje: e.target.value})}
                placeholder="Escribe el contenido de la notificación..."
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-slate-500 mt-1">{formData.mensaje.length}/200 caracteres</p>
            </div>

            {/* Destinatarios y Prioridad */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Destinatarios</Label>
                <Select 
                  value={formData.tipo_destinatario} 
                  onValueChange={(v) => setFormData({...formData, tipo_destinatario: v, categoria_destino: ""})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">👥 Todos los usuarios</SelectItem>
                    <SelectItem value="padres">👨‍👩‍👧 Solo Padres/Familias</SelectItem>
                    <SelectItem value="entrenadores">🏃 Solo Entrenadores</SelectItem>
                    <SelectItem value="administradores">👔 Solo Administradores</SelectItem>
                    <SelectItem value="categoria">⚽ Por Categoría/Deporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Prioridad</Label>
                <Select 
                  value={formData.prioridad} 
                  onValueChange={(v) => setFormData({...formData, prioridad: v})}
                >
                  <SelectTrigger className={prioridadColors[formData.prioridad]}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">ℹ️ Normal</SelectItem>
                    <SelectItem value="importante">⚠️ Importante</SelectItem>
                    <SelectItem value="urgente">🚨 Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Categoría específica */}
            {formData.tipo_destinatario === "categoria" && (
              <div>
                <Label className="text-xs">Selecciona Categoría</Label>
                <Select 
                  value={formData.categoria_destino} 
                  onValueChange={(v) => setFormData({...formData, categoria_destino: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Enlace destino */}
            <div>
              <Label className="text-xs flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                Enlace de destino (opcional)
              </Label>
              <Select 
                value={formData.enlace_destino} 
                onValueChange={(v) => setFormData({...formData, enlace_destino: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin enlace" />
                </SelectTrigger>
                <SelectContent>
                  {PAGINAS_DESTINO.map(page => (
                    <SelectItem key={page.value} value={page.value}>{page.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Al tocar la notificación, el usuario irá a esta sección
              </p>
            </div>

            {/* Preview */}
            <div className="bg-slate-900 rounded-xl p-4 text-white">
              <p className="text-xs text-slate-400 mb-2">Vista previa:</p>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{formData.icono}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">
                    {formData.titulo || "Título de la notificación"}
                  </p>
                  <p className="text-xs text-slate-300 line-clamp-2">
                    {formData.mensaje || "Contenido del mensaje..."}
                  </p>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !formData.titulo.trim() || !formData.mensaje.trim()}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? "Enviando..." : "Enviar Notificación"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}