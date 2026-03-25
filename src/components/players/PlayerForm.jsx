import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ValidatedInput from "@/components/ui/ValidatedInput";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdultPlayerInvitationRequest from "./AdultPlayerInvitationRequest";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Loader2, AlertCircle, Lock, Users, Shield, Camera, UserCheck, UserX, RefreshCw, Heart, FileText, Download, ChevronDown, ChevronUp, Eye, Send, CheckCircle2 } from "lucide-react";
import SecondParentSection from "./SecondParentSection";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { uploadPrivateFile } from "../utils/privateUpload";
import PrivateFileViewer from "../utils/PrivateFileViewer";

// Hook para cargar categorías dinámicas desde CategoryConfig
const useCategoriesFromConfig = () => {
  const [categories, setCategories] = React.useState([
    { value: "Fútbol Pre-Benjamín (Mixto)", label: `⚽ Fútbol Pre-Benjamín (Mixto) - 6-7 años` },
    { value: "Fútbol Benjamín (Mixto)", label: `⚽ Fútbol Benjamín (Mixto) - 8-9 años` },
    { value: "Fútbol Alevín (Mixto)", label: `⚽ Fútbol Alevín (Mixto) - 10-11 años` },
    { value: "Fútbol Infantil (Mixto)", label: `⚽ Fútbol Infantil (Mixto) - 12-13 años` },
    { value: "Fútbol Cadete", label: `⚽ Fútbol Cadete - 14-15 años` },
    { value: "Fútbol Juvenil", label: `⚽ Fútbol Juvenil - 16-18 años` },
    { value: "Fútbol Aficionado", label: `⚽ Fútbol Aficionado - 19+ años` },
    { value: "Fútbol Femenino", label: "⚽ Fútbol Femenino" },
    { value: "Baloncesto (Mixto)", label: "🏀 Baloncesto (Mixto)" }
  ]);

  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const configs = await base44.entities.CategoryConfig.filter({ activa: true });
        const activeSeasons = await base44.entities.SeasonConfig.filter({ activa: true });
        const currentSeason = activeSeasons[0]?.temporada;

        // Filtrar solo las categorías de la temporada activa
        const seasonCategories = configs.filter(c => c.temporada === currentSeason && c.activa);

        if (seasonCategories.length > 0) {
          const categoryList = seasonCategories.map(c => ({
            value: c.nombre,
            label: c.nombre
          }));
          setCategories(categoryList);
        }
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    };
    fetchCategories();
  }, []);

  return categories;
};

