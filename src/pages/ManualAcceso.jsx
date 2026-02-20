import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, ArrowDown, Smartphone, Mail, KeyRound, ShieldCheck, Clock, PartyPopper } from "lucide-react";

const STEPS = [
  {
    number: 1,
    title: "Abre la App del Club",
    icon: Smartphone,
    color: "bg-blue-500",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/b16a442aa_image.png",
    instructions: [
      "Abre el navegador de tu móvil (Chrome, Safari...)",
      "Escribe en la barra de direcciones:",
    ],
    highlight: "https://app.cdbustarviejo.com",
    extra: "Te aparecerá la pantalla de bienvenida del Club Deportivo Bustarviejo.",
    annotation: {
      text: "👇 Pulsa aquí: \"Need an account? Sign up\"",
      position: "bottom",
      description: "Busca en la parte de ABAJO de la pantalla donde pone \"Need an account? Sign up\" y PULSA en \"Sign up\"."
    }
  },
  {
    number: 2,
    title: "Crea tu cuenta",
    icon: KeyRound,
    color: "bg-green-500",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/0dce9c7fb_image.png",
    instructions: [],
    fields: [
      {
        label: "Email",
        description: "Escribe tu dirección de correo electrónico. ¡OJO! Tiene que ser un email REAL al que tengas acceso, porque te van a mandar un código.",
        example: "Ejemplo: tuemail@gmail.com"
      },
      {
        label: "Password",
        description: "Invéntate una contraseña. Tiene que tener MÍNIMO 8 caracteres (letras, números...). ¡Apúntatela en algún sitio para no olvidarla!",
        example: "Ejemplo: MiClub2025!"
      },
      {
        label: "Confirm Password",
        description: "Vuelve a escribir EXACTAMENTE la misma contraseña que acabas de poner. Esto es para confirmar que no te has equivocado.",
        example: "Tiene que ser IDÉNTICA a la anterior"
      }
    ],
    buttonText: "Cuando tengas los 3 campos rellenos, pulsa el botón \"Create account\"",
    warnings: [
      "La contraseña debe tener al menos 8 caracteres",
      "Las dos contraseñas tienen que ser IGUALES",
      "Usa un email al que tengas acceso AHORA (necesitarás revisarlo enseguida)"
    ]
  },
  {
    number: 3,
    title: "Verifica tu email con el código",
    icon: Mail,
    color: "bg-orange-500",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/1e81cf7cf_image.png",
    instructions: [
      "Te aparecerá una pantalla que dice \"Verify your email\" con 6 casillas vacías.",
      "Ahora tienes que ir a revisar tu correo electrónico (el que acabas de poner).",
    ],
    warnings: [
      "⚠️ MUY IMPORTANTE: El correo puede llegar a la carpeta de SPAM o Correo no deseado. ¡Revísala!",
      "⏰ El código caduca en 10 minutos. Si tarda, pulsa \"Resend\" para que te envíen otro."
    ]
  },
  {
    number: 4,
    title: "El email con tu código",
    icon: ShieldCheck,
    color: "bg-purple-500",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/7f4c605b6_image.png",
    instructions: [
      "En tu correo encontrarás un email del Club Deportivo Bustarviejo con un código de 6 números (como en el ejemplo de la imagen).",
      "Copia o apunta ese código de 6 dígitos.",
      "Vuelve a la pantalla de la app y escríbelo en las 6 casillas.",
      "Pulsa el botón \"Verify email\".",
    ],
    extra: "El código del ejemplo es 440931, pero a ti te llegará uno DIFERENTE. Usa el tuyo.",
    warnings: [
      "⚠️ Si no te llega el correo, revisa SPAM / Correo no deseado",
      "Si pasan más de 10 minutos, vuelve a la app y pulsa \"Resend\" para recibir un código nuevo"
    ]
  },
  {
    number: 5,
    title: "Solicitud enviada - ¡Espera la aprobación!",
    icon: Clock,
    color: "bg-amber-500",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/397244fa8_image.png",
    instructions: [
      "Si todo ha ido bien, verás una pantalla que dice \"Access requested\" (Acceso solicitado).",
      "Esto significa que tu cuenta se ha creado correctamente.",
      "Ahora el administrador del club tiene que aprobar tu acceso. No te preocupes, lo hacemos lo antes posible.",
    ],
    extra: "No tienes que hacer nada más por ahora. ¡Ten paciencia! 😊"
  },
  {
    number: 6,
    title: "¡Acceso aprobado! Ya puedes entrar",
    icon: PartyPopper,
    color: "bg-emerald-500",
    image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/e438fb148_image.png",
    instructions: [
      "Cuando el administrador apruebe tu solicitud, recibirás un correo como el de la imagen.",
      "Pulsa el botón \"Join Club Deportivo Bustarviejo now\".",
      "Te llevará de vuelta a la pantalla de login de la app.",
      "Ahora ya puedes iniciar sesión con tu email y contraseña.",
    ],
    annotation: {
      text: "👆 Pulsa \"Join Club Deportivo Bustarviejo now\"",
      position: "bottom",
      description: "Al pulsarlo volverás a la app y podrás entrar con tu usuario y contraseña."
    },
    finalStep: true
  }
];

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
            <h3 className="font-bold text-lg">{step.title}</h3>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Instructions */}
          {step.instructions?.length > 0 && (
            <div className="space-y-2">
              {step.instructions.map((inst, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                  <p className="text-slate-700 text-sm leading-relaxed">{inst}</p>
                </div>
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
            <div className="space-y-3">
              {step.fields.map((field, idx) => (
                <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-slate-700 text-white text-xs">{idx + 1}</Badge>
                    <span className="font-bold text-slate-800">{field.label}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-1">{field.description}</p>
                  <p className="text-xs text-slate-400 italic">{field.example}</p>
                </div>
              ))}
            </div>
          )}

          {/* Button text */}
          {step.buttonText && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
              <span className="text-2xl">👆</span>
              <p className="text-sm font-semibold text-green-800">{step.buttonText}</p>
            </div>
          )}

          {/* Image with annotation */}
          {step.image && (
            <div className="relative">
              {step.annotation && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 mb-2 animate-pulse">
                  <p className="text-red-700 font-bold text-sm text-center">{step.annotation.text}</p>
                  <p className="text-red-600 text-xs text-center mt-1">{step.annotation.description}</p>
                </div>
              )}
              <div className="rounded-xl overflow-hidden border-2 border-slate-200 shadow-md">
                <img 
                  src={step.image} 
                  alt={`Paso ${step.number}`}
                  className="w-full max-w-xs mx-auto"
                  style={{ maxHeight: "500px", objectFit: "contain" }}
                />
              </div>
            </div>
          )}

          {/* Extra info */}
          {step.extra && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-sm text-amber-800">💡 {step.extra}</p>
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
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 text-center">
              <p className="text-3xl mb-2">🎉🎉🎉</p>
              <p className="font-bold text-green-800 text-lg">¡LISTO! Ya estás dentro</p>
              <p className="text-sm text-green-700 mt-1">Ya puedes usar la app del Club Deportivo Bustarviejo</p>
              <p className="text-xs text-green-600 mt-2">Entra en <span className="font-mono font-bold">app.cdbustarviejo.com</span> con tu email y contraseña</p>
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
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/b16a442aa_image.png" 
            alt="Club" 
            className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-white/30 object-cover object-top"
            style={{ objectPosition: "center 15%" }}
          />
          <h1 className="text-2xl font-bold mb-1">Guía de Acceso a la App</h1>
          <p className="text-orange-100 text-sm">Club Deportivo Bustarviejo</p>
          <div className="mt-3 bg-white/10 rounded-xl p-3">
            <p className="text-sm">Sigue estos <strong>6 sencillos pasos</strong> para darte de alta y acceder a la app del club</p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-lg mx-auto px-4 -mt-4 pb-8 space-y-4">
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
              <p>• <strong>No me llega el código:</strong> Revisa la carpeta de SPAM o correo no deseado. Si sigue sin llegar, pulsa "Resend" en la app.</p>
              <p>• <strong>He olvidado mi contraseña:</strong> En la pantalla de login, pulsa "Forgot password?" y sigue los pasos.</p>
              <p>• <strong>No me aprueban el acceso:</strong> Contacta con el coordinador de tu categoría o escribe al club.</p>
              <p>• <strong>La app no carga:</strong> Asegúrate de escribir bien la dirección: <span className="font-mono font-bold">app.cdbustarviejo.com</span></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}