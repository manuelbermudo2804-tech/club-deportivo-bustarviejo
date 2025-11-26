import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Loader2, AlertCircle, Lock, Users, Shield, Camera, UserCheck, UserX, RefreshCw, Heart, FileText, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// Función para obtener las categorías con años dinámicos
const getCategoriesWithYears = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const baseYear = currentMonth <= 8 ? currentYear - 1 : currentYear;
  
  return [
    { value: "Fútbol Pre-Benjamín (Mixto)", label: `⚽ Fútbol Pre-Benjamín (Mixto) - ${baseYear - 6}/${baseYear - 7}` },
    { value: "Fútbol Benjamín (Mixto)", label: `⚽ Fútbol Benjamín (Mixto) - ${baseYear - 8}/${baseYear - 9}` },
    { value: "Fútbol Alevín (Mixto)", label: `⚽ Fútbol Alevín (Mixto) - ${baseYear - 10}/${baseYear - 11}` },
    { value: "Fútbol Infantil (Mixto)", label: `⚽ Fútbol Infantil (Mixto) - ${baseYear - 12}/${baseYear - 13}` },
    { value: "Fútbol Cadete", label: `⚽ Fútbol Cadete - ${baseYear - 14}/${baseYear - 15}` },
    { value: "Fútbol Juvenil", label: `⚽ Fútbol Juvenil - ${baseYear - 16}/${baseYear - 17}/${baseYear - 18}` },
    { value: "Fútbol Aficionado", label: `⚽ Fútbol Aficionado - ${baseYear - 19} y anteriores` },
    { value: "Fútbol Femenino", label: "⚽ Fútbol Femenino" },
    { value: "Baloncesto (Mixto)", label: "🏀 Baloncesto (Mixto)" }
  ];
};

