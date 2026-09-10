import React from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export default function ShareListingButton({ listing }) {
  if (!listing?.id) return null;
  const url = `${window.location.origin}/MarketListingDetail?id=${listing.id}`;
  const precio = listing.tipo === 'donacion' || Number(listing.precio || 0) === 0
    ? 'GRATIS'
    : `${Number(listing.precio || 0).toFixed(0)} €`;
  const texto = [
    `🛍️ *${listing.titulo}* — ${precio}`,
    listing.talla ? `Talla: ${listing.talla}` : null,
    'Mercadillo del CD Bustarviejo:',
    url,
  ].filter(Boolean).join('\n');

  return (
    <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer">
      <Button size="sm" variant="outline" className="border-green-400 text-green-700">
        <MessageCircle className="w-4 h-4 mr-1" /> Compartir por WhatsApp
      </Button>
    </a>
  );
}