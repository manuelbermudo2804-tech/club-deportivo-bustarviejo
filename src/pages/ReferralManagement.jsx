import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, Gift, Shirt, Ticket, Hotel, Trophy, Search, 
  CheckCircle2, Clock, Crown, Star, Sparkles, Download,
  Eye, Award, PartyPopper
} from "lucide-react";
import { toast } from "sonner";

const TIER_CONFIG = [
  { count: 1, emoji: "🎁", label: "Bronce", color: "bg-blue-500" },
  { count: 3, emoji: "⭐", label: "Plata", color: "bg-green-500" },
  { count: 5, emoji: "🏆", label: "Oro", color: "bg-orange-500" },
  { count: 10, emoji: "👑", label: "Platino", color: "bg-purple-500" },
  { count: 15, emoji: "🏨", label: "Diamante", color: "bg-pink-500" }
];

const getTierForCount = (count) => {
  if (count >= 15) return TIER_CONFIG[4];
  if (count >= 10) return TIER_CONFIG[3];
  if (count >= 5) return TIER_CONFIG[2];
  if (count >= 3) return TIER_CONFIG[1];
  if (count >= 1) return TIER_CONFIG[0];
  return null;
};

export default function ReferralManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [claimNotes, setClaimNotes] = useState("");
  const queryClient = useQueryClient();

  // Fetch data
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: referralRewards = [], isLoading: loadingRewards } = useQuery({
    queryKey: ['referralRewards'],
    queryFn: () => base44.entities.ReferralReward.list(),
  });

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });

  // Mutation para marcar premio como entregado
  const claimRewardMutation = useMutation({
    mutationFn: async ({ oderId, data }) => {
      await base44.entities.User.update(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      toast.success("Premio marcado como entregado");
      setShowClaimDialog(false);
      setClaimNotes("");
    }
  });

  // Usuarios con referidos
  const usersWithReferrals = users
    .filter(u => (u.referrals_count || 0) > 0)
    .sort((a, b) => (b.referrals_count || 0) - (a.referrals_count || 0));

  // Filtrar por búsqueda
  const filteredUsers = usersWithReferrals.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estadísticas generales
  const totalReferrals = usersWithReferrals.reduce((sum, u) => sum + (u.referrals_count || 0), 0);
  const totalCredit = usersWithReferrals.reduce((sum, u) => sum + (u.clothing_credit_balance || 0), 0);
  const totalRaffleEntries = usersWithReferrals.reduce((sum, u) => sum + (u.raffle_entries_total || 0), 0);
  const diamondUsers = usersWithReferrals.filter(u => (u.referrals_count || 0) >= 15).length;

  // Referidos de un usuario específico
  const getUserReferrals = (email) => {
    return referralRewards.filter(r => r.referrer_email === email);
  };

  // Exportar datos
  const exportData = () => {
    const data = filteredUsers.map(u => ({
      nombre: u.full_name,
      email: u.email,
      referidos: u.referrals_count || 0,
      credito_ropa: u.clothing_credit_balance || 0,
      participaciones_sorteo: u.raffle_entries_total || 0,
      nivel: getTierForCount(u.referrals_count || 0)?.label || "Sin nivel"
    }));

    const csv = [
      ["Nombre", "Email", "Referidos", "Crédito Ropa (€)", "Participaciones Sorteo", "Nivel"],
      ...data.map(d => [d.nombre, d.email, d.referidos, d.credito_ropa, d.participaciones_sorteo, d.nivel])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `referidos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loadingUsers || loadingRewards) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Gift className="w-8 h-8 text-purple-600" />
            Gestión de Referidos
          </h1>
          <p className="text-slate-600">Controla premios y participaciones del programa de referidos</p>
        </div>
        <Button onClick={exportData} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-3xl font-bold">{usersWithReferrals.length}</p>
            <p className="text-sm opacity-80">Participantes</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4 text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-3xl font-bold">{totalReferrals}</p>
            <p className="text-sm opacity-80">Total Referidos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4 text-center">
            <Shirt className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-3xl font-bold">{totalCredit}€</p>
            <p className="text-sm opacity-80">Crédito Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4 text-center">
            <Ticket className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-3xl font-bold">{totalRaffleEntries}</p>
            <p className="text-sm opacity-80">Participaciones</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
          <CardContent className="p-4 text-center">
            <Hotel className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-3xl font-bold">{diamondUsers}</p>
            <p className="text-sm opacity-80">Nivel Diamante</p>
          </CardContent>
        </Card>
      </div>

      {/* Ranking / Lista de participantes */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Ranking de Referidos
            </CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Gift className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No hay participantes en el programa de referidos</p>
              <p className="text-sm">Los usuarios aparecerán aquí cuando refieran nuevos socios</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead className="text-center">Referidos</TableHead>
                    <TableHead className="text-center">Nivel</TableHead>
                    <TableHead className="text-center">Crédito Ropa</TableHead>
                    <TableHead className="text-center">Sorteos</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user, index) => {
                    const tier = getTierForCount(user.referrals_count || 0);
                    const isTop3 = index < 3;
                    
                    return (
                      <TableRow key={user.id} className={isTop3 ? "bg-yellow-50" : ""}>
                        <TableCell>
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-slate-900">{user.full_name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-purple-600 text-lg px-3">
                            {user.referrals_count || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {tier && (
                            <Badge className={`${tier.color} text-white`}>
                              {tier.emoji} {tier.label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-green-600">
                            {user.clothing_credit_balance || 0}€
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-orange-600">
                            {user.raffle_entries_total || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Premios del sorteo configurados */}
      {seasonConfig?.sorteo_premios && seasonConfig.sorteo_premios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Premios del Sorteo Configurados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {seasonConfig.sorteo_premios.map((prize, index) => (
                <div key={index} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 text-center border-2 border-yellow-200">
                  <span className="text-4xl block mb-2">{prize.emoji}</span>
                  <p className="font-bold text-slate-900">{prize.nombre}</p>
                  <p className="text-xs text-slate-600">{prize.descripcion}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de detalles */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className="w-5 h-5 text-purple-600" />
              Detalles de {selectedUser?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-purple-50 rounded-xl p-4 text-center border-2 border-purple-200">
                  <Users className="w-6 h-6 mx-auto mb-1 text-purple-600" />
                  <p className="text-2xl font-bold text-purple-700">{selectedUser.referrals_count || 0}</p>
                  <p className="text-xs text-purple-600">Referidos</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center border-2 border-green-200">
                  <Shirt className="w-6 h-6 mx-auto mb-1 text-green-600" />
                  <p className="text-2xl font-bold text-green-700">{selectedUser.clothing_credit_balance || 0}€</p>
                  <p className="text-xs text-green-600">Crédito Ropa</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 text-center border-2 border-orange-200">
                  <Ticket className="w-6 h-6 mx-auto mb-1 text-orange-600" />
                  <p className="text-2xl font-bold text-orange-700">{selectedUser.raffle_entries_total || 0}</p>
                  <p className="text-xs text-orange-600">Sorteos</p>
                </div>
              </div>

              {/* Niveles alcanzados */}
              <div>
                <h4 className="font-semibold mb-2">Niveles Alcanzados</h4>
                <div className="flex flex-wrap gap-2">
                  {TIER_CONFIG.map((tier) => {
                    const achieved = (selectedUser.referrals_count || 0) >= tier.count;
                    return (
                      <Badge
                        key={tier.count}
                        className={achieved ? `${tier.color} text-white` : "bg-slate-200 text-slate-500"}
                      >
                        {achieved ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                        {tier.emoji} {tier.count} - {tier.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Lista de referidos */}
              <div>
                <h4 className="font-semibold mb-2">Socios Referidos</h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {getUserReferrals(selectedUser.email).map((ref, idx) => (
                    <div key={ref.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">#{idx + 1}</span>
                        <div>
                          <p className="font-medium text-slate-900">{ref.referred_member_name}</p>
                          <p className="text-xs text-slate-500">{ref.temporada}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-green-600">+{ref.clothing_credit_earned || 0}€</p>
                        {ref.raffle_entries_earned > 0 && (
                          <p className="text-orange-600">+{ref.raffle_entries_earned} sorteo(s)</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {getUserReferrals(selectedUser.email).length === 0 && (
                    <p className="text-slate-500 text-center py-4">No hay registros detallados</p>
                  )}
                </div>
              </div>

              {/* Premio hotel si aplica */}
              {(selectedUser.referrals_count || 0) >= 15 && seasonConfig?.referidos_premio_hotel && (
                <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-xl p-4 border-2 border-pink-300 text-center">
                  <Hotel className="w-10 h-10 mx-auto mb-2 text-pink-600" />
                  <p className="font-bold text-pink-800 text-lg">🏨 ¡PREMIO HOTEL DESBLOQUEADO!</p>
                  <p className="text-sm text-pink-700">Este usuario ha ganado una noche de hotel para dos</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}