import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ListingForm from "../components/market/ListingForm";
import ListingCard from "../components/market/ListingCard";

export default function Mercadillo() {
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('todos');

  const load = async () => {
    const u = await base44.auth.me().catch(() => null);
    setUser(u);
    const data = await base44.entities.MarketListing.filter({ estado: 'activo' });
    setListings(data || []);
  };

  useEffect(() => { load(); }, []);

  const reserve = async (item) => {
    if (!user) { alert('Debes estar conectado para reservar'); return; }
    const comprador_nombre = user.full_name || user.email;
    await base44.entities.MarketReservation.create({
      listing_id: item.id,
      comprador_nombre,
      comprador_email: user.email,
      comprador_telefono: user.telefono || '',
      mensaje: 'Reserva desde la app',
      fecha: new Date().toISOString()
    });
    // Marcar anuncio como reservado
    await base44.entities.MarketListing.update(item.id, {
      estado: 'reservado',
      reservado_por_email: user.email,
      reservado_por_nombre: comprador_nombre,
      reservado_fecha: new Date().toISOString()
    });
    // Aviso por email al vendedor
    await base44.integrations.Core.SendEmail({
      to: item.vendedor_email,
      subject: `Nueva reserva: ${item.titulo}`,
      body: `Hola ${item.vendedor_nombre || ''},\n\n${comprador_nombre} quiere reservar tu anuncio: ${item.titulo}.\nEmail: ${user.email}\nTeléfono: ${user.telefono || ''}\n\nPoneos de acuerdo para la entrega.\n\nCD Bustarviejo`
    });
    alert('Reserva enviada. El vendedor ha sido notificado.');
    await load();
  };

  const filtered = listings.filter(l => filter === 'todos' ? true : (filter === 'donacion' ? l.tipo === 'donacion' : l.tipo === 'venta'));

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black">🛍️ Mercadillo Deportivo</h1>
        <p className="text-slate-600">Compra, vende o dona material deportivo dentro del club.</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={filter==='todos'?'default':'outline'} onClick={() => setFilter('todos')}>Todos</Button>
            <Button size="sm" variant={filter==='venta'?'default':'outline'} onClick={() => setFilter('venta')}>Venta</Button>
            <Button size="sm" variant={filter==='donacion'?'default':'outline'} onClick={() => setFilter('donacion')}>Donación</Button>
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(v => !v); }} className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 sm:ml-auto mt-2 sm:mt-0">{showForm ? 'Cerrar' : 'Publicar anuncio'}</Button>
        </div>
        {showForm && (
          <div className="mt-4">
            <ListingForm listing={editing} onSaved={() => { setShowForm(false); setEditing(null); load(); }} />
          </div>
        )}
      </Card>

      <div className="grid gap-3">
        {filtered.map(item => (
          <ListingCard
            key={item.id}
            item={item}
            onReserve={reserve}
            onEdit={user && (item.created_by === user.email) ? (it) => { setEditing(it); setShowForm(true); } : null}
          />
        ))}
      </div>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle>ℹ️ Normas del Mercadillo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 space-y-1">
          <p>• Solo material deportivo (equipación, calzado, protecciones, accesorios).</p>
          <p>• Contacto directo entre vendedor y comprador (email/teléfono).</p>
          <p>• Usa el botón “Reservar” para notificar al vendedor por email.</p>
          <p>• El vendedor puede editar o retirar su anuncio en cualquier momento.</p>
        </CardContent>
      </Card>
    </div>
  );
}