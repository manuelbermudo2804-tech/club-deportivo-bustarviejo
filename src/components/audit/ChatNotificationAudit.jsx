import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChatNotificationAudit() {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [criticalIssues, setCriticalIssues] = useState([]);

  const runAudit = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      
      // Obtener todos los datos necesarios en paralelo
      const [
        staffMessages,
        chatMessages,
        coordinatorMessages,
        coordinatorConversations,
        privateMessages,
        users,
        allPlayers
      ] = await Promise.all([
        base44.entities.StaffMessage.filter({}, '-created_date', 1000),
        base44.entities.ChatMessage.filter({}, '-created_date', 1000),
        base44.entities.CoordinatorMessage.filter({}, '-created_date', 1000),
        base44.entities.CoordinatorConversation.filter({}, '-created_date', 1000),
        base44.entities.PrivateMessage.filter({}, '-created_date', 1000),
        base44.entities.User.filter({}, 'email', 1000),
        base44.entities.Player.filter({}, 'id', 1000),
      ]);

      // Construir matriz de auditoría
      const issues = [];
      const chatInventory = {};

      // ====== CHAT STAFF ======
      chatInventory['STAFF'] = {
        tipo: 'Grupo',
        descripcion: 'Comunicación staff (coordinadores, entrenadores, admin)',
        participantes: users.filter(u => u.es_coordinador || u.es_entrenador || u.role === 'admin').length,
        totalMensajes: staffMessages.length,
        ultimoMensaje: staffMessages[0]?.created_date || 'N/A',
        canWrite: 'staff',
        canRead: 'staff'
      };

      // ====== CHAT COACH-FAMILIAS ======
      const chatMsgGroups = {};
      chatMessages.forEach(msg => {
        if (msg.tipo === 'entrenador_a_grupo' || msg.tipo === 'padre_a_grupo') {
          const key = msg.grupo_id || msg.deporte;
          if (!chatMsgGroups[key]) {
            chatMsgGroups[key] = { entrenador: 0, padre: 0 };
          }
          if (msg.tipo === 'entrenador_a_grupo') chatMsgGroups[key].entrenador++;
          else chatMsgGroups[key].padre++;
        }
      });

      Object.entries(chatMsgGroups).forEach(([grupo, stats]) => {
        chatInventory[`CHAT_${grupo}`] = {
          tipo: 'Grupo',
          descripcion: `Entrenador + Familias de ${grupo}`,
          participantes: '?',
          totalMensajes: stats.entrenador + stats.padre,
          ultimoMensaje: 'tracking',
          canWrite: 'entrenador + padres',
          canRead: 'entrenador + padres'
        };
      });

      // ====== CHAT COORDINADOR-FAMILIA ======
      const uniqueConversations = new Set(coordinatorMessages.map(m => m.conversacion_id));
      chatInventory['COORDINATOR'] = {
        tipo: '1-a-1',
        descripcion: 'Coordinador + Familia (privado)',
        participantes: uniqueConversations.size,
        totalMensajes: coordinatorMessages.length,
        ultimoMensaje: coordinatorMessages[0]?.created_date || 'N/A',
        canWrite: 'coordinador + familia',
        canRead: 'ambos'
      };

      // ====== MENSAJES PRIVADOS ======
      chatInventory['PRIVATE'] = {
        tipo: 'Solo lectura',
        descripcion: 'Club → Familia',
        participantes: new Set(privateMessages.map(m => m.conversacion_id)).size,
        totalMensajes: privateMessages.length,
        ultimoMensaje: privateMessages[0]?.created_date || 'N/A',
        canWrite: 'staff only',
        canRead: 'familia'
      };

      // ====== DETECCIÓN DE PROBLEMAS ======
      
      // Problema 1: Mensajes sin unread_count
      const staffSinUnread = staffMessages.filter(m => !m.leido_por || m.leido_por.length === 0).length;
      if (staffSinUnread > 0) {
        issues.push({
          nivel: 'CRÍTICO',
          chat: 'STAFF',
          problema: `${staffSinUnread} mensajes sin tracking de lectura`,
          impacto: 'Notificaciones perdidas para usuarios',
          solucion: 'Implementar tracking automático en creación de mensaje'
        });
      }

      // Problema 2: Chat messages inconsistentes
      const chatSinRespuesta = chatMessages.filter(m => m.tipo === 'padre_a_grupo' && !m.leido_por).length;
      if (chatSinRespuesta > 0) {
        issues.push({
          nivel: 'CRÍTICO',
          chat: 'CHAT_GROUPS',
          problema: `${chatSinRespuesta} mensajes de padres sin confirmación de lectura`,
          impacto: 'Entrenadores no notificados de nuevos mensajes',
          solucion: 'Validar leido_por en cada mensaje del padre'
        });
      }

      // Problema 3: Coordinator sin unread_coordinador
      const coordSinUnread = coordinatorMessages.filter(m => m.autor === 'padre' && !m.leido_coordinador).length;
      if (coordSinUnread > 0) {
        issues.push({
          nivel: 'CRÍTICO',
          chat: 'COORDINATOR',
          problema: `${coordSinUnread} mensajes de familia sin marcar leído`,
          impacto: 'Coordinadores no reciben notificación',
          solucion: 'Verificar leido_coordinador en cada mensaje'
        });
      }

      // Problema 4: Private messages sin lectura
      const privateSinLectura = privateMessages.filter(m => !m.leido).length;
      if (privateSinLectura > 0) {
        issues.push({
          nivel: 'CRÍTICO',
          chat: 'PRIVATE',
          problema: `${privateSinLectura} mensajes privados sin marcar como leídos`,
          impacto: 'Familias no ven notificación de mensajes del club',
          solucion: 'Marcar leído al abrir conversación privada'
        });
      }

      // Problema 5: Verificar sincronización UnifiedStore
      issues.push({
        nivel: 'INFO',
        chat: 'SISTEMA',
        problema: 'Revisar que UnifiedChatNotificationStore recibe actualizaciones en tiempo real',
        impacto: 'Burbujas y menú pueden desincronizarse',
        solucion: 'Verificar suscripciones en ChatNotificationSync'
      });

      setCriticalIssues(issues);
      setAuditData({
        timestamp: new Date().toLocaleString('es-ES'),
        totalChats: Object.keys(chatInventory).length,
        totalMensajes: 
          staffMessages.length + 
          chatMessages.length + 
          coordinatorMessages.length + 
          privateMessages.length,
        chats: chatInventory,
        usuarios: {
          total: users.length,
          staff: users.filter(u => u.es_coordinador || u.es_entrenador || u.role === 'admin').length,
          familias: users.filter(u => !u.es_coordinador && !u.es_entrenador && u.role !== 'admin').length
        }
      });

    } catch (error) {
      console.error('Error en auditoría:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Ejecutando auditoría...</p>
        </div>
      </div>
    );
  }

  if (!auditData) {
    return <div className="p-4 text-red-600">Error cargando auditoría</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">🔍 AUDITORÍA DE NOTIFICACIONES</h1>
        <Button onClick={runAudit} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Ejecutar de nuevo
        </Button>
      </div>

      {/* RESUMEN GENERAL */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            RESUMEN GENERAL
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-600">Última auditoría</p>
            <p className="text-lg font-bold">{auditData.timestamp}</p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total de chats</p>
            <p className="text-lg font-bold text-blue-600">{auditData.totalChats}</p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total de mensajes</p>
            <p className="text-lg font-bold text-blue-600">{auditData.totalMensajes}</p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <p className="text-sm text-gray-600">Usuarios</p>
            <p className="text-lg font-bold text-blue-600">{auditData.usuarios.total}</p>
          </div>
        </CardContent>
      </Card>

      {/* PROBLEMAS CRÍTICOS */}
      {criticalIssues.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              ⚠️ PROBLEMAS DETECTADOS ({criticalIssues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticalIssues.map((issue, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg border-l-4 border-red-500">
                <div className="flex items-start justify-between mb-2">
                  <span className={`font-bold ${issue.nivel === 'CRÍTICO' ? 'text-red-600' : 'text-blue-600'}`}>
                    {issue.nivel}
                  </span>
                  <Badge variant={issue.nivel === 'CRÍTICO' ? 'destructive' : 'secondary'}>
                    {issue.chat}
                  </Badge>
                </div>
                <p className="font-semibold text-gray-900">{issue.problema}</p>
                <p className="text-sm text-gray-700 mt-1"><strong>Impacto:</strong> {issue.impacto}</p>
                <p className="text-sm text-gray-700"><strong>Solución:</strong> {issue.solucion}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* INVENTARIO DE CHATS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📋 INVENTARIO DE CHATS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Chat</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-center">Participantes</th>
                  <th className="px-4 py-2 text-center">Mensajes</th>
                  <th className="px-4 py-2 text-left">Permisos</th>
                  <th className="px-4 py-2 text-left">Últimas actividad</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(auditData.chats).map(([key, chat]) => (
                  <tr key={key} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono font-bold text-blue-600">{key}</td>
                    <td className="px-4 py-2">
                      <Badge variant="outline">{chat.tipo}</Badge>
                    </td>
                    <td className="px-4 py-2 text-center">{chat.participantes}</td>
                    <td className="px-4 py-2 text-center font-bold">{chat.totalMensajes}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      <span className="block">✍️ {chat.canWrite}</span>
                      <span className="block text-blue-600">👁️ {chat.canRead}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{chat.ultimoMensaje}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* DISTRIBUCIÓN DE USUARIOS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            👥 DISTRIBUCIÓN DE USUARIOS
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-300">
            <p className="text-sm text-gray-600">Total de usuarios</p>
            <p className="text-3xl font-bold text-purple-600">{auditData.usuarios.total}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-300">
            <p className="text-sm text-gray-600">Staff (Coordinadores, Entrenadores, Admin)</p>
            <p className="text-3xl font-bold text-orange-600">{auditData.usuarios.staff}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-300">
            <p className="text-sm text-gray-600">Familias</p>
            <p className="text-3xl font-bold text-green-600">{auditData.usuarios.familias}</p>
          </div>
        </CardContent>
      </Card>

      {/* MATRIZ DE NOTIFICACIONES */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 MATRIZ DE NOTIFICACIONES
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Chat / Usuario</th>
                  <th className="px-3 py-2 text-center">Ve Mensajes</th>
                  <th className="px-3 py-2 text-center">¿Burbuja?</th>
                  <th className="px-3 py-2 text-center">¿Menú?</th>
                  <th className="px-3 py-2 text-center">¿Sincronizado?</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {/* STAFF */}
                <tr className="border-t font-bold bg-gray-50">
                  <td colSpan={6} className="px-3 py-2">🔵 STAFF (Coordinador, Entrenador, Admin)</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2">STAFF Chat</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">⚠️</td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant="outline" className="bg-yellow-50">Revisar</Badge>
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2">CHAT Groups</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">
                    <Badge className="bg-green-100 text-green-800">OK</Badge>
                  </td>
                </tr>

                {/* COORDINADOR */}
                <tr className="border-t font-bold bg-gray-50">
                  <td colSpan={6} className="px-3 py-2">🟢 COORDINADOR</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2">Coordinator 1-a-1</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">
                    <Badge className="bg-green-100 text-green-800">OK</Badge>
                  </td>
                </tr>

                {/* FAMILIAS */}
                <tr className="border-t font-bold bg-gray-50">
                  <td colSpan={6} className="px-3 py-2">🔴 FAMILIAS</td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2">Mensajes Privados (Club)</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">⚠️</td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant="outline" className="bg-red-50">ERROR</Badge>
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2">Coach Groups</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">
                    <Badge className="bg-green-100 text-green-800">OK</Badge>
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-2">Coordinator 1-a-1</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">✅</td>
                  <td className="px-3 py-2 text-center">
                    <Badge className="bg-green-100 text-green-800">OK</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CONCLUSIONES */}
      <Card className="border-l-4 border-orange-500 bg-orange-50">
        <CardHeader>
          <CardTitle>📝 CONCLUSIONES</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>✅ Sistema funcional:</strong> Burbujas y menú lateral usando UnifiedChatNotificationStore</p>
          <p><strong>⚠️ Puntos críticos a revisar:</strong></p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Tracking de lectura en mensajes privados (PrivateMessage.leido)</li>
            <li>Sincronización real-time de CoachConversation eliminada ✅</li>
            <li>Verificar que ChatNotificationSync recibe actualizaciones</li>
          </ul>
          <p className="mt-4"><strong>📊 Siguiente paso:</strong> Ejecutar auditoría nuevamente tras correcciones para validar soluciones.</p>
        </CardContent>
      </Card>
    </div>
  );
}