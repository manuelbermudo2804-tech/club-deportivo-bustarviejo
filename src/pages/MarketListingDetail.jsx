import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageCircle, Mail } from "lucide-react";

export default function MarketListingDetail() {
  const [listing, setListing] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      if (!id) { setLoading(false); return; }
      const [rows, me] = await Promise.all([
        base44.entities.MarketListing.filter({ id }),
        base44.auth.me().catch(() => null),
      ]);
      setUser(me);
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

  const esMio = user && (user.email === listing.vendedor_email || user.email === listing.created_by);
  const esAdmin = user?.role === 'admin';
  const esVendidoYa = listing.estado === 'vendido' || listing.estado === 'entregado';
  const soyElQueReserva = user && listing.reservado_por_email === user.email;
  // Solo el vendedor y el club pueden abrir un artículo ya vendido/entregado
  if (esVendidoYa && !esMio && !esAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center text-slate-600 space-y-3">
            <p className="text-4xl">🔒</p>
            <p className="font-semibold text-slate-800">Este artículo ya está {listing.estado === 'entregado' ? 'entregado' : 'vendido'}</p>
            <p className="text-sm">Ya no está disponible, así que no se puede consultar su ficha.</p>
            <Link to={createPageUrl("Mercadillo")}>
              <Button variant="outline">Volver al Mercadillo</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDonation = listing.tipo === "donacion" || Number(listing.precio||0) === 0;
  const priceText = isDonation ? "GRATIS" : `${Number(listing.precio||0).toFixed(2)} €`;
  const images = Array.isArray(listing.imagenes) ? listing.imagenes : [];
  const phoneDigits = (listing.vendedor_telefono || '').replace(/\D/g, '');
  const waUrl = phoneDigits ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent('Hola, estoy interesado en tu anuncio: ' + listing.titulo)}` : null;
  const compradorDigits = (listing.reservado_por_telefono || '').replace(/\D/g, '');
  const compradorWaUrl = compradorDigits
    ? `https://wa.me/${compradorDigits.length === 9 ? '34' + compradorDigits : compradorDigits}?text=${encodeURIComponent('Hola ' + (listing.reservado_por_nombre || '') + ', te escribo por el artículo del Mercadillo del club: ' + listing.titulo)}`
    : null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold flex items-center gap-3">{listing.titulo}{listing.estado === 'reservado' && (<span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 border border-yellow-200">Reservado</span>)}{listing.estado === 'entregado' && (<span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">Entregado</span>)}</h1>
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

      {(listing.reservado_por_email || listing.comprador_final_email) && (user?.role === 'admin' || user?.email === listing.vendedor_email || user?.email === listing.created_by) && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-lg">
              {listing.estado === 'reservado' ? '🛍️ Reservado por' : (listing.estado === 'entregado' ? '✅ Entregado a' : '✅ Vendido a')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-slate-800 text-sm">
            <p><span className="font-semibold">Nombre:</span> {listing.reservado_por_nombre || listing.comprador_final_nombre || '—'}</p>
            <p>
              <span className="font-semibold">Email:</span>{" "}
              <a className="text-orange-600 hover:underline" href={`mailto:${listing.reservado_por_email || listing.comprador_final_email}`}>
                {listing.reservado_por_email || listing.comprador_final_email}
              </a>
            </p>
            {listing.reservado_por_telefono
              ? <p><span className="font-semibold">Teléfono:</span> {listing.reservado_por_telefono}</p>
              : <p className="text-slate-600">Esta reserva se hizo antes de que pidiéramos el teléfono, así que solo tienes su email. Las nuevas reservas ya incluyen teléfono.</p>}
            {listing.reservado_fecha && <p><span className="font-semibold">Fecha de reserva:</span> {new Date(listing.reservado_fecha).toLocaleString('es-ES')}</p>}
            <div className="flex flex-wrap gap-2 pt-2">
              {compradorWaUrl && (
                <a href={compradorWaUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp al comprador
                  </Button>
                </a>
              )}
              <a href={`mailto:${listing.reservado_por_email || listing.comprador_final_email}?subject=${encodeURIComponent('Mercadillo CD Bustarviejo: ' + listing.titulo)}`}>
                <Button size="sm" variant="outline">
                  <Mail className="w-4 h-4 mr-1" /> Enviar email
                </Button>
              </a>
            </div>
            <p className="pt-1 text-xs text-slate-500">Solo tú (el vendedor) y el club veis estos datos de contacto.</p>
            {listing.estado === 'reservado' && (
              <p className="pt-1 text-yellow-900 font-semibold">Cuando le entregues el artículo, vuelve al Mercadillo y pulsa «Vendido».</p>
            )}
          </CardContent>
        </Card>
      )}

      {!(esMio || esAdmin || soyElQueReserva) ? (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-lg">🔒 Contacto del vendedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-slate-700 text-sm">
            <p>Para ver el teléfono y el email del vendedor, primero <span className="font-semibold">reserva el artículo</span>. Así el vendedor sabe quién está interesado y nadie recibe mensajes por sorpresa.</p>
            <Link to={createPageUrl("Mercadillo")}>
              <Button className="bg-orange-600 hover:bg-orange-700">🛒 Ir a reservar</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
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
          {listing.vendedor_telefono && (
            <p className="flex items-center gap-3">
              <span><span className="font-semibold">Teléfono:</span> {listing.vendedor_telefono}</span>
              {waUrl && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 font-medium underline">Escribir por WhatsApp</a>
              )}
            </p>
          )}
          {soyElQueReserva && !esMio && (
            <p className="text-xs text-slate-500 pt-1">Ves estos datos porque tienes el artículo reservado. Ponte de acuerdo con el vendedor para recogerlo.</p>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}