// Función para calcular edad
const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export default function PlayerForm({ player, onSubmit, onCancel, isSubmitting, isParent = false, allPlayers = [] }) {
  const formRef = useRef(null);
  
  const [currentPlayer, setCurrentPlayer] = useState(() => {
    if (player) return player;
    return {
      nombre: "",
      foto_url: "",
      deporte: "Fútbol Pre-Benjamín (Mixto)",
      tipo_inscripcion: "Nueva Inscripción",
      fecha_nacimiento: "",
      es_mayor_edad: false,
      dni_jugador: "",
      dni_jugador_url: "",
      libro_familia_url: "",
      dni_tutor_legal: "",
      dni_tutor_legal_url: "",
      enlace_firma_jugador: "",
      enlace_firma_tutor: "",
      firma_jugador_completada: false,
      firma_tutor_completada: false,
      documentos_adicionales: [],
      telefono: "",
      email_padre: "",
      telefono_tutor_2: "",
      email_tutor_2: "",
      direccion: "",
      municipio: "",
      activo: true,
      tiene_descuento_hermano: false,
      descuento_aplicado: 0,
      incluye_seguro_accidentes: true,
      incluye_ficha_federativa: true,
      observaciones: "",
      acepta_politica_privacidad: false,
      fecha_aceptacion_privacidad: null,
      autorizacion_fotografia: "",
      ficha_medica: {
        alergias: "",
        medicacion_habitual: "",
        condiciones_medicas: "",
        grupo_sanguineo: "",
        contacto_emergencia_nombre: "",
        contacto_emergencia_telefono: "",
        contacto_emergencia_2_nombre: "",
        contacto_emergencia_2_telefono: "",
        lesiones: "",
        observaciones_medicas: ""
      }
    };
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDNI, setUploadingDNI] = useState(false);
  const [uploadingLibroFamilia, setUploadingLibroFamilia] = useState(false);
  const [uploadingDNITutor, setUploadingDNITutor] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPreviousPlayer, setSelectedPreviousPlayer] = useState(null);
  const [seasonConfig, setSeasonConfig] = useState(null);

  const categories = getCategoriesWithYears();

  // Calcular edad del jugador
  const playerAge = useMemo(() => calculateAge(currentPlayer.fecha_nacimiento), [currentPlayer.fecha_nacimiento]);
  const isMayorDeEdad = playerAge !== null && playerAge >= 18;
  const requiresDNI = playerAge !== null && playerAge >= 14;

  // Calcular descuento por hermanos
  const siblingDiscount = useMemo(() => {
    if (!currentUser || !allPlayers.length) return { hasDiscount: false, amount: 0 };
    
    // Buscar otros jugadores de la misma familia (mismo email padre)
    const familyPlayers = allPlayers.filter(p => 
      (p.email_padre === currentUser.email || p.email_padre === currentPlayer.email_padre) &&
      p.activo &&
      p.id !== player?.id
    );

    if (familyPlayers.length === 0) return { hasDiscount: false, amount: 0 };

    // Si hay hermanos, este jugador puede tener descuento si NO es el mayor
    const allBirthDates = [...familyPlayers.map(p => p.fecha_nacimiento), currentPlayer.fecha_nacimiento].filter(Boolean);
    
    if (allBirthDates.length <= 1) return { hasDiscount: false, amount: 0 };

    // Ordenar por fecha de nacimiento (el mayor primero - fecha más antigua)
    const sortedDates = allBirthDates.sort((a, b) => new Date(a) - new Date(b));
    
    // Si este jugador NO es el mayor (no tiene la fecha más antigua), aplica descuento
    if (currentPlayer.fecha_nacimiento && currentPlayer.fecha_nacimiento !== sortedDates[0]) {
      return { hasDiscount: true, amount: 25 };
    }

    return { hasDiscount: false, amount: 0 };
  }, [currentUser, allPlayers, currentPlayer.fecha_nacimiento, currentPlayer.email_padre, player?.id]);

  // Actualizar estado de mayor de edad y descuento cuando cambia
  useEffect(() => {
    setCurrentPlayer(prev => ({
      ...prev,
      es_mayor_edad: isMayorDeEdad,
      tiene_descuento_hermano: siblingDiscount.hasDiscount,
      descuento_aplicado: siblingDiscount.amount
    }));
  }, [isMayorDeEdad, siblingDiscount]);

  // Obtener configuración de la temporada
  useEffect(() => {
    const fetchSeasonConfig = async () => {
      try {
        const configs = await base44.entities.SeasonConfig.list();
        const active = configs.find(c => c.activa === true);
        setSeasonConfig(active);
      } catch (error) {
        console.error("Error fetching season config:", error);
      }
    };
    fetchSeasonConfig();
  }, []);

  useEffect(() => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (isParent) {
        try {
          const user = await base44.auth.me();
          setCurrentUser(user);
          if (!player) {
            setCurrentPlayer(prev => ({ ...prev, email_padre: user.email }));
          }
        } catch (error) {
          console.error("Error fetching user:", error);
        }
      }
    };
    fetchUser();
  }, [isParent, player]);

  const handlePreviousPlayerSelect = (playerId) => {
    const selectedPlayer = allPlayers.find(p => p.id === playerId);
    if (selectedPlayer) {
      setSelectedPreviousPlayer(selectedPlayer);
      setCurrentPlayer({
        ...selectedPlayer,
        tipo_inscripcion: "Renovación",
        activo: true,
        acepta_politica_privacidad: selectedPlayer.acepta_politica_privacidad || false,
        autorizacion_fotografia: selectedPlayer.autorizacion_fotografia || ""
      });
    }
  };

  const handleFileUpload = async (file, type) => {
    if (!file) return null;

    const setUploading = {
      photo: setUploadingPhoto,
      dni: setUploadingDNI,
      libro: setUploadingLibroFamilia,
      dniTutor: setUploadingDNITutor
    }[type];

    setUploading(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      toast.success("Archivo subido correctamente");
      return response.file_url;
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Error al subir el archivo");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    const url = await handleFileUpload(file, 'photo');
    if (url) setCurrentPlayer({ ...currentPlayer, foto_url: url });
  };

  const handleDNIUpload = async (e) => {
    const file = e.target.files?.[0];
    const url = await handleFileUpload(file, 'dni');
    if (url) setCurrentPlayer({ ...currentPlayer, dni_jugador_url: url });
  };

  const handleLibroFamiliaUpload = async (e) => {
    const file = e.target.files?.[0];
    const url = await handleFileUpload(file, 'libro');
    if (url) setCurrentPlayer({ ...currentPlayer, libro_familia_url: url });
  };

  const handleDNITutorUpload = async (e) => {
    const file = e.target.files?.[0];
    const url = await handleFileUpload(file, 'dniTutor');
    if (url) setCurrentPlayer({ ...currentPlayer, dni_tutor_legal_url: url });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!player && !currentPlayer.acepta_politica_privacidad) {
      toast.error("Debes aceptar la política de privacidad");
      return;
    }
    if (!player && !currentPlayer.autorizacion_fotografia) {
      toast.error("Debes seleccionar una opción para la autorización de fotografías");
      return;
    }
    if (!currentPlayer.foto_url) {
      toast.error("La foto tipo carnet es obligatoria");
      return;
    }
    if (requiresDNI && !currentPlayer.dni_jugador) {
      toast.error("El DNI del jugador es obligatorio para mayores de 14 años");
      return;
    }
    if (!isMayorDeEdad && !currentPlayer.dni_tutor_legal) {
      toast.error("El DNI del padre/tutor legal es obligatorio");
      return;
    }

    if (!player && !currentPlayer.fecha_aceptacion_privacidad) {
      currentPlayer.fecha_aceptacion_privacidad = new Date().toISOString();
    }

    onSubmit(currentPlayer);
  };

  const availablePlayersForRenewal = allPlayers.filter(p => {
    if (isParent && currentUser) {
      return p.email_padre === currentUser.email || p.email === currentUser.email;
    }
    return true;
  });

  return (
    <motion.div
      ref={formRef}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
              {player ? "Editar Jugador" : isMayorDeEdad ? "Inscripción Jugador Mayor de Edad" : "Nuevo Jugador"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Alertas informativas */}
          {isParent && !player && (
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Nuevo registro:</strong> Estás registrando un nuevo jugador asociado a tu cuenta ({currentUser?.email})
              </AlertDescription>
            </Alert>
          )}

          {siblingDiscount.hasDiscount && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>🎉 ¡Descuento familiar!</strong> Este jugador tiene un descuento de <strong>{siblingDiscount.amount}€</strong> por tener hermanos mayores inscritos.
              </AlertDescription>
            </Alert>
          )}

          {isMayorDeEdad && (
            <Alert className="mb-6 bg-purple-50 border-purple-200">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-800">
                <strong>👤 Jugador mayor de edad:</strong> Al ser mayor de 18 años, te representas a ti mismo y la cuota de socio está incluida en tu inscripción.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo de Inscripción */}
            {!player && seasonConfig?.permitir_renovaciones && (
              <>
                <div className="space-y-4 border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-bold text-blue-900">¿Nueva inscripción o renovación? *</h3>
                  </div>
                  
                  <RadioGroup
                    value={currentPlayer.tipo_inscripcion}
                    onValueChange={(value) => {
                      setCurrentPlayer({...currentPlayer, tipo_inscripcion: value});
                      if (value === "Nueva Inscripción") setSelectedPreviousPlayer(null);
                    }}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border-2 border-blue-200">
                      <RadioGroupItem value="Nueva Inscripción" id="nueva" />
                      <Label htmlFor="nueva" className="font-semibold cursor-pointer">Nueva Inscripción</Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border-2 border-blue-200">
                      <RadioGroupItem value="Renovación" id="renovacion" />
                      <Label htmlFor="renovacion" className="font-semibold cursor-pointer flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" /> Renovación
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {currentPlayer.tipo_inscripcion === "Renovación" && (
                  <div className="space-y-4 border-2 border-green-200 rounded-lg p-6 bg-green-50">
                    <h3 className="text-lg font-bold text-green-900">Selecciona el jugador a renovar *</h3>
                    <Select value={selectedPreviousPlayer?.id} onValueChange={handlePreviousPlayerSelect}>
                      <SelectTrigger><SelectValue placeholder="Selecciona un jugador..." /></SelectTrigger>
                      <SelectContent>
                        {availablePlayersForRenewal.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.nombre} - {p.deporte}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {/* FOTO TIPO CARNET (OBLIGATORIA) */}
            <div className="space-y-4 border-2 border-orange-300 rounded-lg p-6 bg-orange-50">
              <div className="flex items-center gap-2">
                <Camera className="w-6 h-6 text-orange-600" />
                <h3 className="text-lg font-bold text-orange-900">Foto Tipo Carnet * (OBLIGATORIA)</h3>
              </div>
              
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  {currentPlayer.foto_url ? (
                    <img src={currentPlayer.foto_url} alt="Foto carnet" className="w-32 h-40 object-cover border-4 border-orange-300 shadow-lg rounded-lg" />
                  ) : (
                    <div className="w-32 h-40 bg-slate-200 flex items-center justify-center text-slate-500 border-4 border-dashed border-orange-300 rounded-lg">
                      <Camera className="w-8 h-8" />
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" id="photo-upload" />
                  <label htmlFor="photo-upload">
                    <Button type="button" size="sm" variant="outline" className="absolute bottom-0 right-0 rounded-full" disabled={uploadingPhoto} onClick={() => document.getElementById('photo-upload').click()}>
                      {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    </Button>
                  </label>
                </div>
                <p className="text-sm text-orange-700 font-medium">Foto tipo carnet de frente, fondo claro</p>
              </div>
            </div>

            {/* Datos básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre y Apellidos del Jugador *</Label>
                <Input id="nombre" value={currentPlayer.nombre} onChange={(e) => setCurrentPlayer({...currentPlayer, nombre: e.target.value})} required placeholder="Ej: Juan García López" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento *</Label>
                <Input id="fecha_nacimiento" type="date" value={currentPlayer.fecha_nacimiento} onChange={(e) => setCurrentPlayer({...currentPlayer, fecha_nacimiento: e.target.value})} required />
                {playerAge !== null && (
                  <p className="text-xs text-slate-600">Edad: <strong>{playerAge} años</strong> {isMayorDeEdad ? "(Mayor de edad)" : requiresDNI ? "(Requiere DNI)" : "(Menor de 14)"}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deporte">Categoría y Deporte *</Label>
              <Select value={currentPlayer.deporte} onValueChange={(value) => setCurrentPlayer({...currentPlayer, deporte: value})} disabled={isParent && player}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* DOCUMENTACIÓN DEL JUGADOR */}
            <div className="space-y-4 border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-bold text-blue-900">Documentación del Jugador</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* DNI del Jugador */}
                <div className="space-y-2">
                  <Label htmlFor="dni_jugador">DNI del Jugador {requiresDNI ? "*" : "(opcional si menor de 14)"}</Label>
                  <Input id="dni_jugador" value={currentPlayer.dni_jugador || ""} onChange={(e) => setCurrentPlayer({...currentPlayer, dni_jugador: e.target.value})} placeholder="12345678A" required={requiresDNI} />
                </div>

                <div className="space-y-2">
                  <Label>Subir DNI Jugador (escaneado)</Label>
                  <div className="flex items-center gap-2">
                    <input type="file" accept="image/*,application/pdf" onChange={handleDNIUpload} className="hidden" id="dni-upload" />
                    <Button type="button" variant="outline" onClick={() => document.getElementById('dni-upload').click()} disabled={uploadingDNI} className="flex-1">
                      {uploadingDNI ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                      {currentPlayer.dni_jugador_url ? "Cambiar DNI" : "Subir DNI"}
                    </Button>
                    {currentPlayer.dni_jugador_url && (
                      <a href={currentPlayer.dni_jugador_url} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="ghost" size="icon"><Download className="w-4 h-4" /></Button>
                      </a>
                    )}
                  </div>
                </div>

                {/* Libro de Familia (para menores sin DNI) */}
                {!requiresDNI && (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Libro de Familia (si no tiene DNI) *</Label>
                      <div className="flex items-center gap-2">
                        <input type="file" accept="image/*,application/pdf" onChange={handleLibroFamiliaUpload} className="hidden" id="libro-upload" />
                        <Button type="button" variant="outline" onClick={() => document.getElementById('libro-upload').click()} disabled={uploadingLibroFamilia} className="flex-1">
                          {uploadingLibroFamilia ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                          {currentPlayer.libro_familia_url ? "Cambiar Libro" : "Subir Libro de Familia"}
                        </Button>
                        {currentPlayer.libro_familia_url && (
                          <a href={currentPlayer.libro_familia_url} target="_blank" rel="noopener noreferrer">
                            <Button type="button" variant="ghost" size="icon"><Download className="w-4 h-4" /></Button>
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-blue-700">Si el jugador es menor de 14 años y no tiene DNI, sube el libro de familia</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* DATOS DEL TUTOR LEGAL (solo si menor de edad) */}
            {!isMayorDeEdad && (
              <div className="space-y-4 border-2 border-green-200 rounded-lg p-6 bg-green-50">
                <div className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-bold text-green-900">Datos del Padre/Madre/Tutor Legal *</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="dni_tutor_legal">DNI del Tutor Legal *</Label>
                    <Input id="dni_tutor_legal" value={currentPlayer.dni_tutor_legal || ""} onChange={(e) => setCurrentPlayer({...currentPlayer, dni_tutor_legal: e.target.value})} placeholder="12345678A" required />
                  </div>

                  <div className="space-y-2">
                    <Label>Subir DNI Tutor (escaneado)</Label>
                    <div className="flex items-center gap-2">
                      <input type="file" accept="image/*,application/pdf" onChange={handleDNITutorUpload} className="hidden" id="dni-tutor-upload" />
                      <Button type="button" variant="outline" onClick={() => document.getElementById('dni-tutor-upload').click()} disabled={uploadingDNITutor} className="flex-1">
                        {uploadingDNITutor ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                        {currentPlayer.dni_tutor_legal_url ? "Cambiar DNI" : "Subir DNI Tutor"}
                      </Button>
                      {currentPlayer.dni_tutor_legal_url && (
                        <a href={currentPlayer.dni_tutor_legal_url} target="_blank" rel="noopener noreferrer">
                          <Button type="button" variant="ghost" size="icon"><Download className="w-4 h-4" /></Button>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email_padre">Correo Electrónico Tutor *</Label>
                    <Input id="email_padre" type="email" value={currentPlayer.email_padre} onChange={(e) => setCurrentPlayer({...currentPlayer, email_padre: e.target.value})} required disabled={isParent} className={isParent ? "bg-slate-100" : ""} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono Tutor *</Label>
                    <Input id="telefono" type="tel" value={currentPlayer.telefono} onChange={(e) => setCurrentPlayer({...currentPlayer, telefono: e.target.value})} required placeholder="600123456" />
                  </div>
                </div>
              </div>
            )}

            {/* DATOS DEL JUGADOR MAYOR DE EDAD */}
            {isMayorDeEdad && (
              <div className="space-y-4 border-2 border-purple-200 rounded-lg p-6 bg-purple-50">
                <div className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-purple-600" />
                  <h3 className="text-lg font-bold text-purple-900">Datos de Contacto del Jugador</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email_padre">Correo Electrónico *</Label>
                    <Input id="email_padre" type="email" value={currentPlayer.email_padre} onChange={(e) => setCurrentPlayer({...currentPlayer, email_padre: e.target.value})} required disabled={isParent} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono *</Label>
                    <Input id="telefono" type="tel" value={currentPlayer.telefono} onChange={(e) => setCurrentPlayer({...currentPlayer, telefono: e.target.value})} required />
                  </div>
                </div>
              </div>
            )}

            {/* DIRECCIÓN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección Completa *</Label>
                <Input id="direccion" value={currentPlayer.direccion} onChange={(e) => setCurrentPlayer({...currentPlayer, direccion: e.target.value})} placeholder="Calle, número, piso..." required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="municipio">Municipio *</Label>
                <Input id="municipio" value={currentPlayer.municipio || ""} onChange={(e) => setCurrentPlayer({...currentPlayer, municipio: e.target.value})} placeholder="Bustarviejo" required />
              </div>
            </div>

            {/* ENLACES DE FIRMA FEDERACIÓN */}
            <div className="space-y-4 border-2 border-yellow-200 rounded-lg p-6 bg-yellow-50">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-yellow-600" />
                <h3 className="text-lg font-bold text-yellow-900">Enlaces de Firma de Federación</h3>
              </div>
              <p className="text-sm text-yellow-800">Estos enlaces serán proporcionados por la federación para la firma digital.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="enlace_firma_jugador">Enlace Firma Jugador</Label>
                  <Input id="enlace_firma_jugador" value={currentPlayer.enlace_firma_jugador || ""} onChange={(e) => setCurrentPlayer({...currentPlayer, enlace_firma_jugador: e.target.value})} placeholder="https://..." />
                  {currentPlayer.enlace_firma_jugador && (
                    <div className="flex items-center gap-2">
                      <Checkbox checked={currentPlayer.firma_jugador_completada} onCheckedChange={(c) => setCurrentPlayer({...currentPlayer, firma_jugador_completada: c})} />
                      <span className="text-sm">Firma completada</span>
                    </div>
                  )}
                </div>

                {!isMayorDeEdad && (
                  <div className="space-y-2">
                    <Label htmlFor="enlace_firma_tutor">Enlace Firma Tutor Legal</Label>
                    <Input id="enlace_firma_tutor" value={currentPlayer.enlace_firma_tutor || ""} onChange={(e) => setCurrentPlayer({...currentPlayer, enlace_firma_tutor: e.target.value})} placeholder="https://..." />
                    {currentPlayer.enlace_firma_tutor && (
                      <div className="flex items-center gap-2">
                        <Checkbox checked={currentPlayer.firma_tutor_completada} onCheckedChange={(c) => setCurrentPlayer({...currentPlayer, firma_tutor_completada: c})} />
                        <span className="text-sm">Firma completada</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SEGUNDO PROGENITOR (solo si menor de edad) */}
            {!isMayorDeEdad && (
              <div className="space-y-4 border-t border-slate-200 pt-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Segundo Progenitor/Tutor (Opcional)</h3>
                </div>
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-sm">
                    Si el segundo progenitor quiere ser socio, debe rellenar el formulario de <strong>"Hacerse Socio"</strong> desde su propia cuenta con una cuota de 25€.
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email_tutor_2">Correo Electrónico</Label>
                    <Input id="email_tutor_2" type="email" value={currentPlayer.email_tutor_2} onChange={(e) => setCurrentPlayer({...currentPlayer, email_tutor_2: e.target.value})} placeholder="madre@ejemplo.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefono_tutor_2">Teléfono</Label>
                    <Input id="telefono_tutor_2" type="tel" value={currentPlayer.telefono_tutor_2} onChange={(e) => setCurrentPlayer({...currentPlayer, telefono_tutor_2: e.target.value})} placeholder="600654321" />
                  </div>
                </div>
              </div>
            )}

            {/* INFO INCLUIDA */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <h4 className="font-bold text-green-900 mb-2">✅ La inscripción incluye:</h4>
              <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
                <li>Seguro de accidentes deportivos</li>
                <li>Ficha federativa</li>
                {!isMayorDeEdad && <li>Cuota de socio del padre/madre/tutor legal</li>}
                {isMayorDeEdad && <li>Cuota de socio del jugador</li>}
                {siblingDiscount.hasDiscount && <li className="font-bold">Descuento de {siblingDiscount.amount}€ por hermano menor</li>}
              </ul>
            </div>

            {/* FICHA MÉDICA */}
            <div className="space-y-4 border-2 border-red-200 rounded-lg p-6 bg-red-50">
              <div className="flex items-center gap-2">
                <Heart className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-bold text-red-900">Ficha Médica (Opcional)</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alergias">Alergias</Label>
                  <Textarea id="alergias" value={currentPlayer.ficha_medica?.alergias || ""} onChange={(e) => setCurrentPlayer({...currentPlayer, ficha_medica: {...(currentPlayer.ficha_medica || {}), alergias: e.target.value}})} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grupo_sanguineo">Grupo Sanguíneo</Label>
                  <Select value={currentPlayer.ficha_medica?.grupo_sanguineo || ""} onValueChange={(v) => setCurrentPlayer({...currentPlayer, ficha_medica: {...(currentPlayer.ficha_medica || {}), grupo_sanguineo: v}})}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Medicación Habitual</Label>
                  <Textarea value={currentPlayer.ficha_medica?.medicacion_habitual || ""} onChange={(e) => setCurrentPlayer({...currentPlayer, ficha_medica: {...(currentPlayer.ficha_medica || {}), medicacion_habitual: e.target.value}})} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Condiciones Médicas</Label>
                  <Textarea value={currentPlayer.ficha_medica?.condiciones_medicas || ""} onChange={(e) => setCurrentPlayer({...currentPlayer, ficha_medica: {...(currentPlayer.ficha_medica || {}), condiciones_medicas: e.target.value}})} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Contacto Emergencia (Nombre)</Label>
                  <Input value={currentPlayer.ficha_medica?.contacto_emergencia_nombre || ""} onChange={(e) => setCurrentPlayer({...currentPlayer, ficha_medica: {...(currentPlayer.ficha_medica || {}), contacto_emergencia_nombre: e.target.value}})} />
                </div>
                <div className="space-y-2">
                  <Label>Contacto Emergencia (Teléfono)</Label>
                  <Input type="tel" value={currentPlayer.ficha_medica?.contacto_emergencia_telefono || ""} onChange={(e) => setCurrentPlayer({...currentPlayer, ficha_medica: {...(currentPlayer.ficha_medica || {}), contacto_emergencia_telefono: e.target.value}})} />
                </div>
              </div>
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea id="observaciones" value={currentPlayer.observaciones} onChange={(e) => setCurrentPlayer({...currentPlayer, observaciones: e.target.value})} rows={3} />
            </div>

            {/* Estado del jugador (solo edición) */}
            {player && (
              <div className="space-y-4 border-2 border-slate-200 rounded-lg p-6 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {currentPlayer.activo ? <UserCheck className="w-6 h-6 text-green-600" /> : <UserX className="w-6 h-6 text-red-600" />}
                    <div>
                      <h3 className="text-lg font-bold">Estado del Jugador</h3>
                      <p className="text-sm text-slate-600">{currentPlayer.activo ? "Activo" : "Inactivo"}</p>
                    </div>
                  </div>
                  <Switch checked={currentPlayer.activo} onCheckedChange={(c) => setCurrentPlayer({...currentPlayer, activo: c})} />
                </div>
              </div>
            )}

            {/* AUTORIZACIONES */}
            {!player && (
              <>
                <div className="space-y-4 border-2 border-red-200 rounded-lg p-6 bg-red-50">
                  <div className="flex items-center gap-2">
                    <Shield className="w-6 h-6 text-red-600" />
                    <h3 className="text-lg font-bold text-red-900">AUTORIZACIÓN TRATAMIENTO DE DATOS *</h3>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-sm max-h-48 overflow-y-auto border">
                    <p>Autorizo a que CLUB DEPORTIVO BUSTARVIEJO conserve en ficheros informáticos los datos personales proporcionados...</p>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border-2 border-red-300">
                    <Checkbox id="acepta" checked={currentPlayer.acepta_politica_privacidad} onCheckedChange={(c) => setCurrentPlayer({...currentPlayer, acepta_politica_privacidad: c})} />
                    <label htmlFor="acepta" className="text-sm font-semibold cursor-pointer">HE LEÍDO Y ACEPTO LA POLÍTICA DE PRIVACIDAD</label>
                  </div>
                </div>

                <div className="space-y-4 border-2 border-orange-200 rounded-lg p-6 bg-orange-50">
                  <div className="flex items-center gap-2">
                    <Camera className="w-6 h-6 text-orange-600" />
                    <h3 className="text-lg font-bold text-orange-900">AUTORIZACIÓN FOTOGRAFÍAS/VIDEOS *</h3>
                  </div>
                  <RadioGroup value={currentPlayer.autorizacion_fotografia} onValueChange={(v) => setCurrentPlayer({...currentPlayer, autorizacion_fotografia: v})} className="space-y-3">
                    <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border-2 border-orange-200">
                      <RadioGroupItem value="SI AUTORIZO" id="si" />
                      <Label htmlFor="si" className="font-semibold cursor-pointer">SI AUTORIZO</Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border-2 border-orange-200">
                      <RadioGroupItem value="NO AUTORIZO" id="no" />
                      <Label htmlFor="no" className="font-semibold cursor-pointer">NO AUTORIZO</Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={isSubmitting || (!player && (!currentPlayer.acepta_politica_privacidad || !currentPlayer.autorizacion_fotografia || !currentPlayer.foto_url))}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : (player ? "Actualizar" : "Registrar")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}