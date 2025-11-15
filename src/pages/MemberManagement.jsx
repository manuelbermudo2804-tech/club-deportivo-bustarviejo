import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, UserCog, Search, Award } from "lucide-react";

import AdvancedMemberSearch from "../components/members/AdvancedMemberSearch";

export default function MemberManagement() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const user = await base44.auth.me();
      setIsAdmin(user.role === "admin");
    };
    checkAdmin();
  }, []);

  const { data: players, isLoading: loadingPlayers } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
    enabled: isAdmin,
  });

  const roleStats = isAdmin && users ? {
    admin: users.filter(u => u.role === "admin").length,
    entrenadores: users.filter(u => u.es_entrenador === true).length,
    delegados: users.filter(u => u.rol_adicional === "Delegado de Equipo").length,
    responsables_pagos: users.filter(u => u.rol_adicional === "Responsable de Pagos").length,
    padres: users.filter(u => u.role === "user" && !u.es_entrenador).length,
  } : null;

  if (loadingPlayers || (isAdmin && loadingUsers)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Gestión de Miembros</h1>
        <p className="text-slate-600 mt-1">Búsqueda avanzada y perfiles unificados</p>
      </div>

      {isAdmin && roleStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{roleStats.admin}</p>
                  <p className="text-xs text-slate-600">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Award className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{roleStats.entrenadores}</p>
                  <p className="text-xs text-slate-600">Entrenadores</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{roleStats.delegados}</p>
                  <p className="text-xs text-slate-600">Delegados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{roleStats.responsables_pagos}</p>
                  <p className="text-xs text-slate-600">Resp. Pagos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{roleStats.padres}</p>
                  <p className="text-xs text-slate-600">Padres</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <AdvancedMemberSearch players={players} users={users} />
    </div>
  );
}