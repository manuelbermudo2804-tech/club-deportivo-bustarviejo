import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, AlertTriangle, ArrowDown, Mail, KeyRound, 
  ShieldCheck, Smartphone, PartyPopper, ChevronRight, Monitor
} from "lucide-react";

const STEPS = [
  {
    number: 1,
    title: "Recibirás un email de invitación",
    icon: Mail,
    color: "bg-blue-500",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/36e44ff37_image.png",
    instructions: [
      "El administrador del club te enviará una invitación al email que le facilitaste.",
      "Recibirás un correo con el asunto \"Invitation to join Club Deportivo Bustarviejo\".",
      "Dentro del correo verás un botón negro que dice \"Join Club Deportivo Bustarviejo now\".",
    ],
    annotation: {
      text: "👇 Pulsa el botón \"Join Club Deportivo Bustarviejo now\"",
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
        description: "Si tu email es de Gmail → pulsa \"Continue with Google\"\nSi tu email es de Outlook/Hotmail → pulsa \"Continue with Microsoft\"",
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
          <h1 className="text-2xl font-bold mb-1">Guía de Acceso a la App</h1>
          <p className="text-orange-100 text-sm">Club Deportivo Bustarviejo</p>
          <div className="mt-3 bg-white/10 rounded-xl p-3">
            <p className="text-sm">Sigue estos pasos para acceder a la app del club</p>
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