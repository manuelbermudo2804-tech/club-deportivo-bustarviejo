import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageCircle, Shield, Search, Archive, ArchiveRestore } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function AdminChat() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("active");
  const queryClient = useQueryClient();

  // Preselect from URL
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("convId");
    if (id) setSelectedConversation({ id });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        setIsAdmin(me.role === "admin");
      } catch {}
    })();
  }, []);

  const { data: conversations = [] } = useQuery({
    queryKey: ["adminConversations"],
    queryFn: async () => await base44.entities.AdminConversation.list("-ultimo_mensaje_fecha"),
    enabled: isAdmin,
    staleTime: 60000,
  });

  // Keep list live
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = base44.entities.AdminConversation.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["adminConversations"] });
    });
    return unsub;
  }, [isAdmin, queryClient]);

  // Resolve full selected conversation from id
  const selectedFull = useMemo(() => {
    if (!selectedConversation?.id) return null;
    return conversations.find(c => c.id === selectedConversation.id) || null;
  }, [selectedConversation?.id, conversations]);

  // Messages
  const { data: messages = [] } = useQuery({
    queryKey: ["adminMessages", selectedFull?.id],
    queryFn: async () => {
      if (!selectedFull?.id) return [];
      return await base44.entities.AdminMessage.filter({ conversacion_id: selectedFull.id }, "created_date");
    },
    enabled: !!selectedFull?.id,
  });

  useEffect(() => {
    if (!selectedFull?.id) return;
    const unsub = base44.entities.AdminMessage.subscribe((e) => {
      if (e.data?.conversacion_id === selectedFull.id) {
        queryClient.invalidateQueries({ queryKey: ["adminMessages", selectedFull.id] });
      }
    });
    return unsub;
  }, [selectedFull?.id, queryClient]);

  // Mark as read when opening
  useEffect(() => {
    if (!selectedFull?.id || !isAdmin) return;
    (async () => {
      try {
        if ((selectedFull.no_leidos_admin || 0) > 0) {
          await base44.entities.AdminConversation.update(selectedFull.id, {
            no_leidos_admin: 0,
            last_read_admin_at: new Date().toISOString(),
          });
        }
      } catch {}
    })();
  }, [selectedFull?.id, isAdmin]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!messageInput.trim() || !selectedFull?.id) return;
      await base44.entities.AdminMessage.create({
        conversacion_id: selectedFull.id,
        autor: "admin",
        autor_email: user.email,
        autor_nombre: user.full_name,
        mensaje: messageInput.trim(),
        leido_admin: true,
        leido_padre: false,
      });
      await base44.entities.AdminConversation.update(selectedFull.id, {
        ultimo_mensaje: messageInput.trim(),
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_autor: "admin",
        no_leidos_padre: (selectedFull.no_leidos_padre || 0) + 1,
        archivada: false,
      });
      if (selectedFull.padre_email) {
        await base44.entities.AppNotification.create({
          usuario_email: selectedFull.padre_email,
          titulo: `🛡️ Mensaje del Administrador`,
          mensaje: messageInput.trim().slice(0, 100),
          tipo: "importante",
          icono: "🛡️",
          enlace: "ParentDirectMessages",
          vista: false,
        });
      }
    },
    onSuccess: () => {
      setMessageInput("\n".slice(1));
      queryClient.invalidateQueries({ queryKey: ["adminMessages", selectedFull?.id] });
    },
  });

  if (!isAdmin) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Solo administradores pueden acceder a esta sección</p>
      </div>
    );
  }

  const active = conversations.filter(c => !c.archivada);
  const archived = conversations.filter(c => c.archivada);

  const filterList = (list) => list.filter(c => {
    const s = search.toLowerCase();
    const a = c.padre_nombre?.toLowerCase().includes(s);
    const b = c.jugadores_asociados?.some(j => j.jugador_nombre?.toLowerCase().includes(s));
    return a || b;
  });

  const filteredActive = filterList(active);
  const filteredArchived = filterList(archived);

  return (
    <div className="h-full min-h-0 flex flex-col lg:flex-row overflow-hidden">
      {/* Sidebar */}
      <div className={`${selectedFull ? 'hidden lg:flex' : 'flex'} w-full lg:w-96 border-r bg-slate-50 min-h-0 flex-col h-full overflow-hidden`}>
        <div className="p-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-bold flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Chats Admin ↔ Padre
            </h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
            <Input
              placeholder="Buscar familias..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white h-9 text-slate-900"
            />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-3">
            <TabsTrigger value="active" className="flex-1">Activas ({filteredActive.length})</TabsTrigger>
            <TabsTrigger value="archived" className="flex-1">Archivadas ({filteredArchived.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="flex-1 overflow-y-auto px-2">
            {filteredActive.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No hay conversaciones</p>
              </div>
            ) : (
              filteredActive.map(conv => (
                <Card
                  key={conv.id}
                  className={`mb-2 cursor-pointer hover:shadow-md transition-all ${selectedFull?.id === conv.id ? 'ring-2 ring-orange-500' : ''}`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm text-slate-900 truncate">{conv.padre_nombre}</p>
                          {conv.escalada_desde_coordinador && (
                            <Badge className="bg-orange-100 text-orange-700 text-xs flex-shrink-0">Escalada</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {conv.jugadores_asociados?.map(j => `${j.jugador_nombre} (${j.categoria})`).join(', ')}
                        </p>
                      </div>
                      {conv.no_leidos_admin > 0 && (
                        <Badge className="bg-red-500 text-white font-bold text-xs flex-shrink-0 px-2 py-1 rounded-full">{conv.no_leidos_admin}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 truncate">{conv.ultimo_mensaje}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-400">
                        {conv.ultimo_mensaje_fecha && format(new Date(conv.ultimo_mensaje_fecha), "dd MMM, HH:mm", { locale: es })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="archived" className="flex-1 overflow-y-auto px-2">
            {filteredArchived.length === 0 ? (
              <div className="text-center py-12">
                <Archive className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No hay conversaciones archivadas</p>
              </div>
            ) : (
              filteredArchived.map(conv => (
                <Card key={conv.id} className="mb-2 opacity-60">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <p className="font-bold text-sm text-slate-900">{conv.padre_nombre}</p>
                        <p className="text-xs text-slate-500">
                          {conv.jugadores_asociados?.map(j => j.jugador_nombre).join(', ')}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 truncate">{conv.ultimo_mensaje}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat window */}
      <div className={`${selectedFull ? 'flex' : 'hidden lg:flex'} flex-1 min-h-0 h-full overflow-hidden`}>
        {selectedFull ? (
          <Card className="w-full h-full rounded-none border-0">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-orange-700" />
                    {selectedFull.padre_nombre}
                  </div>
                </CardTitle>
                <div className="flex items-center gap-2">
                  {!selectedFull.archivada && (
                    <Button size="sm" variant="outline" onClick={async () => {
                      await base44.entities.AdminConversation.update(selectedFull.id, { archivada: true, resuelta: true });
                      queryClient.invalidateQueries({ queryKey: ["adminConversations"] });
                    }}>
                      Archivar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-full flex flex-col min-h-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-2 pb-24">
                {messages.map(msg => {
                  const isMe = msg.autor === "admin" && msg.autor_email === user?.email;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${isMe ? 'bg-orange-600 text-white' : 'bg-white border'}`}>
                        {!isMe && (
                          <p className={`text-[11px] ${isMe ? 'text-orange-100' : 'text-slate-500'} mb-0.5`}>{msg.autor_nombre}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.mensaje}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-orange-100' : 'text-slate-500'}`}>
                          {format(new Date(msg.created_date), "dd MMM HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input */}
              <div className="border-t bg-white flex-shrink-0 p-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Escribe un mensaje..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMutation.mutate(); } }}
                    className="flex-1"
                  />
                  <Button onClick={() => sendMutation.mutate()} disabled={!messageInput.trim()} className="bg-orange-600 hover:bg-orange-700">
                    Enviar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-50 w-full">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Selecciona una conversación para empezar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}