import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import GalleryAlbum from "../components/gallery/GalleryAlbum";
import ContactCard from "../components/ContactCard";

export default function ParentGallery() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [myCategories, setMyCategories] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: players } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => 
        p.email_padre === user?.email || p.email_tutor_2 === user?.email
      );
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: albums, isLoading } = useQuery({
    queryKey: ['photoGallery'],
    queryFn: () => base44.entities.PhotoGallery.list('-fecha_evento'),
    initialData: [],
  });

  useEffect(() => {
    if (players.length > 0) {
      const categories = [...new Set(players.map(p => p.deporte))];
      setMyCategories(categories);
    }
  }, [players]);

  const visibleAlbums = albums.filter(album => album.visible_para_padres);

  const filteredAlbums = visibleAlbums.filter(album => {
    const matchesSearch = album.titulo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (categoryFilter === "all") {
      return matchesSearch;
    } else if (categoryFilter === "my") {
      // Mostrar álbumes de las categorías de mis jugadores + "Todas las Categorías"
      return matchesSearch && (
        album.categoria === "Todas las Categorías" || 
        myCategories.includes(album.categoria)
      );
    } else {
      return matchesSearch && album.categoria === categoryFilter;
    }
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">📸 Galería de Fotos</h1>
        <p className="text-slate-600 mt-1">Revive los mejores momentos del club</p>
      </div>

      {/* Filtro por Categoría */}
      <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="my">Mis Jugadores</TabsTrigger>
          {myCategories.map(cat => (
            <TabsTrigger key={cat} value={cat} className="text-xs">
              {cat.includes("Baloncesto") ? "🏀" : "⚽"} {cat.split(" ")[1]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Buscar álbum..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white shadow-sm"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : filteredAlbums.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500">No hay álbumes disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredAlbums.map((album) => (
              <GalleryAlbum 
                key={album.id} 
                album={album}
                isAdmin={false}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <ContactCard />
    </div>
  );
}