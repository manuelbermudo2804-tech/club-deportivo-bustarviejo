import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Eye } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import GalleryForm from "../components/gallery/GalleryForm";
import GalleryAlbum from "../components/gallery/GalleryAlbum";

export default function AdminGallery() {
  const [showForm, setShowForm] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  const queryClient = useQueryClient();

  const { data: albums, isLoading } = useQuery({
    queryKey: ['photoGallery'],
    queryFn: () => base44.entities.PhotoGallery.list('-fecha_evento'),
    initialData: [],
  });

  const createAlbumMutation = useMutation({
    mutationFn: (albumData) => base44.entities.PhotoGallery.create(albumData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photoGallery'] });
      setShowForm(false);
      setEditingAlbum(null);
    },
  });

  const updateAlbumMutation = useMutation({
    mutationFn: ({ id, albumData }) => base44.entities.PhotoGallery.update(id, albumData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photoGallery'] });
      setShowForm(false);
      setEditingAlbum(null);
    },
  });

  const handleSubmit = async (albumData) => {
    if (editingAlbum) {
      updateAlbumMutation.mutate({ id: editingAlbum.id, albumData });
    } else {
      createAlbumMutation.mutate(albumData);
    }
  };

  const handleEdit = (album) => {
    setEditingAlbum(album);
    setShowForm(true);
  };

  const filteredAlbums = albums.filter(album => {
    const matchesSearch = album.titulo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || album.categoria === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    "Fútbol Pre-Benjamín (Mixto)",
    "Fútbol Benjamín (Mixto)",
    "Fútbol Alevín (Mixto)",
    "Fútbol Infantil (Mixto)",
    "Fútbol Cadete",
    "Fútbol Juvenil",
    "Fútbol Aficionado",
    "Fútbol Femenino",
    "Baloncesto (Mixto)"
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">📸 Galería de Fotos</h1>
          <p className="text-slate-600 mt-1">Gestiona los álbumes del club</p>
        </div>
        <Button
          onClick={() => {
            setEditingAlbum(null);
            setShowForm(!showForm);
          }}
          className="bg-orange-600 hover:bg-orange-700 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Álbum
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <GalleryForm
            album={editingAlbum}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingAlbum(null);
            }}
            isSubmitting={createAlbumMutation.isPending || updateAlbumMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Filtro por Categoría */}
      <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="all">Todas</TabsTrigger>
          {categories.map(cat => (
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
          <p className="text-slate-500">No se encontraron álbumes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredAlbums.map((album) => (
              <GalleryAlbum 
                key={album.id} 
                album={album} 
                onEdit={handleEdit}
                isAdmin={true}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}