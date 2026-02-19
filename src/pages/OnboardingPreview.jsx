import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronLeft, ChevronRight, Eye, Monitor, Smartphone, Users, UserCircle, UserPlus, AlertTriangle, Shield, Camera, FileText, Heart, CheckCircle2, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const SCREENS = [
  { id: "welcome", label: "Bienvenida" },
  { id: "selector", label: "Tipo Registro" },
  { id: "wizard0", label: "Wizard: Datos Jugador" },
  { id: "wizard1", label: "Wizard: Categoría" },
  { id: "wizard2", label: "Wizard: Documentos" },
  { id: "wizard3", label: "Wizard: Tutor" },
  { id: "wizard4", label: "Wizard: 2º Progenitor" },
  { id: "wizard5", label: "Wizard: Médica" },
  { id: "wizard6", label: "Wizard: Autorizaciones" },
  { id: "wizard7", label: "Wizard: Resumen" },
  { id: "install", label: "Instalar App (PWA)" },
  { id: "secondparent_view", label: "Vista 2º Progenitor" },
];

function ScreenWelcome() {
  return (
    <div className="min-h-[400px] bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center p-6 rounded-2xl">
      <div className="text-center text-white space-y-6">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg" alt="Logo" className="w-24 h-24 rounded-xl mx-auto shadow-xl" />
        <h1 className="text-4xl font-black">¡Bienvenido al CD Bustarviejo!</h1>
        <p className="text-xl text-orange-100">Tu club, tu familia, tu app</p>
        <div className="space-y-3 max-w-md mx-auto text-left">
          <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
            <span className="text-2xl">⚽</span>
            <span>Inscribe a tus jugadores y gestiona todo desde el móvil</span>
          </div>
          <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
            <span className="text-2xl">💬</span>
            <span>Chatea directamente con entrenadores y coordinador</span>
          </div>
          <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
            <span className="text-2xl">📅</span>
            <span>Convocatorias, calendario, pagos y mucho más</span>
          </div>
        </div>
        <Button className="bg-white text-orange-700 hover:bg-orange-50 font-bold text-lg py-6 px-10" disabled>
          Entrar →
        </Button>
      </div>
    </div>
  );
}

