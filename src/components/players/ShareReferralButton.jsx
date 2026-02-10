import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Share2, Copy, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ShareReferralButton({ user }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!user?.full_name) return null;

  const referralLink = `https://app.cdbustarviejo.com/JoinReferral?referrer=${encodeURIComponent(user.full_name)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Enlace copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const message = `¡Únete al CD Bustarviejo! 🟠⚽\n\nInscribe a tu hijo/a en nuestro club y disfruta de beneficios exclusivos.\n\n👉 ${referralLink}\n\n¡Te espero en el club! 💪`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2 border-green-500 text-green-700 hover:bg-green-50"
      >
        <Share2 className="w-4 h-4" />
        <span className="hidden sm:inline">Invitar Amigos</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <div className="text-center space-y-4 p-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Share2 className="w-8 h-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900">Invita a tus amigos</h2>
            <p className="text-sm text-slate-600">
              Comparte tu enlace de referido y gana premios cuando tus amigos se inscriban
            </p>

            <div className="bg-slate-50 rounded-lg p-3 text-left">
              <p className="text-xs text-slate-500 mb-1">Tu enlace personal:</p>
              <p className="text-sm text-slate-900 break-all font-mono">{referralLink}</p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="flex-1 gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiado" : "Copiar enlace"}
              </Button>
              
              <Button
                onClick={handleWhatsApp}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </Button>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-800">
                🎁 <strong>Gana premios</strong> por cada socio que traigas: crédito en ropa y participaciones en sorteos
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}