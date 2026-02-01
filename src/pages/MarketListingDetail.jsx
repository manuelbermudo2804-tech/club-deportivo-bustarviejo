import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MarketListingDetail() {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      if (!id) { setLoading(false); return; }
      const rows = await base44.entities.MarketListing.filter({ id });
      setListing(rows && rows[0] ? rows[0] : null);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] grid place-items-center text-slate-500">Cargando…</div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center text-slate-600">
            <p>No se encontró el anuncio.</p>
            <div className="mt-4">
              <Link to={createPageUrl("Mercadillo")}>
                <Button variant="outline">Volver al Mercadillo</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDonation = listing.tipo === "donacion" || Number(listing.precio||0) === 0;
  const priceText = isDonation ? "GRATIS" : `${Number(listing.precio||0).toFixed(2)} €`;
  const images = Array.isArray(listing.imagenes) ? listing.imagenes : [];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">{listing.titulo}</h1>
        <Link to={createPageUrl("Mercadillo")}><Button variant="outline">Volver</Button></Link>
      </div>

      <Card className="overflow-hidden">
        {images.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
            {images.map((src, idx) => (
              <div key={idx} className="w-full aspect-video bg-slate-100 rounded-lg overflow-hidden">
                <img src={src} alt={`Foto ${idx+1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-56 grid place-items-center text-slate-400">Sin fotos</div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-slate-700">
          <p><span className="font-semibold">Categoría:</span> {listing.categoria}</p>
          <p><span className="font-semibold">Tipo:</span> {listing.tipo === 'donacion' ? 'Donación' : 'Venta'}</p>
          <p><span className="font-semibold">Precio:</span> {priceText}</p>
          {listing.descripcion && (
            <div>
              <p className="font-semibold mb-1">Descripción</p>
              <p className="whitespace-pre-wrap">{listing.descripcion}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contacto del vendedor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-slate-700">
          {listing.vendedor_nombre && <p><span className="font-semibold">Nombre:</span> {listing.vendedor_nombre}</p>}
          {listing.vendedor_email && (
            <p>
              <span className="font-semibold">Email:</span> {" "}
              <a className="text-orange-600 hover:underline" href={`mailto:${listing.vendedor_email}`}>
                {listing.vendedor_email}
              </a>
            </p>
          )}
          {listing.vendedor_telefono && <p><span className="font-semibold">Teléfono:</span> {listing.vendedor_telefono}</p>}
        </CardContent>
      </Card>
    </div>
  );
}