function ScreenSelector() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-3">
            Bienvenido/a a CD Bustarviejo
          </h2>
          <p className="text-slate-600 text-base lg:text-lg">
            Cuéntanos en qué situación estás para personalizar tu experiencia
          </p>
        </div>

        <Alert className="bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-400 mb-6">
          <UserPlus className="h-5 w-5 text-cyan-700" />
          <AlertDescription className="text-cyan-900">
            <p className="font-bold text-sm mb-1">👥 ¿Tu pareja ya ha registrado al jugador?</p>
            <p className="text-xs">
              <strong>NO lo hagas de nuevo.</strong> Tu pareja debe invitarte como "segundo progenitor" desde la ficha del jugador.
            </p>
            <Badge className="mt-2 bg-cyan-600 text-white text-xs">Botón: "Ya me han invitado, continuar como Familia →"</Badge>
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-3 gap-6">
          {/* OPCIÓN 1: FAMILIA */}
          <div 
            className="group bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-8 border-4 border-orange-300 hover:border-orange-500 hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <Users className="w-12 h-12 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl lg:text-3xl font-bold text-orange-900 mb-3">
                  👨‍👩‍👧 Padre, Madre o Tutor
                </h3>
                <p className="text-base text-orange-700 mb-2">
                  Inscribiré a mi hijo/a o soy el responsable principal
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border-2 border-orange-200 text-left space-y-3">
                <p className="text-sm font-bold text-orange-900">ℹ️ Esto es para ti si:</p>
                <ul className="text-sm text-slate-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>Vas a inscribir a tu <strong>hijo/a por primera vez</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>Eres el <strong>responsable principal</strong> del jugador</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>Después podrás compartir acceso con el <strong>segundo progenitor</strong></span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl p-4">
                <p className="text-sm font-bold mb-1">📋 Acceso a:</p>
                <p className="text-xs">
                  Pagos • Convocatorias • Chat • Calendario • Documentos • Galería
                </p>
              </div>

              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white text-lg font-bold py-6 shadow-xl group-hover:bg-orange-700" disabled>
                Continuar como Padre/Madre →
              </Button>
            </div>
          </div>

          {/* OPCIÓN 2: JUGADOR +18 */}
          <div 
            className="group bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-8 border-4 border-green-300 hover:border-green-500 hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <UserCircle className="w-12 h-12 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl lg:text-3xl font-bold text-green-900 mb-3">
                  ⚽ Jugador Mayor de 18 Años
                </h3>
                <p className="text-base text-green-700 mb-2">
                  Te inscribes a ti mismo/a directamente
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border-2 border-green-200 text-left space-y-3">
                <p className="text-sm font-bold text-green-900">ℹ️ Esto es para ti si:</p>
                <ul className="text-sm text-slate-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>Tienes <strong>18 años o más</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>Quieres gestionar <strong>tu propio perfil</strong> como jugador</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>No tienes menores de edad a tu cargo</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl p-4">
                <p className="text-sm font-bold mb-1">⚽ Acceso a:</p>
                <p className="text-xs">
                  Tus Convocatorias • Tus Pagos • Chat de Equipo • Calendario • Documentos
                </p>
              </div>

              <Button className="w-full bg-green-600 hover:bg-green-700 text-white text-lg font-bold py-6 shadow-xl group-hover:bg-green-700" disabled>
                Continuar como Jugador →
              </Button>
            </div>
          </div>

          {/* OPCIÓN 3: SEGUNDO PROGENITOR */}
          <div 
            className="group bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-3xl p-8 border-4 border-cyan-300 hover:border-cyan-500 hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-cyan-600 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                <UserPlus className="w-12 h-12 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl lg:text-3xl font-bold text-cyan-900 mb-3">
                  👥 Segundo Progenitor
                </h3>
                <p className="text-base text-cyan-700 mb-2">
                  Mi pareja ya ha inscrito al jugador
                </p>
              </div>

              <div className="bg-white rounded-xl p-5 border-2 border-cyan-200 text-left space-y-3">
                <p className="text-sm font-bold text-cyan-900">ℹ️ Esto es para ti si:</p>
                <ul className="text-sm text-slate-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-600 font-bold">•</span>
                    <span>Tu pareja <strong>ya ha registrado</strong> al jugador</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-600 font-bold">•</span>
                    <span>Tu pareja debe <strong>invitarte</strong> desde la ficha del jugador</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-600 font-bold">•</span>
                    <span>Tendrás acceso <strong>compartido</strong> al perfil del jugador</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl p-4">
                <p className="text-sm font-bold mb-1">👥 Acceso a:</p>
                <p className="text-xs">
                  Mismo acceso que el primer progenitor (compartido)
                </p>
              </div>

              <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-lg font-bold py-6 shadow-xl group-hover:bg-cyan-700" disabled>
                Ya me han invitado →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WizardStep({ stepNum, title, icon, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm">{stepNum}</div>
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">{icon} {title}</h3>
      </div>
      {/* Progress bar */}
      <div className="flex gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= stepNum ? 'bg-orange-500' : 'bg-slate-200'}`} />
        ))}
      </div>
      <div className="bg-white border rounded-xl p-4">{children}</div>
      <div className="flex justify-between gap-3 pt-2 border-t">
        <Button variant="outline" className="min-h-[48px]" disabled>
          <ChevronLeft className="w-5 h-5 mr-1" /> Anterior
        </Button>
        <Button className="bg-orange-600 min-h-[48px] font-bold" disabled>
          Siguiente <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function ScreenWizard0() {
  return (
    <WizardStep stepNum={0} title="Datos del Jugador" icon="👤">
      <div className="space-y-4">
        <div className="border-2 border-orange-300 bg-orange-50 rounded-lg p-4 text-center space-y-2">
          <Camera className="w-8 h-8 text-orange-600 mx-auto" />
          <p className="font-bold text-orange-900">Foto Tipo Carnet *</p>
          <div className="flex gap-2 justify-center">
            <Button size="sm" className="bg-orange-600" disabled>📸 Hacer Foto</Button>
            <Button size="sm" variant="outline" disabled>Subir desde galería</Button>
          </div>
        </div>
        <MockInput label="Nombre y Apellidos del Jugador *" placeholder="Ej: Juan García López" />
        <MockInput label="Fecha de Nacimiento *" placeholder="dd/mm/aaaa" type="date" />
        <p className="text-xs text-slate-600">Edad: <strong>10 años</strong> (Menor de 14)</p>
      </div>
    </WizardStep>
  );
}

