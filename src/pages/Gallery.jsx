import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Calendar, Image as ImageIcon } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

import GalleryForm from "../components/gallery/GalleryForm";
import GalleryAlbum from "../components/gallery/GalleryAlbum";
import ContactCard from "../components/ContactCard";

const CATEGORIES = [
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

export default function Gallery() {
  const [showForm, setShowForm] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("parent"); // admin, coach, parent, player
  const [myCategories, setMyCategories] = useState([]);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser.role === "admin") {
          setUserRole("admin");
        } else if (currentUser.role === "jugador") {
          setUserRole("player");
        } else if (currentUser.es_entrenador || currentUser.es_coordinador) {
          setUserRole("coach");
        } else {
          setUserRole("parent");
        }
      } catch (error) {
        console.error("Error checking permissions:", error);
      }
    };
    checkPermissions();
  }, []);

  const { data: players } = useQuery({
    queryKey: ['myPlayers', user?.email, userRole],
    queryFn: async () => {
      if (userRole === "player") {
        if (user?.player_id) {
          return await base44.entities.Player.filter({ id: user.player_id, activo: true });
        }
        return await base44.entities.Player.filter({ email_jugador: user.email, activo: true });
      } else {
        const [byParent, byTutor2] = await Promise.all([
          base44.entities.Player.filter({ email_padre: user.email, activo: true }),
          base44.entities.Player.filter({ email_tutor_2: user.email, activo: true })
        ]);
        const map = new Map();
        [...byParent, ...byTutor2].forEach(p => map.set(p.id, p));
        return [...map.values()];
      }
    },
    enabled: !!user?.email && (userRole === "parent" || userRole === "player"),
    initialData: [],
  });

  useEffect(() => {
    if (players.length > 0) {
      const cats = new Set();
      players.forEach(p => {
        if (p.categoria_principal) cats.add(p.categoria_principal);
        (p.categorias || []).forEach(c => cats.add(c));
        if (p.deporte) cats.add(p.deporte); // fallback legacy
      });
      setMyCategories([...cats]);
    }
  }, [players]);

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

  // Quick upload handler for adding photos directly to an album
  const handleQuickUpload = async (albumId, newFotos) => {
    await base44.entities.PhotoGallery.update(albumId, { fotos: newFotos });
    queryClient.invalidateQueries({ queryKey: ['photoGallery'] });
  };

  const deleteAlbumMutation = useMutation({
    mutationFn: (albumId) => base44.entities.PhotoGallery.delete(albumId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photoGallery'] });
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

  const canEdit = userRole === "admin" || userRole === "coach";
  const isParentOrPlayer = userRole === "parent" || userRole === "player";
  
  // Categorías que puede gestionar el entrenador/coordinador
  const coachCategories = user?.categorias_entrena || [];

  // Filter albums based on role and visibility
  const visibleAlbums = (() => {
    if (userRole === "admin") {
      return albums;
    }
    // Staff (coach/coordinator) see all visible albums
    if (userRole === "coach") {
      return albums.filter(album => album.visible_para_padres !== false);
    }
    // Parents and players: only their categories + "Todas las Categorías"
    return albums.filter(album => {
      if (album.visible_para_padres === false) return false;
      if (album.categoria === "Todas las Categorías") return true;
      return myCategories.includes(album.categoria);
    });
  })();

  // Apply search and category filters
  const filteredAlbums = visibleAlbums.filter(album => {
    const matchesSearch = album.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          album.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (categoryFilter === "all") {
      return matchesSearch;
    } else {
      return matchesSearch && album.categoria === categoryFilter;
    }
  });

  // Categories to show in filter tabs
  const filterCategories = userRole === "admin" ? CATEGORIES : myCategories;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">📸 Galería de Fotos</h1>
          <p className="text-slate-600 mt-1 text-sm">
            {canEdit ? (userRole === "coach" ? "Sube fotos de tus equipos" : "Álbumes del club") : "Revive los mejores momentos del club"}
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => {
              setEditingAlbum(null);
              setShowForm(!showForm);
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Álbum
          </Button>
        )}
      </div>

      {/* Stats for Player view */}
      {userRole === "player" && (
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
                  <p className="text-lg font-bold text-green-900">{myCategories[0] || '-'}</p>
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
      )}

      {/* Form for Admin */}
      <AnimatePresence>
        {showForm && canEdit && (
          <GalleryForm
            album={editingAlbum}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingAlbum(null);
            }}
            isSubmitting={createAlbumMutation.isPending || updateAlbumMutation.isPending}
            userRole={userRole}
            coachCategories={coachCategories}
          />
        )}
      </AnimatePresence>

      {/* Category Filter - only show if more than one category available */}
      {filterCategories.length > 1 && (
        <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
          <TabsList className="flex flex-wrap h-auto p-1">
            <TabsTrigger value="all" className="text-xs px-2 py-1">Todas</TabsTrigger>
            {filterCategories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-[10px] px-2 py-1">
                {cat.includes("Baloncesto") ? "🏀" : "⚽"} {cat.split(" ")[1] || cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar álbum..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-white shadow-sm text-sm"
        />
      </div>

      {/* Albums Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredAlbums.length === 0 ? (
        <Card className="border-none shadow-lg">
          <div className="py-12 text-center">
            <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No hay álbumes disponibles</p>
            <p className="text-sm text-slate-400 mt-2">
              {canEdit ? 'Haz clic en "Nuevo Álbum" para crear uno' : 'Las fotos se publicarán próximamente'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {filteredAlbums.map((album) => {
              // Entrenadores solo pueden editar álbumes de sus categorías
              const canEditThisAlbum = userRole === "admin" || 
                (userRole === "coach" && coachCategories.includes(album.categoria));
              
              return (
                <GalleryAlbum 
                  key={album.id} 
                  album={album} 
                  onEdit={canEditThisAlbum ? handleEdit : undefined}
                  onDelete={canEditThisAlbum ? (album) => {
                    if (confirm(`¿Eliminar el álbum "${album.titulo}"?`)) {
                      deleteAlbumMutation.mutate(album.id);
                    }
                  } : undefined}
                  isAdmin={canEditThisAlbum}
                  isReadOnly={userRole === "player"}
                  onQuickUpload={canEditThisAlbum ? handleQuickUpload : undefined}
                />
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {isParentOrPlayer && <ContactCard />}
    </div>
  );
}