import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import GalleryAlbum from "../components/gallery/GalleryAlbum";

export default function PlayerGallery() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: player } = useQuery({
    queryKey: ['myPlayerProfile', user?.jugador_id],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.find(p => p.id === user?.jugador_id) || null;
    },
    enabled: !!user?.jugador_id,
  });

  const { data: albums, isLoading } = useQuery({
    queryKey: ['photoGallery'],
    queryFn: () => base44.entities.PhotoGallery.list('-created_date'),
    initialData: [],
  });

  const visibleAlbums = albums.filter(album => album.visible_para_padres);

  const filteredAlbums = visibleAlbums.filter(album => {
    const matchesSearch = album.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          album.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtrar por mi categoría
    const matchesCategory = !player?.deporte || 
                           album.categoria === "Todas las Categorías" || 
                           album.categoria === player?.deporte;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Galería</h1>
          <p className="text-slate-600 mt-1">Fotos y momentos del equipo</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 mb-1">Total Álbumes</p>
                <p className="text-3xl font-bold text-orange-900">{filteredAlbums.length}</p>
              </div>
              <ImageIcon className="w-12 h-12 text-orange-600 opacity-20" />
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 mb-1">Mi Categoría</p>
                <p className="text-lg font-bold text-green-900">{player?.deporte || '-'}</p>
              </div>
              <Calendar className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 mb-1">Total Fotos</p>
                <p className="text-3xl font-bold text-blue-900">
                  {filteredAlbums.reduce((sum, album) => sum + (album.fotos?.length || 0), 0)}
                </p>
              </div>
              <ImageIcon className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </div>
        </Card>
      </div>

      {/* Buscador */}
      <Card className="border-none shadow-lg">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar álbumes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {/* Álbumes */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : filteredAlbums.length === 0 ? (
        <Card className="border-none shadow-lg">
          <div className="py-12 text-center">
            <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No hay álbumes disponibles</p>
            <p className="text-sm text-slate-400 mt-2">
              Las fotos se publicarán próximamente
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAlbums.map((album) => (
            <GalleryAlbum key={album.id} album={album} isReadOnly={true} />
          ))}
        </div>
      )}
    </div>
  );
}