function ScreenWizard1() {
  return (
    <WizardStep stepNum={1} title="Categoría y Deporte" icon="⚽">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg border-2 border-pink-200">
          <div className="w-5 h-5 border-2 border-pink-400 rounded" />
          <div>
            <p className="font-bold text-pink-900 text-sm">⚽👧 ¿Es jugadora de Fútbol Femenino?</p>
            <p className="text-xs text-pink-700">Marca si participará en el equipo femenino</p>
          </div>
        </div>
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm">
            <strong>✅ Categoría auto-seleccionada:</strong> Según la edad (10 años) → <strong>Fútbol Alevín (Mixto)</strong>
          </AlertDescription>
        </Alert>
        <MockSelect label="Categoría y Deporte *" value="⚽ Fútbol Alevín (Mixto) - 10-11 años" />
      </div>
    </WizardStep>
  );
}

function ScreenWizard2() {
  return (
    <WizardStep stepNum={2} title="Documentación del Jugador" icon={<FileText className="w-5 h-5 text-blue-600" />}>
      <div className="space-y-4">
        <MockSelect label="Tipo de Documento del Jugador" value="🪪 DNI" />
        <MockInput label="DNI del Jugador (opcional si menor de 14)" placeholder="12345678A" />
        <div className="space-y-2">
          <p className="text-sm font-medium">Subir DNI Jugador (escaneado)</p>
          <Button variant="outline" className="w-full" disabled>📤 Subir documento</Button>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Libro de Familia (si no tiene DNI) *</p>
          <Button variant="outline" className="w-full" disabled>📤 Subir Libro de Familia</Button>
          <p className="text-xs text-blue-700">Si el jugador es menor de 14 años y no tiene DNI, sube el libro de familia</p>
        </div>
      </div>
    </WizardStep>
  );
}

function ScreenWizard3() {
  return (
    <WizardStep stepNum={3} title="Datos del Padre/Madre/Tutor Legal *" icon={<Users className="w-5 h-5 text-green-600" />}>
      <div className="space-y-4">
        <MockInput label="Nombre y Apellidos *" placeholder="Ej: María García López" />
        <div className="grid grid-cols-2 gap-3">
          <MockSelect label="Tipo de Documento" value="🪪 DNI" />
          <MockInput label="DNI *" placeholder="12345678A" />
        </div>
        <div>
          <p className="text-sm font-medium mb-1">Subir DNI Tutor (escaneado) *</p>
          <Button variant="outline" className="w-full" disabled>📤 Subir documento</Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MockInput label="Correo Electrónico *" placeholder="padre@ejemplo.com" />
          <MockInput label="Teléfono *" placeholder="600123456" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MockInput label="Dirección Completa *" placeholder="Calle, número, piso..." />
          <MockInput label="Municipio *" placeholder="Bustarviejo" />
        </div>
      </div>
    </WizardStep>
  );
}

function ScreenWizard4() {
  return (
    <WizardStep stepNum={4} title="Segundo Progenitor/Tutor (Opcional)" icon="👥">
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
          <p className="font-bold text-blue-900 mb-2 text-sm">👥 ¿Cómo funciona la invitación?</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">1</span>
              <span>Rellenas sus datos aquí</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">2</span>
              <span>El club revisa y envía la invitación</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">3</span>
              <span>Acepta y accede a la app</span>
            </div>
          </div>
        </div>
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-xs">
            Si el segundo progenitor quiere ser socio, debe rellenar "Hacerse Socio" desde su propia cuenta (25€).
          </AlertDescription>
        </Alert>
        <MockInput label="Nombre y Apellidos" placeholder="Ej: Pedro García López" />
        <div className="grid grid-cols-2 gap-3">
          <MockInput label="Correo Electrónico" placeholder="padre@ejemplo.com" />
          <MockInput label="Teléfono" placeholder="600654321" />
        </div>
      </div>
    </WizardStep>
  );
}

