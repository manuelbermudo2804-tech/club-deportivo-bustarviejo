import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ListingForm from "../components/market/ListingForm";
import ListingCard from "../components/market/ListingCard";

export default function Mercadillo() {
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('todos');
  const [newCount, setNewCount] = useState(0);
  const [category, setCategory] = useState('todas');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [q, setQ] = useState('');
  const CATEGORIES = ['Fútbol','Baloncesto','Equipación','Calzado','Protecciones','Accesorios','Otro Deportivo'];
  const [visibleCount, setVisibleCount] = useState(20);
  const sentinelRef = useRef(null);

  const load = async () => {
    const u = await base44.auth.me().catch(() => null);
    setUser(u);
    const data = await base44.entities.MarketListing.filter({ estado: 'activo' });
    setListings(data || []);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const lastSeen = Number(localStorage.getItem('marketLastSeenCount') || 0);
    setNewCount(listings.length > lastSeen ? (listings.length - lastSeen) : 0);
  }, [listings]);

  // Reset paginación al cambiar filtros/búsqueda
  useEffect(() => { setVisibleCount(20); }, [filter, category, priceMin, priceMax, q, listings]);

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
    // Confirmación al comprador
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: `Has solicitado reservar: ${item.titulo}`,
      body: `Hola ${comprador_nombre},\n\nHemos avisado por email al vendedor (${item.vendedor_nombre || item.vendedor_email}).\nTe recomendamos escribirle o llamarle para cerrar la entrega.\n\nAnuncio: ${item.titulo}\nCategoría: ${item.categoria}\nPrecio: ${Number(item.precio||0).toFixed(2)} €\n\nGracias por usar el mercadillo del club.\nCD Bustarviejo`
    });
    alert('¡Reserva enviada! Hemos avisado por email al vendedor y te hemos mandado una confirmación.');
    await load();
  };

  const filtered = listings.filter((l) => {
    const typeMatch = filter === 'todos' || l.tipo === filter;
    const categoryMatch = category === 'todas' || l.categoria === category;
    const keyword = q.trim().toLowerCase();
    const keywordMatch = !keyword || (l.titulo?.toLowerCase().includes(keyword) || l.descripcion?.toLowerCase().includes(keyword));
    let priceMatch = true;
    const p = Number(l.precio || 0);
    if (priceMin !== '' && l.tipo === 'venta' && p < Number(priceMin)) priceMatch = false;
    if (priceMax !== '' && l.tipo === 'venta' && p > Number(priceMax)) priceMatch = false;
    return typeMatch && categoryMatch && keywordMatch && priceMatch;
  });

  // Cargar más al alcanzar el final (infinite scroll)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting) {
        setVisibleCount((c) => Math.min(c + 20, filtered.length));
      }
    }, { root: null, rootMargin: '200px', threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [filtered.length]);

   return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black">🛍️ Mercadillo Deportivo</h1>
        <p className="text-slate-600">Compra, vende o dona material deportivo dentro del club.</p>
      </div>

      {newCount > 0 && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 flex items-center justify-between">
          <span className="font-medium">Tienes {newCount} anuncio(s) nuevo(s) desde tu última visita</span>
          <Button size="sm" variant="outline" onClick={() => { localStorage.setItem('marketLastSeenCount', String(listings.length)); setNewCount(0); }}>Marcar como visto</Button>
        </div>
      )}

      <Card className="p-4 sticky top-0 z-20 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
            {/* Categoría */}
            <Select value={category} onValueChange={(v) => setCategory(v)}>
              <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tipo */}
            <Select value={filter} onValueChange={(v) => setFilter(v)}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="venta">Venta</SelectItem>
                <SelectItem value="donacion">Donación</SelectItem>
              </SelectContent>
            </Select>

            {/* Precio mín */}
            <Input type="number" min="0" step="0.01" placeholder="Precio mín." value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
            {/* Precio máx */}
            <Input type="number" min="0" step="0.01" placeholder="Precio máx." value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />

            {/* Búsqueda por palabras */}
            <Input placeholder="Buscar por palabras" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => { setCategory('todas'); setFilter('todos'); setPriceMin(''); setPriceMax(''); setQ(''); }}
            >
              Limpiar filtros
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setShowForm(v => !v); }} className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700">
              {showForm ? 'Cerrar' : 'Publicar anuncio'}
            </Button>
          </div>
        </div>
        {showForm && (
          <div className="mt-4">
            <ListingForm listing={editing} onSaved={() => { setShowForm(false); setEditing(null); load(); }} />
          </div>
        )}
      </Card>

      <div className="divide-y rounded-xl bg-white/50">
        {filtered.slice(0, visibleCount).map(item => {
          const firstImg = Array.isArray(item.imagenes) && item.imagenes[0] ? item.imagenes[0] : null;
          const isNew = (() => { try { return (Date.now() - new Date(item.created_date).getTime()) < 7*24*60*60*1000; } catch { return false; }})();
          const price = item.tipo === 'donacion' || Number(item.precio||0) === 0 ? 'GRATIS' : `${Number(item.precio||0).toFixed(2)} €`;
          return (
            <div key={item.id} className="flex items-center gap-3 p-3">
              <div className="h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                {firstImg ? (
                  <img src={firstImg} alt={item.titulo} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-slate-400">📦</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate max-w-[60vw] md:max-w-[500px]">{item.titulo}</span>
                  {isNew && <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">Nuevo</span>}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {item.categoria} · {item.tipo === 'donacion' ? 'Donación' : 'Venta'}
                </div>
                {item.descripcion && (
                  <div className="text-xs text-slate-600 line-clamp-2 mt-0.5">{item.descripcion}</div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="font-bold text-slate-900">{price}</div>
                <div className="flex gap-2">
                  {user && (item.created_by === user.email) && (
                    <Button variant="outline" size="sm" onClick={() => { setEditing(item); setShowForm(true); }}>Editar</Button>
                  )}
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => reserve(item)}>Reservar</Button>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={sentinelRef} />
        {visibleCount < filtered.length && (
          <div className="text-center py-3 text-slate-500">Cargando más...</div>
        )}
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