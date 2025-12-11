import React from "react";
import { Button } from "@/components/ui/button";
import { Facebook, Twitter, Share2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function ShareButtons({ title, description, url }) {
  const shareUrl = url || window.location.href;
  const shareText = `${title}${description ? ` - ${description}` : ''}`;

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Enlace copiado al portapapeles");
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-slate-600 font-medium">Compartir:</span>
      <Button
        size="sm"
        variant="outline"
        onClick={handleFacebookShare}
        className="flex items-center gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
      >
        <Facebook className="w-3 h-3" />
        <span className="hidden sm:inline">Facebook</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleTwitterShare}
        className="flex items-center gap-1 text-sky-500 border-sky-300 hover:bg-sky-50"
      >
        <Twitter className="w-3 h-3" />
        <span className="hidden sm:inline">Twitter</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleWhatsAppShare}
        className="flex items-center gap-1 text-green-600 border-green-300 hover:bg-green-50"
      >
        <MessageCircle className="w-3 h-3" />
        <span className="hidden sm:inline">WhatsApp</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleCopyLink}
        className="flex items-center gap-1"
      >
        <Share2 className="w-3 h-3" />
        <span className="hidden sm:inline">Copiar</span>
      </Button>
    </div>
  );
}