// Función para calcular edad - solo si la fecha es válida y completa
const calculateAge = (birthDate) => {
  if (!birthDate || birthDate.length !== 10) return null;
  
  // Validar que el año empiece por 19 o 20 (años válidos)
  const year = birthDate.substring(0, 4);
  if (!year.startsWith('19') && !year.startsWith('20')) return null;
  
  const yearNum = parseInt(year);
  if (yearNum < 1900 || yearNum > new Date().getFullYear()) return null;
  
  const today = new Date();
  const birth = new Date(birthDate);
  
  // Verificar que la fecha sea válida
  if (isNaN(birth.getTime())) return null;
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// Función para sugerir categoría según edad
const suggestCategoryByAge = (birthDate) => {
  const age = calculateAge(birthDate);
  if (age === null) return null;
  
  // Pre-Benjamín (6-7 años) - También incluye 4-5 años al no existir categoría Chupetín
  if (age <= 7) return "Fútbol Pre-Benjamín (Mixto)";
  // Benjamín (8-9 años)
  if (age <= 9) return "Fútbol Benjamín (Mixto)";
  // Alevín (10-11 años)
  if (age <= 11) return "Fútbol Alevín (Mixto)";
  // Infantil (12-13 años)
  if (age <= 13) return "Fútbol Infantil (Mixto)";
  // Cadete (14-15 años)
  if (age <= 15) return "Fútbol Cadete";
  // Juvenil (16-18 años)
  if (age <= 18) return "Fútbol Juvenil";
  // Aficionado (19+ años)
  return "Fútbol Aficionado";
};

export default function PlayerForm({ player, onSubmit, onCancel, isSubmitting, isParent = false, allPlayers = [], isAdultPlayerSelfRegistration = false }) {
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
      tipo_documento: "DNI",
      dni_jugador: "",
      dni_jugador_url: "",
      libro_familia_url: "",
      tipo_documento_tutor: "DNI",
      nombre_tutor_legal: "",
      dni_tutor_legal: "",
      dni_tutor_legal_url: "",
      enlace_firma_jugador: "",
      enlace_firma_tutor: "",
      firma_jugador_completada: false,
      firma_tutor_completada: false,
      documentos_adicionales: [],
      telefono: "",
      email_padre: "",
      nombre_tutor_2: "",
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

  const [usePreviousTutorData, setUsePreviousTutorData] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDNI, setUploadingDNI] = useState(false);
  const [uploadingLibroFamilia, setUploadingLibroFamilia] = useState(false);
  const [uploadingDNITutor, setUploadingDNITutor] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPreviousPlayer, setSelectedPreviousPlayer] = useState(null);
  const [seasonConfig, setSeasonConfig] = useState(null);
  const [showCondiciones, setShowCondiciones] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const categories = useCategoriesFromConfig();

  // Buscar jugadores existentes de la misma familia para reutilizar datos
  const existingFamilyPlayers = allPlayers.filter(p => 
    currentUser && (p.email_padre === currentUser.email || p.email_tutor_2 === currentUser.email)
  );

  const handleLoadPreviousTutorData = (playerId) => {
    const sourcePlayer = allPlayers.find(p => p.id === playerId);
    if (sourcePlayer) {
      setCurrentPlayer(prev => ({
        ...prev,
        nombre_tutor_legal: sourcePlayer.nombre_tutor_legal || "",
        dni_tutor_legal: sourcePlayer.dni_tutor_legal || "",
        dni_tutor_legal_url: sourcePlayer.dni_tutor_legal_url || "",
        telefono: sourcePlayer.telefono || "",
        email_padre: sourcePlayer.email_padre || "",
        nombre_tutor_2: sourcePlayer.nombre_tutor_2 || "",
        telefono_tutor_2: sourcePlayer.telefono_tutor_2 || "",
        email_tutor_2: sourcePlayer.email_tutor_2 || "",
        direccion: sourcePlayer.direccion || "",
        municipio: sourcePlayer.municipio || ""
      }));
      setUsePreviousTutorData(true);
    }
  };

  const handleClearTutorData = () => {
    setCurrentPlayer(prev => ({
      ...prev,
      nombre_tutor_legal: "",
      dni_tutor_legal: "",
      dni_tutor_legal_url: "",
      telefono: "",
      email_padre: isParent && currentUser ? currentUser.email : "",
      nombre_tutor_2: "",
      telefono_tutor_2: "",
      email_tutor_2: "",
      direccion: "",
      municipio: ""
    }));
    setUsePreviousTutorData(false);
  };

  // Calcular edad del jugador
  const playerAge = useMemo(() => calculateAge(currentPlayer.fecha_nacimiento), [currentPlayer.fecha_nacimiento]);
  const isMayorDeEdad = playerAge !== null && playerAge >= 18;
  const requiresDNI = playerAge !== null && playerAge >= 14;

  // Calcular descuento por hermanos
  // REGLA: Jugadores mayores de 18 años NO tienen descuento de hermanos
  const siblingDiscount = useMemo(() => {
    // Si es mayor de edad, NO aplica descuento
    if (isMayorDeEdad) return { hasDiscount: false, amount: 0, reason: "mayor_edad" };
    
    if (!currentUser || !allPlayers.length) return { hasDiscount: false, amount: 0 };
    
    // Buscar otros jugadores de la misma familia (mismo email padre) que sean MENORES de 18
    const familyPlayers = allPlayers.filter(p => {
      if (p.id === player?.id) return false;
      if (p.email_padre !== currentUser.email && p.email_padre !== currentPlayer.email_padre) return false;
      if (!p.activo) return false;
      // Excluir mayores de 18 del cálculo de hermanos
      const age = calculateAge(p.fecha_nacimiento);
      if (age !== null && age >= 18) return false;
      return true;
    });

    if (familyPlayers.length === 0) return { hasDiscount: false, amount: 0 };

    // Si hay hermanos menores, este jugador puede tener descuento si NO es el mayor
    const allBirthDates = [...familyPlayers.map(p => p.fecha_nacimiento), currentPlayer.fecha_nacimiento].filter(Boolean);
    
    if (allBirthDates.length <= 1) return { hasDiscount: false, amount: 0 };

    // Ordenar por fecha de nacimiento (el mayor primero - fecha más antigua)
    const sortedDates = allBirthDates.sort((a, b) => new Date(a) - new Date(b));
    
    // Si este jugador NO es el mayor (no tiene la fecha más antigua), aplica descuento
    if (currentPlayer.fecha_nacimiento && currentPlayer.fecha_nacimiento !== sortedDates[0]) {
      return { hasDiscount: true, amount: 25 };
    }

    return { hasDiscount: false, amount: 0 };
  }, [currentUser, allPlayers, currentPlayer.fecha_nacimiento, currentPlayer.email_padre, player?.id, isMayorDeEdad]);

  // Actualizar estado de mayor de edad y descuento cuando cambia
  useEffect(() => {
    setCurrentPlayer(prev => ({
      ...prev,
      es_mayor_edad: isMayorDeEdad,
      tiene_descuento_hermano: siblingDiscount.hasDiscount,
      descuento_aplicado: siblingDiscount.amount
    }));
  }, [isMayorDeEdad, siblingDiscount]);

  // Auto-seleccionar categoría sugerida cuando cambia la fecha de nacimiento
  useEffect(() => {
    // Solo auto-seleccionar si:
    // 1. No es edición (nuevo jugador)
    // 2. Hay fecha de nacimiento válida
    // 3. No es Fútbol Femenino (que es selección manual)
    if (!player && currentPlayer.fecha_nacimiento && currentPlayer.deporte !== "Fútbol Femenino") {
      const suggested = suggestCategoryByAge(currentPlayer.fecha_nacimiento);
      if (suggested) {
        setCurrentPlayer(prev => ({
          ...prev,
          deporte: suggested
        }));
      }
    }
  }, [currentPlayer.fecha_nacimiento, player]);

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
      if (isParent || isAdultPlayerSelfRegistration) {
        try {
          const user = await base44.auth.me();
          setCurrentUser(user);
          if (!player) {
            // Para auto-registro de +18, pre-llenar con el email del usuario
            if (isAdultPlayerSelfRegistration) {
              setCurrentPlayer(prev => ({ 
                ...prev, 
                email_padre: user.email,
                email_jugador: user.email,
                nombre_tutor_legal: user.full_name || "",
                es_mayor_edad: true
              }));
            } else {
              setCurrentPlayer(prev => ({ ...prev, email_padre: user.email }));
            }
          }
        } catch (error) {
          console.error("Error fetching user:", error);
        }
      }
    };
    fetchUser();
  }, [isParent, isAdultPlayerSelfRegistration, player]);

  const handlePreviousPlayerSelect = (playerId) => {
    const selectedPlayer = allPlayers.find(p => p.id === playerId);
    if (selectedPlayer) {
      setSelectedPreviousPlayer(selectedPlayer);
      // Al renovar, el jugador pasa a estar ACTIVO de nuevo para la nueva temporada
      setCurrentPlayer({
        ...selectedPlayer,
        tipo_inscripcion: "Renovación",
        activo: true, // REACTIVAR para la nueva temporada
        estado_renovacion: "renovado",
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

    // Documentos sensibles van a almacenamiento PRIVADO
    const isSensitive = ['dni', 'libro', 'dniTutor'].includes(type);

    // Validar archivo vacío o demasiado grande
    if (file.size === 0) {
      toast.error('El archivo está vacío o no se pudo leer. Inténtalo de nuevo.', { duration: 6000 });
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(0);
      toast.error(`El archivo pesa ${sizeMB}MB (máx 10MB). Baja la resolución de la cámara o envía la foto por WhatsApp a ti mismo y súbela desde ahí.`, { duration: 10000 });
      return null;
    }

    setUploading(true);
    try {
      if (isSensitive) {
        const file_uri = await uploadPrivateFile(file);
        toast.success("🔒 Documento subido de forma segura");
        return file_uri;
      } else {
        const response = await base44.integrations.Core.UploadFile({ file });
        toast.success("Archivo subido correctamente");
        return response.file_url;
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error(
        'No se pudo subir el documento. Prueba con una foto más pequeña o envíatela por WhatsApp y súbela desde ahí (se reduce sola).',
        { duration: 10000 }
      );
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

  const scrollToField = (fieldId) => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
      // Añadir animación de highlight
      element.classList.add('ring-2', 'ring-red-500', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2');
      }, 3000);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Resetear errores
    setFieldErrors({});
    const errors = {};
    let firstErrorField = null;

    // VALIDACIÓN: Verificar si categoría coincide con edad (±1 año tolerancia)
    let categoriaRequiereRevision = false;
    let motivoRevision = "";
    
    if (currentPlayer.fecha_nacimiento && currentPlayer.deporte && currentPlayer.deporte !== "Fútbol Femenino") {
      const suggested = suggestCategoryByAge(currentPlayer.fecha_nacimiento);
      if (suggested && suggested !== currentPlayer.deporte) {
        // Verificar si la diferencia es significativa (más de 1 categoría)
        const categoriesOrder = [
          "Fútbol Pre-Benjamín (Mixto)",
          "Fútbol Benjamín (Mixto)",
          "Fútbol Alevín (Mixto)",
          "Fútbol Infantil (Mixto)",
          "Fútbol Cadete",
          "Fútbol Juvenil",
          "Fútbol Aficionado"
        ];
        
        const suggestedIndex = categoriesOrder.indexOf(suggested);
        const selectedIndex = categoriesOrder.indexOf(currentPlayer.deporte);
        
        // Si la diferencia es > 1 categoría, marcar para revisión
        if (Math.abs(suggestedIndex - selectedIndex) > 1) {
          categoriaRequiereRevision = true;
          motivoRevision = `Edad: ${playerAge} años → sugerido ${suggested}, seleccionado ${currentPlayer.deporte}`;
        }
      }
    }

    // Agregar campos de revisión al jugador
    const playerDataWithValidation = {
      ...currentPlayer,
      categoria_requiere_revision: categoriaRequiereRevision,
      motivo_revision_categoria: categoriaRequiereRevision ? motivoRevision : ""
    };

    // Validaciones con mensajes descriptivos
    if (!currentPlayer.nombre?.trim()) {
      errors.nombre = "El nombre del jugador es obligatorio";
      if (!firstErrorField) firstErrorField = 'nombre';
    }

    if (!currentPlayer.fecha_nacimiento) {
      errors.fecha_nacimiento = "La fecha de nacimiento es obligatoria";
      if (!firstErrorField) firstErrorField = 'fecha_nacimiento';
    }

    if (!currentPlayer.foto_url) {
      errors.foto_url = "La foto tipo carnet es obligatoria";
      if (!firstErrorField) firstErrorField = 'photo-upload-gallery';
    }

    if (requiresDNI && !currentPlayer.dni_jugador?.trim()) {
      errors.dni_jugador = "El DNI del jugador es obligatorio para mayores de 14 años";
      if (!firstErrorField) firstErrorField = 'dni_jugador';
    }

    // Validaciones de tutor solo si NO es auto-registro +18
    if (!isMayorDeEdad && !isAdultPlayerSelfRegistration) {
      if (!currentPlayer.nombre_tutor_legal?.trim()) {
        errors.nombre_tutor_legal = "El nombre del padre/madre/tutor es obligatorio";
        if (!firstErrorField) firstErrorField = 'nombre_tutor_legal';
      }
      if (!currentPlayer.dni_tutor_legal?.trim()) {
        errors.dni_tutor_legal = "El DNI del padre/madre/tutor es obligatorio";
        if (!firstErrorField) firstErrorField = 'dni_tutor_legal';
      }
    }

    if (!currentPlayer.email_padre?.trim()) {
      errors.email_padre = "El correo electrónico es obligatorio";
      if (!firstErrorField) firstErrorField = 'email_padre';
    }

    if (!currentPlayer.telefono?.trim()) {
      errors.telefono = "El teléfono de contacto es obligatorio";
      if (!firstErrorField) firstErrorField = 'telefono';
    }

    if (!currentPlayer.direccion?.trim()) {
      errors.direccion = "La dirección es obligatoria";
      if (!firstErrorField) firstErrorField = 'direccion';
    }

    if (!currentPlayer.municipio?.trim()) {
      errors.municipio = "El municipio es obligatorio";
      if (!firstErrorField) firstErrorField = 'municipio';
    }

    if (!player && !currentPlayer.acepta_politica_privacidad) {
      errors.acepta_politica_privacidad = "Debes aceptar la política de privacidad";
      if (!firstErrorField) firstErrorField = 'acepta';
    }

    if (!player && !currentPlayer.autorizacion_fotografia) {
      errors.autorizacion_fotografia = "Debes seleccionar una opción para la autorización de fotografías";
      if (!firstErrorField) firstErrorField = 'si';
    }

    // VALIDACIONES CRÍTICAS DE DOCUMENTACIÓN ESCANEADA (OBLIGATORIAS)
    if (!currentPlayer.foto_url) {
      errors.foto_url = "La foto tipo carnet es OBLIGATORIA";
      if (!firstErrorField) firstErrorField = 'photo-upload-gallery';
    }

    if (requiresDNI && !currentPlayer.dni_jugador_url) {
      errors.dni_jugador_url = "El DNI del jugador escaneado es OBLIGATORIO (mayor de 14 años)";
      if (!firstErrorField) firstErrorField = 'dni-upload';
    }

    // Libro de familia solo si NO es auto-registro +18
    if (!requiresDNI && !isAdultPlayerSelfRegistration && !currentPlayer.dni_jugador_url && !currentPlayer.libro_familia_url) {
      errors.libro_familia_url = "El Libro de Familia escaneado es OBLIGATORIO (menor de 14 sin DNI)";
      if (!firstErrorField) firstErrorField = 'libro-upload';
    }

    // DNI tutor solo si NO es auto-registro +18
    if (!isMayorDeEdad && !isAdultPlayerSelfRegistration && !currentPlayer.dni_tutor_legal_url) {
      errors.dni_tutor_legal_url = "El DNI del tutor legal escaneado es OBLIGATORIO";
      if (!firstErrorField) firstErrorField = 'dni-tutor-upload';
    }

    // Si hay errores, mostrarlos y hacer scroll al primer campo
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      
      // Construir mensaje de error descriptivo
      const errorMessages = Object.values(errors);
      const mainError = errorMessages[0];
      const additionalCount = errorMessages.length - 1;
      
      if (additionalCount > 0) {
        toast.error(`${mainError} (y ${additionalCount} campo${additionalCount > 1 ? 's' : ''} más)`, {
          duration: 5000,
          description: "Los campos obligatorios están marcados en rojo"
        });
      } else {
        toast.error(mainError, { duration: 5000 });
      }

      // Scroll al primer campo con error
      if (firstErrorField) {
        setTimeout(() => scrollToField(firstErrorField), 100);
      }
      return;
    }

    // ADVERTENCIA DE DATOS MÉDICOS (no bloquea, pero avisa)
    const medicalWarnings = [];
    if (!currentPlayer.ficha_medica?.contacto_emergencia_nombre?.trim()) {
      medicalWarnings.push("• Contacto de emergencia (nombre y teléfono)");
    }
    if (!currentPlayer.ficha_medica?.alergias?.trim()) {
      medicalWarnings.push("• Alergias conocidas");
    }
    if (!currentPlayer.ficha_medica?.grupo_sanguineo) {
      medicalWarnings.push("• Grupo sanguíneo");
    }
    if (!currentPlayer.ficha_medica?.medicacion_habitual?.trim()) {
      medicalWarnings.push("• Medicación habitual");
    }

    if (medicalWarnings.length > 0 && !player) {
      const confirmed = window.confirm(
        `⚠️ ADVERTENCIA - Datos médicos incompletos:\n\n` +
        medicalWarnings.join('\n') +
        `\n\n¿Deseas continuar sin completar estos datos?\n\n` +
        `(Puedes añadirlos después desde "Mis Jugadores")`
      );
      if (!confirmed) return;
    }

    if (!player && !playerDataWithValidation.fecha_aceptacion_privacidad) {
      playerDataWithValidation.fecha_aceptacion_privacidad = new Date().toISOString();
    }

    onSubmit(playerDataWithValidation);
  };

  // JUGADORES DISPONIBLES PARA RENOVAR: Solo los INACTIVOS (de temporada anterior)
  const availablePlayersForRenewal = allPlayers.filter(p => {
    // Solo mostrar jugadores INACTIVOS (marcados en reset) para renovar
    if (p.activo === true) return false;
    
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

          {/* BLOQUEO: Padres no pueden inscribir mayores de 18 - Solo si NO es auto-registro */}
          {isMayorDeEdad && isParent && !isAdultPlayerSelfRegistration && currentPlayer.fecha_nacimiento && currentPlayer.fecha_nacimiento.length === 10 && (
            <AdultPlayerInvitationRequest 
              playerAge={playerAge}
              playerData={currentPlayer}
              parentEmail={currentUser?.email}
              parentName={currentUser?.full_name}
              onCancel={onCancel}
            />
          )}

          {/* Info para jugadores +18 que se auto-registran */}
          {isMayorDeEdad && isAdultPlayerSelfRegistration && (
            <Alert className="mb-6 bg-purple-50 border-purple-200">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-800">
                <strong>👤 Auto-registro como Jugador Mayor de Edad:</strong> Al ser mayor de 18 años, te representas a ti mismo. Introduce tus datos personales para completar la inscripción.

                <div className="mt-3 p-3 bg-amber-100 rounded-lg border border-amber-300">
                  <p className="font-bold text-amber-900 mb-1">⚠️ Sin descuento de hermanos</p>
                  <p className="text-sm text-amber-800">
                    Los jugadores mayores de 18 años <strong>no tienen descuento de hermanos</strong>, independientemente de si tienen hermanos menores inscritos.
                  </p>
                </div>

                <div className="mt-3 p-3 bg-purple-100 rounded-lg border border-purple-300">
                  <p className="font-bold text-purple-900 mb-1">🎉 ¡Tu panel cambiará automáticamente!</p>
                  <p className="text-sm">
                    Al completar esta inscripción, el sistema detectará que eres mayor de 18 años y tu panel cambiará del <strong>"Panel Familia"</strong> al <strong>"Panel Jugador"</strong>.
                  </p>
                  <p className="text-sm mt-2">
                    <strong>¿Qué verás en el Panel Jugador?</strong>
                  </p>
                  <ul className="text-sm list-disc list-inside mt-1 space-y-0.5">
                    <li>✅ Tus convocatorias de partidos</li>
                    <li>✅ Tus pagos pendientes y realizados</li>
                    <li>✅ Chat directo con tu equipo y entrenadores</li>
                    <li>✅ Calendario de entrenamientos y partidos</li>
                    <li>✅ Eventos del club y galería</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Condiciones Generales de la Inscripción */}
            <Collapsible open={showCondiciones} onOpenChange={setShowCondiciones}>
              <div className="border-2 border-slate-200 rounded-lg overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button type="button" className="w-full p-4 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-left">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-slate-600" />
                      <span className="font-bold text-slate-900">Condiciones Generales de la Inscripción</span>
                    </div>
                    {showCondiciones ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 bg-white border-t space-y-3 text-sm text-slate-700">
                    <ul className="list-disc list-outside ml-5 space-y-2">
                      <li>
                        La inscripción <strong>incluye la cuota de socios</strong> para la unidad familiar y se asignará al padre, madre o tutor en el caso de jugadores/as menores de 18 años. Las familias que lo deseen pueden inscribir como socios a más personas a través del apartado <strong>"Hacerse Socio"</strong> en el menú de la aplicación. <strong>Cuota de socio: 25 €</strong>
                      </li>
                      <li>
                        En el caso de <strong>familias con más de un jugador/a</strong> se aplica un <strong>descuento de 25 €</strong> sobre la cuota de inscripción para los jugadores/as de menor edad.
                      </li>
                      <li>
                        La inscripción incluye un <strong>seguro de accidentes</strong> o <strong>ficha federativa</strong>.
                      </li>
                      <li>
                        Se realizarán <strong>dos entrenamientos a la semana + partido</strong> (si es grupo inscrito en la federación).
                      </li>
                      <li>
                        En función de las condiciones climatológicas, es posible que se suspenda alguno de los entrenamientos durante el año.
                      </li>
                      <li>
                        La imposibilidad de asistir a los entrenamientos no supondrá, en ningún caso, la disminución o exención del pago de las cuotas por temporada.
                      </li>
                      <li>
                        <strong>La inscripción NO incluye la equipación y el pack de ropa de entrenamiento.</strong> Puedes consultar la equipación disponible en el apartado <strong>"Tienda"</strong> del menú.
                      </li>
                      <li>
                        No se tramitará la ficha federativa, ni el seguro de accidentes, si no está entregada la ficha de inscripción y el importe correspondiente. Los jugadores/as no podrán realizar la actividad hasta no cumplir con estos requisitos.
                      </li>
                      <li>
                        Si alguna familia se encuentra con dificultades económicas para realizar el pago en los plazos establecidos, rogamos que lo ponga en conocimiento de la Junta Directiva o Coordinador para buscar una solución. <strong>El objetivo del club es que nadie quede excluido por este motivo.</strong>
                      </li>
                      <li>
                        Las fichas federativas se harán por riguroso orden de presentación de las inscripciones y pagos.
                      </li>
                    </ul>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>



            {/* FOTO TIPO CARNET (OBLIGATORIA) */}
            <div className={`space-y-4 border-2 rounded-lg p-6 ${fieldErrors.foto_url ? 'border-red-500 bg-red-50 animate-pulse' : 'border-orange-300 bg-orange-50'}`}>
              <div className="flex items-center gap-2">
                <Camera className={`w-6 h-6 ${fieldErrors.foto_url ? 'text-red-600' : 'text-orange-600'}`} />
                <h3 className={`text-lg font-bold ${fieldErrors.foto_url ? 'text-red-900' : 'text-orange-900'}`}>
                  Foto Tipo Carnet * (OBLIGATORIA) {fieldErrors.foto_url && <span className="text-red-500 text-xs ml-1">⚠️ Falta la foto</span>}
                </h3>
              </div>
              {fieldErrors.foto_url && <p className="text-xs text-red-600 font-medium bg-red-100 p-2 rounded">⚠️ {fieldErrors.foto_url}</p>}
              
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  {currentPlayer.foto_url ? (
                    <img src={currentPlayer.foto_url} alt="Foto carnet" className="w-32 h-40 object-cover border-4 border-orange-300 shadow-lg rounded-lg" />
                  ) : (
                    <div className="w-32 h-40 bg-slate-200 flex items-center justify-center text-slate-500 border-4 border-dashed border-orange-300 rounded-lg">
                      <Camera className="w-8 h-8" />
                    </div>
                  )}
                </div>
                
                {/* Input con capture="environment" para abrir cámara en móvil */}
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  onChange={handlePhotoUpload} 
                  className="hidden" 
                  id="photo-upload-camera" 
                />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                  className="hidden" 
                  id="photo-upload-gallery" 
                />
                
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <Button 
                    type="button" 
                    variant="default"
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                    disabled={uploadingPhoto} 
                    onClick={() => document.getElementById('photo-upload-camera').click()}
                  >
                    {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
                    📸 Hacer Foto
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    className="flex-1"
                    disabled={uploadingPhoto} 
                    onClick={() => document.getElementById('photo-upload-gallery').click()}
                  >
                    {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    Subir desde galería
                  </Button>
                </div>
                
                <p className="text-sm text-orange-700 font-medium text-center">
                  Foto tipo carnet de frente, fondo claro<br/>
                  <span className="text-xs text-orange-600">En móvil pulsa "Hacer Foto" para abrir la cámara</span>
                </p>
              </div>
            </div>

            {/* Datos básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nombre" className={fieldErrors.nombre ? "text-red-600 font-bold" : ""}>
                  Nombre y Apellidos del Jugador * {fieldErrors.nombre && <span className="text-red-500 text-xs ml-1">⚠️ Obligatorio</span>}
                </Label>
                <Input 
                  id="nombre" 
                  name="name"
                  autoComplete="name"
                  value={currentPlayer.nombre} 
                  onChange={(e) => {
                    setCurrentPlayer({...currentPlayer, nombre: e.target.value});
                    if (fieldErrors.nombre) setFieldErrors(prev => ({...prev, nombre: null}));
                  }}
                  onBlur={(e) => {
                    if (e.target.value !== currentPlayer.nombre) {
                      setCurrentPlayer({...currentPlayer, nombre: e.target.value});
                    }
                  }}
                  required 
                  placeholder="Ej: Juan García López" 
                  className={fieldErrors.nombre ? "border-2 border-red-500 bg-red-50" : ""}
                />
                {fieldErrors.nombre && <p className="text-xs text-red-600 font-medium">{fieldErrors.nombre}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_nacimiento" className={fieldErrors.fecha_nacimiento ? "text-red-600 font-bold" : ""}>
                  Fecha de Nacimiento * {fieldErrors.fecha_nacimiento && <span className="text-red-500 text-xs ml-1">⚠️ Obligatorio</span>}
                </Label>
                <Input 
                  id="fecha_nacimiento" 
                  type="date" 
                  value={currentPlayer.fecha_nacimiento} 
                  onChange={(e) => {
                    setCurrentPlayer({...currentPlayer, fecha_nacimiento: e.target.value});
                    if (fieldErrors.fecha_nacimiento) setFieldErrors(prev => ({...prev, fecha_nacimiento: null}));
                  }} 
                  required 
                  className={fieldErrors.fecha_nacimiento ? "border-2 border-red-500 bg-red-50" : ""}
                />
                {fieldErrors.fecha_nacimiento && <p className="text-xs text-red-600 font-medium">{fieldErrors.fecha_nacimiento}</p>}
                {playerAge !== null && (
                  <p className="text-xs text-slate-600">Edad: <strong>{playerAge} años</strong> {isMayorDeEdad ? "(Mayor de edad)" : requiresDNI ? "(Requiere DNI)" : "(Menor de 14)"}</p>
                )}
              </div>
            </div>

            {/* Checkbox Fútbol Femenino */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border-2 border-pink-200">
                <Checkbox 
                  id="es_femenino"
                  checked={currentPlayer.deporte === "Fútbol Femenino"}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setCurrentPlayer({...currentPlayer, deporte: "Fútbol Femenino"});
                    } else {
                      // Si desmarca, volver a la sugerencia o Pre-Benjamín
                      const suggested = suggestCategoryByAge(currentPlayer.fecha_nacimiento);
                      setCurrentPlayer({...currentPlayer, deporte: suggested || "Fútbol Pre-Benjamín (Mixto)"});
                    }
                  }}
                  className="w-5 h-5"
                />
                <Label htmlFor="es_femenino" className="cursor-pointer flex-1">
                  <span className="font-bold text-pink-900">⚽👧 ¿Es jugadora de Fútbol Femenino?</span>
                  <p className="text-xs text-pink-700 mt-1">
                    Marca esta casilla si la jugadora va a participar en el equipo femenino del club
                  </p>
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deporte">Categoría y Deporte *</Label>
                {playerAge !== null && currentPlayer.deporte !== "Fútbol Femenino" && (
                  <Alert className="mb-2 bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 text-sm">
                      <strong>✅ Categoría seleccionada automáticamente:</strong> Según la edad ({playerAge} años) → <strong>{currentPlayer.deporte}</strong>
                      <br/><span className="text-xs">Puedes cambiarla manualmente si no es correcta</span>
                    </AlertDescription>
                  </Alert>
                )}
                <Select 
                  value={currentPlayer.deporte} 
                  onValueChange={(value) => setCurrentPlayer({...currentPlayer, deporte: value})} 
                  disabled={false}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  ℹ️ Categoría auto-seleccionada por edad - puedes cambiarla manualmente
                </p>
              </div>
            </div>

            {/* DOCUMENTACIÓN DEL JUGADOR */}
            <div className="space-y-4 border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-bold text-blue-900">Documentación del Jugador</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tipo de documento */}
                <div className="space-y-2">
                  <Label htmlFor="tipo_documento">Tipo de Documento del Jugador</Label>
                  <Select 
                    value={currentPlayer.tipo_documento || "DNI"} 
                    onValueChange={(v) => setCurrentPlayer({...currentPlayer, tipo_documento: v})}
                  >
                    <SelectTrigger id="tipo_documento">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DNI">🪪 DNI</SelectItem>
                      <SelectItem value="Pasaporte">🛂 Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* DNI/Pasaporte del Jugador */}
                <div className="space-y-2">
                  <Label htmlFor="dni_jugador" className={fieldErrors.dni_jugador ? "text-red-600 font-bold" : ""}>
                    {currentPlayer.tipo_documento === "Pasaporte" ? "Pasaporte" : "DNI"} del Jugador {requiresDNI ? "*" : "(opcional si menor de 14)"} {fieldErrors.dni_jugador && <span className="text-red-500 text-xs ml-1">⚠️</span>}
                  </Label>
                  <Input 
                    id="dni_jugador" 
                    name="dni"
                    autoComplete="off"
                    value={currentPlayer.dni_jugador || ""} 
                    onChange={(e) => {
                      setCurrentPlayer({...currentPlayer, dni_jugador: e.target.value});
                      if (fieldErrors.dni_jugador) setFieldErrors(prev => ({...prev, dni_jugador: null}));
                    }}
                    placeholder={currentPlayer.tipo_documento === "Pasaporte" ? "ABC123456" : "12345678A"} 
                    required={requiresDNI} 
                    className={fieldErrors.dni_jugador ? "border-2 border-red-500 bg-red-50" : ""}
                  />
                  {fieldErrors.dni_jugador && <p className="text-xs text-red-600 font-medium">{fieldErrors.dni_jugador}</p>}
                </div>

                <div className={`space-y-2 md:col-span-2 ${fieldErrors.dni_jugador_url ? 'animate-pulse' : ''}`}>
                  <Label className={fieldErrors.dni_jugador_url ? "text-red-600 font-bold" : ""}>
                    Subir {currentPlayer.tipo_documento === "Pasaporte" ? "Pasaporte" : "DNI"} Jugador (escaneado) {requiresDNI ? "*" : ""} {fieldErrors.dni_jugador_url && <span className="text-red-500 text-xs ml-1">⚠️ OBLIGATORIO</span>}
                  </Label>
                  <div className="flex items-center gap-2">
                    <input type="file" accept="image/*,application/pdf" onChange={handleDNIUpload} className="hidden" id="dni-upload" />
                    <Button 
                      type="button" 
                      variant={fieldErrors.dni_jugador_url ? "destructive" : "outline"}
                      onClick={() => document.getElementById('dni-upload').click()} 
                      disabled={uploadingDNI} 
                      className={`flex-1 ${fieldErrors.dni_jugador_url ? 'border-2 border-red-500' : ''}`}
                    >
                      {uploadingDNI ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                      {currentPlayer.dni_jugador_url ? `✓ Cambiar ${currentPlayer.tipo_documento === "Pasaporte" ? "Pasaporte" : "DNI"}` : `Subir ${currentPlayer.tipo_documento === "Pasaporte" ? "Pasaporte" : "DNI"}`}
                    </Button>
                    {currentPlayer.dni_jugador_url && (
                      <PrivateFileViewer fileUri={currentPlayer.dni_jugador_url} playerId={player?.id} label="Ver DNI" />
                    )}
                    </div>
                    {fieldErrors.dni_jugador_url && <p className="text-xs text-red-600 font-medium bg-red-100 p-2 rounded">⚠️ {fieldErrors.dni_jugador_url}</p>}
                    </div>

                    {/* Libro de Familia (solo menores sin DNI y NO auto-registro +18) */}
                    {!requiresDNI && !isAdultPlayerSelfRegistration && (
                    <>
                    <div className={`space-y-2 md:col-span-2 ${fieldErrors.libro_familia_url ? 'animate-pulse' : ''}`}>
                      <Label className={fieldErrors.libro_familia_url ? "text-red-600 font-bold" : ""}>
                        Libro de Familia (si no tiene DNI) * {fieldErrors.libro_familia_url && <span className="text-red-500 text-xs ml-1">⚠️ OBLIGATORIO</span>}
                      </Label>
                      <div className="flex items-center gap-2">
                        <input type="file" accept="image/*,application/pdf" onChange={handleLibroFamiliaUpload} className="hidden" id="libro-upload" />
                        <Button 
                          type="button" 
                          variant={fieldErrors.libro_familia_url ? "destructive" : "outline"}
                          onClick={() => document.getElementById('libro-upload').click()} 
                          disabled={uploadingLibroFamilia} 
                          className={`flex-1 ${fieldErrors.libro_familia_url ? 'border-2 border-red-500' : ''}`}
                        >
                          {uploadingLibroFamilia ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                          {currentPlayer.libro_familia_url ? "✓ Cambiar Libro" : "Subir Libro de Familia"}
                        </Button>
                        {currentPlayer.libro_familia_url && (
                          <PrivateFileViewer fileUri={currentPlayer.libro_familia_url} playerId={player?.id} label="Ver Libro" />
                        )}
                      </div>
                      <p className="text-xs text-blue-700">Si el jugador es menor de 14 años y no tiene DNI, sube el libro de familia</p>
                      {fieldErrors.libro_familia_url && <p className="text-xs text-red-600 font-medium bg-red-100 p-2 rounded">⚠️ {fieldErrors.libro_familia_url}</p>}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* DATOS DEL TUTOR LEGAL - SOLO si NO es auto-registro de +18 */}
            {!isAdultPlayerSelfRegistration && (
              <div className="space-y-4 border-2 border-green-200 rounded-lg p-6 bg-green-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-6 h-6 text-green-600" />
                    <h3 className="text-lg font-bold text-green-900">Datos del Padre/Madre/Tutor Legal *</h3>
                  </div>
                </div>

                {/* Opción para cargar datos de otro jugador de la familia */}
                {!player && existingFamilyPlayers.length > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border-2 border-blue-300 shadow-sm">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-base font-bold text-blue-900">
                            👨‍👩‍👧‍👦 ¡Ya tienes hijos inscritos!
                          </p>
                          <p className="text-xs text-blue-700">
                            Copia los datos de tutores para ahorrar tiempo
                          </p>
                        </div>
                      </div>
                      
                      {!usePreviousTutorData ? (
                        <Select onValueChange={handleLoadPreviousTutorData}>
                          <SelectTrigger className="w-full h-12 bg-white border-2 border-blue-300">
                            <SelectValue placeholder="📋 Selecciona un hijo para copiar datos..." />
                          </SelectTrigger>
                          <SelectContent>
                            {existingFamilyPlayers.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                👤 {p.nombre} - {p.deporte}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="space-y-2">
                          <Alert className="bg-green-100 border-green-300">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800 text-sm">
                              ✅ <strong>Datos copiados correctamente:</strong> Tutor principal, segundo progenitor, dirección y teléfonos.
                              Puedes modificar cualquier campo si es necesario.
                            </AlertDescription>
                          </Alert>
                          <Button type="button" variant="outline" onClick={handleClearTutorData} className="w-full text-red-600 border-red-300 hover:bg-red-50">
                            <X className="w-4 h-4 mr-1" /> Limpiar y rellenar manualmente
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="nombre_tutor_legal" className={fieldErrors.nombre_tutor_legal ? "text-red-600 font-bold" : ""}>
                          Nombre y Apellidos del Padre/Madre/Tutor Legal * {fieldErrors.nombre_tutor_legal && <span className="text-red-500 text-xs ml-1">⚠️ Obligatorio</span>}
                        </Label>
                        <Input 
                          id="nombre_tutor_legal" 
                          name="parent-name"
                          autoComplete="name"
                          value={currentPlayer.nombre_tutor_legal || ""} 
                          onChange={(e) => {
                            setCurrentPlayer({...currentPlayer, nombre_tutor_legal: e.target.value});
                            if (fieldErrors.nombre_tutor_legal) setFieldErrors(prev => ({...prev, nombre_tutor_legal: null}));
                          }}
                          onBlur={(e) => {
                            if (e.target.value !== (currentPlayer.nombre_tutor_legal || "")) {
                              setCurrentPlayer({...currentPlayer, nombre_tutor_legal: e.target.value});
                            }
                          }}
                          placeholder="Ej: María García López" 
                          required 
                          className={fieldErrors.nombre_tutor_legal ? "border-2 border-red-500 bg-red-50" : ""}
                        />
                        {fieldErrors.nombre_tutor_legal && <p className="text-xs text-red-600 font-medium">{fieldErrors.nombre_tutor_legal}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tipo_documento_tutor">Tipo de Documento del Tutor</Label>
                        <Select 
                          value={currentPlayer.tipo_documento_tutor || "DNI"} 
                          onValueChange={(v) => setCurrentPlayer({...currentPlayer, tipo_documento_tutor: v})}
                        >
                          <SelectTrigger id="tipo_documento_tutor">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DNI">🪪 DNI</SelectItem>
                            <SelectItem value="Pasaporte">🛂 Pasaporte</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dni_tutor_legal" className={fieldErrors.dni_tutor_legal ? "text-red-600 font-bold" : ""}>
                          {currentPlayer.tipo_documento_tutor === "Pasaporte" ? "Pasaporte" : "DNI"} del Tutor Legal * {fieldErrors.dni_tutor_legal && <span className="text-red-500 text-xs ml-1">⚠️ Obligatorio</span>}
                        </Label>
                        <Input 
                          id="dni_tutor_legal" 
                          name="parent-dni"
                          autoComplete="off"
                          value={currentPlayer.dni_tutor_legal || ""} 
                          onChange={(e) => {
                            setCurrentPlayer({...currentPlayer, dni_tutor_legal: e.target.value});
                            if (fieldErrors.dni_tutor_legal) setFieldErrors(prev => ({...prev, dni_tutor_legal: null}));
                          }}
                          placeholder={currentPlayer.tipo_documento_tutor === "Pasaporte" ? "ABC123456" : "12345678A"} 
                          required 
                          className={fieldErrors.dni_tutor_legal ? "border-2 border-red-500 bg-red-50" : ""}
                        />
                        {fieldErrors.dni_tutor_legal && <p className="text-xs text-red-600 font-medium">{fieldErrors.dni_tutor_legal}</p>}
                      </div>

                      <div className={`space-y-2 md:col-span-2 ${fieldErrors.dni_tutor_legal_url ? 'animate-pulse' : ''}`}>
                        <Label className={fieldErrors.dni_tutor_legal_url ? "text-red-600 font-bold" : ""}>
                          Subir {currentPlayer.tipo_documento_tutor === "Pasaporte" ? "Pasaporte" : "DNI"} Tutor (escaneado) * {fieldErrors.dni_tutor_legal_url && <span className="text-red-500 text-xs ml-1">⚠️ OBLIGATORIO</span>}
                        </Label>
                        <div className="flex items-center gap-2">
                          <input type="file" accept="image/*,application/pdf" onChange={handleDNITutorUpload} className="hidden" id="dni-tutor-upload" />
                          <Button 
                            type="button" 
                            variant={fieldErrors.dni_tutor_legal_url ? "destructive" : "outline"}
                            onClick={() => document.getElementById('dni-tutor-upload').click()} 
                            disabled={uploadingDNITutor} 
                            className={`flex-1 ${fieldErrors.dni_tutor_legal_url ? 'border-2 border-red-500' : ''}`}
                          >
                            {uploadingDNITutor ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                            {currentPlayer.dni_tutor_legal_url ? `✓ Cambiar ${currentPlayer.tipo_documento_tutor === "Pasaporte" ? "Pasaporte" : "DNI"}` : `Subir ${currentPlayer.tipo_documento_tutor === "Pasaporte" ? "Pasaporte" : "DNI"} Tutor`}
                          </Button>
                          {currentPlayer.dni_tutor_legal_url && (
                            <PrivateFileViewer fileUri={currentPlayer.dni_tutor_legal_url} playerId={player?.id} label="Ver DNI Tutor" />
                          )}
                        </div>
                        {fieldErrors.dni_tutor_legal_url && <p className="text-xs text-red-600 font-medium bg-red-100 p-2 rounded">⚠️ {fieldErrors.dni_tutor_legal_url}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email_padre" className={fieldErrors.email_padre ? "text-red-600 font-bold" : ""}>
                          Correo Electrónico Tutor * {fieldErrors.email_padre && <span className="text-red-500 text-xs ml-1">⚠️ Obligatorio</span>}
                        </Label>
                        <ValidatedInput 
                          id="email_padre" 
                          validationType="email"
                          name="email"
                          type="email" 
                          autoComplete="email"
                          value={currentPlayer.email_padre} 
                          onChange={(e) => {
                            setCurrentPlayer({...currentPlayer, email_padre: e.target.value});
                            if (fieldErrors.email_padre) setFieldErrors(prev => ({...prev, email_padre: null}));
                          }}
                          required 
                          disabled={isParent} 
                          className={`${isParent ? "bg-slate-100" : ""} ${fieldErrors.email_padre ? "border-2 border-red-500 bg-red-50" : ""}`} 
                        />
                        {fieldErrors.email_padre && <p className="text-xs text-red-600 font-medium">{fieldErrors.email_padre}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="telefono" className={fieldErrors.telefono ? "text-red-600 font-bold" : ""}>
                          Teléfono Tutor * {fieldErrors.telefono && <span className="text-red-500 text-xs ml-1">⚠️ Obligatorio</span>}
                        </Label>
                        <ValidatedInput 
                          id="telefono" 
                          validationType="telefono"
                          name="tel"
                          type="tel" 
                          autoComplete="tel"
                          value={currentPlayer.telefono} 
                          onChange={(e) => {
                            setCurrentPlayer({...currentPlayer, telefono: e.target.value});
                            if (fieldErrors.telefono) setFieldErrors(prev => ({...prev, telefono: null}));
                          }}
                          required 
                          placeholder="600123456" 
                          className={fieldErrors.telefono ? "border-2 border-red-500 bg-red-50" : ""}
                        />
                        {fieldErrors.telefono && <p className="text-xs text-red-600 font-medium">{fieldErrors.telefono}</p>}
                      </div>
                    </div>
              </div>
            )}

            {/* DATOS DEL JUGADOR MAYOR DE EDAD - SOLO si es auto-registro de +18 */}
            {isAdultPlayerSelfRegistration && (
              <div className="space-y-4 border-2 border-purple-200 rounded-lg p-6 bg-purple-50">
                <div className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-purple-600" />
                  <h3 className="text-lg font-bold text-purple-900">Tus Datos de Contacto</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email_padre" className={fieldErrors.email_padre ? "text-red-600 font-bold" : ""}>
                      Tu Correo Electrónico * {fieldErrors.email_padre && <span className="text-red-500 text-xs ml-1">⚠️ Obligatorio</span>}
                    </Label>
                    <ValidatedInput 
                      id="email_padre" 
                      validationType="email"
                      name="email"
                      type="email" 
                      autoComplete="email"
                      value={currentPlayer.email_padre} 
                      onChange={(e) => {
                        setCurrentPlayer({...currentPlayer, email_padre: e.target.value, email_jugador: e.target.value});
                        if (fieldErrors.email_padre) setFieldErrors(prev => ({...prev, email_padre: null}));
                      }}
                      required 
                      disabled={true}
                      className={`bg-slate-100 ${fieldErrors.email_padre ? "border-2 border-red-500" : ""}`}
                    />
                    <p className="text-xs text-purple-600">Este es tu email de acceso actual</p>
                    {fieldErrors.email_padre && <p className="text-xs text-red-600 font-medium">{fieldErrors.email_padre}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefono" className={fieldErrors.telefono ? "text-red-600 font-bold" : ""}>
                      Tu Teléfono * {fieldErrors.telefono && <span className="text-red-500 text-xs ml-1">⚠️ Obligatorio</span>}
                    </Label>
                    <ValidatedInput 
                      id="telefono" 
                      validationType="telefono"
                      name="tel"
                      type="tel" 
                      autoComplete="tel"
                      value={currentPlayer.telefono} 
                      onChange={(e) => {
                        setCurrentPlayer({...currentPlayer, telefono: e.target.value});
                        if (fieldErrors.telefono) setFieldErrors(prev => ({...prev, telefono: null}));
                      }}
                      required 
                      placeholder="600123456"
                      className={fieldErrors.telefono ? "border-2 border-red-500 bg-red-50" : ""}
                    />
                    {fieldErrors.telefono && <p className="text-xs text-red-600 font-medium">{fieldErrors.telefono}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* DIRECCIÓN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="direccion" className={fieldErrors.direccion ? "text-red-600 font-bold" : ""}>
                  Dirección Completa * {fieldErrors.direccion && <span className="text-red-500 text-xs ml-1">⚠️ Obligatorio</span>}
                </Label>
                <Input 
                  id="direccion" 
                  name="street-address"
                  autoComplete="street-address"
                  value={currentPlayer.direccion} 
                  onChange={(e) => {
                    setCurrentPlayer({...currentPlayer, direccion: e.target.value});
                    if (fieldErrors.direccion) setFieldErrors(prev => ({...prev, direccion: null}));
                  }}
                  onBlur={(e) => {
                    if (e.target.value !== currentPlayer.direccion) {
                      setCurrentPlayer({...currentPlayer, direccion: e.target.value});
                    }
                  }}
                  placeholder="Calle, número, piso..." 
                  required 
                  className={fieldErrors.direccion ? "border-2 border-red-500 bg-red-50" : ""}
                />
                {fieldErrors.direccion && <p className="text-xs text-red-600 font-medium">{fieldErrors.direccion}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="municipio" className={fieldErrors.municipio ? "text-red-600 font-bold" : ""}>
                  Municipio * {fieldErrors.municipio && <span className="text-red-500 text-xs ml-1">⚠️ Obligatorio</span>}
                </Label>
                <Input 
                  id="municipio" 
                  name="address-level2"
                  autoComplete="address-level2"
                  value={currentPlayer.municipio || ""} 
                  onChange={(e) => {
                    setCurrentPlayer({...currentPlayer, municipio: e.target.value});
                    if (fieldErrors.municipio) setFieldErrors(prev => ({...prev, municipio: null}));
                  }}
                  onBlur={(e) => {
                    if (e.target.value !== (currentPlayer.municipio || "")) {
                      setCurrentPlayer({...currentPlayer, municipio: e.target.value});
                    }
                  }}
                  placeholder="Bustarviejo" 
                  required 
                  className={fieldErrors.municipio ? "border-2 border-red-500 bg-red-50" : ""}
                />
                {fieldErrors.municipio && <p className="text-xs text-red-600 font-medium">{fieldErrors.municipio}</p>}
              </div>
            </div>

            {/* SEGUNDO PROGENITOR - SOLO si NO es auto-registro de +18 */}
            {!isAdultPlayerSelfRegistration && (
              <SecondParentSection
                currentPlayer={currentPlayer}
                setCurrentPlayer={setCurrentPlayer}
                existingFamilyPlayers={existingFamilyPlayers}
                isEditing={!!player}
              />
            )}

            {/* INFO INCLUIDA - NUNCA mostrar info de tutor si es auto-registro */}
            {!isAdultPlayerSelfRegistration && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <h4 className="font-bold text-green-900 mb-2">✅ La inscripción incluye:</h4>
                <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
                  <li>Seguro de accidentes deportivos</li>
                  <li>Ficha federativa</li>
                  {!isMayorDeEdad && <li>Cuota de socio del padre/madre/tutor legal</li>}
                  {siblingDiscount.hasDiscount && <li className="font-bold">Descuento de {siblingDiscount.amount}€ por hermano menor</li>}
                </ul>
              </div>
            )}

            {/* INFO FIRMAS FEDERACIÓN */}
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                🖊️ Sobre las Firmas de Federación
              </h4>
              <div className="text-sm text-yellow-800 space-y-2">
                <p>
                  Una vez completada la inscripción, cuando el club suba la documentación de federación, <strong>recibirás un aviso por email</strong> indicando que los documentos están listos para firmar.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Firma del jugador/a:</strong> Obligatoria</li>
                  {!isMayorDeEdad && <li><strong>Firma del padre/madre/tutor:</strong> Obligatoria para menores</li>}
                </ul>
                <p className="mt-2">
                  📱 <strong>¿Dónde firmar?</strong> Debes acceder a la sección <strong>"🖊️ Firmas Federación"</strong> en el menú de la app para completar las firmas. El email solo es un aviso.
                </p>
                <p className="text-xs text-yellow-700 mt-2">
                  ⚠️ Sin las firmas completadas no se puede tramitar la ficha federativa ni el seguro.
                </p>
              </div>
            </div>

            {/* FICHA MÉDICA - Desplegable */}
            <Collapsible>
              <div className="border-2 border-red-200 rounded-lg overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button type="button" className="w-full p-4 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-between text-left">
                    <div className="flex items-center gap-2">
                      <Heart className="w-6 h-6 text-red-600" />
                      <span className="font-bold text-red-900">Ficha Médica y Contactos de Emergencia</span>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Recomendado</Badge>
                    </div>
                    <ChevronDown className="w-5 h-5 text-red-500" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-6 bg-white border-t space-y-6">
                    {/* Anotaciones médicas */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-red-800 flex items-center gap-2">
                        🏥 Anotaciones de Ficha Médica
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="alergias">Alergias</Label>
                          <Textarea id="alergias" value={currentPlayer.ficha_medica?.alergias || ""} onChange={(e) => setCurrentPlayer({...currentPlayer, ficha_medica: {...(currentPlayer.ficha_medica || {}), alergias: e.target.value}})} rows={2} placeholder="Alimentos, medicamentos, etc." />
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
                          <Textarea value={currentPlayer.ficha_medica?.medicacion_habitual || ""} onChange={(e) => setCurrentPlayer({...currentPlayer, ficha_medica: {...(currentPlayer.ficha_medica || {}), medicacion_habitual: e.target.value}})} rows={2} placeholder="Medicamentos que toma regularmente" />
                        </div>
                        <div className="space-y-2">
                          <Label>Condiciones Médicas</Label>
                          <Textarea value={currentPlayer.ficha_medica?.condiciones_medicas || ""} onChange={(e) => setCurrentPlayer({...currentPlayer, ficha_medica: {...(currentPlayer.ficha_medica || {}), condiciones_medicas: e.target.value}})} rows={2} placeholder="Asma, diabetes, epilepsia, etc." />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Lesiones o Historial Relevante</Label>
                          <Textarea value={currentPlayer.ficha_medica?.lesiones || ""} onChange={(e) => setCurrentPlayer({...currentPlayer, ficha_medica: {...(currentPlayer.ficha_medica || {}), lesiones: e.target.value}})} rows={2} placeholder="Lesiones previas o actuales" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Observaciones Médicas Adicionales</Label>
                          <Textarea value={currentPlayer.ficha_medica?.observaciones_medicas || ""} onChange={(e) => setCurrentPlayer({...currentPlayer, ficha_medica: {...(currentPlayer.ficha_medica || {}), observaciones_medicas: e.target.value}})} rows={2} placeholder="Cualquier otra información médica relevante" />
                        </div>
                      </div>
                    </div>

                    {/* Contactos de Emergencia */}
                    <div className="space-y-4 pt-4 border-t border-red-200">
                      <h4 className="font-semibold text-red-800 flex items-center gap-2">
                        📞 Contactos de Emergencia
                      </h4>

                      {/* Contacto 1 */}
                      <div className="bg-red-50 rounded-lg p-4 space-y-3">
                        <p className="text-sm font-medium text-red-700">Contacto de Emergencia 1</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input 
                              name="emergency1-name"
                              autoComplete="name"
                              value={currentPlayer.ficha_medica?.contacto_emergencia_nombre || ""} 
                              onChange={(e) => setCurrentPlayer({...currentPlayer, ficha_medica: {...(currentPlayer.ficha_medica || {}), contacto_emergencia_nombre: e.target.value}})}
                              onBlur={(e) => {
                                if (e.target.value !== (currentPlayer.ficha_medica?.contacto_emergencia_nombre || "")) {
                                  setCurrentPlayer({...currentPlayer, ficha_medica: {...(currentPlayer.ficha_medica || {}), contacto_emergencia_nombre: e.target.value}});
                                }
                              }}
                              placeholder="Nombre completo" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Teléfono</Label>
                            <ValidatedInput 
                              validationType="telefono"
                              name="emergency1-tel"
                              type="tel" 
                              autoComplete="tel"
                              value={currentPlayer.ficha_medica?.contacto_emergencia_telefono || ""} 
                              onChange={(e) => setCurrentPlayer({...currentPlayer, ficha_medica: {...(currentPlayer.ficha_medica || {}), contacto_emergencia_telefono: e.target.value}})}
                              placeholder="600 123 456" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Contacto 2 */}
                      <div className="bg-red-50 rounded-lg p-4 space-y-3">
                        <p className="text-sm font-medium text-red-700">Contacto de Emergencia 2</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input 
                              name="emergency2-name"
                              autoComplete="name"
                              value={currentPlayer.ficha_medica?.contacto_emergencia_2_nombre || ""} 
                              onChange={(e) => setCurrentPlayer({...currentPlayer, ficha_medica: {...(currentPlayer.ficha_medica || {}), contacto_emergencia_2_nombre: e.target.value}})}
                              onBlur={(e) => {
                                if (e.target.value !== (currentPlayer.ficha_medica?.contacto_emergencia_2_nombre || "")) {
                                  setCurrentPlayer({...currentPlayer, ficha_medica: {...(currentPlayer.ficha_medica || {}), contacto_emergencia_2_nombre: e.target.value}});
                                }
                              }}
                              placeholder="Nombre completo" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Teléfono</Label>
                            <ValidatedInput 
                              validationType="telefono"
                              name="emergency2-tel"
                              type="tel" 
                              autoComplete="tel"
                              value={currentPlayer.ficha_medica?.contacto_emergencia_2_telefono || ""} 
                              onChange={(e) => setCurrentPlayer({...currentPlayer, ficha_medica: {...(currentPlayer.ficha_medica || {}), contacto_emergencia_2_telefono: e.target.value}})}
                              placeholder="600 654 321" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

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
                  <div className="bg-white rounded-lg p-4 text-sm max-h-64 overflow-y-auto border text-slate-700 space-y-3">
                    <p className="font-semibold text-slate-900">POLÍTICA DE PROTECCIÓN DE DATOS - CLUB DEPORTIVO BUSTARVIEJO</p>
                    <p>
                      En cumplimiento de lo dispuesto en el Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, 
                      de 27 de abril de 2016, relativo a la protección de las personas físicas en lo que respecta al 
                      tratamiento de datos personales y a la libre circulación de estos datos (RGPD), le informamos de que:
                    </p>
                    <p>
                      <strong>Responsable del tratamiento:</strong> CLUB DEPORTIVO BUSTARVIEJO<br/>
                      <strong>Finalidad:</strong> Gestión de la inscripción deportiva, comunicaciones relacionadas con la 
                      actividad del club, gestión administrativa y deportiva.
                    </p>
                    <p>
                      <strong>Legitimación:</strong> Consentimiento del interesado y/o ejecución de un contrato.
                    </p>
                    <p>
                      <strong>Destinatarios:</strong> Los datos podrán ser comunicados a:<br/>
                      • Federaciones deportivas correspondientes para la tramitación de licencias<br/>
                      • Compañías de seguros para la cobertura de accidentes deportivos<br/>
                      • Administraciones públicas cuando sea legalmente requerido
                    </p>
                    <p>
                      <strong>Conservación:</strong> Los datos se conservarán durante el tiempo necesario para cumplir 
                      con la finalidad para la que se recabaron y para determinar las posibles responsabilidades que 
                      se pudieran derivar.
                    </p>
                    <p>
                      <strong>Derechos:</strong> Puede ejercer sus derechos de acceso, rectificación, supresión, 
                      limitación del tratamiento, portabilidad y oposición dirigiéndose a: 
                      <strong> cdbustarviejo@gmail.com</strong>
                    </p>
                    <p className="text-xs text-slate-500">
                      También tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).
                    </p>
                  </div>
                  <div className={`flex items-start gap-3 p-4 bg-white rounded-lg border-2 ${fieldErrors.acepta_politica_privacidad ? 'border-red-500 bg-red-50 animate-pulse' : 'border-red-300'}`}>
                    <Checkbox 
                      id="acepta" 
                      checked={currentPlayer.acepta_politica_privacidad} 
                      onCheckedChange={(c) => {
                        setCurrentPlayer({...currentPlayer, acepta_politica_privacidad: c});
                        if (fieldErrors.acepta_politica_privacidad) setFieldErrors(prev => ({...prev, acepta_politica_privacidad: null}));
                      }} 
                    />
                    <label htmlFor="acepta" className={`text-sm font-semibold cursor-pointer ${fieldErrors.acepta_politica_privacidad ? 'text-red-600' : 'text-red-900'}`}>
                      ✅ HE LEÍDO Y ACEPTO LA POLÍTICA DE PRIVACIDAD Y PROTECCIÓN DE DATOS
                      {fieldErrors.acepta_politica_privacidad && <span className="block text-xs text-red-500 mt-1">⚠️ Debes aceptar para continuar</span>}
                    </label>
                  </div>
                </div>

                <div className={`space-y-4 border-2 rounded-lg p-6 ${fieldErrors.autorizacion_fotografia ? 'border-red-500 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
                  <div className="flex items-center gap-2">
                    <Camera className={`w-6 h-6 ${fieldErrors.autorizacion_fotografia ? 'text-red-600' : 'text-orange-600'}`} />
                    <h3 className={`text-lg font-bold ${fieldErrors.autorizacion_fotografia ? 'text-red-900' : 'text-orange-900'}`}>
                      AUTORIZACIÓN FOTOGRAFÍAS Y VÍDEOS * {fieldErrors.autorizacion_fotografia && <span className="text-red-500 text-xs ml-1">⚠️ Obligatorio</span>}
                    </h3>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-sm max-h-48 overflow-y-auto border text-slate-700 space-y-2">
                    <p>
                      El CLUB DEPORTIVO BUSTARVIEJO podrá realizar fotografías y/o grabaciones de vídeo durante las 
                      actividades deportivas (entrenamientos, partidos, torneos, eventos del club) con las siguientes finalidades:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Publicación en la página web y redes sociales oficiales del club (Facebook, Instagram, etc.)</li>
                      <li>Publicación en la aplicación móvil del club</li>
                      <li>Elaboración de materiales promocionales del club</li>
                      <li>Publicación en medios de comunicación locales</li>
                      <li>Memoria anual de actividades del club</li>
                    </ul>
                    <p className="text-xs text-slate-500 mt-2">
                      Esta autorización puede ser revocada en cualquier momento comunicándolo por escrito al club.
                    </p>
                  </div>
                  {fieldErrors.autorizacion_fotografia && <p className="text-xs text-red-600 font-medium bg-red-100 p-2 rounded">⚠️ {fieldErrors.autorizacion_fotografia}</p>}
                  <RadioGroup 
                    value={currentPlayer.autorizacion_fotografia} 
                    onValueChange={(v) => {
                      setCurrentPlayer({...currentPlayer, autorizacion_fotografia: v});
                      if (fieldErrors.autorizacion_fotografia) setFieldErrors(prev => ({...prev, autorizacion_fotografia: null}));
                    }} 
                    className="space-y-3"
                  >
                    <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border-2 border-green-300 hover:bg-green-50 transition-colors">
                      <RadioGroupItem value="SI AUTORIZO" id="si" className="mt-1" />
                      <Label htmlFor="si" className="cursor-pointer">
                        <span className="font-bold text-green-800">✅ SÍ AUTORIZO</span>
                        <p className="text-xs text-slate-600 mt-1">
                          Autorizo la captación, reproducción y publicación de {isAdultPlayerSelfRegistration ? "mis imágenes y vídeos" : "imágenes y vídeos de mi hijo/a"} en los medios indicados.
                        </p>
                      </Label>
                    </div>
                    <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border-2 border-red-300 hover:bg-red-50 transition-colors">
                      <RadioGroupItem value="NO AUTORIZO" id="no" className="mt-1" />
                      <Label htmlFor="no" className="cursor-pointer">
                        <span className="font-bold text-red-800">❌ NO AUTORIZO</span>
                        <p className="text-xs text-slate-600 mt-1">
                          No autorizo la captación ni publicación de imágenes. El club evitará en la medida de lo posible 
                          la aparición del jugador/a en fotografías y vídeos.
                        </p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
              <Button 
                type="submit" 
                className="bg-orange-600 hover:bg-orange-700" 
                disabled={
                  isSubmitting || 
                  (!player && (!currentPlayer.acepta_politica_privacidad || !currentPlayer.autorizacion_fotografia || !currentPlayer.foto_url)) ||
                  (isMayorDeEdad && isParent && !isAdultPlayerSelfRegistration && currentPlayer.fecha_nacimiento?.length === 10) // Bloquear solo si es padre normal
                }
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : (player ? "Actualizar" : isAdultPlayerSelfRegistration ? "Completar Mi Registro" : "Registrar")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}