import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

import WizardProgress from "./wizard/WizardProgress";
import WizardNavButtons from "./wizard/WizardNavButtons";
import StepPlayerData from "./wizard/StepPlayerData";
import StepCategory from "./wizard/StepCategory";
import StepDocuments from "./wizard/StepDocuments";
import StepTutor from "./wizard/StepTutor";
import StepMedical from "./wizard/StepMedical";
import StepAuthorizations from "./wizard/StepAuthorizations";
import StepNormativa from "./wizard/StepNormativa";
import StepSummary from "./wizard/StepSummary";
import SecondParentSection from "./SecondParentSection";
import AdultPlayerInvitationRequest from "./AdultPlayerInvitationRequest";
import { useImageUpload } from "../utils/useImageUpload";
import { logUploadError, logUploadButtonClick, logInputChange, generateDiagnosticCode } from "../utils/uploadLogger";
import SendDiagnosticButton from "../upload/SendDiagnosticButton";
import { saveFormDraft, loadFormDraft, clearFormDraft, markCameraOpening, checkCameraReload, clearCameraFlag } from "./wizard/useFormPersistence";

// --- Helpers (same as original PlayerForm) ---
const calculateAge = (birthDate) => {
  if (!birthDate || birthDate.length !== 10) return null;
  const year = birthDate.substring(0, 4);
  if (!year.startsWith('19') && !year.startsWith('20')) return null;
  const yearNum = parseInt(year);
  if (yearNum < 1900 || yearNum > new Date().getFullYear()) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const suggestCategoryByAge = (birthDate) => {
  const age = calculateAge(birthDate);
  if (age === null) return null;
  if (age <= 7) return "Fútbol Pre-Benjamín (Mixto)";
  if (age <= 9) return "Fútbol Benjamín (Mixto)";
  if (age <= 11) return "Fútbol Alevín (Mixto)";
  if (age <= 13) return "Fútbol Infantil (Mixto)";
  if (age <= 15) return "Fútbol Cadete";
  if (age <= 18) return "Fútbol Juvenil";
  return "Fútbol Aficionado";
};

const useCategoriesFromConfig = () => {
  const [categories, setCategories] = React.useState([
    { value: "Fútbol Pre-Benjamín (Mixto)", label: "⚽ Fútbol Pre-Benjamín (Mixto) - 6-7 años" },
    { value: "Fútbol Benjamín (Mixto)", label: "⚽ Fútbol Benjamín (Mixto) - 8-9 años" },
    { value: "Fútbol Alevín (Mixto)", label: "⚽ Fútbol Alevín (Mixto) - 10-11 años" },
    { value: "Fútbol Infantil (Mixto)", label: "⚽ Fútbol Infantil (Mixto) - 12-13 años" },
    { value: "Fútbol Cadete", label: "⚽ Fútbol Cadete - 14-15 años" },
    { value: "Fútbol Juvenil", label: "⚽ Fútbol Juvenil - 16-18 años" },
    { value: "Fútbol Aficionado", label: "⚽ Fútbol Aficionado - 19+ años" },
    { value: "Fútbol Femenino", label: "⚽ Fútbol Femenino" },
    { value: "Baloncesto (Mixto)", label: "🏀 Baloncesto (Mixto)" }
  ]);
  React.useEffect(() => {
    (async () => {
      try {
        const configs = await base44.entities.CategoryConfig.filter({ activa: true });
        const activeSeasons = await base44.entities.SeasonConfig.filter({ activa: true });
        const currentSeason = activeSeasons[0]?.temporada;
        const seasonCategories = configs.filter(c => c.temporada === currentSeason && c.activa);
        if (seasonCategories.length > 0) {
          setCategories(seasonCategories.map(c => ({ value: c.nombre, label: c.nombre })));
        }
      } catch {}
    })();
  }, []);
  return categories;
};

// --- STEPS for new player ---
// 0: PlayerData, 1: Category, 2: Documents, 3: Tutor, 4: SecondParent, 5: Medical, 6: Normativa, 7: Authorizations, 8: Summary
const NEW_STEP_LABELS = ["Jugador", "Categoría", "Documentos", "Tutor", "2º Progenitor", "Médica", "Normativa", "Autorizaciones", "Resumen"];
const NEW_TOTAL = 9;

// --- STEPS for edit (reduced: no authorizations step, no summary) ---

export default function PlayerFormWizard({ player, onSubmit, onCancel, isSubmitting, isParent = false, allPlayers = [], isAdultPlayerSelfRegistration = false }) {
  const formRef = useRef(null);
  const [step, setStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});

  const isEditing = !!player;

  // Determine steps
  const totalSteps = isEditing ? 6 : NEW_TOTAL;
  const stepLabels = isEditing
    ? ["Jugador", "Categoría", "Documentos", "Tutor", "2º Progenitor", "Médica"]
    : NEW_STEP_LABELS;

  const [currentPlayer, setCurrentPlayer] = useState(() => {
    if (player) return player;
    return {
      nombre: "", foto_url: "", deporte: "Fútbol Pre-Benjamín (Mixto)", tipo_inscripcion: "Nueva Inscripción",
      fecha_nacimiento: "", es_mayor_edad: false, tipo_documento: "DNI", dni_jugador: "", dni_jugador_url: "",
      libro_familia_url: "", tipo_documento_tutor: "DNI", nombre_tutor_legal: "", dni_tutor_legal: "",
      dni_tutor_legal_url: "", enlace_firma_jugador: "", enlace_firma_tutor: "", firma_jugador_completada: false,
      firma_tutor_completada: false, documentos_adicionales: [], telefono: "", email_padre: "",
      nombre_tutor_2: "", telefono_tutor_2: "", email_tutor_2: "", direccion: "", municipio: "",
      activo: true, tiene_descuento_hermano: false, descuento_aplicado: 0, incluye_seguro_accidentes: true,
      incluye_ficha_federativa: true, observaciones: "", acepta_politica_privacidad: false,
      fecha_aceptacion_privacidad: null, autorizacion_fotografia: "",
      ficha_medica: { alergias: "", medicacion_habitual: "", condiciones_medicas: "", grupo_sanguineo: "",
        contacto_emergencia_nombre: "", contacto_emergencia_telefono: "", contacto_emergencia_2_nombre: "",
        contacto_emergencia_2_telefono: "", lesiones: "", observaciones_medicas: "" }
    };
  });

  const [usePreviousTutorData, setUsePreviousTutorData] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [uploadingPhoto, uploadFile_photo] = useImageUpload();
  const [uploadingDNI, uploadFile_dni] = useImageUpload();
  const [uploadingLibroFamilia, uploadFile_libro] = useImageUpload();
  const [uploadingDNITutor, uploadFile_tutordni] = useImageUpload();

  // Flags: se activan cuando una subida normal falla → muestra alternativa "pegar"
  const [photoUploadFailed, setPhotoUploadFailed] = useState(false);
  const [dniUploadFailed, setDniUploadFailed] = useState(false);
  const [libroUploadFailed, setLibroUploadFailed] = useState(false);

  const categories = useCategoriesFromConfig();

  const existingFamilyPlayers = allPlayers.filter(p =>
    currentUser && (p.email_padre === currentUser.email || p.email_tutor_2 === currentUser.email)
  );

  const playerAge = useMemo(() => calculateAge(currentPlayer.fecha_nacimiento), [currentPlayer.fecha_nacimiento]);
  const isMayorDeEdad = playerAge !== null && playerAge >= 18;
  const requiresDNI = playerAge !== null && playerAge >= 14;

  const siblingDiscount = useMemo(() => {
    if (isMayorDeEdad) return { hasDiscount: false, amount: 0, reason: "mayor_edad" };
    if (!currentUser || !allPlayers.length) return { hasDiscount: false, amount: 0 };
    const familyPlayers = allPlayers.filter(p => {
      if (p.id === player?.id) return false;
      if (p.email_padre !== currentUser.email && p.email_padre !== currentPlayer.email_padre) return false;
      if (!p.activo) return false;
      const age = calculateAge(p.fecha_nacimiento);
      if (age !== null && age >= 18) return false;
      return true;
    });
    if (familyPlayers.length === 0) return { hasDiscount: false, amount: 0 };
    const allBirthDates = [...familyPlayers.map(p => p.fecha_nacimiento), currentPlayer.fecha_nacimiento].filter(Boolean);
    if (allBirthDates.length <= 1) return { hasDiscount: false, amount: 0 };
    const sortedDates = allBirthDates.sort((a, b) => new Date(a) - new Date(b));
    if (currentPlayer.fecha_nacimiento && currentPlayer.fecha_nacimiento !== sortedDates[0]) return { hasDiscount: true, amount: 25 };
    return { hasDiscount: false, amount: 0 };
  }, [currentUser, allPlayers, currentPlayer.fecha_nacimiento, currentPlayer.email_padre, player?.id, isMayorDeEdad]);

  useEffect(() => {
    setCurrentPlayer(prev => ({ ...prev, es_mayor_edad: isMayorDeEdad, tiene_descuento_hermano: siblingDiscount.hasDiscount, descuento_aplicado: siblingDiscount.amount }));
  }, [isMayorDeEdad, siblingDiscount]);

  useEffect(() => {
    if (!player && currentPlayer.fecha_nacimiento && currentPlayer.deporte !== "Fútbol Femenino") {
      const suggested = suggestCategoryByAge(currentPlayer.fecha_nacimiento);
      if (suggested) setCurrentPlayer(prev => ({ ...prev, deporte: suggested }));
    }
  }, [currentPlayer.fecha_nacimiento, player]);

  // Auto-guardar borrador en cada cambio de paso o datos relevantes
  useEffect(() => {
    if (!isEditing && currentPlayer.nombre) {
      saveFormDraft(currentPlayer, step);
    }
  }, [step, currentPlayer.nombre, currentPlayer.foto_url, currentPlayer.dni_jugador_url, currentPlayer.libro_familia_url, currentPlayer.dni_tutor_legal_url]);

  // Detectar recarga (por cámara o por crash) y restaurar borrador al montar
  useEffect(() => {
    if (isEditing) return;
    const cameraReload = checkCameraReload();
    const draft = loadFormDraft();
    if (draft?.playerData && (draft.playerData.nombre || draft.playerData.foto_url)) {
      setCurrentPlayer(draft.playerData);
      setStep(draft.step || 0);
      // Recuperación silenciosa — sin toasts ni banners
      try {
        base44.entities.UploadDiagnostic.create({
          user_email: draft.playerData.email_padre || 'unknown',
          event_type: 'diagnostic_report',
          context: cameraReload ? 'camera_reload_detected' : 'crash_reload_detected',
          error_message: `Formulario restaurado silenciosamente. Foto: ${draft.playerData.foto_url ? 'SÍ' : 'NO'}`,
          device: navigator.userAgent?.substring(0, 200) || 'unknown',
          extra_data: { step: draft.step, hasFoto: !!draft.playerData.foto_url, hasDNI: !!draft.playerData.dni_jugador_url }
        });
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  useEffect(() => {
    if (isParent || isAdultPlayerSelfRegistration) {
      base44.auth.me().then(user => {
        setCurrentUser(user);
        if (!player) {
          if (isAdultPlayerSelfRegistration) {
            setCurrentPlayer(prev => ({ ...prev, email_padre: user.email, email_jugador: user.email, nombre_tutor_legal: user.full_name || "", es_mayor_edad: true }));
          } else {
            setCurrentPlayer(prev => ({ ...prev, email_padre: user.email }));
          }
        }
      }).catch(console.error);
    }
  }, [isParent, isAdultPlayerSelfRegistration, player]);

  // Handlers de subida — usan el hook centralizado useImageUpload
  // Cada handler registra: (1) que se disparó onChange, (2) cuántos archivos llegaron, (3) resultado
  const handlePhotoUpload = async (e) => {
    try {
      clearCameraFlag();
      logInputChange(e.target?.id || 'photo', e.target?.files, 'handlePhotoUpload');
      const file = e.target.files?.[0];
      if (e.target) e.target.value = '';
      if (!file) return;
      const url = await uploadFile_photo(file);
      if (url) {
        setPhotoUploadFailed(false);
        try {
          const draft = JSON.parse(localStorage.getItem('playerFormWizard_draft') || '{}');
          if (draft.playerData) { draft.playerData.foto_url = url; localStorage.setItem('playerFormWizard_draft', JSON.stringify(draft)); }
        } catch {}
        setCurrentPlayer(p => ({ ...p, foto_url: url }));
      } else {
        setPhotoUploadFailed(true);
      }
    } catch (err) { setPhotoUploadFailed(true); logUploadError(null, err, 'handlePhotoUpload_catch'); }
  };
  const handleDNIUpload = async (e) => {
    try {
      clearCameraFlag();
      logInputChange(e.target?.id || 'dni', e.target?.files, 'handleDNIUpload');
      const file = e.target.files?.[0];
      if (e.target) e.target.value = '';
      if (!file) return;
      const url = await uploadFile_dni(file);
      if (url) {
        setDniUploadFailed(false);
        try {
          const draft = JSON.parse(localStorage.getItem('playerFormWizard_draft') || '{}');
          if (draft.playerData) { draft.playerData.dni_jugador_url = url; localStorage.setItem('playerFormWizard_draft', JSON.stringify(draft)); }
        } catch {}
        setCurrentPlayer(p => ({ ...p, dni_jugador_url: url }));
      } else {
        setDniUploadFailed(true);
      }
    } catch (err) { setDniUploadFailed(true); logUploadError(null, err, 'handleDNIUpload_catch'); }
  };
  const handleLibroFamiliaUpload = async (e) => {
    try {
      clearCameraFlag();
      logInputChange(e.target?.id || 'libro', e.target?.files, 'handleLibroFamiliaUpload');
      const file = e.target.files?.[0];
      if (e.target) e.target.value = '';
      if (!file) return;
      const url = await uploadFile_libro(file);
      if (url) {
        setLibroUploadFailed(false);
        try {
          const draft = JSON.parse(localStorage.getItem('playerFormWizard_draft') || '{}');
          if (draft.playerData) { draft.playerData.libro_familia_url = url; localStorage.setItem('playerFormWizard_draft', JSON.stringify(draft)); }
        } catch {}
        setCurrentPlayer(p => ({ ...p, libro_familia_url: url }));
      } else {
        setLibroUploadFailed(true);
      }
    } catch (err) { setLibroUploadFailed(true); logUploadError(null, err, 'handleLibroFamiliaUpload_catch'); }
  };
  const handleDNITutorUpload = async (e) => {
    try {
      clearCameraFlag();
      logInputChange(e.target?.id || 'tutordni', e.target?.files, 'handleDNITutorUpload');
      const file = e.target.files?.[0];
      if (e.target) e.target.value = '';
      if (!file) return;
      const url = await uploadFile_tutordni(file);
      if (url) {
        try {
          const draft = JSON.parse(localStorage.getItem('playerFormWizard_draft') || '{}');
          if (draft.playerData) { draft.playerData.dni_tutor_legal_url = url; localStorage.setItem('playerFormWizard_draft', JSON.stringify(draft)); }
        } catch {}
        setCurrentPlayer(p => ({ ...p, dni_tutor_legal_url: url }));
      }
    } catch (err) { logUploadError(null, err, 'handleDNITutorUpload_catch'); }
  };

  const handleLoadPreviousTutorData = (playerId) => {
    const source = allPlayers.find(p => p.id === playerId);
    if (source) {
      setCurrentPlayer(prev => ({
        ...prev, nombre_tutor_legal: source.nombre_tutor_legal || "", dni_tutor_legal: source.dni_tutor_legal || "",
        dni_tutor_legal_url: source.dni_tutor_legal_url || "", telefono: source.telefono || "",
        email_padre: source.email_padre || "", nombre_tutor_2: source.nombre_tutor_2 || "",
        telefono_tutor_2: source.telefono_tutor_2 || "", email_tutor_2: source.email_tutor_2 || "",
        direccion: source.direccion || "", municipio: source.municipio || ""
      }));
      setUsePreviousTutorData(true);
    }
  };

  const handleClearTutorData = () => {
    setCurrentPlayer(prev => ({
      ...prev, nombre_tutor_legal: "", dni_tutor_legal: "", dni_tutor_legal_url: "", telefono: "",
      email_padre: isParent && currentUser ? currentUser.email : "", nombre_tutor_2: "",
      telefono_tutor_2: "", email_tutor_2: "", direccion: "", municipio: ""
    }));
    setUsePreviousTutorData(false);
  };

  // --- Per-step validation ---
  const validateStep = (s) => {
    const errors = {};
    if (s === 0) {
      if (!currentPlayer.nombre?.trim()) errors.nombre = "El nombre es obligatorio";
      if (!currentPlayer.fecha_nacimiento) errors.fecha_nacimiento = "La fecha es obligatoria";
      if (!currentPlayer.foto_url) errors.foto_url = "La foto es obligatoria";
    }
    if (s === 2) {
      if (requiresDNI && !currentPlayer.dni_jugador?.trim()) errors.dni_jugador = "DNI obligatorio (mayor de 14)";
      if (requiresDNI && !currentPlayer.dni_jugador_url) errors.dni_jugador_url = "Documento escaneado obligatorio";
      if (!requiresDNI && !isAdultPlayerSelfRegistration && !currentPlayer.dni_jugador_url && !currentPlayer.libro_familia_url)
        errors.libro_familia_url = "Libro de Familia obligatorio (menor sin DNI)";
    }
    if (s === 3) {
      if (!isAdultPlayerSelfRegistration && !isMayorDeEdad) {
        if (!currentPlayer.nombre_tutor_legal?.trim()) errors.nombre_tutor_legal = "Nombre del tutor obligatorio";
        if (!currentPlayer.dni_tutor_legal?.trim()) errors.dni_tutor_legal = "DNI del tutor obligatorio";
        if (!currentPlayer.dni_tutor_legal_url) errors.dni_tutor_legal_url = "Documento del tutor obligatorio";
      }
      if (!currentPlayer.email_padre?.trim()) errors.email_padre = "Email obligatorio";
      if (!currentPlayer.telefono?.trim()) errors.telefono = "Teléfono obligatorio";
      if (!currentPlayer.direccion?.trim()) errors.direccion = "Dirección obligatoria";
      if (!currentPlayer.municipio?.trim()) errors.municipio = "Municipio obligatorio";
    }
    if (s === 6 && !isEditing) {
      if (!currentPlayer.acepta_normativa) errors.acepta_normativa = "Debes aceptar la normativa del club";
    }
    if (s === 7 && !isEditing) {
      if (!currentPlayer.acepta_politica_privacidad) errors.acepta_politica_privacidad = "Debes aceptar la política";
      if (!currentPlayer.autorizacion_fotografia) errors.autorizacion_fotografia = "Selecciona una opción";
      if (currentPlayer.acceso_menor_autorizado && !currentPlayer.acceso_menor_email?.trim()) {
        errors.acceso_menor_email = "Introduce el email de tu hijo/a para el acceso juvenil";
      }
      if (currentPlayer.acceso_menor_autorizado && currentPlayer.acceso_menor_email && !currentPlayer.acceso_menor_email.includes("@")) {
        errors.acceso_menor_email = "Introduce un email válido";
      }
    }
    return errors;
  };

  const handleNext = () => {
    const errors = validateStep(step);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstMsg = Object.values(errors)[0];
      toast.error(firstMsg);
      return;
    }
    setFieldErrors({});
    setStep(s => Math.min(s + 1, totalSteps - 1));
  };

  const handleBack = () => { setFieldErrors({}); setStep(s => Math.max(s - 1, 0)); };

  const handleFinalSubmit = () => {
    // Validate normativa + authorizations steps if new
    if (!isEditing) {
      const normErrors = validateStep(6);
      if (Object.keys(normErrors).length > 0) {
        setFieldErrors(normErrors);
        toast.error(Object.values(normErrors)[0]);
        setStep(6);
        return;
      }
      const authErrors = validateStep(7);
      if (Object.keys(authErrors).length > 0) {
        setFieldErrors(authErrors);
        toast.error(Object.values(authErrors)[0]);
        setStep(7);
        return;
      }
    }

    // Build category validation
    let categoriaRequiereRevision = false;
    let motivoRevision = "";
    if (currentPlayer.fecha_nacimiento && currentPlayer.deporte && currentPlayer.deporte !== "Fútbol Femenino") {
      const suggested = suggestCategoryByAge(currentPlayer.fecha_nacimiento);
      if (suggested && suggested !== currentPlayer.deporte) {
        const order = ["Fútbol Pre-Benjamín (Mixto)", "Fútbol Benjamín (Mixto)", "Fútbol Alevín (Mixto)", "Fútbol Infantil (Mixto)", "Fútbol Cadete", "Fútbol Juvenil", "Fútbol Aficionado"];
        if (Math.abs(order.indexOf(suggested) - order.indexOf(currentPlayer.deporte)) > 1) {
          categoriaRequiereRevision = true;
          motivoRevision = `Edad: ${playerAge} años → sugerido ${suggested}, seleccionado ${currentPlayer.deporte}`;
        }
      }
    }

    const finalData = {
      ...currentPlayer,
      categoria_requiere_revision: categoriaRequiereRevision,
      motivo_revision_categoria: categoriaRequiereRevision ? motivoRevision : "",
    };
    if (!player && !finalData.fecha_aceptacion_privacidad) {
      finalData.fecha_aceptacion_privacidad = new Date().toISOString();
    }
    // If minor access was authorized during registration, add consent metadata
    if (finalData.acceso_menor_autorizado && finalData.acceso_menor_email) {
      finalData.acceso_menor_fecha_consentimiento = new Date().toISOString();
      finalData.acceso_menor_padre_email = currentPlayer.email_padre;
      finalData.acceso_menor_texto_version = "v1.0";
      finalData.acceso_menor_user_agent = navigator.userAgent;
    }
    clearFormDraft();
    onSubmit(finalData);
  };

  // Block +18 from parent registration (not self-registration)
  if (isMayorDeEdad && isParent && !isAdultPlayerSelfRegistration && currentPlayer.fecha_nacimiento?.length === 10) {
    return (
      <motion.div ref={formRef} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
        <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Nuevo Jugador</CardTitle>
              <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-5 h-5" /></Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Show date + name fields so user can see the issue */}
            <StepPlayerData currentPlayer={currentPlayer} setCurrentPlayer={setCurrentPlayer} fieldErrors={{}} setFieldErrors={setFieldErrors} playerAge={playerAge} isMayorDeEdad={isMayorDeEdad} requiresDNI={requiresDNI} uploadingPhoto={uploadingPhoto} onPhotoUpload={handlePhotoUpload} />
            <div className="mt-4">
              <AdultPlayerInvitationRequest playerAge={playerAge} playerData={currentPlayer} parentEmail={currentUser?.email} parentName={currentUser?.full_name} onCancel={onCancel} />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // --- Render current step ---
  const renderStep = () => {
    switch (step) {
      case 0: return <StepPlayerData currentPlayer={currentPlayer} setCurrentPlayer={setCurrentPlayer} fieldErrors={fieldErrors} setFieldErrors={setFieldErrors} playerAge={playerAge} isMayorDeEdad={isMayorDeEdad} requiresDNI={requiresDNI} uploadingPhoto={uploadingPhoto} onPhotoUpload={handlePhotoUpload} photoUploadFailed={photoUploadFailed} />;
      case 1: return <StepCategory currentPlayer={currentPlayer} setCurrentPlayer={setCurrentPlayer} categories={categories} playerAge={playerAge} suggestCategoryByAge={suggestCategoryByAge} />;
      case 2: return <StepDocuments currentPlayer={currentPlayer} setCurrentPlayer={setCurrentPlayer} fieldErrors={fieldErrors} setFieldErrors={setFieldErrors} requiresDNI={requiresDNI} isAdultPlayerSelfRegistration={isAdultPlayerSelfRegistration} uploadingDNI={uploadingDNI} uploadingLibroFamilia={uploadingLibroFamilia} onDNIUpload={handleDNIUpload} onLibroFamiliaUpload={handleLibroFamiliaUpload} dniUploadFailed={dniUploadFailed} libroUploadFailed={libroUploadFailed} />;
      case 3: return <StepTutor currentPlayer={currentPlayer} setCurrentPlayer={setCurrentPlayer} fieldErrors={fieldErrors} setFieldErrors={setFieldErrors} isParent={isParent} isAdultPlayerSelfRegistration={isAdultPlayerSelfRegistration} existingFamilyPlayers={existingFamilyPlayers} usePreviousTutorData={usePreviousTutorData} onLoadPreviousTutorData={handleLoadPreviousTutorData} onClearTutorData={handleClearTutorData} uploadingDNITutor={uploadingDNITutor} onDNITutorUpload={handleDNITutorUpload} />;
      case 4: return (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">👥 Segundo Progenitor/Tutor (Opcional)</h3>
          <p className="text-sm text-slate-600">Si hay un segundo progenitor, introduce sus datos aquí. Si no, puedes saltar este paso.</p>
          <SecondParentSection currentPlayer={currentPlayer} setCurrentPlayer={setCurrentPlayer} existingFamilyPlayers={existingFamilyPlayers} isEditing={isEditing} />
        </div>
      );
      case 5: return <StepMedical currentPlayer={currentPlayer} setCurrentPlayer={setCurrentPlayer} />;
      case 6: return isEditing ? null : <StepNormativa currentPlayer={currentPlayer} setCurrentPlayer={setCurrentPlayer} fieldErrors={fieldErrors} setFieldErrors={setFieldErrors} />;
      case 7: return isEditing ? null : <StepAuthorizations currentPlayer={currentPlayer} setCurrentPlayer={setCurrentPlayer} fieldErrors={fieldErrors} setFieldErrors={setFieldErrors} isAdultPlayerSelfRegistration={isAdultPlayerSelfRegistration} isEditing={isEditing} playerAge={playerAge} />;
      case 8: return isEditing ? null : <StepSummary currentPlayer={currentPlayer} playerAge={playerAge} isMayorDeEdad={isMayorDeEdad} siblingDiscount={siblingDiscount} isAdultPlayerSelfRegistration={isAdultPlayerSelfRegistration} />;
      default: return null;
    }
  };

  const isLastStep = step === totalSteps - 1;

  return (
    <motion.div ref={formRef} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              {isEditing ? "Editar Jugador" : isMayorDeEdad ? "Inscripción Jugador +18" : "Nuevo Jugador"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => { clearFormDraft(); onCancel(); }}><X className="w-5 h-5" /></Button>
          </div>
          <WizardProgress currentStep={step} totalSteps={totalSteps} stepLabels={stepLabels} />
        </CardHeader>
        <CardContent className="pt-6">

          {siblingDiscount.hasDiscount && step === 0 && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>🎉 Descuento familiar:</strong> {siblingDiscount.amount}€ por tener hermanos inscritos.
              </AlertDescription>
            </Alert>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-4">
            <SendDiagnosticButton className="text-xs" />
          </div>

          <WizardNavButtons
            currentStep={step}
            totalSteps={totalSteps}
            onBack={handleBack}
            onNext={handleNext}
            onSubmit={handleFinalSubmit}
            isSubmitting={isSubmitting}
            isLastStep={isLastStep}
            submitLabel={isEditing ? "Actualizar" : isAdultPlayerSelfRegistration ? "Completar Mi Registro" : "Confirmar Inscripción"}
            canAdvance={true}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}