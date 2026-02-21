import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, AlertTriangle, ArrowDown, Mail, KeyRound, 
  ShieldCheck, Smartphone, PartyPopper, ChevronRight, Monitor,
  Users, UserCircle, Download, UserPlus
} from "lucide-react";

const STEPS = [
  {
    number: 1,
    title: "Recibirás un email de invitación",
    icon: Mail,
    color: "bg-blue-500",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/bd3449dc1_image.png",
    instructions: [
      "El administrador del club te enviará una invitación al email que le facilitaste.",
      "Recibirás un correo con el asunto \"You're invited to join Club Deportivo Bustarviejo\".",
      "Dentro del correo verás un botón negro que dice \"Access app\".",
    ],
    annotation: {
      text: "👇 Pulsa el botón \"Access app\"",
      description: "Este botón te llevará a la pantalla de acceso de la app."
    },
    warnings: [
      "⚠️ Si no encuentras el correo, revisa la carpeta de SPAM o Correo no deseado",
      "El correo llegará al email que le diste al administrador del club"
    ]
  },
  {
    number: 2,
    title: "Pantalla de acceso - Elige cómo entrar",
    icon: Smartphone,
    color: "bg-indigo-500",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/5d38f762e_image.png",
    instructions: [
      "Al pulsar el botón del email, llegarás a esta pantalla de bienvenida.",
      "Aquí tienes DOS opciones para acceder:",
    ],
    options: [
      {
        emoji: "⚡",
        title: "Opción RÁPIDA (recomendada)",
        description: "Si tu email es de Gmail → pulsa \"Continue with Google\"\nSi tu email es de Outlook/Hotmail → pulsa \"Continue with Microsoft\"\nSi usas Apple → pulsa \"Continue with Apple\"",
        highlight: true,
        note: "¡Entrarás directamente sin crear contraseña!"
      },
      {
        emoji: "📧",
        title: "Opción con email y contraseña",
        description: "Si tu email NO es de Gmail ni Microsoft (o prefieres usar contraseña), pulsa abajo donde dice:",
        linkText: "\"Need an account? Sign up\"",
        note: "Sigue los pasos 3, 4 y 5 de este manual"
      }
    ],
    extra: "💡 Si tu email es de Gmail o Microsoft, usa la opción rápida. ¡Es mucho más fácil y no necesitas recordar contraseña!"
  },
  {
    number: 3,
    title: "Crea tu cuenta (solo si elegiste Sign up)",
    icon: KeyRound,
    color: "bg-green-500",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/119ae6625_image.png",
    skipLabel: "⚡ Si entraste con Google o Microsoft, salta al paso final",
    instructions: [],
    fields: [
      {
        label: "Email",
        description: "Escribe el MISMO email que le diste al administrador del club. Tiene que coincidir exactamente.",
        example: "Ejemplo: tuemail@gmail.com"
      },
      {
        label: "Password",
        description: "Invéntate una contraseña de MÍNIMO 8 caracteres (letras, números...). ¡Apúntatela!",
        example: "Ejemplo: MiClub2025!"
      },
      {
        label: "Confirm Password",
        description: "Repite EXACTAMENTE la misma contraseña que acabas de escribir.",
        example: "Tiene que ser idéntica a la anterior"
      }
    ],
    buttonText: "Cuando tengas los 3 campos rellenos, pulsa \"Create account\"",
    warnings: [
      "La contraseña debe tener al menos 8 caracteres",
      "Las dos contraseñas tienen que ser IGUALES",
      "¡Usa el MISMO email que le diste al club!"
    ]
  },
  {
    number: 4,
    title: "Verifica tu email con el código",
    icon: ShieldCheck,
    color: "bg-orange-500",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/fcba57ad2_image.png",
    skipLabel: "⚡ Si entraste con Google o Microsoft, salta al paso final",
    instructions: [
      "Te aparecerá esta pantalla con 6 casillas vacías pidiendo un código de verificación.",
      "Ahora ve a revisar tu correo electrónico (el que acabas de usar).",
      "Te habrá llegado un email con un código de 6 números.",
    ],
    warnings: [
      "⚠️ Revisa la carpeta de SPAM si no lo encuentras",
      "⏰ El código caduca en 10 minutos. Si no te llega, pulsa \"Resend\""
    ]
  },
  {
    number: 5,
    title: "El email con tu código de verificación",
    icon: Mail,
    color: "bg-purple-500",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/d2ad4ef39_image.png",
    skipLabel: "⚡ Si entraste con Google o Microsoft, salta al paso final",
    instructions: [
      "En tu bandeja de entrada encontrarás un email del Club Deportivo Bustarviejo.",
      "Dentro verás un código de 6 números (en el ejemplo: 548764).",
      "Copia o apunta ese código.",
      "Vuelve a la pantalla anterior de la app y escríbelo en las 6 casillas.",
      "Pulsa \"Verify email\".",
    ],
    extra: "El código del ejemplo es 548764, pero a ti te llegará uno DIFERENTE. ¡Usa el tuyo!",
    warnings: [
      "⚠️ Si no te llega el correo, revisa SPAM / Correo no deseado"
    ]
  },
  {
    number: 6,
    title: "¡Ya estás dentro! 🎉",
    icon: PartyPopper,
    color: "bg-emerald-500",
    instructions: [
      "Si entraste con Google/Microsoft → ya tienes acceso directo.",
      "Si creaste cuenta con email → tras verificar el código, ya puedes entrar.",
      "La próxima vez solo tienes que ir a app.cdbustarviejo.com e iniciar sesión.",
    ],
    finalStep: true
  },
  {
    number: 7,
    title: "Pantalla de bienvenida",
    icon: PartyPopper,
    color: "bg-orange-600",
    sectionHeader: "📲 ALTA EN LA APP — ¿Qué pasa al entrar por primera vez?",
    instructions: [
      "Nada más entrar por primera vez, verás una pantalla de bienvenida con el logo del club.",
      "Te explicará brevemente qué puedes hacer con la app: inscribir jugadores, chatear con entrenadores, ver calendario, etc.",
      "Pulsa \"Entrar\" para continuar.",
    ],
    image: null,
    welcomeScreen: true
  },
  {
    number: 8,
    title: "Elige tu tipo de registro",
    icon: Users,
    color: "bg-indigo-600",
    instructions: [
      "La app te preguntará qué tipo de usuario eres.",
      "Elige la opción que corresponda a tu caso:",
    ],
    registrationTypeStep: true
  },
  {
    number: 9,
    title: "Instala la app en tu móvil",
    icon: Download,
    color: "bg-green-600",
    instructions: [
      "Antes de seguir, la app te pedirá que la instales en tu móvil como si fuera una app normal.",
      "Es muy rápido (menos de 1 minuto) y te permitirá acceder directamente desde tu pantalla de inicio.",
    ],
    installStep: true
  },
  {
    number: 10,
    title: "Da de alta a tus jugadores",
    icon: UserPlus,
    color: "bg-orange-500",
    instructions: [
      "Una vez instalada la app, ábrela desde el icono en tu pantalla de inicio.",
      "La app te guiará paso a paso por un formulario muy sencillo e intuitivo para dar de alta al jugador.",
      "El formulario incluye: foto, datos personales, categoría, documentación, ficha médica y autorizaciones.",
      "Al finalizar llegarás a tu Panel Principal con acceso a todo: convocatorias, pagos, chat, calendario y más.",
    ],
    playerRegistrationStep: true
  }
];

