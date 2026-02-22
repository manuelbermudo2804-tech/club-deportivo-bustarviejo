import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, AlertCircle, KeyRound, ShieldOff } from "lucide-react";
import { toast } from "sonner";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function AccessCodeVerification({ user, onSuccess }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [blockedMinutes, setBlockedMinutes] = useState(0);

  const LOCKOUT_MINUTES = 15;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    
    setLoading(true);
    setError("");

    try {
      const { data } = await base44.functions.invoke("validateAccessCode", { codigo: code.trim() });
      
      if (data.valid) {
        toast.success("¡Código verificado correctamente!");
        onSuccess(data);
      } else {
        setError(data.error || "Código inválido");
        if (data.blocked) {
          setBlocked(true);
          setBlockedMinutes(data.minutes_left || LOCKOUT_MINUTES);
        }
      }
    } catch (err) {
      const errData = err?.response?.data;
      const errorMsg = errData?.error || err.message || "Error al verificar el código";
      setError(errorMsg);
      if (errData?.blocked) {
        setBlocked(true);
        setBlockedMinutes(errData.minutes_left || LOCKOUT_MINUTES);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCode = (value) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length > 4) {
      return clean.slice(0, 4) + "-" + clean.slice(4, 8);
    }
    return clean;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-none shadow-2xl">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <img 
              src={CLUB_LOGO_URL} 
              alt="CD Bustarviejo" 
              className="w-24 h-24 rounded-2xl shadow-xl object-cover ring-4 ring-orange-500/50" 
            />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bienvenido al CD Bustarviejo</h1>
            <p className="text-slate-600 mt-2">
              Para activar tu cuenta, introduce el código de acceso que recibiste por email.
            </p>
          </div>

          {user && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-500">Conectado como</p>
              <p className="font-medium text-slate-900">{user.email}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
              <Input
                value={code}
                onChange={(e) => setCode(formatCode(e.target.value))}
                placeholder="ABCD-1234"
                maxLength={9}
                className="text-center text-2xl font-mono font-bold tracking-[4px] h-16 pl-12 pr-4 border-2 border-slate-200 focus:border-orange-500"
                autoFocus
                disabled={loading}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || code.length < 9 || blocked}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 py-6 text-lg font-bold"
            >
              {blocked ? (
                <>
                  <ShieldOff className="w-5 h-5 mr-2" />
                  Bloqueado ({blockedMinutes} min)
                </>
              ) : loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  Verificar Código
                </>
              )}
            </Button>
          </form>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
            <p className="text-sm text-blue-800 font-medium mb-1">¿No tienes código?</p>
            <p className="text-xs text-blue-700">
              Si eres nuevo en el club, contacta con el administrador para solicitar tu código de acceso. 
              Si ya recibiste un email del club, busca el código en ese correo.
            </p>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-slate-400">
              CD Bustarviejo • <a href="mailto:CDBUSTARVIEJO@GMAIL.COM" className="text-orange-500">CDBUSTARVIEJO@GMAIL.COM</a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}