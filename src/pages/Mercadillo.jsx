import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, X, Filter, ShoppingBag, Gift, Tag } from "lucide-react";
import { toast } from "sonner";
import ListingForm from "../components/market/ListingForm";
import MarketListingCard from "../components/market/MarketListingCard";
import MercadilloAdminPanel from "../components/market/MercadilloAdminPanel";
import { reservarArticulo, marcarVendido, liberarReserva, esVendido, vendidoReciente, DIAS_VISIBLE_VENDIDO } from "../components/market/marketActions";

const CATEGORIES = ['Fútbol','Baloncesto','Equipación','Calzado','Protecciones','Accesorios','Otro Deportivo'];

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
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const sentinelRef = useRef(null);

  const [allListings, setAllListings] = useState([]);

  const load = async () => {
    const u = await base44.auth.me().catch(() => null);
    setUser(u);
    const data = (await base44.entities.MarketListing.list('-created_date', 300)) || [];
    setAllListings(data);
    // Visibles para todos: publicados, reservados y los vendidos de los últimos días.
    // Cada uno ve además sus propios anuncios pendientes de revisión.
    setListings(data.filter((l) => {
      if (l.estado === 'activo' || l.estado === 'reservado') return true;
      if (esVendido(l)) return vendidoReciente(l);
      if (l.estado === 'pendiente') return u && (l.vendedor_email === u.email || l.created_by === u.email);
      return false;
    }));
  };

  const isAdmin = user?.role === 'admin';

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const lastSeen = Number(localStorage.getItem('marketLastSeenCount') || 0);
    setNewCount(listings.length > lastSeen ? (listings.length - lastSeen) : 0);
  }, [listings]);

  useEffect(() => { setVisibleCount(20); }, [filter, category, priceMin, priceMax, q, listings]);

  const reserve = async (item) => {
    if (!user) { toast.error('Debes estar conectado para reservar'); return; }
    await reservarArticulo(item, user);
    toast.success('¡Reserva enviada! Hemos avisado al vendedor.');
    await load();
  };

  const markSold = async (item) => {
    const esDonacion = item.tipo === 'donacion';
    if (!window.confirm(esDonacion ? `¿Confirmas que has ENTREGADO "${item.titulo}"?` : `¿Confirmas que has VENDIDO "${item.titulo}"?`)) return;
    await marcarVendido(item, user?.email);
    toast.success(esDonacion ? 'Marcado como entregado' : 'Marcado como vendido');
    await load();
  };

  const release = async (item) => {
    await liberarReserva(item);
    toast.success('Reserva liberada, el artículo vuelve a estar disponible');
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

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount((c) => Math.min(c + 20, filtered.length));
    }, { rootMargin: '200px', threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [filtered.length]);

  const overdueMine = (() => {
    if (!user || !Array.isArray(listings)) return [];
    const now = Date.now();
    const cutoff = 48 * 60 * 60 * 1000;
    return listings.filter((it) => {
      if (it?.estado !== 'reservado') return false;
      const isOwner = (it?.created_by === user.email) || (it?.vendedor_email === user.email);
      if (!isOwner) return false;
      const ts = it?.reservado_fecha || it?.updated_date || it?.created_date;
      const t = ts ? new Date(ts).getTime() : NaN;
      return Number.isFinite(t) && (now - t) > cutoff;
    });
  })();

  const hasActiveFilters = filter !== 'todos' || category !== 'todas' || priceMin !== '' || priceMax !== '' || q !== '';
  const clearFilters = () => { setCategory('todas'); setFilter('todos'); setPriceMin(''); setPriceMax(''); setQ(''); };

  const statsVenta = listings.filter(l => l.tipo === 'venta' && l.estado === 'activo').length;
  const statsDonacion = listings.filter(l => l.tipo === 'donacion' && l.estado === 'activo').length;

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-orange-600" />
            Mercadillo Deportivo
          </h1>
          <p className="text-slate-500 text-sm mt-1">Compra, vende o dona material deportivo del club</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-orange-600 hover:bg-orange-700 shadow-lg">
          <Plus className="w-4 h-4 mr-2" />
          Publicar anuncio
        </Button>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-2xl font-black text-slate-900">{listings.filter(l => l.estado === 'activo').length}</p>
          <p className="text-xs text-slate-500">Anuncios activos</p>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-2xl font-black text-orange-600">{statsVenta}</p>
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1"><Tag className="w-3 h-3" /> En venta</p>
        </div>
        <div className="bg-white rounded-xl border p-3 text-center">
          <p className="text-2xl font-black text-green-600">{statsDonacion}</p>
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1"><Gift className="w-3 h-3" /> Donaciones</p>
        </div>
      </div>

      {newCount > 0 && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 flex items-center justify-between">
          <span className="font-medium text-sm">🆕 {newCount} anuncio(s) nuevo(s) desde tu última visita</span>
          <Button size="sm" variant="outline" onClick={() => { localStorage.setItem('marketLastSeenCount', String(listings.length)); setNewCount(0); }}>Visto</Button>
        </div>
      )}

      {/* Barra de búsqueda + filtros */}
      <div className="bg-white rounded-xl border shadow-sm p-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar artículos..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={hasActiveFilters ? "border-orange-400 text-orange-600" : ""}>
            <Filter className="w-4 h-4 mr-1" />
            Filtros
            {hasActiveFilters && <span className="ml-1 w-2 h-2 rounded-full bg-orange-500" />}
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="venta">💰 Venta</SelectItem>
                <SelectItem value="donacion">🎁 Donación</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" min="0" step="0.01" placeholder="Precio mín." value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="text-sm" />
            <Input type="number" min="0" step="0.01" placeholder="Precio máx." value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="text-sm" />
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
            <button onClick={clearFilters} className="text-orange-600 hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Anuncios pendientes de cierre */}
      {overdueMine.length > 0 && (
        <Card className="bg-yellow-50 border-yellow-300">
          <CardContent className="p-4 text-sm text-yellow-900 space-y-2">
            <p className="font-bold">⏰ Tienes {overdueMine.length} anuncio(s) reservados hace +48h</p>
            {overdueMine.slice(0, 3).map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-2 bg-white rounded-lg p-2 border border-yellow-200">
                <span className="truncate text-sm font-medium">{it.titulo}</span>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {it.reservado_por_nombre && <span className="text-[11px]">Reservado por <b>{it.reservado_por_nombre}</b></span>}
                  <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-xs h-7" onClick={() => markSold(it)}>
                    {it.tipo === 'donacion' ? 'Entregado' : 'Vendido'}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <MercadilloAdminPanel
          listings={allListings}
          user={user}
          onEdit={(it) => { setEditing(it); setShowForm(true); }}
          onChanged={load}
        />
      )}

      {/* Grid de anuncios */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-6xl">📦</div>
          <p className="text-lg font-semibold text-slate-700">No hay anuncios</p>
          <p className="text-sm text-slate-500">Sé el primero en publicar algo en el mercadillo del club.</p>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" /> Publicar anuncio
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
          {filtered.slice(0, visibleCount).map(item => (
            <MarketListingCard
              key={item.id}
              item={item}
              user={user}
              isAdmin={isAdmin}
              onEdit={(it) => { setEditing(it); setShowForm(true); }}
              onReserve={reserve}
              onSold={markSold}
              onRelease={release}
            />
          ))}
        </div>
      )}

      <div ref={sentinelRef} />
      {visibleCount < filtered.length && (
        <div className="text-center py-3 text-slate-400 text-sm">Cargando más…</div>
      )}

      {/* Normas */}
      <div className="bg-slate-50 rounded-xl border p-4 space-y-2">
        <p className="font-bold text-sm text-slate-700">ℹ️ Normas del Mercadillo</p>
        <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
          <li>Solo material deportivo (equipación, calzado, protecciones, accesorios).</li>
          <li>Es obligatorio subir al menos una foto del artículo.</li>
          <li>Al reservar, el vendedor recibe un email con tu nombre y teléfono para contactarte.</li>
          <li>Reservar no es comprar: cuando entregues el artículo, pulsa «Vendido» para cerrar el anuncio.</li>
          <li>Los artículos vendidos siguen visibles {DIAS_VISIBLE_VENDIDO} días con el cartel «VENDIDO» y luego desaparecen.</li>
        </ul>
      </div>

      {/* Modal formulario */}
      <ListingForm
        listing={editing}
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={() => { setShowForm(false); setEditing(null); load(); }}
      />
    </div>
  );
}