import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCircle, Camera, Save, Calendar as CalendarIcon, Phone, MapPin, FileCheck, AlertCircle, Heart, MapPinCheck, Upload, File, Download, X, Eye, ArrowRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { calcularEdad, getSuggestedCategory } from "../components/utils/calcularEdad";
import RenewalPaymentFlow from "../components/renewals/RenewalPaymentFlow";
import RenewalSuccessScreen from "../components/renewals/RenewalSuccessScreen";
import PlayerStatsWidget from "../components/players/PlayerStatsWidget";
import PlayerEvolutionTab from "../components/players/PlayerEvolutionTab";
import AddExtraActivityDialog from "../components/players/AddExtraActivityDialog";
import { PlusCircle } from "lucide-react";

export default function PlayerProfile() {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [renewalSuccess, setRenewalSuccess] = useState(false);
  const [renewalData, setRenewalData] = useState(null);
  const [showExtra, setShowExtra] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
    staleTime: 300_000,
    gcTime: 600_000,
    refetchOnWindowFocus: false,
  });

  const { data: player, isLoading } = useQuery({
    queryKey: ["myPlayerProfile", user?.player_id, user?.email],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      // Fast path: buscar por player_id directamente con get() (lectura por clave, instantánea)
      if (user.player_id) {
        try {
          const byId = await base44.entities.Player.get(user.player_id);
          if (byId) return byId;
        } catch {}
      }
      // Fallback: buscar por email
      const candidates = await base44.entities.Player.filter({
        $or: [
          { email_jugador: user.email },
          { email_padre: user.email },
          { email_tutor_2: user.email },
        ]
      }, "-updated_date", 1);
      const found = candidates?.[0] || null;
      if (found && !user.player_id) {
        base44.auth.updateMe({ player_id: found.id }).catch(() => {});
      }
      return found;
    },
    staleTime: 120_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: seasonConfig } = useQuery({
    queryKey: ["seasonConfigActive"],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.filter({ activa: true });
      return configs?.[0] || null;
    },
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  // Solo cargar categorías cuando se necesitan (renovación)
  const needsRenewal = player?.estado_renovacion === "pendiente";
  const { data: categoryConfigs } = useQuery({
    queryKey: ["categoryConfigs"],
    queryFn: () => base44.entities.CategoryConfig.list(),
    staleTime: 600_000,
    refetchOnWindowFocus: false,
    enabled: needsRenewal || showPaymentFlow,
  });

  const [form, setForm] = useState({
    nombre: "",
    foto_url: "",
    posicion: "Sin asignar",
    fecha_nacimiento: "",
    telefono: "",
    direccion: "",
    municipio: "",
    autorizacion_fotografia: undefined,
    observaciones: "",
    tipo_documento: "DNI",
    dni_jugador: "",
    dni_jugador_url: "",
    ficha_medica: {
      alergias: "",
      medicacion_habitual: "",
      condiciones_medicas: "",
      contacto_emergencia_nombre: "",
      contacto_emergencia_telefono: "",
      grupo_sanguineo: "",
    },
  });

  React.useEffect(() => {
    if (player) {
      setForm({
        nombre: player.nombre || "",
        foto_url: player.foto_url || "",
        posicion: player.posicion || "Sin asignar",
        fecha_nacimiento: player.fecha_nacimiento || "",
        telefono: player.telefono || "",
        direccion: player.direccion || "",
        municipio: player.municipio || "",
        autorizacion_fotografia: player.autorizacion_fotografia,
        observaciones: player.observaciones || "",
        tipo_documento: player.tipo_documento || "DNI",
        dni_jugador: player.dni_jugador || "",
        dni_jugador_url: player.dni_jugador_url || "",
        ficha_medica: {
          alergias: player.ficha_medica?.alergias || "",
          medicacion_habitual: player.ficha_medica?.medicacion_habitual || "",
          condiciones_medicas: player.ficha_medica?.condiciones_medicas || "",
          contacto_emergencia_nombre: player.ficha_medica?.contacto_emergencia_nombre || "",
          contacto_emergencia_telefono: player.ficha_medica?.contacto_emergencia_telefono || "",
          grupo_sanguineo: player.ficha_medica?.grupo_sanguineo || "",
        },
      });
    }
  }, [player]);

  const updateMutation = useMutation({
    mutationFn: async (payload) => base44.entities.Player.update(player.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player", user?.email] });
      setEditMode(false);
      toast.success("Perfil actualizado");
    },
  });

  const renewalMutation = useMutation({
    mutationFn: async (newCategory) => {
      return base44.entities.Player.update(player.id, {
        deporte: newCategory || player.deporte,
        estado_renovacion: "renovado",
        fecha_renovacion: new Date().toISOString(),
        temporada_renovacion: seasonConfig?.temporada || new Date().getFullYear() + "-" + (new Date().getFullYear() + 1)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player", user?.email] });
      setShowPaymentFlow(false);
      setRenewalSuccess(true);
      toast.success("✅ Renovación completada");
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async (payments) => {
      return base44.entities.Payment.bulkCreate(payments);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  const handleUpload = async (file) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((prev) => ({ ...prev, foto_url: file_url }));
  };

  const handleUploadDocument = async (file, type) => {
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (type === 'dni') {
        setForm((prev) => ({ ...prev, dni_jugador_url: file_url }));
      }
    } catch (error) {
      console.error("Error subiendo documento:", error);
      toast.error("Error al subir el documento");
    }
  };

  const handleSave = async () => {
    if (!player) return;
    const payload = {
      nombre: form.nombre,
      foto_url: form.foto_url,
      posicion: form.posicion,
      fecha_nacimiento: form.fecha_nacimiento,
      telefono: form.telefono,
      direccion: form.direccion,
      municipio: form.municipio,
      autorizacion_fotografia: form.autorizacion_fotografia,
      observaciones: form.observaciones,
      tipo_documento: form.tipo_documento,
      dni_jugador: form.dni_jugador,
      dni_jugador_url: form.dni_jugador_url,
      ficha_medica: {
        ...(player.ficha_medica || {}),
        alergias: form.ficha_medica.alergias,
        medicacion_habitual: form.ficha_medica.medicacion_habitual,
        condiciones_medicas: form.ficha_medica.condiciones_medicas,
        contacto_emergencia_nombre: form.ficha_medica.contacto_emergencia_nombre,
        contacto_emergencia_telefono: form.ficha_medica.contacto_emergencia_telefono,
        grupo_sanguineo: form.ficha_medica.grupo_sanguineo,
      },
    };
    await updateMutation.mutateAsync(payload);
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="spinner-elegant"></div>
      </div>
    );
  }

  if (!player) {
    // Sin ficha → redirigir directamente al dashboard que abrirá el wizard automáticamente
    // Evita pantallas intermedias confusas
    if (typeof window !== 'undefined') {
      window.location.replace('/PlayerDashboard?registro=1');
    }
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-3"></div>
          <p className="text-slate-500 text-sm">Abriendo formulario de inscripción...</p>
        </div>
      </div>
    );
  }

  const edad = calcularEdad(form.fecha_nacimiento);



  // Grid de documentos (solo jugador mayor de edad)
  const documentos = [
    {
      id: "dni",
      titulo: "DNI/Pasaporte",
      estado: player.dni_jugador_url ? "✅" : "❌",
      valor: player.dni_jugador || "No registrado",
      icono: "🆔",
    },
    {
      id: "firma_jugador",
      titulo: "Firma",
      estado: player.firma_jugador_completada ? "✅" : "❌",
      valor: player.firma_jugador_completada ? "Completada" : "Pendiente",
      icono: "✍️",
    },
  ];

  return (
    <div className="player-profile-wow max-w-5xl mx-auto p-4 md:p-7 space-y-7 text-slate-800">


      {/* Header con acciones */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-orange-700 mb-2"><span className="h-1.5 w-1.5 rounded-full bg-orange-500"></span> Área personal del jugador</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-950">Mi espacio<span className="text-orange-600">.</span></h1>
          <p className="text-sm text-slate-500 mt-1">Tu ficha deportiva, tus estadísticas y tu temporada en el C.D. Bustarviejo.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
        <Button variant="outline" onClick={() => setShowExtra(true)} className="rounded-xl border-slate-200 bg-white shadow-sm hover:border-orange-300 hover:bg-orange-50 text-slate-700">
          <PlusCircle className="w-4 h-4 mr-2" /> Apuntarme a otra actividad
        </Button>
        <Button
          onClick={() => (editMode ? handleSave() : setEditMode(true))}
          className={`rounded-xl shadow-md shadow-orange-600/15 ${editMode ? "bg-emerald-600 hover:bg-emerald-700" : "bg-orange-600 hover:bg-orange-700"}`}
        >
          <Save className="w-4 h-4 mr-2" />
          {editMode ? "Guardar" : "Editar"}
        </Button>
        </div>
      </div>
      <AddExtraActivityDialog
        player={player}
        open={showExtra}
        onOpenChange={setShowExtra}
        onDone={() => queryClient.invalidateQueries({ queryKey: ["myPlayerProfile"] })}
      />

      {/* Cabecera de perfil clara: identidad del club sin fondo oscuro */}
      <Card className="profile-hero border border-slate-200/80 shadow-lg shadow-slate-900/5 overflow-hidden rounded-[1.6rem] ring-1 ring-orange-600/10">
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white px-6 py-8 md:px-8 md:py-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl -mr-24 -mt-32 pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-slate-400/10 rounded-full blur-3xl -mb-28 pointer-events-none"></div>
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500 rounded-r-full"></div>

          <div className="relative flex flex-col md:flex-row items-center md:items-center gap-6 md:gap-8">
            {/* Foto destacada */}
            <div className="relative shrink-0">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden bg-slate-800 shadow-xl shadow-black/20 flex items-center justify-center border-4 border-slate-700 ring-2 ring-orange-500/70">
                {form.foto_url ? (
                  <img src={form.foto_url} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="w-20 h-20 text-slate-400" />
                )}
              </div>
              {editMode && (
                <input
                  id="foto"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files?.[0])}
                />
              )}
              {editMode && (
                <label htmlFor="foto">
                  <Button
                    variant="outline"
                    type="button"
                    className="absolute bottom-1 right-1 rounded-full w-10 h-10 p-0 shadow-lg bg-white border-orange-200 hover:bg-orange-50"
                    title="Cambiar foto"
                  >
                    <Camera className="w-5 h-5 text-orange-600" />
                  </Button>
                </label>
              )}
            </div>

            {/* Datos principales */}
            <div className="flex-1 min-w-0 text-white text-center md:text-left self-center">
              {editMode ? (
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Nombre completo"
                  className="text-2xl md:text-3xl font-bold mb-2 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus-visible:ring-orange-500"
                />
              ) : (
                <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-3 text-white">{form.nombre}</h2>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <Badge className="bg-orange-500/15 text-orange-200 border border-orange-400/40 rounded-full px-3 py-1 text-xs sm:text-sm">
                  ⚽ {player.deporte}
                </Badge>
                {form.posicion !== "Sin asignar" && (
                  <Badge className="bg-white/10 text-slate-100 border border-white/15 rounded-full px-3 py-1 text-xs sm:text-sm">
                    📍 {form.posicion}
                  </Badge>
                )}
                {edad && (
                  <Badge className="bg-white/10 text-slate-100 border border-white/15 rounded-full px-3 py-1 text-xs sm:text-sm">
                    🎂 {edad} años
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-300 mt-4">Tu ficha deportiva · C.D. Bustarviejo</p>
            </div>
          </div>
        </div>

        {/* Documentos Grid */}
        <CardContent className="p-5 md:p-6 bg-gradient-to-b from-white to-slate-50/80">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 mb-1">Estado de tu ficha</p>
              <h3 className="font-bold text-slate-900 text-base">Documentación</h3>
            </div>
            <span className="text-xs text-slate-400">{documentos.filter(doc => doc.estado === "✅").length} de {documentos.length} completados</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {documentos.map((doc) => (
              <div
                key={doc.id}
                className={`p-4 rounded-xl border text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  doc.estado === "✅"
                    ? "bg-green-50 border-green-300"
                    : "bg-red-50 border-red-300"
                }`}
              >
                <div className="text-2xl mb-1">{doc.icono}</div>
                <p className="text-xs font-semibold text-slate-900">{doc.titulo}</p>
                <p className={`text-sm font-bold ${doc.estado === "✅" ? "text-green-700" : "text-red-700"}`}>
                  {doc.estado}
                </p>
                <p className="text-xs text-slate-600 mt-1 truncate">{doc.valor}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas del Jugador */}
      {player && (
        <Card className="border border-slate-200/80 shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-5 md:p-6">
            <PlayerStatsWidget
              playerId={player.id}
              playerName={player.nombre}
              playerCategory={player.categoria_principal || player.deporte}
              fechaNacimiento={player.fecha_nacimiento}
              createdDate={player.created_date}
              compact={false}
            />
          </CardContent>
        </Card>
      )}

      {/* Panel de Renovación Pendiente */}
      {player?.estado_renovacion === "pendiente" && !showPaymentFlow && (
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-400 rounded-lg p-4 space-y-3 relative z-10">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-700 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-orange-900 mb-2">⏰ Renovación Pendiente</p>
              <p className="text-sm text-orange-800 mb-3">
                Es momento de renovar tu inscripción para la próxima temporada. Elige tu categoría:
              </p>
              
              <div className="space-y-2">
                <div className="space-y-1 relative z-50">
                  <label className="text-xs font-bold text-orange-900 block">Categoría:</label>
                  <Select value={selectedCategory || player.deporte || ""} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full border-2 border-orange-300 bg-white text-orange-900 font-medium">
                      <SelectValue placeholder="Selecciona categoría" />
                    </SelectTrigger>
                    <SelectContent side="bottom">
                      <SelectItem value={player.deporte}>{player.deporte} (actual)</SelectItem>
                      {[
                        "Fútbol Pre-Benjamín (Mixto)",
                        "Fútbol Benjamín (Mixto)",
                        "Fútbol Alevín (Mixto)",
                        "Fútbol Infantil (Mixto)",
                        "Fútbol Cadete",
                        "Fútbol Juvenil",
                        "Fútbol Aficionado",
                        "Fútbol Femenino",
                        "Baloncesto (Mixto)"
                      ].filter(cat => cat !== player.deporte).map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {getSuggestedCategory(edad, player.deporte) && (
                  <div className="bg-orange-100 rounded-lg p-2 text-xs text-orange-900">
                    <p className="font-bold mb-1">Sugerencia por edad ({edad} años):</p>
                    <p>{getSuggestedCategory(edad, player.deporte)}</p>
                  </div>
                )}
                <Button
                  onClick={() => setShowPaymentFlow(true)}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  🔄 Continuar con Renovación
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Flow Dialog */}
      <Dialog open={showPaymentFlow} onOpenChange={setShowPaymentFlow}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {seasonConfig && categoryConfigs && (
            <RenewalPaymentFlow
              player={{ ...player, deporte: selectedCategory || player.deporte }}
              newCategory={selectedCategory || player.deporte}
              seasonConfig={seasonConfig}
              categoryConfigs={categoryConfigs}
              onComplete={async (data) => {
                try {
                  await paymentMutation.mutateAsync(data.payments);
                  await renewalMutation.mutateAsync(data.newCategory);
                  setRenewalData(data);
                } catch (error) {
                  console.error("Error:", error);
                  toast.error("Error procesando la renovación");
                }
              }}
              onCancel={() => setShowPaymentFlow(false)}
              allPlayers={[]}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Success Screen */}
      {renewalSuccess && renewalData && (
        <RenewalSuccessScreen
          player={player}
          renewalData={renewalData}
          onClose={() => {
            setRenewalSuccess(false);
            setRenewalData(null);
            setSelectedCategory(null);
          }}
        />
      )}

      {/* Tabs de contenido */}
      <Tabs defaultValue="datos" className="profile-content-tabs w-full space-y-4">
        <div className="px-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">Tu espacio</p>
          <TabsList className="grid w-full grid-cols-4 h-auto rounded-2xl bg-white border border-slate-200/80 p-1.5 gap-1 shadow-sm">
          <TabsTrigger value="datos" className="rounded-xl py-3 text-xs sm:text-sm data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-md">📋 Datos</TabsTrigger>
          <TabsTrigger value="evolucion" className="rounded-xl py-3 text-xs sm:text-sm data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-md">📈 Evolución</TabsTrigger>
          <TabsTrigger value="salud" className="rounded-xl py-3 text-xs sm:text-sm data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-md">❤️ Salud</TabsTrigger>
          <TabsTrigger value="contacto" className="rounded-xl py-3 text-xs sm:text-sm data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-md">📞 Contacto</TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: Evolución deportiva */}
        <TabsContent value="evolucion" className="space-y-4">
          <PlayerEvolutionTab player={player} />
        </TabsContent>



        {/* Tab: Datos personales */}
        <TabsContent value="datos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <span className="text-xs font-semibold text-slate-700">Posición</span>
                  {editMode ? (
                    <select
                      value={form.posicion}
                      onChange={(e) => setForm((p) => ({ ...p, posicion: e.target.value }))}
                      className="border rounded-lg px-3 py-2 bg-white text-slate-900"
                    >
                      <option>Portero</option>
                      <option>Defensa</option>
                      <option>Medio</option>
                      <option>Delantero</option>
                      <option>Sin asignar</option>
                    </select>
                  ) : (
                    <p className="text-slate-900 font-semibold">{form.posicion}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" /> Fecha de nacimiento
                  </span>
                  {editMode ? (
                    <Input
                      type="date"
                      value={form.fecha_nacimiento || ""}
                      onChange={(e) => setForm((p) => ({ ...p, fecha_nacimiento: e.target.value }))}
                    />
                  ) : (
                    <p className="text-slate-900 font-semibold">
                      {form.fecha_nacimiento
                        ? format(new Date(form.fecha_nacimiento), "dd/MM/yyyy")
                        : "—"}
                      {edad && <span className="text-slate-600"> ({edad} años)</span>}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <span className="text-xs font-semibold text-slate-700">Autorización de fotografía</span>
                {editMode ? (
                  <select
                    value={form.autorizacion_fotografia || ""}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        autorizacion_fotografia: e.target.value || undefined,
                      }))
                    }
                    className="border rounded-lg px-3 py-2 bg-white text-slate-900"
                  >
                    <option value="">— Sin definir</option>
                    <option>SI AUTORIZO</option>
                    <option>NO AUTORIZO</option>
                  </select>
                ) : (
                  <Badge
                    className={
                      form.autorizacion_fotografia === "SI AUTORIZO"
                        ? "bg-green-100 text-green-800 w-fit"
                        : form.autorizacion_fotografia === "NO AUTORIZO"
                          ? "bg-red-100 text-red-800 w-fit"
                          : "bg-slate-100 text-slate-800 w-fit"
                    }
                  >
                    {form.autorizacion_fotografia || "Sin definir"}
                  </Badge>
                )}
              </div>

              {/* Documentación - DNI/Pasaporte */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-slate-900 mb-3 text-sm">📄 Documentación</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <span className="text-xs font-semibold text-slate-700">Tipo de documento</span>
                    {editMode ? (
                      <select
                        value={form.tipo_documento}
                        onChange={(e) => setForm((p) => ({ ...p, tipo_documento: e.target.value }))}
                        className="border rounded-lg px-3 py-2 bg-white text-slate-900"
                      >
                        <option>DNI</option>
                        <option>Pasaporte</option>
                      </select>
                    ) : (
                      <p className="text-slate-900 font-semibold">{form.tipo_documento}</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <span className="text-xs font-semibold text-slate-700">Número de documento</span>
                    {editMode ? (
                      <Input
                        value={form.dni_jugador}
                        onChange={(e) => setForm((p) => ({ ...p, dni_jugador: e.target.value }))}
                        placeholder="DNI o Pasaporte"
                      />
                    ) : (
                      <p className="text-slate-900 font-semibold">{form.dni_jugador || "—"}</p>
                    )}
                  </div>
                </div>

                {editMode && (
                  <div className="grid gap-2 mt-3">
                    <span className="text-xs font-semibold text-slate-700">Escanear documento</span>
                    <input
                      id="dni_upload"
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleUploadDocument(e.target.files[0], 'dni');
                        }
                      }}
                    />
                    <label htmlFor="dni_upload">
                      <Button type="button" variant="outline" className="w-full cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        {form.dni_jugador_url ? "Cambiar documento" : "Subir documento"}
                      </Button>
                    </label>
                    {form.dni_jugador_url && (
                      <div className="bg-green-50 border border-green-200 rounded p-2 flex items-center justify-between">
                        <span className="text-xs text-green-800">✅ Documento cargado</span>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setForm((p) => ({ ...p, dni_jugador_url: "" }))}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Salud */}
        <TabsContent value="salud" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" /> Información Médica (Privada)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <span className="text-xs font-semibold text-slate-700">Grupo sanguíneo</span>
                  {editMode ? (
                    <select
                      value={form.ficha_medica.grupo_sanguineo || ""}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          ficha_medica: { ...p.ficha_medica, grupo_sanguineo: e.target.value },
                        }))
                      }
                      className="border rounded-lg px-3 py-2 bg-white text-slate-900"
                    >
                      <option value="">— Sin definir</option>
                      <option>O+</option>
                      <option>O-</option>
                      <option>A+</option>
                      <option>A-</option>
                      <option>B+</option>
                      <option>B-</option>
                      <option>AB+</option>
                      <option>AB-</option>
                    </select>
                  ) : (
                    <p className="text-slate-900 font-semibold">{form.ficha_medica.grupo_sanguineo || "—"}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <span className="text-xs font-semibold text-slate-700">Alergias</span>
                  {editMode ? (
                    <Textarea
                      value={form.ficha_medica.alergias}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          ficha_medica: { ...p.ficha_medica, alergias: e.target.value },
                        }))
                      }
                      placeholder="Alergias conocidas..."
                      className="min-h-[80px]"
                    />
                  ) : (
                    <p className="text-slate-700">{form.ficha_medica.alergias || "—"}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <span className="text-xs font-semibold text-slate-700">Medicación habitual</span>
                  {editMode ? (
                    <Textarea
                      value={form.ficha_medica.medicacion_habitual}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          ficha_medica: { ...p.ficha_medica, medicacion_habitual: e.target.value },
                        }))
                      }
                      placeholder="Medicaciones..."
                      className="min-h-[80px]"
                    />
                  ) : (
                    <p className="text-slate-700">{form.ficha_medica.medicacion_habitual || "—"}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <span className="text-xs font-semibold text-slate-700">Condiciones médicas</span>
                {editMode ? (
                  <Textarea
                    value={form.ficha_medica.condiciones_medicas}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        ficha_medica: { ...p.ficha_medica, condiciones_medicas: e.target.value },
                      }))
                    }
                    placeholder="Asma, diabetes, etc..."
                    className="min-h-[100px]"
                  />
                ) : (
                  <p className="text-slate-700">{form.ficha_medica.condiciones_medicas || "—"}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Contacto */}
        <TabsContent value="contacto" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-500" /> Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Teléfono
                </span>
                {editMode ? (
                  <Input
                    value={form.telefono}
                    onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                    placeholder="Teléfono de contacto"
                  />
                ) : (
                  <p className="text-slate-900 font-semibold">{form.telefono || "—"}</p>
                )}
              </div>

              <div className="grid gap-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Dirección
                </span>
                {editMode ? (
                  <>
                    <Input
                      value={form.direccion}
                      onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))}
                      placeholder="Dirección completa"
                    />
                    <Input
                      value={form.municipio}
                      onChange={(e) => setForm((p) => ({ ...p, municipio: e.target.value }))}
                      placeholder="Municipio"
                    />
                  </>
                ) : (
                  <>
                    <p className="text-slate-900 font-semibold">{form.direccion || "—"}</p>
                    <p className="text-slate-700 text-sm">{form.municipio || "—"}</p>
                  </>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-900 mb-3">Contacto de Emergencia</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-slate-600">Nombre</span>
                    {editMode ? (
                      <Input
                        value={form.ficha_medica.contacto_emergencia_nombre}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            ficha_medica: {
                              ...p.ficha_medica,
                              contacto_emergencia_nombre: e.target.value,
                            },
                          }))
                        }
                        placeholder="Nombre"
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-slate-900 font-semibold">
                        {form.ficha_medica.contacto_emergencia_nombre || "—"}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-slate-600">Teléfono</span>
                    {editMode ? (
                      <Input
                        value={form.ficha_medica.contacto_emergencia_telefono}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            ficha_medica: {
                              ...p.ficha_medica,
                              contacto_emergencia_telefono: e.target.value,
                            },
                          }))
                        }
                        placeholder="Teléfono"
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-slate-900 font-semibold">
                        {form.ficha_medica.contacto_emergencia_telefono || "—"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notas */}
      {editMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas Personales</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.observaciones}
              onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
              placeholder="Notas privadas..."
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>
      )}


    </div>
  );
}