function ScreenWizard5() {
  return (
    <WizardStep stepNum={5} title="Ficha Médica y Emergencias" icon={<Heart className="w-5 h-5 text-red-600" />}>
      <div className="space-y-4">
        <p className="text-xs text-slate-600">Datos no obligatorios pero muy recomendables para la seguridad del jugador.</p>
        <div className="grid grid-cols-2 gap-3">
          <MockInput label="Alergias" placeholder="Alimentos, medicamentos..." multiline />
          <MockSelect label="Grupo Sanguíneo" value="Seleccionar grupo..." />
        </div>
        <MockInput label="Medicación Habitual" placeholder="Medicamentos que toma regularmente" multiline />
        <MockInput label="Condiciones Médicas" placeholder="Asma, diabetes, epilepsia..." multiline />
        <div className="border-t pt-3">
          <p className="font-semibold text-red-800 text-sm mb-2">📞 Contactos de Emergencia</p>
          <div className="bg-red-50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-red-700">Contacto 1</p>
            <div className="grid grid-cols-2 gap-2">
              <MockInput label="Nombre" placeholder="Nombre completo" small />
              <MockInput label="Teléfono" placeholder="600 123 456" small />
            </div>
          </div>
        </div>
      </div>
    </WizardStep>
  );
}

function ScreenWizard6() {
  return (
    <WizardStep stepNum={6} title="Autorizaciones y Observaciones" icon="📋">
      <div className="space-y-4">
        <MockInput label="Observaciones (opcional)" placeholder="Cualquier nota adicional..." multiline />
        <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            <span className="font-bold text-red-900 text-sm">AUTORIZACIÓN TRATAMIENTO DE DATOS *</span>
          </div>
          <div className="bg-white rounded-lg p-2 text-[10px] max-h-20 overflow-y-auto border text-slate-700">
            <p className="font-semibold">POLÍTICA DE PROTECCIÓN DE DATOS - CLUB DEPORTIVO BUSTARVIEJO</p>
            <p>En cumplimiento del RGPD (UE) 2016/679, le informamos que sus datos serán tratados por el CD Bustarviejo...</p>
          </div>
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border-2 border-red-300">
            <div className="w-5 h-5 border-2 border-red-400 rounded" />
            <span className="text-sm font-semibold text-red-900">✅ HE LEÍDO Y ACEPTO LA POLÍTICA DE PRIVACIDAD</span>
          </div>
        </div>
        <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50 space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-orange-600" />
            <span className="font-bold text-orange-900 text-sm">AUTORIZACIÓN FOTOGRAFÍAS Y VÍDEOS *</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border-2 border-green-300">
              <div className="w-4 h-4 border-2 border-green-400 rounded-full" />
              <span className="text-sm font-bold text-green-800">✅ SÍ AUTORIZO</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border-2 border-red-300">
              <div className="w-4 h-4 border-2 border-red-400 rounded-full" />
              <span className="text-sm font-bold text-red-800">❌ NO AUTORIZO</span>
            </div>
          </div>
        </div>
      </div>
    </WizardStep>
  );
}

