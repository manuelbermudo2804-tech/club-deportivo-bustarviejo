import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Camera, Save, Calendar as CalendarIcon, Phone, MapPin, CreditCard, Bell, MessageCircle } from "lucide-react";

export default function PlayerProfile() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
    staleTime: 60_000,
  });

  const { data: player, isLoading } = useQuery({
    queryKey: ["player", user?.email],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const conditions = [
        { email_jugador: user.email },
        { created_by: user.email },
        { email_padre: user.email },
      ];
      if (user.player_id) conditions.unshift({ id: user.player_id });
      const candidates = await base44.entities.Player.filter({ $or: conditions }, "-updated_date", 1);
      return candidates?.[0] || null;
    },
    initialData: null,
    staleTime: 60_000,
  });

  const [form, setForm] = React.useState({
    nombre: "",
    foto_url: "",
    posicion: "Sin asignar",
    fecha_nacimiento: "",
    telefono: "",
    direccion: "",
    municipio: "",
    autorizacion_fotografia: undefined,
    observaciones: "",
    ficha_medica: {
      alergias: "",
      medicacion_habitual: "",
      condiciones_medicas: "",
      contacto_emergencia_nombre: "",
      contacto_emergencia_telefono: "",
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
        ficha_medica: {
          alergias: player.ficha_medica?.alergias || "",
          medicacion_habitual: player.ficha_medica?.medicacion_habitual || "",
          condiciones_medicas: player.ficha_medica?.condiciones_medicas || "",
          contacto_emergencia_nombre: player.ficha_medica?.contacto_emergencia_nombre || "",
          contacto_emergencia_telefono: player.ficha_medica?.contacto_emergencia_telefono || "",
        },
      });
    }
  }, [player]);

  const updateMutation = useMutation({
    mutationFn: async (payload) => base44.entities.Player.update(player.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player", user?.email] });
    },
  });

  const handleUpload = async (file) => {
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((prev) => ({ ...prev, foto_url: file_url }));
  };

  const handleSave = async () => {
    if (!player) return;
    const payload = {
      // Nota: NO modificamos 'deporte' (categoría) – solo lectura
      nombre: form.nombre,
      foto_url: form.foto_url,
      posicion: form.posicion,
      fecha_nacimiento: form.fecha_nacimiento,
      telefono: form.telefono,
      direccion: form.direccion,
      municipio: form.municipio,
      autorizacion_fotografia: form.autorizacion_fotografia,
      observaciones: form.observaciones,
      ficha_medica: {
        ...(player.ficha_medica || {}),
        alergias: form.ficha_medica.alergias,
        medicacion_habitual: form.ficha_medica.medicacion_habitual,
        condiciones_medicas: form.ficha_medica.condiciones_medicas,
        contacto_emergencia_nombre: form.ficha_medica.contacto_emergencia_nombre,
        contacto_emergencia_telefono: form.ficha_medica.contacto_emergencia_telefono,
      },
    };
    await updateMutation.mutateAsync(payload);
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="spinner-elegant"></div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Mi Ficha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-slate-700">
            <p>No hemos encontrado tu ficha de jugador vinculada a esta cuenta.</p>
            <p className="text-sm">Si te diste de alta como jugador, asegúrate de usar el mismo email; si no, contacta con tu coordinador para vincular tu ficha.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="mb-4 text-center space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-balance">Mi Ficha</h1>
        <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" /> Guardar cambios
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
              {form.foto_url ? (
                <img src={form.foto_url} alt="Foto" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-12 h-12 text-slate-400" />
              )}
            </div>
            <div className="w-full grid gap-2 sm:grid-cols-1 md:grid-cols-[1fr_auto] items-center">
              <Input
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Nombre completo"
                className="w-full"
              />
              <div className="justify-self-center sm:justify-self-end">
                <input
                  id="foto"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files?.[0])}
                />
                <label htmlFor="foto">
                  <Button variant="outline" type="button" className="gap-2 w-full sm:w-auto">
                    <Camera className="w-4 h-4" /> Cambiar foto
                  </Button>
                </label>
              </div>
            </div>
            <div className="text-sm text-slate-600 flex items-center justify-center gap-2">
              <span className="font-medium">Deporte/Categoría:</span>
              <Badge variant="outline">{player.deporte || "—"}</Badge>
              <span className="text-xs text-slate-500">(solo lectura)</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Link to={createPageUrl("ParentPayments")} className="block">
          <Button className="w-full bg-green-600 hover:bg-green-700 gap-2">
            <CreditCard className="w-4 h-4" /> Pagos
          </Button>
        </Link>
        <Link to={createPageUrl("ParentCallups")} className="block">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
            <Bell className="w-4 h-4" /> Convocatorias
          </Button>
        </Link>
        <Link to={createPageUrl("ParentCoordinatorChat")} className="block">
          <Button className="w-full bg-cyan-600 hover:bg-cyan-700 gap-2">
            <MessageCircle className="w-4 h-4" /> Chats
          </Button>
        </Link>
      </div>
      <div className="mt-4 flex justify-center">
        <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" /> Guardar cambios
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4 items-start">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-base">Datos personales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <span className="text-xs text-slate-500">Posición</span>
              <select
                value={form.posicion}
                onChange={(e) => setForm((p) => ({ ...p, posicion: e.target.value }))}
                className="border rounded-md px-3 py-2 bg-white"
              >
                <option>Portero</option>
                <option>Defensa</option>
                <option>Medio</option>
                <option>Delantero</option>
                <option>Sin asignar</option>
              </select>
            </div>
            <div className="grid gap-2">
              <span className="text-xs text-slate-500 flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> Fecha de nacimiento</span>
              <Input
                type="date"
                value={form.fecha_nacimiento || ""}
                onChange={(e) => setForm((p) => ({ ...p, fecha_nacimiento: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <span className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3"/> Teléfono</span>
              <Input
                value={form.telefono}
                onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                placeholder="Teléfono de contacto"
              />
            </div>
            <div className="grid gap-2">
              <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3"/> Dirección</span>
              <Input
                value={form.direccion}
                onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))}
                placeholder="Dirección"
              />
              <Input
                value={form.municipio}
                onChange={(e) => setForm((p) => ({ ...p, municipio: e.target.value }))}
                placeholder="Municipio"
              />
            </div>
            <div className="grid gap-2">
              <span className="text-xs text-slate-500">Autorización de fotografía</span>
              <select
                value={form.autorizacion_fotografia || ""}
                onChange={(e) => setForm((p) => ({ ...p, autorizacion_fotografia: e.target.value || undefined }))}
                className="border rounded-md px-3 py-2 bg-white"
              >
                <option value="">—</option>
                <option>SI AUTORIZO</option>
                <option>NO AUTORIZO</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-base">Salud (privado)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <span className="text-xs text-slate-500">Alergias</span>
              <Textarea
                value={form.ficha_medica.alergias}
                onChange={(e) => setForm((p) => ({ ...p, ficha_medica: { ...p.ficha_medica, alergias: e.target.value } }))}
                placeholder="Alergias conocidas"
              />
            </div>
            <div className="grid gap-2">
              <span className="text-xs text-slate-500">Medicación habitual</span>
              <Textarea
                value={form.ficha_medica.medicacion_habitual}
                onChange={(e) => setForm((p) => ({ ...p, ficha_medica: { ...p.ficha_medica, medicacion_habitual: e.target.value } }))}
                placeholder="Medicaciones"
              />
            </div>
            <div className="grid gap-2">
              <span className="text-xs text-slate-500">Condiciones médicas</span>
              <Textarea
                value={form.ficha_medica.condiciones_medicas}
                onChange={(e) => setForm((p) => ({ ...p, ficha_medica: { ...p.ficha_medica, condiciones_medicas: e.target.value } }))}
                placeholder="Asma, diabetes, etc."
              />
            </div>
            <div className="grid gap-2">
              <span className="text-xs text-slate-500">Contacto de emergencia</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  value={form.ficha_medica.contacto_emergencia_nombre}
                  onChange={(e) => setForm((p) => ({ ...p, ficha_medica: { ...p.ficha_medica, contacto_emergencia_nombre: e.target.value } }))}
                  placeholder="Nombre"
                />
                <Input
                  value={form.ficha_medica.contacto_emergencia_telefono}
                  onChange={(e) => setForm((p) => ({ ...p, ficha_medica: { ...p.ficha_medica, contacto_emergencia_telefono: e.target.value } }))}
                  placeholder="Teléfono"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Observaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.observaciones}
            onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
            placeholder="Notas personales (entrenadores pueden verlas)"
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>
    </div>
  );
}