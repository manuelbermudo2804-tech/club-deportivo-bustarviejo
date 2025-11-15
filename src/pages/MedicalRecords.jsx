import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence } from "framer-motion";

import MedicalRecordForm from "../components/medical/MedicalRecordForm";
import MedicalRecordCard from "../components/medical/MedicalRecordCard";

export default function MedicalRecords() {
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const [myPlayers, setMyPlayers] = useState([]);

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await base44.auth.me();
        const adminCheck = user.role === "admin";
        setIsAdmin(adminCheck);

        if (!adminCheck) {
          const allPlayers = await base44.entities.Player.list();
          const userPlayers = allPlayers.filter(p =>
            p.email_padre === user.email || p.email_tutor_2 === user.email
          );
          setMyPlayers(userPlayers);
          setIsParent(userPlayers.length > 0);
        }
      } catch (error) {
        setIsAdmin(false);
        setIsParent(false);
      }
    };
    checkUser();
  }, []);

  const { data: medicalRecords, isLoading } = useQuery({
    queryKey: ['medicalRecords'],
    queryFn: () => base44.entities.MedicalRecord.list('-fecha_ocurrencia'),
    initialData: [],
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const createRecordMutation = useMutation({
    mutationFn: (recordData) => base44.entities.MedicalRecord.create(recordData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicalRecords'] });
      setShowForm(false);
      setEditingRecord(null);
    },
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({ id, recordData }) => base44.entities.MedicalRecord.update(id, recordData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicalRecords'] });
      setShowForm(false);
      setEditingRecord(null);
    },
  });

  const handleSubmit = async (recordData) => {
    if (editingRecord) {
      updateRecordMutation.mutate({ id: editingRecord.id, recordData });
    } else {
      createRecordMutation.mutate(recordData);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const visibleRecords = isAdmin
    ? medicalRecords
    : medicalRecords.filter(r =>
        r.visible_para_padres &&
        myPlayers.some(p => p.id === r.jugador_id)
      );

  const filteredRecords = statusFilter === "all"
    ? visibleRecords
    : visibleRecords.filter(r => r.estado === statusFilter);

  const activeCases = visibleRecords.filter(r => r.estado === "Activo").length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🏥 Seguimiento Médico</h1>
          <p className="text-slate-600 mt-1">
            {isAdmin ? "Gestión de lesiones y registros médicos" : "Información médica de tus jugadores"}
          </p>
          {activeCases > 0 && (
            <p className="text-red-600 font-semibold mt-2">⚠️ {activeCases} caso{activeCases !== 1 ? 's' : ''} activo{activeCases !== 1 ? 's' : ''}</p>
          )}
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingRecord(null);
              setShowForm(!showForm);
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Registro
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showForm && isAdmin && (
          <MedicalRecordForm
            record={editingRecord}
            players={players}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingRecord(null);
            }}
            isSubmitting={createRecordMutation.isPending || updateRecordMutation.isPending}
          />
        )}
      </AnimatePresence>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="bg-white">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="Activo">Activos</TabsTrigger>
          <TabsTrigger value="En Seguimiento">En Seguimiento</TabsTrigger>
          <TabsTrigger value="Recuperado">Recuperados</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-md">
          <div className="text-6xl mb-4">🏥</div>
          <p className="text-slate-500">No hay registros médicos</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {filteredRecords.map((record) => (
              <MedicalRecordCard
                key={record.id}
                record={record}
                onEdit={handleEdit}
                isAdmin={isAdmin}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}