function ScreenWizard7() {
  return (
    <WizardStep stepNum={7} title="Resumen de Inscripción" icon="📋">
      <div className="space-y-4">
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
          <p className="text-green-800 font-bold text-lg">✅ Todo listo para inscribir</p>
          <p className="text-green-700 text-sm">Revisa los datos antes de confirmar</p>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1 border-b"><span className="text-slate-600">Jugador:</span><strong>Juan García López</strong></div>
          <div className="flex justify-between py-1 border-b"><span className="text-slate-600">Edad:</span><strong>10 años</strong></div>
          <div className="flex justify-between py-1 border-b"><span className="text-slate-600">Categoría:</span><strong>Fútbol Alevín (Mixto)</strong></div>
          <div className="flex justify-between py-1 border-b"><span className="text-slate-600">Tutor:</span><strong>María García López</strong></div>
          <div className="flex justify-between py-1 border-b"><span className="text-slate-600">Email:</span><strong>maria@ejemplo.com</strong></div>
          <div className="flex justify-between py-1 border-b"><span className="text-slate-600">Foto:</span><Badge className="bg-green-100 text-green-800">✅ Subida</Badge></div>
          <div className="flex justify-between py-1 border-b"><span className="text-slate-600">RGPD:</span><Badge className="bg-green-100 text-green-800">✅ Aceptada</Badge></div>
        </div>
        <Button className="w-full bg-orange-600 font-bold py-4 text-base" disabled>
          Confirmar Inscripción
        </Button>
      </div>
    </WizardStep>
  );
}

function ScreenInstall() {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Smartphone className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-green-700">📲 Instala la App del Club</h2>
        <p className="text-slate-600 text-sm">¡Es muy sencillo! Solo 4 pasos y tardarás menos de 1 minuto</p>
      </div>
      <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3 text-center text-sm">
        <p className="text-green-800 font-medium">✨ <strong>Con la app instalada podrás:</strong></p>
        <ul className="text-green-700 text-xs mt-1 space-y-1">
          <li>✅ Recibir convocatorias al instante</li>
          <li>✅ Ver pagos, documentos y calendario</li>
          <li>✅ Comunicarte con los entrenadores</li>
        </ul>
      </div>
      <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
        <p className="font-bold text-slate-900 text-center text-sm">📱 iPhone / iPad</p>
        {["Abre esta web en Safari", "Pulsa el botón Compartir", 'Busca "Añadir a pantalla de inicio"', 'Pulsa "Añadir"'].map((step, i) => (
          <div key={i} className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm">
            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">{i + 1}</span>
            <p className="text-xs text-slate-700">{step}</p>
          </div>
        ))}
      </div>
      <Button className="w-full bg-green-600 font-bold py-4" disabled>
        ✅ Ya la tengo instalada
      </Button>
    </div>
  );
}

