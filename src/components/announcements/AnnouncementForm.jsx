import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Pin, Clock, AlertCircle, Sparkles, Bell, ShieldAlert, Bold, Highlighter, Heading2 } from "lucide-react";
import AnnouncementCtaSelector from "./AnnouncementCtaSelector";

export default function AnnouncementForm({ announcement, onSubmit, onCancel, isSubmitting }) {
  const [currentAnnouncement, setCurrentAnnouncement] = useState(announcement || {
    titulo: "",
    contenido: "",
    prioridad: "Normal",
    destinatarios_tipo: "Todos",
    publicado: true,
    destacado: false,
    tipo_caducidad: "horas",
    duracion_horas: 72,
    fecha_expiracion: "",
    enviar_email: false,
    enviar_chat: false,
    requiere_confirmacion: false,
    email_enviado: false,
    fecha_publicacion: new Date().toISOString(),
    leido_por: [],
    // Nuevos campos de segmentación y banner
    destinatarios_emails: "",
    mostrar_como_banner: false,
    banner_activo: false,
    banner_posicion: "top",
    banner_dismissible: true,
    banner_variant: "info"
  });

  const [userSearch, setUserSearch] = useState("");
  const contenidoRef = useRef(null);
  const convertirTextoAHtml = (texto = "") => texto.split("\n").map((linea) => {
    if (linea.startsWith("## ")) return `<h3>${linea.slice(3)}</h3>`;
    const html = linea.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/==(.*?)==/g, "<mark>$1</mark>");
    return `<p>${html || "<br>"}</p>`;
  }).join("");
  const convertirHtmlATexto = (html = "") => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const recorrer = (nodo) => {
      if (nodo.nodeType === Node.TEXT_NODE) return nodo.textContent || "";
      if (nodo.nodeType !== Node.ELEMENT_NODE) return "";
      const tag = nodo.tagName.toLowerCase();
      const contenido = Array.from(nodo.childNodes).map(recorrer).join("");
      if (tag === "strong" || tag === "b") return `**${contenido}**`;
      if (tag === "mark" || (tag === "span" && /background-color/i.test(nodo.getAttribute("style") || ""))) return `==${contenido}==`;
      if (tag === "h3" || tag === "h2") return `## ${contenido}\n`;
      if (tag === "div" || tag === "p") return `${contenido}\n`;
      if (tag === "br") return "\n";
      return contenido;
    };
    return Array.from(doc.body.childNodes).map(recorrer).join("").replace(/\n+$/, "").replace(/\n\n\n+/g, "\n\n");
  };
  const aplicarFormato = (comando, valor = null) => {
    contenidoRef.current?.focus();
    document.execCommand(comando, false, valor);
    setCurrentAnnouncement((prev) => ({ ...prev, contenido: convertirHtmlATexto(contenidoRef.current?.innerHTML || "") }));
  };
  const sincronizarContenido = () => setCurrentAnnouncement((prev) => ({ ...prev, contenido: convertirHtmlATexto(contenidoRef.current?.innerHTML || "") }));
  useEffect(() => {
    if (contenidoRef.current) contenidoRef.current.innerHTML = convertirTextoAHtml(announcement?.contenido || "");
  }, []);
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['announcementUsers'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  // Categorías reales desde CategoryConfig (no hardcodeadas) para que las categorías
  // nuevas aparezcan automáticamente como destinatarios.
  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ['announcementCategories'],
    queryFn: () => base44.entities.CategoryConfig.list(),
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });
  const categoriasActivas = Array.from(
    new Set((categoryConfigs || []).filter(c => c.activa).map(c => c.nombre).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  // Asegura que la categoría guardada en un anuncio existente siga apareciendo aunque
  // se haya desactivado en CategoryConfig.
  const opcionesDestinatarios = (() => {
    const set = new Set(categoriasActivas);
    if (currentAnnouncement.destinatarios_tipo && currentAnnouncement.destinatarios_tipo !== 'Todos') {
      set.add(currentAnnouncement.destinatarios_tipo);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  })();
  const iconoCategoria = (nombre) => (/baloncesto/i.test(nombre) ? '🏀' : '⚽');

  const handleSubmit = (e) => {
    e.preventDefault();
    const contenidoActual = convertirHtmlATexto(contenidoRef.current?.innerHTML || "");
    if (!contenidoActual.replace(/[#*=]/g, "").trim()) {
      alert("Escribe el contenido del anuncio antes de publicarlo.");
      contenidoRef.current?.focus();
      return;
    }
    const emails = Array.isArray(currentAnnouncement.destinatarios_emails)
      ? currentAnnouncement.destinatarios_emails
      : (currentAnnouncement.destinatarios_emails || "").split(",").map((x) => x.trim()).filter(Boolean);
    const payload = { ...currentAnnouncement, contenido: contenidoActual, destinatarios_emails: emails };
    onSubmit(payload);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-2xl text-slate-900">
            {announcement ? "Editar Anuncio" : "Nuevo Anuncio"}
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            Los anuncios son comunicados oficiales que permanecen visibles
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Info sobre cuándo usar anuncios */}
            <Alert className="bg-blue-50 border-blue-300">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>¿Cuándo usar Anuncios?</strong>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• Información crítica que debe permanecer visible</li>
                  <li>• Entrenamientos cancelados, cambios de horario</li>
                  <li>• Convocatorias para torneos o eventos</li>
                  <li>• Comunicados oficiales del club</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Título */}
              <div className="space-y-2 md:col-span-2">
                <Label>Título del Anuncio *</Label>
                <Input
                  placeholder="Ej: Entrenamiento cancelado por lluvia"
                  value={currentAnnouncement.titulo}
                  onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, titulo: e.target.value })}
                  required
                />
              </div>

              {/* Prioridad */}
              <div className="space-y-2">
                <Label>Nivel de Prioridad *</Label>
                <Select
                  value={currentAnnouncement.prioridad}
                  onValueChange={(value) => setCurrentAnnouncement({ ...currentAnnouncement, prioridad: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">ℹ️ Normal</SelectItem>
                    <SelectItem value="Importante">⚠️ Importante</SelectItem>
                    <SelectItem value="Urgente">🚨 Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Destinatarios */}
              <div className="space-y-2">
                <Label>Destinatarios *</Label>
                <Select
                  value={currentAnnouncement.destinatarios_tipo}
                  onValueChange={(value) => setCurrentAnnouncement({ ...currentAnnouncement, destinatarios_tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">🏃 Todos los grupos</SelectItem>
                    {opcionesDestinatarios.map((nombre) => (
                      <SelectItem key={nombre} value={nombre}>{iconoCategoria(nombre)} {nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-1">
                  <Label className="text-sm">Usuarios específicos (opcional)</Label>
                  <Input
                    placeholder="Buscar por nombre o email"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                  <div className="max-h-56 overflow-auto rounded-lg border p-2 bg-white">
                    {usersLoading && (
                      <div className="text-xs text-slate-500 px-1 py-2">Cargando usuarios...</div>
                    )}
                    {(users || [])
                      .filter(u => {
                        const q = userSearch.toLowerCase();
                        const name = (u.full_name || '').toLowerCase();
                        const email = (u.email || '').toLowerCase();
                        return !q || name.includes(q) || email.includes(q);
                      })
                      .map((u) => {
                        const email = u.email;
                        const name = u.full_name || email;
                        const selected = Array.isArray(currentAnnouncement.destinatarios_emails)
                          ? currentAnnouncement.destinatarios_emails
                          : (currentAnnouncement.destinatarios_emails || '').split(',').map(s=>s.trim()).filter(Boolean);
                        const checked = selected.includes(email);
                        return (
                          <label key={u.id} className="flex items-center gap-2 p-1 rounded hover:bg-slate-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = new Set(selected);
                                if (e.target.checked) next.add(email); else next.delete(email);
                                setCurrentAnnouncement({ ...currentAnnouncement, destinatarios_emails: Array.from(next) });
                              }}
                            />
                            <span className="text-sm text-slate-800 truncate max-w-[40%]">{name}</span>
                            <span className="ml-auto text-xs text-slate-500 truncate">{email}</span>
                          </label>
                        );
                      })}
                    {(!usersLoading && users.length === 0) && (
                      <div className="text-xs text-slate-500 px-1 py-2">No hay usuarios para mostrar</div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Marca usuarios para segmentar el anuncio (además del filtro por grupo si aplica).</p>
                </div>
              </div>

              {/* Configuración de Banner */}
              <div className="space-y-3 md:col-span-2 p-4 rounded-lg bg-purple-50 border-2 border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium text-purple-900">Mostrar como Banner</Label>
                    <p className="text-sm text-purple-700">Aparecerá fijo en la parte superior o inferior de la app</p>
                  </div>
                  <Switch
                    checked={currentAnnouncement.mostrar_como_banner}
                    onCheckedChange={(checked) => setCurrentAnnouncement({ ...currentAnnouncement, mostrar_como_banner: checked })}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>

                {currentAnnouncement.mostrar_como_banner && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Estado</Label>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={currentAnnouncement.banner_activo}
                          onCheckedChange={(checked) => setCurrentAnnouncement({ ...currentAnnouncement, banner_activo: checked })}
                        />
                        <span className="text-sm">{currentAnnouncement.banner_activo ? 'Activo' : 'Inactivo'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Posición</Label>
                      <Select
                        value={currentAnnouncement.banner_posicion}
                        onValueChange={(v) => setCurrentAnnouncement({ ...currentAnnouncement, banner_posicion: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Arriba</SelectItem>
                          <SelectItem value="bottom">Abajo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Estilo</Label>
                      <Select
                        value={currentAnnouncement.banner_variant}
                        onValueChange={(v) => setCurrentAnnouncement({ ...currentAnnouncement, banner_variant: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warning">Aviso</SelectItem>
                          <SelectItem value="success">Éxito</SelectItem>
                          <SelectItem value="danger">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 md:col-span-3">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={currentAnnouncement.banner_dismissible}
                          onCheckedChange={(checked) => setCurrentAnnouncement({ ...currentAnnouncement, banner_dismissible: checked })}
                        />
                        <Label>Permitir que el usuario lo oculte</Label>
                      </div>
                    </div>

                    {/* === MEJORAS VISUALES DEL BANNER === */}
                    <div className="md:col-span-3 space-y-3 pt-3 border-t border-purple-200">
                      <div className="space-y-1">
                        <Label className="text-purple-900">🖼️ Imagen de fondo (opcional)</Label>
                        <Input
                          placeholder="https://...imagen.jpg"
                          value={currentAnnouncement.banner_imagen_url || ''}
                          onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, banner_imagen_url: e.target.value })}
                        />
                        <p className="text-xs text-purple-700">Aparecerá difuminada de fondo. Pega la URL de una imagen subida a la galería.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-purple-900">🔘 Texto del botón (opcional)</Label>
                          <Input
                            placeholder="¡Apúntate ya!"
                            value={currentAnnouncement.banner_cta_texto || ''}
                            onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, banner_cta_texto: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-purple-900">🔗 URL destino del botón</Label>
                          <Input
                            placeholder="/l/torneo-padel-2026 o /Porra"
                            value={currentAnnouncement.banner_cta_url || ''}
                            onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, banner_cta_url: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-purple-900">⏱️ Cuenta atrás hasta (opcional)</Label>
                        <Input
                          type="datetime-local"
                          value={currentAnnouncement.banner_cuenta_atras_fecha ? currentAnnouncement.banner_cuenta_atras_fecha.slice(0, 16) : ''}
                          onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, banner_cuenta_atras_fecha: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                        />
                        <p className="text-xs text-purple-700">Mostrará un contador en vivo (días/horas/minutos). Ideal para crear urgencia.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tipo de caducidad */}
              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  Caducidad del Anuncio
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={currentAnnouncement.tipo_caducidad === "horas" ? "default" : "outline"}
                    onClick={() => setCurrentAnnouncement({ ...currentAnnouncement, tipo_caducidad: "horas" })}
                    className={currentAnnouncement.tipo_caducidad === "horas" ? "bg-orange-600" : ""}
                  >
                    ⏱️ Por Horas
                  </Button>
                  <Button
                    type="button"
                    variant={currentAnnouncement.tipo_caducidad === "fecha" ? "default" : "outline"}
                    onClick={() => setCurrentAnnouncement({ ...currentAnnouncement, tipo_caducidad: "fecha" })}
                    className={currentAnnouncement.tipo_caducidad === "fecha" ? "bg-orange-600" : ""}
                  >
                    📅 Fecha Específica
                  </Button>
                </div>
              </div>

              {/* Configuración de caducidad */}
              {currentAnnouncement.tipo_caducidad === "horas" ? (
                <div className="space-y-2 md:col-span-2">
                  <Label>Duración del Anuncio</Label>
                  <Select
                    value={currentAnnouncement.duracion_horas?.toString() || "72"}
                    onValueChange={(value) => setCurrentAnnouncement({ ...currentAnnouncement, duracion_horas: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">⏱️ 6 horas</SelectItem>
                      <SelectItem value="12">⏱️ 12 horas</SelectItem>
                      <SelectItem value="24">📅 24 horas (1 día)</SelectItem>
                      <SelectItem value="48">📅 48 horas (2 días)</SelectItem>
                      <SelectItem value="72">📅 72 horas (3 días)</SelectItem>
                      <SelectItem value="168">📅 1 semana</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    El anuncio se ocultará automáticamente después de este tiempo
                  </p>
                </div>
              ) : (
                <div className="space-y-2 md:col-span-2">
                  <Label>Fecha de Expiración (opcional)</Label>
                  <Input
                    type="date"
                    value={currentAnnouncement.fecha_expiracion || ""}
                    onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, fecha_expiracion: e.target.value })}
                  />
                  <p className="text-xs text-slate-500">
                    El anuncio se ocultará automáticamente después de esta fecha
                  </p>
                </div>
              )}
            </div>

            {/* Contenido con formato sencillo */}
            <div className="space-y-3">
              <Label>Contenido del Anuncio *</Label>
              <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                <Button type="button" size="sm" variant="outline" onMouseDown={(e) => e.preventDefault()} onClick={() => aplicarFormato("bold")} className="bg-white"><Bold className="mr-1.5 h-4 w-4" />Negrita</Button>
                <Button type="button" size="sm" variant="outline" onMouseDown={(e) => e.preventDefault()} onClick={() => aplicarFormato("hiliteColor", "#fef08a")} className="bg-white"><Highlighter className="mr-1.5 h-4 w-4" />Resaltar</Button>
                <Button type="button" size="sm" variant="outline" onMouseDown={(e) => e.preventDefault()} onClick={() => aplicarFormato("formatBlock", "h3")} className="bg-white"><Heading2 className="mr-1.5 h-4 w-4" />Título</Button>
              </div>
              <div
                ref={contenidoRef}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label="Contenido del anuncio"
                aria-multiline="true"
                onInput={sincronizarContenido}
                onBlur={sincronizarContenido}
                className="min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 whitespace-pre-wrap break-words [&_h3]:my-2 [&_h3]:text-lg [&_h3]:font-extrabold [&_h3]:text-orange-700 [&_p]:my-1 [&_mark]:rounded [&_mark]:bg-yellow-200 [&_mark]:px-1"
              />
              <p className="text-xs text-slate-500">Escribe directamente y selecciona cualquier fragmento para aplicarle formato. Los símbolos de formato no aparecen en el texto.</p>
              <div className="rounded-xl border border-orange-200 bg-white p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-orange-700">Vista previa del texto</p>
                <div className="space-y-1 text-sm text-slate-700 whitespace-pre-wrap break-words">{(currentAnnouncement.contenido || "Aquí verás cómo quedará el anuncio.").split("\n").map((linea, i) => <p key={i} className={linea.startsWith("## ") ? "text-base font-extrabold text-orange-700" : ""}>{linea.startsWith("## ") ? linea.slice(3) : linea.split(/(\*\*.*?\*\*|==.*?==)/g).map((parte, j) => parte.startsWith("**") && parte.endsWith("**") ? <strong key={j}>{parte.slice(2, -2)}</strong> : parte.startsWith("==") && parte.endsWith("==") ? <mark key={j} className="rounded bg-yellow-200 px-1 font-semibold text-slate-900">{parte.slice(2, -2)}</mark> : parte)}</p>)}</div>
              </div>
            </div>

            {/* Botón de enlace a sección de la app */}
            <AnnouncementCtaSelector
              texto={currentAnnouncement.cta_texto}
              url={currentAnnouncement.cta_url}
              onChange={(vals) => setCurrentAnnouncement({ ...currentAnnouncement, ...vals })}
            />

            {/* Opciones */}
            <div className="space-y-4">
              {/* Anclado/Destacado */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-yellow-50 border-2 border-yellow-200">
                <div className="flex items-center gap-3">
                  <Pin className="w-5 h-5 text-yellow-700" />
                  <div>
                    <Label className="text-base font-medium text-yellow-900">Anclar anuncio</Label>
                    <p className="text-sm text-yellow-700">
                      Aparecerá siempre al inicio, por encima del resto
                    </p>
                  </div>
                </div>
                <Switch
                  checked={currentAnnouncement.destacado}
                  onCheckedChange={(checked) => setCurrentAnnouncement({ ...currentAnnouncement, destacado: checked })}
                  className="data-[state=checked]:bg-yellow-600"
                />
              </div>

              {/* Publicar */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border-2 border-green-200">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-green-700" />
                  <div>
                    <Label className="text-base font-medium text-green-900">Publicar anuncio</Label>
                    <p className="text-sm text-green-700">
                      {currentAnnouncement.publicado 
                        ? "Visible para todos los usuarios" 
                        : "Borrador (solo visible para admins)"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={currentAnnouncement.publicado}
                  onCheckedChange={(checked) => setCurrentAnnouncement({ ...currentAnnouncement, publicado: checked })}
                  className="data-[state=checked]:bg-green-600"
                />
              </div>

              {/* Enviar Email */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 border-2 border-blue-200">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-blue-700" />
                  <div>
                    <Label className="text-base font-medium text-blue-900">Enviar por email</Label>
                    <p className="text-sm text-blue-700">
                      Enviar copia del anuncio a los destinatarios
                    </p>
                  </div>
                </div>
                <Switch
                  checked={currentAnnouncement.enviar_email}
                  onCheckedChange={(checked) => setCurrentAnnouncement({ ...currentAnnouncement, enviar_email: checked })}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>

              {/* Enviar a Mensajes del Club */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-orange-50 border-2 border-orange-200">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-orange-700" />
                  <div>
                    <Label className="text-base font-medium text-orange-900">Enviar a "Mensajes del Club"</Label>
                    <p className="text-sm text-orange-700">
                      Publica este anuncio como mensaje privado del club para cada familia
                    </p>
                  </div>
                </div>
                <Switch
                  checked={currentAnnouncement.enviar_chat === true}
                  onCheckedChange={(checked) => setCurrentAnnouncement({ ...currentAnnouncement, enviar_chat: checked })}
                  className="data-[state=checked]:bg-orange-600"
                />
              </div>

              {/* Requiere confirmación de lectura (acuse de recibo obligatorio) */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border-2 border-red-200">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-700" />
                  <div>
                    <Label className="text-base font-medium text-red-900">Requiere confirmación de lectura</Label>
                    <p className="text-sm text-red-700">
                      Aparecerá como modal bloqueante hasta que la familia confirme "He leído". Úsalo solo en avisos críticos.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={currentAnnouncement.requiere_confirmacion === true}
                  onCheckedChange={(checked) => setCurrentAnnouncement({ ...currentAnnouncement, requiere_confirmacion: checked })}
                  className="data-[state=checked]:bg-red-600"
                />
              </div>
            </div>

            {/* Alertas informativas */}
            {currentAnnouncement.enviar_email && (
              <Alert className="bg-blue-50 border-blue-200">
                <Mail className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>Envío de email:</strong> Se enviará un email a todos los destinatarios seleccionados con el contenido del anuncio.
                </AlertDescription>
              </Alert>
            )}

            {/* Info sobre alertas */}
            <Alert className="bg-green-50 border-green-200">
              <Bell className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm">
                <strong>🔔 Aparecerá automáticamente en el Centro de Alertas</strong> de todos los destinatarios hasta que lo lean o expire.
              </AlertDescription>
            </Alert>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  announcement ? "Actualizar Anuncio" : "Publicar Anuncio"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}