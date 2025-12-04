import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, Bus, Ticket, Trophy, ShoppingBag, Package, Calendar,
  Users, CheckCircle2, Clock, AlertCircle, Eye, Edit, Trash2,
  Upload, Loader2, Euro, Send, X
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const TIPOS_PAGO = [
  { value: "Autobús", label: "🚌 Autobús", icon: Bus },
  { value: "Excursión", label: "🏕️ Excursión", icon: Package },
  { value: "Entrada", label: "🎫 Entrada", icon: Ticket },
  { value: "Torneo", label: "🏆 Torneo", icon: Trophy },
  { value: "Material", label: "📦 Material", icon: Package },
  { value: "Equipación Extra", label: "👕 Equipación Extra", icon: ShoppingBag },
  { value: "Otro", label: "📋 Otro", icon: Package }
];

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

export default function ExtraPayments() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [viewingPayment, setViewingPayment] = useState(null);
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    tipo: "Otro",
    importe: "",
    fecha_limite: "",
    fecha_evento: "",
    categorias_destino: [],
    jugadores_especificos: [],
    activo: true,
    notas_admin: ""
  });
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectAllCategories, setSelectAllCategories] = useState(true);
  const [selectedIndividualPlayers, setSelectedIndividualPlayers] = useState([]);
  const [playerSearchTerm, setPlayerSearchTerm] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAdmin(currentUser.role === "admin" || currentUser.es_tesorero);
    };
    fetchUser();
  }, []);

  const { data: extraPayments = [], isLoading } = useQuery({
    queryKey: ['extraPayments'],
    queryFn: () => base44.entities.ExtraPayment.list('-created_date'),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });

  const activePlayers = players.filter(p => p.activo);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ExtraPayment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extraPayments'] });
      resetForm();
      toast.success("Pago extra creado correctamente");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ExtraPayment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extraPayments'] });
      setViewingPayment(null);
      toast.success("Actualizado correctamente");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ExtraPayment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extraPayments'] });
      toast.success("Pago eliminado");
    },
  });

  const resetForm = () => {
    setFormData({
      titulo: "",
      descripcion: "",
      tipo: "Otro",
      importe: "",
      fecha_limite: "",
      fecha_evento: "",
      categorias_destino: [],
      jugadores_especificos: [],
      activo: true,
      notas_admin: ""
    });
    setSelectedCategories([]);
    setSelectAllCategories(true);
    setSelectedIndividualPlayers([]);
    setPlayerSearchTerm("");
    setShowForm(false);
    setEditingPayment(null);
  };

  const handleSubmit = () => {
    if (!formData.titulo || !formData.importe) {
      toast.error("Título e importe son obligatorios");
      return;
    }

    // Determinar jugadores afectados
    let jugadoresAfectados = [];
    
    if (selectAllCategories) {
      // Todos los jugadores activos
      jugadoresAfectados = activePlayers.map(p => ({
        jugador_id: p.id,
        jugador_nombre: p.nombre,
        categoria: p.deporte,
        email_padre: p.email_padre,
        estado: "Pendiente"
      }));
    } else {
      // Jugadores de las categorías seleccionadas
      if (selectedCategories.length > 0) {
        const playersFromCategories = activePlayers
          .filter(p => selectedCategories.includes(p.deporte))
          .map(p => ({
            jugador_id: p.id,
            jugador_nombre: p.nombre,
            categoria: p.deporte,
            email_padre: p.email_padre,
            estado: "Pendiente"
          }));
        jugadoresAfectados = [...playersFromCategories];
      }
      
      // Añadir jugadores individuales seleccionados (que no estén ya incluidos)
      if (selectedIndividualPlayers.length > 0) {
        const existingIds = jugadoresAfectados.map(j => j.jugador_id);
        const additionalPlayers = selectedIndividualPlayers
          .filter(p => !existingIds.includes(p.id))
          .map(p => ({
            jugador_id: p.id,
            jugador_nombre: p.nombre,
            categoria: p.deporte,
            email_padre: p.email_padre,
            estado: "Pendiente"
          }));
        jugadoresAfectados = [...jugadoresAfectados, ...additionalPlayers];
      }
    }

    if (jugadoresAfectados.length === 0) {
      toast.error("Debes seleccionar al menos una categoría o jugador");
      return;
    }

    let finalPagosRecibidos = jugadoresAfectados;

    // Si estamos editando, preservar los estados de pago existentes
    if (editingPayment && editingPayment.pagos_recibidos) {
      const existingPayments = editingPayment.pagos_recibidos;
      
      finalPagosRecibidos = jugadoresAfectados.map(newPago => {
        // Buscar si este jugador ya tenía un pago registrado
        const existingPago = existingPayments.find(ep => ep.jugador_id === newPago.jugador_id);
        if (existingPago) {
          // Preservar estado, justificante, fecha_pago y notas del pago existente
          return {
            ...newPago,
            estado: existingPago.estado,
            justificante_url: existingPago.justificante_url,
            fecha_pago: existingPago.fecha_pago,
            notas: existingPago.notas
          };
        }
        return newPago;
      });
    }

    const paymentData = {
      ...formData,
      importe: Number(formData.importe),
      categorias_destino: selectAllCategories ? [] : selectedCategories,
      jugadores_especificos: selectedIndividualPlayers.map(p => ({ jugador_id: p.id, jugador_nombre: p.nombre })),
      pagos_recibidos: finalPagosRecibidos,
      temporada: seasonConfig?.temporada,
      creado_por: user?.email
    };

    if (editingPayment) {
      updateMutation.mutate({ id: editingPayment.id, data: paymentData });
    } else {
      createMutation.mutate(paymentData);
    }
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setFormData({
      titulo: payment.titulo,
      descripcion: payment.descripcion || "",
      tipo: payment.tipo,
      importe: payment.importe,
      fecha_limite: payment.fecha_limite || "",
      fecha_evento: payment.fecha_evento || "",
      categorias_destino: payment.categorias_destino || [],
      jugadores_especificos: payment.jugadores_especificos || [],
      activo: payment.activo,
      notas_admin: payment.notas_admin || ""
    });
    setSelectedCategories(payment.categorias_destino || []);
    setSelectAllCategories(!payment.categorias_destino || payment.categorias_destino.length === 0);
    
    // Recuperar jugadores individuales
    const individualPlayerIds = (payment.jugadores_especificos || []).map(j => j.jugador_id);
    const individualPlayers = activePlayers.filter(p => individualPlayerIds.includes(p.id));
    setSelectedIndividualPlayers(individualPlayers);
    
    setShowForm(true);
  };

  const handleDelete = (payment) => {
    if (confirm(`¿Eliminar "${payment.titulo}"?`)) {
      deleteMutation.mutate(payment.id);
    }
  };

  const handlePlayerPaymentStatus = (paymentId, jugadorId, newStatus, justificanteUrl = null) => {
    const payment = extraPayments.find(p => p.id === paymentId);
    if (!payment) return;

    const updatedPagos = payment.pagos_recibidos.map(pago => {
      if (pago.jugador_id === jugadorId) {
        return {
          ...pago,
          estado: newStatus,
          ...(justificanteUrl ? { justificante_url: justificanteUrl } : {}),
          ...(newStatus === "Pagado" ? { fecha_pago: new Date().toISOString().split('T')[0] } : {})
        };
      }
      return pago;
    });

    updateMutation.mutate({
      id: paymentId,
      data: { ...payment, pagos_recibidos: updatedPagos }
    });
  };

  const getStats = (payment) => {
    const pagos = payment.pagos_recibidos || [];
    return {
      total: pagos.length,
      pagados: pagos.filter(p => p.estado === "Pagado").length,
      revision: pagos.filter(p => p.estado === "En revisión").length,
      pendientes: pagos.filter(p => p.estado === "Pendiente").length,
      recaudado: pagos.filter(p => p.estado === "Pagado").length * payment.importe
    };
  };

  const tipoIcon = (tipo) => {
    const found = TIPOS_PAGO.find(t => t.value === tipo);
    return found ? found.label.split(' ')[0] : "📋";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Euro className="w-8 h-8 text-green-600" />
            Pagos Extras
          </h1>
          <p className="text-slate-600 mt-1">Gestiona pagos especiales: autobuses, excursiones, entradas, torneos...</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Pago Extra
          </Button>
        )}
      </div>

      {/* Estadísticas generales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{extraPayments.filter(p => p.activo).length}</p>
            <p className="text-xs text-blue-600">Pagos Activos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-700">
              {extraPayments.reduce((sum, p) => sum + getStats(p).pagados, 0)}
            </p>
            <p className="text-xs text-green-600">Pagos Recibidos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">
              {extraPayments.reduce((sum, p) => sum + getStats(p).revision, 0)}
            </p>
            <p className="text-xs text-yellow-600">En Revisión</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-purple-700">
              {extraPayments.reduce((sum, p) => sum + getStats(p).recaudado, 0).toLocaleString()}€
            </p>
            <p className="text-xs text-purple-600">Total Recaudado</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de pagos extras */}
      <div className="space-y-4">
        {extraPayments.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <Euro className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No hay pagos extras</h3>
              <p className="text-slate-500 mb-4">Crea un pago extra para autobuses, excursiones, entradas...</p>
              {isAdmin && (
                <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" /> Crear Primer Pago
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          extraPayments.map(payment => {
            const stats = getStats(payment);
            const isExpired = payment.fecha_limite && new Date(payment.fecha_limite) < new Date();
            
            return (
              <Card key={payment.id} className={`hover:shadow-lg transition-shadow ${!payment.activo ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-2xl">{tipoIcon(payment.tipo)}</span>
                        <h3 className="font-bold text-lg text-slate-900">{payment.titulo}</h3>
                        <Badge className="bg-green-600">{payment.importe}€</Badge>
                        {!payment.activo && <Badge variant="outline">Cerrado</Badge>}
                        {isExpired && payment.activo && (
                          <Badge className="bg-red-500">Vencido</Badge>
                        )}
                      </div>
                      
                      {payment.descripcion && (
                        <p className="text-sm text-slate-600 mb-2">{payment.descripcion}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        {payment.fecha_evento && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Evento: {format(new Date(payment.fecha_evento), "d MMM yyyy", { locale: es })}
                          </span>
                        )}
                        {payment.fecha_limite && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Límite: {format(new Date(payment.fecha_limite), "d MMM yyyy", { locale: es })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {stats.total} jugadores
                        </span>
                      </div>

                      {/* Categorías */}
                      {payment.categorias_destino?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {payment.categorias_destino.map(cat => (
                            <Badge key={cat} variant="outline" className="text-xs">{cat}</Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stats y acciones */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="flex gap-2">
                        <div className="text-center px-3 py-1 bg-green-50 rounded-lg">
                          <p className="text-lg font-bold text-green-600">{stats.pagados}</p>
                          <p className="text-[10px] text-green-700">Pagados</p>
                        </div>
                        <div className="text-center px-3 py-1 bg-yellow-50 rounded-lg">
                          <p className="text-lg font-bold text-yellow-600">{stats.revision}</p>
                          <p className="text-[10px] text-yellow-700">Revisión</p>
                        </div>
                        <div className="text-center px-3 py-1 bg-red-50 rounded-lg">
                          <p className="text-lg font-bold text-red-600">{stats.pendientes}</p>
                          <p className="text-[10px] text-red-700">Pendientes</p>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => setViewingPayment(payment)}>
                          <Eye className="w-4 h-4 mr-1" /> Ver
                        </Button>
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(payment)}>
                              <Edit className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(payment)}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog: Crear/Editar */}
      <Dialog open={showForm} onOpenChange={() => resetForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5 text-green-600" />
              {editingPayment ? "Editar Pago Extra" : "Nuevo Pago Extra"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ej: Autobús Torneo Valencia"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_PAGO.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Importe (€) *</Label>
                <Input
                  type="number"
                  value={formData.importe}
                  onChange={(e) => setFormData({ ...formData, importe: e.target.value })}
                  placeholder="25"
                />
              </div>
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Detalles del pago..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha del Evento</Label>
                <Input
                  type="date"
                  value={formData.fecha_evento}
                  onChange={(e) => setFormData({ ...formData, fecha_evento: e.target.value })}
                />
              </div>
              <div>
                <Label>Fecha Límite Pago</Label>
                <Input
                  type="date"
                  value={formData.fecha_limite}
                  onChange={(e) => setFormData({ ...formData, fecha_limite: e.target.value })}
                />
              </div>
            </div>

            {/* Selección de categorías */}
            <div>
              <Label>¿A quién aplica?</Label>
              <div className="mt-2 space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectAllCategories}
                    onCheckedChange={(c) => {
                      setSelectAllCategories(c);
                      if (c) {
                        setSelectedCategories([]);
                        setSelectedIndividualPlayers([]);
                      }
                    }}
                  />
                  <span className="text-sm font-medium">Todos los jugadores activos ({activePlayers.length})</span>
                </div>
                
                {!selectAllCategories && (
                  <>
                    {/* Selección por categorías */}
                    <div className="border rounded-lg p-3 bg-slate-50">
                      <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Seleccionar categorías completas:
                      </p>
                      <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                        {CATEGORIAS.map(cat => {
                          const playersInCat = activePlayers.filter(p => p.deporte === cat).length;
                          return (
                            <div key={cat} className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedCategories.includes(cat)}
                                onCheckedChange={(c) => {
                                  if (c) {
                                    setSelectedCategories([...selectedCategories, cat]);
                                  } else {
                                    setSelectedCategories(selectedCategories.filter(sc => sc !== cat));
                                  }
                                }}
                              />
                              <span className="text-xs truncate">{cat} <span className="text-slate-500">({playersInCat})</span></span>
                            </div>
                          );
                        })}
                      </div>
                      {selectedCategories.length > 0 && (
                        <p className="text-xs text-green-600 mt-2">
                          ✓ {activePlayers.filter(p => selectedCategories.includes(p.deporte)).length} jugadores de {selectedCategories.length} categoría(s)
                        </p>
                      )}
                    </div>

                    {/* Añadir jugadores individuales */}
                    <div className="border rounded-lg p-3 bg-blue-50">
                      <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Añadir jugadores individuales (de otras categorías):
                      </p>
                      <Input
                        placeholder="Buscar jugador por nombre..."
                        value={playerSearchTerm}
                        onChange={(e) => setPlayerSearchTerm(e.target.value)}
                        className="mb-2 text-xs h-8"
                      />
                      
                      {playerSearchTerm.length >= 2 && (
                        <div className="max-h-28 overflow-y-auto border rounded bg-white">
                          {activePlayers
                            .filter(p => 
                              p.nombre.toLowerCase().includes(playerSearchTerm.toLowerCase()) &&
                              !selectedCategories.includes(p.deporte) && // No mostrar los de categorías ya seleccionadas
                              !selectedIndividualPlayers.some(sp => sp.id === p.id) // No mostrar los ya añadidos
                            )
                            .slice(0, 10)
                            .map(player => (
                              <div 
                                key={player.id}
                                onClick={() => {
                                  setSelectedIndividualPlayers([...selectedIndividualPlayers, player]);
                                  setPlayerSearchTerm("");
                                }}
                                className="p-2 text-xs hover:bg-blue-100 cursor-pointer border-b last:border-b-0"
                              >
                                <span className="font-medium">{player.nombre}</span>
                                <span className="text-slate-500 ml-2">({player.deporte})</span>
                              </div>
                            ))
                          }
                          {activePlayers.filter(p => 
                            p.nombre.toLowerCase().includes(playerSearchTerm.toLowerCase()) &&
                            !selectedCategories.includes(p.deporte) &&
                            !selectedIndividualPlayers.some(sp => sp.id === p.id)
                          ).length === 0 && (
                            <p className="p-2 text-xs text-slate-500">No se encontraron jugadores</p>
                          )}
                        </div>
                      )}

                      {/* Jugadores individuales seleccionados */}
                      {selectedIndividualPlayers.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {selectedIndividualPlayers.map(player => (
                            <Badge 
                              key={player.id} 
                              variant="secondary"
                              className="text-xs flex items-center gap-1 bg-blue-100 text-blue-800"
                            >
                              {player.nombre}
                              <X 
                                className="w-3 h-3 cursor-pointer hover:text-red-600"
                                onClick={() => setSelectedIndividualPlayers(
                                  selectedIndividualPlayers.filter(p => p.id !== player.id)
                                )}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Resumen total */}
                    {(selectedCategories.length > 0 || selectedIndividualPlayers.length > 0) && (
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <AlertDescription className="text-green-800 text-xs ml-2">
                          <strong>Total: {
                            activePlayers.filter(p => selectedCategories.includes(p.deporte)).length + 
                            selectedIndividualPlayers.filter(p => !selectedCategories.includes(p.deporte)).length
                          } jugadores</strong>
                          {selectedCategories.length > 0 && (
                            <span className="block">• {activePlayers.filter(p => selectedCategories.includes(p.deporte)).length} de categorías seleccionadas</span>
                          )}
                          {selectedIndividualPlayers.filter(p => !selectedCategories.includes(p.deporte)).length > 0 && (
                            <span className="block">• {selectedIndividualPlayers.filter(p => !selectedCategories.includes(p.deporte)).length} jugadores individuales</span>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </div>
            </div>

            <div>
              <Label>Notas internas (solo admin)</Label>
              <Textarea
                value={formData.notas_admin}
                onChange={(e) => setFormData({ ...formData, notas_admin: e.target.value })}
                placeholder="Notas para el equipo..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {editingPayment ? "Guardar Cambios" : "Crear Pago Extra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ver detalle con lista de pagos */}
      <Dialog open={!!viewingPayment} onOpenChange={() => setViewingPayment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingPayment && tipoIcon(viewingPayment.tipo)}
              {viewingPayment?.titulo}
              <Badge className="ml-2 bg-green-600">{viewingPayment?.importe}€</Badge>
            </DialogTitle>
          </DialogHeader>

          {viewingPayment && (
            <div className="space-y-4">
              {viewingPayment.descripcion && (
                <p className="text-slate-600">{viewingPayment.descripcion}</p>
              )}

              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-green-50">
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{getStats(viewingPayment).pagados}</p>
                    <p className="text-xs text-green-700">Pagados</p>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-50">
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{getStats(viewingPayment).revision}</p>
                    <p className="text-xs text-yellow-700">En Revisión</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50">
                  <CardContent className="pt-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{getStats(viewingPayment).pendientes}</p>
                    <p className="text-xs text-red-700">Pendientes</p>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de jugadores */}
              <div className="border rounded-lg max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2">Jugador</th>
                      <th className="text-left p-2">Estado</th>
                      <th className="text-left p-2">Justificante</th>
                      {isAdmin && <th className="text-right p-2">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {viewingPayment.pagos_recibidos?.map((pago, i) => (
                      <tr key={i} className="border-t hover:bg-slate-50">
                        <td className="p-2">
                          <p className="font-medium">{pago.jugador_nombre}</p>
                          <p className="text-xs text-slate-500">{pago.email_padre}</p>
                        </td>
                        <td className="p-2">
                          <Badge className={
                            pago.estado === "Pagado" ? "bg-green-600" :
                            pago.estado === "En revisión" ? "bg-yellow-600" :
                            "bg-red-600"
                          }>
                            {pago.estado === "Pagado" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {pago.estado === "En revisión" && <Clock className="w-3 h-3 mr-1" />}
                            {pago.estado === "Pendiente" && <AlertCircle className="w-3 h-3 mr-1" />}
                            {pago.estado}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {pago.justificante_url ? (
                            <a href={pago.justificante_url} target="_blank" rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs">Ver</a>
                          ) : '-'}
                        </td>
                        {isAdmin && (
                          <td className="p-2 text-right">
                            {pago.estado !== "Pagado" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-green-50 text-green-700 text-xs"
                                onClick={() => handlePlayerPaymentStatus(viewingPayment.id, pago.jugador_id, "Pagado")}
                              >
                                ✓ Pagado
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Toggle activo */}
              {isAdmin && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={viewingPayment.activo}
                      onCheckedChange={(c) => {
                        updateMutation.mutate({
                          id: viewingPayment.id,
                          data: { ...viewingPayment, activo: c }
                        });
                        setViewingPayment({ ...viewingPayment, activo: c });
                      }}
                    />
                    <span className="text-sm">Ventana de pago activa</span>
                  </div>
                  <Button variant="outline" onClick={() => setViewingPayment(null)}>
                    Cerrar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}