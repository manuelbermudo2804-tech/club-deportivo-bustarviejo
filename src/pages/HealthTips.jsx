import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import HealthTipForm from "../components/health/HealthTipForm";
import HealthTipCard from "../components/health/HealthTipCard";
import ContactCard from "../components/ContactCard";

export default function HealthTips() {
  const [showForm, setShowForm] = useState(false);
  const [editingTip, setEditingTip] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      setIsAdmin(currentUser.role === "admin");
      return currentUser;
    },
  });

  const { data: tips, isLoading } = useQuery({
    queryKey: ['healthTips'],
    queryFn: () => base44.entities.HealthTip.list('-created_date'),
    initialData: [],
  });

  const createTipMutation = useMutation({
    mutationFn: (tipData) => base44.entities.HealthTip.create(tipData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthTips'] });
      setShowForm(false);
      setEditingTip(null);
    },
  });

  const updateTipMutation = useMutation({
    mutationFn: ({ id, tipData }) => base44.entities.HealthTip.update(id, tipData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthTips'] });
      setShowForm(false);
      setEditingTip(null);
    },
  });

  const handleSubmit = async (tipData) => {
    if (editingTip) {
      updateTipMutation.mutate({ id: editingTip.id, tipData });
    } else {
      createTipMutation.mutate(tipData);
    }
  };

  const handleEdit = (tip) => {
    setEditingTip(tip);
    setShowForm(true);
  };

  const visibleTips = isAdmin ? tips : tips.filter(t => t.publicado);

  const filteredTips = visibleTips.filter(tip => {
    const matchesSearch = tip.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tip.contenido?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || tip.categoria === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Separar destacados
  const featuredTips = filteredTips.filter(t => t.destacado);
  const regularTips = filteredTips.filter(t => !t.destacado);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🍎 Consejos de Salud</h1>
          <p className="text-slate-600 mt-1">Nutrición, ejercicios y bienestar deportivo</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingTip(null);
              setShowForm(!showForm);
            }}
            className="bg-orange-600 hover:bg-orange-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Consejo
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <HealthTipForm
            tip={editingTip}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingTip(null);
            }}
            isSubmitting={createTipMutation.isPending || updateTipMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Filtros */}
      <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="Nutrición">🥗 Nutrición</TabsTrigger>
          <TabsTrigger value="Ejercicios">💪 Ejercicios</TabsTrigger>
          <TabsTrigger value="Hidratación">💧 Hidratación</TabsTrigger>
          <TabsTrigger value="Descanso">😴 Descanso</TabsTrigger>
          <TabsTrigger value="Pre-partido">⚽ Pre-partido</TabsTrigger>
          <TabsTrigger value="Post-partido">🏁 Post-partido</TabsTrigger>
          <TabsTrigger value="Lesiones">🏥 Lesiones</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Buscar consejo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white shadow-sm"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : (
        <>
          {/* Consejos Destacados */}
          {featuredTips.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                ⭐ Destacados
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {featuredTips.map((tip) => (
                    <HealthTipCard 
                      key={tip.id} 
                      tip={tip} 
                      onEdit={isAdmin ? handleEdit : null}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Consejos Regulares */}
          {regularTips.length > 0 && (
            <div className="space-y-4">
              {featuredTips.length > 0 && (
                <h2 className="text-2xl font-bold text-slate-900">Más Consejos</h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {regularTips.map((tip) => (
                    <HealthTipCard 
                      key={tip.id} 
                      tip={tip} 
                      onEdit={isAdmin ? handleEdit : null}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {filteredTips.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No se encontraron consejos</p>
            </div>
          )}
        </>
      )}

      <ContactCard />
    </div>
  );
}