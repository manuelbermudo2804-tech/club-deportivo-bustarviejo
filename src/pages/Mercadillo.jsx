import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ListingForm from "../components/market/ListingForm";
import ListingCard from "../components/market/ListingCard";
import CompactListingRow from "../components/market/CompactListingRow";

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
    const data = await base44.entities.MarketListing.filter({ $or: [{ estado: 'activo' }, { estado: 'reservado' }] });
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

    // Crear solicitud de reserva
    await base44.entities.MarketReservation.create({
      listing_id: item.id,
      comprador_nombre,
      comprador_email: user.email,
      comprador_telefono: user.telefono || '',
      mensaje: 'Reserva desde la app',
      fecha: new Date().toISOString()
    });

    // Marcar anuncio como reservado (sin expiración automática)
    await base44.entities.MarketListing.update(item.id, {
      estado: 'reservado',
      reservado_por_email: user.email,
      reservado_por_nombre: comprador_nombre,
      reservado_fecha: new Date().toISOString()
    });

    // Notificación en la app al vendedor (barra de notificaciones)
    const vendedorEmail = item.vendedor_email || item.created_by;
    if (vendedorEmail) {
      await base44.entities.AppNotification.create({
        usuario_email: vendedorEmail,
        titulo: `Reserva: ${item.titulo}`,
        mensaje: `${comprador_nombre} ha reservado tu anuncio. Puedes marcarlo como vendido cuando cierres el trato.`,
        tipo: 'importante',
        icono: '🛍️',
        enlace: typeof window !== 'undefined' ? window.location.href : ''
      });
    }

    // Aviso por email al vendedor
    await base44.integrations.Core.SendEmail({
      to: item.vendedor_email,
      subject: `Nueva reserva: ${item.titulo}`,
      body: `Hola ${item.vendedor_nombre || ''},\n\n${comprador_nombre} ha reservado tu anuncio: ${item.titulo}.\n\nDatos de contacto:\n- Email: ${user.email}\n- Teléfono: ${user.telefono || ''}\n\nEntra en la app para gestionar el anuncio; cuando cierres el trato, márcalo como vendido.\n\nCD Bustarviejo`
    });

    // Confirmación al comprador
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject: `Has reservado: ${item.titulo}`,
      body: `Hola ${comprador_nombre},\n\nHemos avisado por email al vendedor (${item.vendedor_nombre || item.vendedor_email}).\nPermanece atento a su respuesta para concretar la entrega.\n\nAnuncio: ${item.titulo}\nCategoría: ${item.categoria}\nPrecio: ${Number(item.precio||0).toFixed(2)} €\n\nGracias por usar el mercadillo del club.\nCD Bustarviejo`
    });

    alert('¡Reserva enviada! Hemos avisado al vendedor.');
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

  const overdueMine = (() => {
    if (!user || !Array.isArray(listings)) return [];
    const now = Date.now();
    const cutoff = 48 * 60 * 60 * 1000; // 48h
    try {
      return listings.filter((it) => {
        if (it?.estado !== 'reservado') return false;
        const isOwner = (it?.created_by === user.email) || (it?.vendedor_email === user.email);
        if (!isOwner) return false;
        const ts = it?.reservado_fecha || it?.updated_date || it?.created_date;
        const t = ts ? new Date(ts).getTime() : NaN;
        return Number.isFinite(t) && (now - t) > cutoff;
      });
    } catch {
      return [];
    }
  })();

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

      {overdueMine.length > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 text-sm text-yellow-900 space-y-2">
            <div className="font-semibold">Tienes {overdueMine.length} anuncio(s) reservados desde hace más de 48h. Ciérralos para mantener el mercadillo ordenado.</div>
            <div className="space-y-2">
              {overdueMine.slice(0, 3).map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{it.titulo}</span>
                  <div className="flex gap-2">
                    {user && (
                      <>
                        {it.tipo === 'donacion' && (
                          <Button size="sm" variant="outline" className="border-green-600 text-green-700" onClick={async () => { await base44.entities.MarketListing.update(it.id, { estado: 'entregado' }); await load(); }}>Entregado</Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={async () => { await base44.entities.MarketListing.update(it.id, { estado: 'vendido' }); await load(); }}>Vendido</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <div className="text-6xl">📦</div>
          <p className="text-lg font-semibold text-slate-700">No hay anuncios</p>
          <p className="text-sm text-slate-500">Sé el primero en publicar algo en el mercadillo del club.</p>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-orange-600 hover:bg-orange-700">Publicar anuncio</Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.slice(0, visibleCount).map(item => {
          const firstImg = Array.isArray(item.imagenes) && item.imagenes[0] ? item.imagenes[0] : null;
          const isNew = (() => { try { return (Date.now() - new Date(item.created_date).getTime()) < 7*24*60*60*1000; } catch { return false; }})();
          const price = item.tipo === 'donacion' || Number(item.precio||0) === 0 ? 'GRATIS' : `${Number(item.precio||0).toFixed(2)} €`;
          const isMine = user && item.created_by === user.email;
          const isReserved = item.estado === 'reservado';

          return (
            <Card key={item.id} className={`overflow-hidden transition-shadow hover:shadow-lg ${isReserved ? 'opacity-75' : ''}`}>
              {/* Imagen */}
              <Link to={createPageUrl(`MarketListingDetail?id=${item.id}`)}>
                <div className="h-44 bg-slate-100 relative">
                  {firstImg ? (
                    <img src={firstImg} alt={item.titulo} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-5xl text-slate-300">📦</div>
                  )}
                  {/* Badges encima de la imagen */}
                  <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
                    {item.tipo === 'donacion' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500 text-white font-bold shadow">Gratis</span>
                    )}
                    {isNew && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white font-bold shadow">Nuevo</span>
                    )}
                    {isReserved && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500 text-white font-bold shadow">Reservado</span>
                    )}
                    {item.estado === 'entregado' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-600 text-white font-bold shadow">Entregado</span>
                    )}
                  </div>
                  {/* Precio */}
                  <div className="absolute bottom-2 right-2">
                    <span className={`text-sm font-black px-3 py-1 rounded-full shadow ${price === 'GRATIS' ? 'bg-green-500 text-white' : 'bg-white text-slate-900'}`}>
                      {price}
                    </span>
                  </div>
                </div>
              </Link>

              <CardContent className="p-3 space-y-2">
                <Link to={createPageUrl(`MarketListingDetail?id=${item.id}`)} className="block">
                  <h3 className="font-bold text-base truncate hover:underline">{item.titulo}</h3>
                </Link>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span className="bg-slate-100 px-2 py-0.5 rounded">{item.categoria}</span>
                  <span>·</span>
                  <span>{item.vendedor_nombre || 'Anónimo'}</span>
                </div>
                {item.descripcion && (
                  <p className="text-xs text-slate-600 line-clamp-2">{item.descripcion}</p>
                )}

                {/* Botones */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {isMine && (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditing(item); setShowForm(true); }}>Editar</Button>
                  )}
                  {isMine && item.tipo === 'donacion' && (
                    <Button variant="outline" size="sm" className="border-green-600 text-green-700" onClick={async () => { await base44.entities.MarketListing.update(item.id, { estado: 'entregado' }); await load(); }}>Entregado</Button>
                  )}
                  {isMine && (
                    <Button variant="destructive" size="sm" onClick={async () => { await base44.entities.MarketListing.update(item.id, { estado: 'vendido' }); await load(); }}>Vendido</Button>
                  )}
                  {!isMine && (
                    <Button size="sm" className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-60" disabled={isReserved} onClick={() => reserve(item)}>
                      {isReserved ? '🔒 Reservado' : '🛒 Reservar'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div ref={sentinelRef} />
      {visibleCount < filtered.length && (
        <div className="text-center py-3 text-slate-500">Cargando más...</div>
      )}

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