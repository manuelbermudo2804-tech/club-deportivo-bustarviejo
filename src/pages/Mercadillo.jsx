import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import ListingForm from "@/components/marketplace/ListingForm";
import ListingCard from "@/components/marketplace/ListingCard";

export default function Mercadillo() {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");

  useEffect(()=>{ base44.auth.me().then(setUser).catch(()=>{}); },[]);

  const { data: listings = [] } = useQuery({ queryKey:["market_listings"], queryFn:()=> base44.entities.MarketplaceListing.list("-created_date", 200) });

  const saveListing = useMutation({ mutationFn: async (payload)=>{
    if (editing) return base44.entities.MarketplaceListing.update(editing.id, payload);
    return base44.entities.MarketplaceListing.create({ ...payload, estado: 'activo' });
  }, onSuccess:()=>{ setOpenForm(false); setEditing(null); qc.invalidateQueries({queryKey:["market_listings"]}); }});

  const updateListing = useMutation({ mutationFn: async ({ id, data })=> base44.entities.MarketplaceListing.update(id, data), onSuccess:()=> qc.invalidateQueries({queryKey:["market_listings"]}) });

  const reserve = useMutation({ mutationFn: async (item)=>{
    const me = user; if (!me) return;
    await base44.entities.MarketplaceReservation.create({ listing_id: item.id, buyer_email: me.email, buyer_nombre: me.full_name || me.email, buyer_telefono: '', mensaje: 'Reserva solicitada' });
    await base44.entities.MarketplaceListing.update(item.id, { estado: 'reservado' });
    await base44.integrations.Core.SendEmail({ to: item.seller_email, subject: `Reserva en tu anuncio: ${item.titulo}`, body: `Hola,\n\n${me.full_name || me.email} ha reservado tu anuncio en el Mercadillo.\n\nDetalle: ${item.titulo}\nPrecio: ${item.donacion? 'Donación' : (item.precio+'€')}\n\nPonte en contacto: ${me.email}\n\nGracias.\nCD Bustarviejo` });
  }, onSuccess:()=> qc.invalidateQueries({queryKey:["market_listings"]}) });

  const explore = useMemo(()=> listings.filter(l => l.estado==='activo' && (l.titulo?.toLowerCase().includes(q.toLowerCase()) || l.descripcion?.toLowerCase().includes(q.toLowerCase()))), [listings, q]);
  const mine = useMemo(()=> (user? listings.filter(l => l.seller_email===user.email):[]), [listings, user]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-3xl font-bold">Mercadillo</h1>
        <Button onClick={()=>{ setEditing(null); setOpenForm(true); }} className="bg-orange-600">Publicar anuncio</Button>
      </div>

      <Tabs defaultValue="explorar" className="w-full">
        <TabsList>
          <TabsTrigger value="explorar">Explorar</TabsTrigger>
          <TabsTrigger value="mis">Mis anuncios</TabsTrigger>
        </TabsList>
        <TabsContent value="explorar">
          <div className="mb-3"><Input placeholder="Buscar material deportivo..." value={q} onChange={(e)=>setQ(e.target.value)} /></div>
          <div className="grid md:grid-cols-2 gap-4">
            {explore.map((it)=> (
              <ListingCard key={it.id} item={it} onReserve={()=>reserve.mutate(it)} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="mis">
          <div className="grid gap-3">
            {mine.map((it)=> (
              <ListingCard key={it.id} item={it} isOwner onReserve={()=>{}} />
            ))}
            {mine.length===0 && <div className="text-slate-600">No tienes anuncios publicados aún.</div>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {mine.map((it)=> (
              <div key={it.id} className="flex items-center gap-2 bg-white rounded-lg border p-2">
                <span className="text-sm font-medium">{it.titulo}</span>
                <Button size="sm" variant="outline" onClick={()=>{ setEditing(it); setOpenForm(true); }}>Editar</Button>
                {it.estado !== 'vendido' && <Button size="sm" variant="outline" onClick={()=>updateListing.mutate({ id: it.id, data: { estado: 'vendido' } })}>Marcar vendido</Button>}
                {it.estado !== 'activo' && <Button size="sm" variant="outline" onClick={()=>updateListing.mutate({ id: it.id, data: { estado: 'activo' } })}>Reactivar</Button>}
                {it.estado === 'reservado' && <Button size="sm" variant="outline" onClick={()=>updateListing.mutate({ id: it.id, data: { estado: 'activo' } })}>Cancelar reserva</Button>}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-lg">
          {user && <ListingForm user={user} initial={editing} onSubmit={(payload)=>saveListing.mutate(payload)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}