function OptionCard({ option }) {
  return (
    <div className={`rounded-xl p-3.5 border-2 ${option.highlight 
      ? 'bg-green-50 border-green-300' 
      : 'bg-slate-50 border-slate-200'}`}
    >
      <div className="flex items-start gap-2.5">
        <span className="text-2xl flex-shrink-0">{option.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm ${option.highlight ? 'text-green-800' : 'text-slate-800'}`}>
            {option.title}
          </p>
          <p className="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
            {option.description}
          </p>
          {option.linkText && (
            <div className="mt-1.5 bg-white rounded-lg px-3 py-1.5 border border-slate-300 inline-block">
              <p className="text-xs font-bold text-slate-700">{option.linkText}</p>
            </div>
          )}
          {option.note && (
            <p className={`text-[11px] mt-1.5 font-medium ${option.highlight ? 'text-green-600' : 'text-slate-500'}`}>
              {option.note}
            </p>
          )}
          {option.highlight && (
            <Badge className="bg-green-500 text-white text-[10px] mt-2">RECOMENDADA</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function StepCard({ step }) {
  const Icon = step.icon;
  
  return (
    <Card className="border-none shadow-lg overflow-hidden">
      <CardContent className="p-0">
        {/* Step header */}
        <div className={`${step.color} text-white p-4 flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg flex-shrink-0">
            {step.number}
          </div>
          <div className="flex items-center gap-2 flex-1">
            <Icon className="w-5 h-5 flex-shrink-0" />
            <h3 className="font-bold text-lg leading-tight">{step.title}</h3>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Skip label for Google/Microsoft users */}
          {step.skipLabel && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-xs font-semibold text-green-700">{step.skipLabel}</p>
            </div>
          )}

          {/* Instructions */}
          {step.instructions?.length > 0 && (
            <div className="space-y-2">
              {step.instructions.map((inst, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-700 text-sm leading-relaxed">{inst}</p>
                </div>
              ))}
            </div>
          )}

          {/* Options (for step 2) */}
          {step.options && (
            <div className="space-y-2.5">
              {step.options.map((opt, idx) => (
                <OptionCard key={idx} option={opt} />
              ))}
            </div>
          )}

          {/* URL highlight */}
          {step.highlight && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 text-center">
              <p className="font-mono font-bold text-blue-700 text-lg break-all">{step.highlight}</p>
            </div>
          )}

          {/* Form fields explanation */}
          {step.fields && (
            <div className="space-y-2.5">
              {step.fields.map((field, idx) => (
                <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-slate-700 text-white text-xs">{idx + 1}</Badge>
                    <span className="font-bold text-slate-800 text-sm">{field.label}</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-1">{field.description}</p>
                  <p className="text-[11px] text-slate-400 italic">{field.example}</p>
                </div>
              ))}
            </div>
          )}

          {/* Button text */}
          {step.buttonText && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
              <span className="text-xl">👆</span>
              <p className="text-sm font-semibold text-green-800">{step.buttonText}</p>
            </div>
          )}

          {/* Annotation */}
          {step.annotation && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 animate-pulse">
              <p className="text-red-700 font-bold text-sm text-center">{step.annotation.text}</p>
              <p className="text-red-600 text-xs text-center mt-1">{step.annotation.description}</p>
            </div>
          )}

          {/* Image */}
          {step.image && (
            <div className="rounded-xl overflow-hidden border-2 border-slate-200 shadow-md">
              <img 
                src={step.image} 
                alt={`Paso ${step.number}`}
                className="w-full max-w-xs mx-auto"
                style={{ maxHeight: "500px", objectFit: "contain" }}
              />
            </div>
          )}

          {/* Extra info */}
          {step.extra && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-sm text-amber-800">{step.extra}</p>
            </div>
          )}

          {/* Warnings */}
          {step.warnings && (
            <div className="space-y-2">
              {step.warnings.map((warn, idx) => (
                <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700 font-medium">{warn}</p>
                </div>
              ))}
            </div>
          )}

          {/* Final celebration */}
          {step.finalStep && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5 text-center">
              <p className="text-4xl mb-2">🎉⚽🎉</p>
              <p className="font-bold text-green-800 text-lg">¡BIENVENIDO AL CLUB!</p>
              <p className="text-sm text-green-700 mt-1">Ya puedes usar la app del Club Deportivo Bustarviejo</p>
              <div className="mt-3 bg-white/70 rounded-xl p-3 border border-green-200">
                <p className="text-xs text-green-600">Para entrar la próxima vez:</p>
                <p className="font-mono font-bold text-green-800 text-sm mt-1">app.cdbustarviejo.com</p>
              </div>
            </div>
          )}

          {/* Section header divider */}
          {step.sectionHeader && (
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-xl p-4 text-center -mx-4 -mt-4 mb-3">
              <p className="font-bold text-base">{step.sectionHeader}</p>
            </div>
          )}

          {/* Welcome screen */}
          {step.welcomeScreen && (
            <div className="rounded-xl overflow-hidden border-2 border-slate-200 shadow-md">
              <div className="bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 p-6 text-center text-white">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg" alt="Logo" className="w-16 h-16 rounded-xl mx-auto mb-3 shadow-xl" />
                <p className="text-xl font-black">¡Bienvenido al CD Bustarviejo!</p>
                <p className="text-orange-100 text-sm mt-1">Tu club, tu familia, tu app</p>
                <div className="space-y-2 mt-3 text-left max-w-xs mx-auto">
                  <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2 text-xs">
                    <span>⚽</span><span>Inscribe a tus jugadores</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2 text-xs">
                    <span>💬</span><span>Chatea con entrenadores</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2 text-xs">
                    <span>📅</span><span>Convocatorias, pagos y más</span>
                  </div>
                </div>
                <div className="mt-3 bg-white text-orange-700 rounded-lg py-2 px-6 font-bold text-sm inline-block">
                  Entrar →
                </div>
              </div>
            </div>
          )}

          {/* Registration type selector */}
          {step.registrationTypeStep && (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden border-2 border-slate-200 shadow-md">
                <div className="p-3 bg-white space-y-2.5">
                  {/* Aviso segundo progenitor */}
                  <div className="bg-cyan-50 border-2 border-cyan-300 rounded-lg p-2.5">
                    <p className="font-bold text-cyan-900 text-xs">👥 ¿Tu pareja ya ha dado de alta a vuestro/a hijo/a?</p>
                    <p className="text-[10px] text-cyan-700 mt-0.5"><strong>NO des de alta al jugador otra vez.</strong> Pulsa "Ya me han invitado, continuar como Familia →"</p>
                  </div>
                  {/* Options */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-orange-50 rounded-xl p-3 border-2 border-orange-300 text-center">
                      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-1.5">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-xs font-bold text-orange-900">👨‍👩‍👧 Panel de Familia</p>
                      <p className="text-[10px] text-orange-700 mt-0.5">Primer progenitor que da de alta</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 border-2 border-green-300 text-center">
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                        <UserCircle className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-xs font-bold text-green-900">👤 Jugador +18</p>
                      <p className="text-[10px] text-green-700 mt-0.5">Mayores de edad</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-sm text-amber-800">
                  <strong>👨‍👩‍👧 Familias:</strong> El padre o madre que inscriba primero elige "Panel de Familia". El otro progenitor será invitado después.
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm text-green-800">
                  <strong>👤 Jugadores +18:</strong> Si eres mayor de edad y te inscribes tú mismo, elige "Jugador +18".
                </p>
              </div>
            </div>
          )}

          {/* Install PWA step */}
          {step.installStep && (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden border-2 border-slate-200 shadow-md">
                <div className="p-4 bg-white space-y-3">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Smartphone className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="font-bold text-green-700 text-sm">📲 Instala la App del Club</p>
                    <p className="text-[10px] text-slate-500">Menos de 1 minuto</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                    <p className="font-bold text-slate-800 text-xs text-center">📱 iPhone / iPad</p>
                    {["Abre esta web en Safari", "Pulsa el botón Compartir ↗", '"Añadir a pantalla de inicio"', 'Pulsa "Añadir"'].map((s, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white p-1.5 rounded-lg text-[10px] text-slate-700">
                        <span className="bg-blue-500 text-white w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px]">{i + 1}</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                    <p className="font-bold text-slate-800 text-xs text-center">🤖 Android</p>
                    {["Te aparecerá un banner automático", 'Pulsa "Instalar" o "Añadir a pantalla"', "¡Listo! Ya tienes el icono"].map((s, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white p-1.5 rounded-lg text-[10px] text-slate-700">
                        <span className="bg-green-500 text-white w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px]">{i + 1}</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3 text-center">
                <p className="text-sm font-bold text-green-800">✅ Una vez instalada, abre la app desde el icono en tu pantalla de inicio</p>
                <p className="text-xs text-green-600 mt-1">A partir de ahora siempre entrarás desde ahí</p>
              </div>
            </div>
          )}

          {/* Player registration step */}
          {step.playerRegistrationStep && (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-orange-50 to-green-50 border-2 border-orange-300 rounded-xl p-4">
                <p className="font-bold text-orange-900 text-sm mb-3">📋 El formulario de alta incluye:</p>
                <div className="space-y-2">
                  {[
                    { num: "1", label: "Foto tipo carnet", desc: "Del jugador" },
                    { num: "2", label: "Datos del jugador", desc: "Nombre, fecha de nacimiento" },
                    { num: "3", label: "Categoría deportiva", desc: "Se auto-selecciona según la edad" },
                    { num: "4", label: "Documentación", desc: "DNI del jugador y/o libro de familia" },
                    { num: "5", label: "Datos del tutor", desc: "DNI, dirección, teléfono" },
                    { num: "6", label: "Segundo progenitor", desc: "Opcional, se le invitará después" },
                    { num: "7", label: "Ficha médica", desc: "Alergias, contactos de emergencia" },
                    { num: "8", label: "Autorizaciones", desc: "Protección de datos y fotos" },
                  ].map(item => (
                    <div key={item.num} className="flex items-start gap-2.5">
                      <Badge className="bg-orange-500 text-white text-xs shrink-0 mt-0.5">{item.num}</Badge>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-sm text-blue-800">
                  <strong>💡 No te agobies:</strong> El formulario es muy intuitivo y te guía paso a paso. Puedes completar los datos que no tengas a mano más tarde desde <strong>"Mis Jugadores"</strong>.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm text-green-800">
                  <strong>👤 Si eres jugador mayor de 18 años:</strong> El proceso es el mismo pero con tus propios datos.
                </p>
              </div>

              <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4 text-center">
                <p className="text-3xl mb-2">🏠</p>
                <p className="font-bold text-purple-800 text-sm">Después del registro llegarás a tu Panel Principal</p>
                <p className="text-xs text-purple-600 mt-1">Desde ahí tendrás acceso a todo: convocatorias, pagos, chat del equipo, calendario, documentos y mucho más.</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ManualAcceso() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 pb-8">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 text-3xl">
            ⚽
          </div>
          <h1 className="text-2xl font-bold mb-1">Guía de Acceso y Alta</h1>
          <p className="text-orange-100 text-sm">Club Deportivo Bustarviejo</p>
          <div className="mt-3 bg-white/10 rounded-xl p-3">
            <p className="text-sm">Cómo acceder a la app y dar de alta a tus jugadores</p>
          </div>
        </div>
      </div>

      {/* Quick summary */}
      <div className="max-w-lg mx-auto px-4 -mt-4">
        <Card className="border-none shadow-lg mb-4">
          <CardContent className="p-4">
            <h3 className="font-bold text-slate-800 mb-2 text-center text-sm">📋 Resumen Rápido</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-50 rounded-lg p-2.5 text-center border border-green-200">
                <p className="text-lg">⚡</p>
                <p className="text-xs font-bold text-green-800">Gmail / Microsoft</p>
                <p className="text-[10px] text-green-600 mt-0.5">1 clic y entras directo</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2.5 text-center border border-blue-200">
                <p className="text-lg">📧</p>
                <p className="text-xs font-bold text-blue-800">Otro email</p>
                <p className="text-[10px] text-blue-600 mt-0.5">Sign up + código</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Steps */}
      <div className="max-w-lg mx-auto px-4 pb-8 space-y-4">
        {STEPS.map((step, idx) => (
          <React.Fragment key={step.number}>
            <StepCard step={step} />
            {idx < STEPS.length - 1 && (
              <div className="flex justify-center">
                <ArrowDown className="w-6 h-6 text-slate-300" />
              </div>
            )}
          </React.Fragment>
        ))}

        {/* Help section */}
        <Card className="border-none shadow-lg mt-6">
          <CardContent className="p-4">
            <h3 className="font-bold text-slate-800 mb-3 text-center">❓ ¿Necesitas ayuda?</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p>• <strong>No me llega el email de invitación:</strong> Revisa SPAM. Si sigue sin llegar, contacta con el coordinador de tu categoría.</p>
              <p>• <strong>No me llega el código:</strong> Revisa SPAM. Si sigue sin llegar, pulsa "Resend" en la app.</p>
              <p>• <strong>He olvidado mi contraseña:</strong> En la pantalla de login, pulsa "Forgot password?".</p>
              <p>• <strong>Mi email es de Gmail/Microsoft pero no funciona:</strong> Asegúrate de que es el MISMO email que le diste al club.</p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-500">¿Sigues con problemas? Escríbenos a:</p>
              <p className="font-bold text-orange-600 text-sm">cdbustarviejo@gmail.com</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}