function ScreenSecondParentView() {
  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-cyan-900">👥 Vista del Segundo Progenitor</h2>
        <p className="text-sm text-slate-600">Esto es lo que ve alguien que entra por primera vez como segundo progenitor</p>
      </div>
      
      <div className="bg-cyan-50 border-2 border-cyan-300 rounded-xl p-4 space-y-3">
        <p className="font-bold text-cyan-900">Paso 1: Llega al selector de tipo</p>
        <p className="text-sm text-cyan-800">Ve el aviso azul prominente y pulsa <strong>"Ya me han invitado, continuar como Familia →"</strong></p>
      </div>

      <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 space-y-3">
        <p className="font-bold text-green-900">Paso 2: Se marca automáticamente</p>
        <p className="text-sm text-green-800">El sistema detecta su email como <code>email_tutor_2</code> en las fichas de jugadores y le marca como <code>es_segundo_progenitor: true</code></p>
      </div>

      <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 space-y-3">
        <p className="font-bold text-orange-900">Paso 3: Pantalla de instalación</p>
        <p className="text-sm text-orange-800">Ve las instrucciones de instalar la app (mismo flujo que todos)</p>
      </div>

      <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4 space-y-3">
        <p className="font-bold text-purple-900">Paso 4: Dashboard de familia</p>
        <p className="text-sm text-purple-800">Accede al <strong>ParentDashboard</strong> con acceso a los jugadores donde está como email_tutor_2. Ve lo mismo que el primer progenitor: pagos, convocatorias, chat, calendario.</p>
      </div>

      <Alert className="bg-amber-50 border-amber-300">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 text-xs">
          <strong>⚠️ ¿Y si se registra ANTES de ser invitado?</strong> Si alguien se registra con un email que ya existe como <code>email_tutor_2</code> en algún jugador, el Layout lo detecta automáticamente y lo marca como segundo progenitor. No necesita seleccionar nada en el selector.
        </AlertDescription>
      </Alert>

      <Alert className="bg-red-50 border-red-300">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 text-xs">
          <strong>🚫 Protección anti-duplicados:</strong> La página "Mis Jugadores" muestra un banner advirtiendo que NO deben registrar al jugador otra vez si ya lo hizo el primer progenitor.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function MockInput({ label, placeholder, type, multiline, small }) {
  return (
    <div className="space-y-1">
      <p className={`font-medium text-slate-700 ${small ? 'text-xs' : 'text-sm'}`}>{label}</p>
      {multiline ? (
        <div className={`w-full border rounded-lg bg-slate-50 p-2 ${small ? 'h-12' : 'h-16'} text-xs text-slate-400`}>{placeholder}</div>
      ) : (
        <div className={`w-full border rounded-lg bg-slate-50 px-3 ${small ? 'h-8' : 'h-10'} flex items-center text-xs text-slate-400`}>{placeholder}</div>
      )}
    </div>
  );
}

function MockSelect({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="w-full border rounded-lg bg-slate-50 h-10 flex items-center justify-between px-3 text-xs text-slate-600">
        <span>{value}</span>
        <ChevronRight className="w-3 h-3 rotate-90 text-slate-400" />
      </div>
    </div>
  );
}

export default function OnboardingPreview() {
  const [currentScreen, setCurrentScreen] = useState(0);

  const renderScreen = () => {
    switch (SCREENS[currentScreen].id) {
      case "welcome": return <ScreenWelcome />;
      case "selector": return <ScreenSelector />;
      case "wizard0": return <ScreenWizard0 />;
      case "wizard1": return <ScreenWizard1 />;
      case "wizard2": return <ScreenWizard2 />;
      case "wizard3": return <ScreenWizard3 />;
      case "wizard4": return <ScreenWizard4 />;
      case "wizard5": return <ScreenWizard5 />;
      case "wizard6": return <ScreenWizard6 />;
      case "wizard7": return <ScreenWizard7 />;
      case "install": return <ScreenInstall />;
      case "secondparent_view": return <ScreenSecondParentView />;
      default: return null;
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Eye className="w-6 h-6 text-orange-600" />
            Preview: Flujo de Alta de Usuario
          </h1>
          <p className="text-sm text-slate-600">Vista temporal para admin — así ves las pantallas que recorre un nuevo usuario</p>
        </div>
        <Link to={createPageUrl("Home")}>
          <Button variant="outline" size="sm"><Home className="w-4 h-4 mr-1" /> Volver</Button>
        </Link>
      </div>

      {/* Screen navigator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-slate-600">Pantallas del flujo ({currentScreen + 1}/{SCREENS.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {SCREENS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setCurrentScreen(i)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  i === currentScreen
                    ? 'bg-orange-600 text-white border-orange-600 font-bold shadow-md'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Navigation arrows */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              disabled={currentScreen === 0}
              onClick={() => setCurrentScreen(c => c - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <Badge className="bg-orange-100 text-orange-800 text-base px-4 py-1">
              {SCREENS[currentScreen].label}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={currentScreen === SCREENS.length - 1}
              onClick={() => setCurrentScreen(c => c + 1)}
            >
              Siguiente <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Phone frame mockup */}
          <div className="flex justify-center">
            <div className="w-full max-w-md bg-white border-4 border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden">
              {/* Status bar */}
              <div className="bg-slate-800 h-6 flex items-center justify-center">
                <div className="w-20 h-1.5 bg-slate-600 rounded-full" />
              </div>
              {/* Content */}
              <div className="max-h-[600px] overflow-y-auto p-4 bg-gradient-to-br from-slate-50 to-slate-100">
                {renderScreen()}
              </div>
              {/* Home indicator */}
              <div className="bg-white h-6 flex items-center justify-center">
                <div className="w-28 h-1 bg-slate-300 rounded-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}