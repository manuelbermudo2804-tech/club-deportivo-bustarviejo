import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Users, Phone, Mail, MapPin, Calendar, Clock, CheckCircle2, 
  XCircle, Eye, Gift, Search, Filter, Sparkles, Share2, MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_CONFIG = {
  "Nuevo": { color: "bg-blue-500", icon: Sparkles },
  "Contactado": { color: "bg-yellow-500", icon: Phone },
  "Prueba programada": { color: "bg-purple-500", icon: Calendar },
  "Inscrita": { color: "bg-green-500", icon: CheckCircle2 },
  "Descartado": { color: "bg-red-500", icon: XCircle }
};

export default function FemeninoInterests() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInterest, setSelectedInterest] = useState(null);

  const { data: interests = [], isLoading } = useQuery({
    queryKey: ['femeninoInterests'],
    queryFn: () => base44.entities.FemeninoInterest.list('-created_date')
  });

  const { data: seasonConfigs = [] } = useQuery({
    queryKey: ['seasonConfigs'],
    queryFn: () => base44.entities.SeasonConfig.list()
  });

  const activeSeason = seasonConfigs.find(s => s.activa);

  const updateSeasonMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SeasonConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['seasonConfigs']);
      toast.success("Configuración actualizada");
    }
  });

  const updateInterestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FemeninoInterest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['femeninoInterests']);
      toast.success("Solicitud actualizada");
      setSelectedInterest(null);
    }
  });

  const deleteInterestMutation = useMutation({
    mutationFn: (id) => base44.entities.FemeninoInterest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['femeninoInterests']);
      toast.success("Solicitud eliminada");
      setSelectedInterest(null);
    }
  });

  const toggleBanner = () => {
    if (!activeSeason) return;
    updateSeasonMutation.mutate({
      id: activeSeason.id,
      data: { bonus_femenino_activo: !activeSeason.bonus_femenino_activo }
    });
  };

  const filteredInterests = interests.filter(i => {
    const matchesSearch = 
      i.nombre_jugadora?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.nombre_padre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || i.estado === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: interests.length,
    nuevos: interests.filter(i => i.estado === "Nuevo").length,
    contactados: interests.filter(i => i.estado === "Contactado").length,
    pruebasProgramadas: interests.filter(i => i.estado === "Prueba programada").length,
    inscritas: interests.filter(i => i.estado === "Inscrita").length,
    conReferido: interests.filter(i => i.referido_por_email).length
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-3">
            ⚽👧 Solicitudes Fútbol Femenino
          </h1>
          <p className="text-slate-600 mt-1">
            Gestiona las solicitudes de interés en el equipo femenino
          </p>
        </div>
      </div>

      {/* Control del Banner */}
      <Card className="border-2 border-pink-300 bg-gradient-to-r from-pink-50 to-purple-50">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                <Share2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Banner "Compartir Fútbol Femenino"</h3>
                <p className="text-sm text-slate-600">
                  Muestra el banner en el dashboard de los padres para que compartan por WhatsApp
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">
                {activeSeason?.bonus_femenino_activo ? "Activado" : "Desactivado"}
              </Label>
              <Switch
                checked={activeSeason?.bonus_femenino_activo || false}
                onCheckedChange={toggleBanner}
                disabled={!activeSeason}
              />
            </div>
          </div>
          
          {activeSeason?.bonus_femenino_activo && (
            <div className="mt-4 p-3 bg-white rounded-xl border border-pink-200">
              <p className="text-sm text-slate-700">
                <strong>💰 Bonus configurado:</strong> +{activeSeason.bonus_femenino_credito || 10}€ en ropa + {activeSeason.bonus_femenino_sorteos || 2} participaciones en sorteo por cada jugadora referida que se inscriba.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
            <p className="text-xs text-blue-600">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">{stats.nuevos}</p>
            <p className="text-xs text-yellow-600">Nuevos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-orange-700">{stats.contactados}</p>
            <p className="text-xs text-orange-600">Contactados</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-purple-700">{stats.pruebasProgramadas}</p>
            <p className="text-xs text-purple-600">Pruebas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-700">{stats.inscritas}</p>
            <p className="text-xs text-green-600">Inscritas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-pink-700">{stats.conReferido}</p>
            <p className="text-xs text-pink-600">Con Referido</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="Nuevo">Nuevo</SelectItem>
                <SelectItem value="Contactado">Contactado</SelectItem>
                <SelectItem value="Prueba programada">Prueba programada</SelectItem>
                <SelectItem value="Inscrita">Inscrita</SelectItem>
                <SelectItem value="Descartado">Descartado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto"></div>
          <p className="text-slate-500 mt-2">Cargando solicitudes...</p>
        </div>
      ) : filteredInterests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No hay solicitudes que mostrar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredInterests.map((interest) => {
            const statusConfig = STATUS_CONFIG[interest.estado] || STATUS_CONFIG["Nuevo"];
            const StatusIcon = statusConfig.icon;
            
            return (
              <Card 
                key={interest.id} 
                className="hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedInterest(interest)}
              >
                <CardContent className="pt-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                        {interest.nombre_jugadora?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900">{interest.nombre_jugadora}</h3>
                          <Badge className={`${statusConfig.color} text-white text-xs`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {interest.estado}
                          </Badge>
                          {interest.referido_por_nombre && (
                            <Badge variant="outline" className="text-pink-600 border-pink-300">
                              <Gift className="w-3 h-3 mr-1" />
                              Ref: {interest.referido_por_nombre}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          Padre/Madre: {interest.nombre_padre}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {interest.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {interest.telefono}
                          </span>
                          {interest.municipio && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {interest.municipio}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {interest.created_date && format(new Date(interest.created_date), "d MMM yyyy", { locale: es })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedInterest} onOpenChange={() => setSelectedInterest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              ⚽ {selectedInterest?.nombre_jugadora}
            </DialogTitle>
          </DialogHeader>
          
          {selectedInterest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Padre/Madre/Tutor</p>
                  <p className="font-medium">{selectedInterest.nombre_padre}</p>
                </div>
                <div>
                  <p className="text-slate-500">Fecha nacimiento</p>
                  <p className="font-medium">{selectedInterest.fecha_nacimiento || "No indicada"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Email</p>
                  <p className="font-medium">{selectedInterest.email}</p>
                </div>
                <div>
                  <p className="text-slate-500">Teléfono</p>
                  <p className="font-medium">{selectedInterest.telefono}</p>
                </div>
                <div>
                  <p className="text-slate-500">Municipio</p>
                  <p className="font-medium">{selectedInterest.municipio || "No indicado"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Experiencia</p>
                  <p className="font-medium">{selectedInterest.experiencia_previa || "No indicada"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500">¿Cómo nos conoció?</p>
                  <p className="font-medium">{selectedInterest.como_nos_conocio || "No indicado"}</p>
                </div>
              </div>

              {selectedInterest.referido_por_nombre && (
                <div className="bg-pink-50 rounded-xl p-3 border border-pink-200">
                  <p className="text-sm text-pink-800">
                    <Gift className="w-4 h-4 inline mr-1" />
                    <strong>Referido por:</strong> {selectedInterest.referido_por_nombre} ({selectedInterest.referido_por_email})
                  </p>
                  <p className="text-xs text-pink-600 mt-1">
                    ⚠️ Recuerda aplicar el bonus si se inscribe
                  </p>
                </div>
              )}

              {selectedInterest.mensaje && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-sm text-slate-500 mb-1">Mensaje:</p>
                  <p className="text-sm">{selectedInterest.mensaje}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select 
                  value={selectedInterest.estado} 
                  onValueChange={(v) => updateInterestMutation.mutate({ 
                    id: selectedInterest.id, 
                    data: { estado: v } 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nuevo">Nuevo</SelectItem>
                    <SelectItem value="Contactado">Contactado</SelectItem>
                    <SelectItem value="Prueba programada">Prueba programada</SelectItem>
                    <SelectItem value="Inscrita">Inscrita</SelectItem>
                    <SelectItem value="Descartado">Descartado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notas internas</Label>
                <Textarea
                  value={selectedInterest.notas_admin || ""}
                  onChange={(e) => setSelectedInterest({...selectedInterest, notas_admin: e.target.value})}
                  placeholder="Añade notas sobre esta solicitud..."
                  className="min-h-[80px]"
                />
                <Button 
                  size="sm" 
                  onClick={() => updateInterestMutation.mutate({
                    id: selectedInterest.id,
                    data: { notas_admin: selectedInterest.notas_admin }
                  })}
                >
                  Guardar notas
                </Button>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => window.open(`https://wa.me/34${selectedInterest.telefono?.replace(/\s/g, '')}`, '_blank')}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => window.open(`mailto:${selectedInterest.email}`, '_blank')}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button 
                  variant="destructive" 
                  size="icon"
                  onClick={() => {
                    if (confirm("¿Eliminar esta solicitud?")) {
                      deleteInterestMutation.mutate(selectedInterest.id);
                    }
                  }}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}