# 🔔 ANÁLISIS COMPLETO - SISTEMA DE NOTIFICACIONES DE CHATS
**CD Bustarviejo - 23 Enero 2026**

---

## 📊 RESUMEN EJECUTIVO

El sistema de notificaciones tiene **3 capas independientes** que trabajan juntas:

1. **useUnifiedNotifications** - Motor central (real-time)
2. **useChatCounters** - Contadores específicos por tipo de chat
3. **Notificadores visuales/sonoros** - UI y sonidos

---

## 🏗️ ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────┐
│  CAPA 1: useUnifiedNotifications (Layout.js)           │
│  • 12-23 subscriptions real-time                        │
│  • Carga staggered (0-12s)                             │
│  • Broadcast global window.dispatchEvent()             │
│  • Fuente de verdad para badges generales              │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ├── Provee: notifications object
                  │   ├─ unreadCoordinatorMessages
                  │   ├─ unreadCoachMessages
                  │   ├─ unreadStaffMessages
                  │   ├─ pendingCallups
                  │   ├─ pendingSignatures
                  │   └─ etc.
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  CAPA 2: useChatCounters (por tipo de chat)            │
│  • Hook especializado por chat type                    │
│  • Fetch + subscription específica                     │
│  • Throttling 1-2s                                     │
│  • markRead() centralizado                             │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ├── Tipos disponibles:
                  │   ├─ useStaffCounters()
                  │   ├─ useCoachCounters()
                  │   ├─ useCoordinatorCounters()
                  │   ├─ useFamilyCounters()
                  │   ├─ usePrivateCounters()
                  │   └─ useAdminCounters()
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  CAPA 3: Notificadores UI/Sonido                       │
│  • ChatSoundNotifier - Sonidos al recibir mensaje      │
│  • PendingTasksBar - Barra superior con tareas         │
│  • NotificationCenter - Centro de notificaciones       │
│  • Badge visuales en navegación                        │
└─────────────────────────────────────────────────────────┘
```

---

## 📨 FLUJO DE NOTIFICACIÓN COMPLETO

### **EJEMPLO: Padre envía mensaje al Coordinador**

```
1. ENVÍO
   └─ ParentCoordinatorChat.js
      └─ handleSendMessage({ mensaje, adjuntos })
         └─ sendMessageMutation.mutate()
            ├─ CoordinatorMessage.create()
            ├─ CoordinatorConversation.update({ no_leidos_coordinador: +1 })
            └─ AppNotification.create({ usuario_email: coordinador })

2. DETECCIÓN (Coordinador)
   ├─ Subscription CoordinatorConversation detecta cambio
   │  └─ useUnifiedNotifications actualiza rawData
   │     └─ Calcula unreadCoordinatorForStaff++
   │        └─ Broadcast global event
   │
   ├─ Subscription CoordinatorMessage detecta mensaje nuevo
   │  └─ useChatCounters('coordinator') invalida queries
   │     └─ Refetch contador específico
   │
   └─ Subscription AppNotification detecta nueva notif
      └─ NotificationCenter muestra badge

3. NOTIFICACIÓN VISUAL/SONORA
   ├─ ChatSoundNotifier reproduce sonido
   ├─ PendingTasksBar muestra contador
   ├─ Badge en navegación se actualiza
   └─ NotificationCenter lista la notificación

4. MARCAR COMO LEÍDO (cuando coordinador abre chat)
   ├─ CoordinatorChat abre conversación
   ├─ markAsRead() actualiza mensajes
   │  ├─ CoordinatorMessage.update({ leido_coordinador: true })
   │  └─ CoordinatorConversation.update({ no_leidos_coordinador: 0 })
   ├─ AppNotification.update({ vista: true })
   └─ Todos los contadores vuelven a 0
```

---

## 🎯 NOTIFICACIONES POR TIPO DE CHAT

### 1️⃣ **COORDINATOR CHAT**

#### **Familias → Coordinador**
```javascript
// Crear notificación
await base44.entities.AppNotification.create({
  usuario_email: conversation.coordinador_email,
  titulo: `💬 Mensaje de ${user.full_name}`,
  mensaje: messageData.mensaje.substring(0, 100),
  tipo: "importante",
  icono: "💬",
  enlace: "FamilyChats",  // ← Coordinador ve "FamilyChats"
  vista: false
});

// Incrementar contador
await base44.entities.CoordinatorConversation.update(conv.id, {
  no_leidos_coordinador: (conv.no_leidos_coordinador || 0) + 1
});
```

#### **Coordinador → Familias**
```javascript
// Crear notificación
await base44.entities.AppNotification.create({
  usuario_email: conversation.padre_email,
  titulo: `🎓 Mensaje del Coordinador`,
  mensaje: messageData.mensaje.substring(0, 100),
  tipo: "importante",
  icono: "🎓",
  enlace: "ParentCoordinatorChat",  // ← Padre ve su chat
  vista: false
});

// Incrementar contador
await base44.entities.CoordinatorConversation.update(conv.id, {
  no_leidos_padre: (conv.no_leidos_padre || 0) + 1
});
```

**PROBLEMAS DETECTADOS:**
- ⚠️ Palabra "urgente" marca conversación como prioritaria pero NO cambia el tipo de notificación
- ⚠️ Filtro de palabras prohibidas crea log pero no notifica al coordinador del intento

---

### 2️⃣ **COACH CHAT**

#### **Familias → Entrenador (Grupo)**
```javascript
// ChatMessage (grupo público)
await base44.entities.ChatMessage.create({
  tipo: "padre_a_grupo",
  grupo_id: categoria,
  leido_por: []  // ← Entrenador debe agregarse aquí al leer
});

// Notificar a TODOS los entrenadores de la categoría
const coachSettings = await base44.entities.CoachSettings.filter({ 
  categorias_entrena: selectedCategory 
});

for (const coach of coachSettings) {
  await base44.entities.AppNotification.create({
    usuario_email: coach.entrenador_email,
    titulo: `💬 Mensaje en ${categoria}`,
    mensaje: `${user.full_name}: ${mensaje}`,
    tipo: "importante",
    enlace: "CoachParentChat"
  });
}
```

#### **Familias → Entrenador (1:1 privado)**
```javascript
// CoachMessage (conversación privada)
await base44.entities.CoachMessage.create({
  conversacion_id: conv.id,
  autor: "padre",
  leido_entrenador: false
});

// Incrementar contador
await base44.entities.CoachConversation.update(conv.id, {
  no_leidos_entrenador: (conv.no_leidos_entrenador || 0) + 1
});

// Notificación
await base44.entities.AppNotification.create({
  usuario_email: entrenador.email,
  titulo: `⚽ Nuevo mensaje en ${categoria}`,
  enlace: "CoachParentChat"
});
```

#### **Entrenador → Familias (Grupo)**
```javascript
// ChatMessage
await base44.entities.ChatMessage.create({
  tipo: "entrenador_a_grupo",
  grupo_id: categoria,
  leido_por: []
});

// Notificar a TODAS las familias de la categoría
const parentEmails = [...new Set(
  categoryPlayers.flatMap(p => [p.email_padre, p.email_tutor_2].filter(Boolean))
)];

for (const email of parentEmails) {
  await base44.entities.AppNotification.create({
    usuario_email: email,
    titulo: `⚽ ${categoriaCorta}: Nuevo mensaje`,
    mensaje: mensaje.substring(0, 100),
    enlace: "ParentCoachChat"
  });
}

// Guardar imágenes en galería automáticamente
if (hasImages) {
  await base44.entities.PhotoGallery.update/create({
    titulo: `📸 Chat Entrenador - ${categoria}`,
    fotos: [...existingPhotos, ...newPhotos]
  });
}
```

**PROBLEMAS DETECTADOS:**
- ⚠️ Familias reciben notificación POR CADA MENSAJE del entrenador (puede ser spam)
- ⚠️ No hay agrupación de notificaciones
- ✅ Respuestas automáticas (modo ausente + horario laboral) funcionan bien

---

### 3️⃣ **ADMIN CHAT**

#### **Familia → Admin (escalado)**
```javascript
// AdminMessage
await base44.entities.AdminMessage.create({
  conversacion_id: conv.id,
  autor: "padre",
  leido_admin: false
});

// Notificar a TODOS los admins
const allUsers = await base44.entities.User.list();
const admins = allUsers.filter(u => u.role === "admin");

for (const admin of admins) {
  await base44.entities.AppNotification.create({
    usuario_email: admin.email,
    titulo: `🚨 Respuesta en conversación crítica`,
    mensaje: `${padre}: ${mensaje}`,
    tipo: "urgente",  // ← TIPO URGENTE
    icono: "🚨",
    enlace: "AdminChat"
  });
}
```

#### **Admin → Familia**
```javascript
// AdminMessage (puede ser nota interna)
await base44.entities.AdminMessage.create({
  es_nota_interna: false,  // Si true, NO notifica
  leido_padre: false
});

if (!es_nota_interna) {
  await base44.entities.AppNotification.create({
    usuario_email: padre.email,
    titulo: `🛡️ Mensaje del Administrador`,
    tipo: "urgente",
    enlace: "ParentAdminChat"
  });
}
```

**CARACTERÍSTICAS ÚNICAS:**
- ✅ Notas internas (solo visibles para admins, no notifican)
- ✅ Tipo "urgente" en notificaciones
- ✅ Notifica a TODOS los admins simultáneamente
- ✅ Contexto de escalación guardado

---

### 4️⃣ **STAFF CHAT**

#### **Cualquier staff → Otros staff**
```javascript
// StaffMessage con destinatarios opcionales
await base44.entities.StaffMessage.create({
  autor_email: user.email,
  staff_destinatarios: ["coordinator", "coach"],  // Opcional
  leido_por: []
});

// Notificar solo a destinatarios autorizados
const staffUsers = await base44.entities.User.filter({ 
  $or: [
    { es_coordinador: true },
    { es_entrenador: true },
    { role: "admin" }
  ]
});

for (const staff of staffUsers) {
  // Filtrar por destinatarios si hay
  if (staff_destinatarios?.length > 0) {
    const esDestinatario = 
      (staff.es_coordinador && destinatarios.includes('coordinator')) ||
      (staff.es_entrenador && destinatarios.includes('coach')) ||
      (staff.role === 'admin' && destinatarios.includes('admin'));
    
    if (!esDestinatario) continue;
  }
  
  await base44.entities.AppNotification.create({
    usuario_email: staff.email,
    titulo: `💼 Nuevo mensaje Staff`,
    tipo: "importante",
    enlace: "StaffChat"
  });
}
```

**CARACTERÍSTICAS ÚNICAS:**
- ✅ Filtrado por destinatarios (coordinador/entrenador/admin)
- ✅ Todos los staff pueden leer todos los mensajes (si no hay filtro)
- ✅ Array `leido_por[]` para marcar lecturas
- ✅ No tiene contador `no_leidos_X` - usa `leido_por`

---

### 5️⃣ **SYSTEM MESSAGES (PrivateConversation)**

```javascript
// PrivateMessage (del sistema a familia)
await base44.entities.PrivateMessage.create({
  conversacion_id: conv.id,
  autor: "staff",
  mensaje: "🔔 Recordatorio: ...",
  leido_familia: false
});

// Incrementar contador
await base44.entities.PrivateConversation.update(conv.id, {
  no_leidos_familia: (conv.no_leidos_familia || 0) + 1
});

// Notificación
await base44.entities.AppNotification.create({
  usuario_email: familia.email,
  titulo: `🔔 Mensaje del Sistema`,
  tipo: "informativo",
  enlace: "ParentSystemMessages"
});
```

---

## 🔢 MECANISMOS DE CONTEO

### **Tipo 1: Campo `no_leidos_X` en Conversación**

Usado en: CoordinatorConversation, CoachConversation, AdminConversation, PrivateConversation

```javascript
// Incrementar al enviar
await Conversation.update(id, {
  no_leidos_coordinador: (conv.no_leidos_coordinador || 0) + 1
});

// Decrementar al leer
await Conversation.update(id, {
  no_leidos_coordinador: 0
});

// Obtener contador
const unread = conversation.no_leidos_coordinador || 0;
```

**VENTAJAS:**
- ✅ Rápido de consultar (1 campo)
- ✅ Fácil de resetear
- ✅ Perfecto para 1:1

**DESVENTAJAS:**
- ❌ No sabe QUIÉN leyó (solo binario)
- ❌ Difícil para grupos grandes

---

### **Tipo 2: Array `leido_por[]` en Mensaje**

Usado en: ChatMessage, StaffMessage

```javascript
// Marcar como leído
const leidoPor = message.leido_por || [];
leidoPor.push({ 
  email: user.email, 
  nombre: user.full_name, 
  fecha: new Date().toISOString() 
});
await Message.update(id, { leido_por: leidoPor });

// Contar no leídos
const unread = messages.filter(m => 
  !m.leido_por || !m.leido_por.some(lp => lp.email === user.email)
).length;

// Ver QUIÉN leyó (útil para entrenador)
const lectores = message.leido_por || [];
console.log(`${lectores.length} de ${totalPadres} familias leyeron`);
```

**VENTAJAS:**
- ✅ Perfecto para grupos (N:N)
- ✅ Sabe QUIÉN y CUÁNDO leyó cada uno
- ✅ Útil para métricas (engagement)

**DESVENTAJAS:**
- ❌ Array crece con cada lector
- ❌ Más lento de consultar

---

### **Tipo 3: Campo booleano `leido_X`**

Usado en: CoordinatorMessage, CoachMessage, AdminMessage

```javascript
// Al enviar (padre → coordinador)
await Message.create({
  leido_padre: true,      // Yo lo escribí, lo marqué leído
  leido_coordinador: false  // El otro no lo ha leído
});

// Al leer (coordinador abre chat)
await Message.update(id, {
  leido_coordinador: true,
  fecha_leido_coordinador: new Date().toISOString()
});

// Contar no leídos
const unread = messages.filter(m => 
  m.autor === 'padre' && !m.leido_coordinador
).length;
```

**VENTAJAS:**
- ✅ Simple y directo para 1:1
- ✅ Compatible con `no_leidos_X` en conversación

**DESVENTAJAS:**
- ❌ Solo funciona para 2 participantes
- ❌ Requiere actualizar CADA mensaje

---

## 🔊 NOTIFICACIONES SONORAS

### **ChatSoundNotifier.js**

```javascript
// Reproduce sonido cuando llega mensaje NUEVO (no histórico)
useEffect(() => {
  const unsub = base44.entities.CoordinatorMessage.subscribe((event) => {
    if (event.type !== 'create') return;
    if (event.data?.autor_email === user?.email) return; // No suena para mis propios mensajes
    
    // Verificar si debo sonar (según preferencias)
    const shouldNotify = checkNotificationPreferences();
    
    if (shouldNotify) {
      playSound('/sounds/message.mp3');
      showToast(`💬 Mensaje de ${event.data.autor_nombre}`);
    }
  });
  
  return unsub;
}, [user]);
```

**TIPOS DE SONIDOS:**
- `ChatSoundNotifier` - Mensajes de chat
- `CallupSoundNotifier` - Convocatorias
- `AnnouncementSoundNotifier` - Anuncios
- `PaymentSoundNotifier` - Pagos aprobados

**PROBLEMAS DETECTADOS:**
- ⚠️ Puede sonar múltiples veces si hay varias subscriptions activas
- ⚠️ No hay debounce - mensaje + actualización = 2 sonidos
- ⚠️ No respeta Do Not Disturb del dispositivo

---

## 📱 NOTIFICACIONES VISUALES

### **PendingTasksBar.js**

Barra superior que muestra tareas pendientes:

```javascript
// Se muestra si hay tareas urgentes
{(pendingCallups > 0 || pendingSignatures > 0 || ...) && (
  <div className="fixed top-0 z-50 bg-orange-500">
    {pendingCallups > 0 && (
      <Badge>🏆 {pendingCallups} convocatorias</Badge>
    )}
    {pendingSignatures > 0 && (
      <Badge>🖊️ {pendingSignatures} firmas</Badge>
    )}
  </div>
)}
```

**PRIORIDADES:**
1. 🔴 Firmas pendientes
2. 🔴 Convocatorias sin confirmar
3. 🟡 Pagos vencidos
4. 🟡 Mensajes sin leer
5. 🟢 Anuncios nuevos

---

### **NotificationCenter.js**

Centro de notificaciones (campanita):

```javascript
// Lista todas las AppNotification no vistas
const { data: notifications } = useQuery({
  queryKey: ['appNotifications'],
  queryFn: () => base44.entities.AppNotification.filter({ 
    usuario_email: user.email,
    vista: false 
  })
});

// Al hacer click en notificación
const handleClick = (notif) => {
  // 1. Marcar como vista
  await base44.entities.AppNotification.update(notif.id, { 
    vista: true 
  });
  
  // 2. Navegar al enlace
  navigate(createPageUrl(notif.enlace));
};
```

**TIPOS DE NOTIFICACIONES:**
- `urgente` - Rojo, sonido fuerte
- `importante` - Naranja, sonido normal
- `informativo` - Azul, sin sonido

---

## 📊 TABLA COMPARATIVA DE MECANISMOS

| Chat | Contador Conversación | Contador Mensaje | AppNotification | Sonido | Badge |
|------|----------------------|------------------|-----------------|--------|-------|
| **Coordinator** | `no_leidos_coordinador/padre` | `leido_coordinador/padre` | ✅ Siempre | ✅ Sí | ✅ Sí |
| **Coach (1:1)** | `no_leidos_entrenador/padre` | `leido_entrenador/padre` | ✅ Siempre | ✅ Sí | ✅ Sí |
| **Coach (grupo)** | ❌ No tiene | `leido_por[]` | ✅ Siempre | ✅ Sí | ✅ Sí |
| **Admin** | `no_leidos_admin/padre` | `leido_admin/padre` | ✅ Urgente | ✅ Fuerte | 🔴 Rojo |
| **Staff** | ❌ No tiene | `leido_por[]` | ✅ Siempre | ✅ Sí | ✅ Sí |
| **System** | `no_leidos_familia` | `leido_familia` | ✅ Info | ❌ No | ✅ Azul |

---

## 🐛 PROBLEMAS CRÍTICOS DETECTADOS

### **1. DUPLICACIÓN DE NOTIFICACIONES**

```javascript
// ❌ PROBLEMA: Se crea notificación al enviar
await AppNotification.create({ enlace: "ParentCoachChat" });

// Y luego subscription también detecta y podría notificar de nuevo
subscription.subscribe((event) => {
  if (event.type === 'create') {
    showToast("Nuevo mensaje");  // ← DUPLICADO
  }
});
```

**SOLUCIÓN:**
```javascript
// Solo notificar si NO soy el autor
if (event.data?.autor_email !== user.email) {
  showToast();
}
```

---

### **2. SOBRECARGA DE SONIDOS**

```javascript
// ❌ PROBLEMA: Múltiples notificadores escuchando lo mismo
ChatSoundNotifier listens to CoordinatorMessage
+ useUnifiedNotifications listens to CoordinatorMessage
+ useChatCounters listens to CoordinatorMessage
= 3 subscriptions al mismo evento
```

**SOLUCIÓN:**
```javascript
// Centralizar en 1 solo notificador
// Otros solo actualizan datos, no suenan
```

---

### **3. SPAM DE NOTIFICACIONES A FAMILIAS**

```javascript
// ❌ PROBLEMA: Entrenador envía 1 mensaje
// Sistema crea 20 AppNotifications (1 por familia)
for (const email of 20_familias) {
  await AppNotification.create({ usuario_email: email });
}
// 20 inserts en BD en serie
```

**SOLUCIÓN PROPUESTA:**
```javascript
// Batch create
await base44.entities.AppNotification.bulkCreate(
  familias.map(email => ({ usuario_email: email, ... }))
);
```

---

### **4. FALTA DE PRIORIZACIÓN**

```javascript
// ❌ TODAS las notificaciones tienen igual peso
notifications.sort((a, b) => 
  new Date(b.created_date) - new Date(a.created_date)
);
// Firma urgente aparece igual que anuncio de galería
```

**SOLUCIÓN PROPUESTA:**
```javascript
// Ordenar por tipo + fecha
const PRIORITY = { urgente: 1, importante: 2, informativo: 3 };
notifications.sort((a, b) => {
  if (PRIORITY[a.tipo] !== PRIORITY[b.tipo]) {
    return PRIORITY[a.tipo] - PRIORITY[b.tipo];
  }
  return new Date(b.created_date) - new Date(a.created_date);
});
```

---

### **5. NO HAY AGRUPACIÓN**

```javascript
// ❌ PROBLEMA: Entrenador envía 5 mensajes
// Familia ve: 5 notificaciones separadas
// Debería ver: "⚽ 5 mensajes nuevos en Cadete"
```

**SOLUCIÓN PROPUESTA:**
```javascript
// Agrupar por enlace + autor
const grouped = notifications.reduce((acc, notif) => {
  const key = `${notif.enlace}_${notif.autor}`;
  if (!acc[key]) acc[key] = { ...notif, count: 1 };
  else acc[key].count++;
  return acc;
}, {});
```

---

## 🎨 CASOS DE USO POR ROL

### **👨‍👩‍👧 FAMILIA (Padre/Tutor)**

**Notificaciones que recibe:**
- 💬 Mensajes del Coordinador
- ⚽ Mensajes del Entrenador (grupo)
- 🏆 Convocatorias nuevas
- 🖊️ Firmas pendientes
- 💳 Recordatorios de pago
- 📢 Anuncios del club
- 🔔 Mensajes del sistema
- 🛡️ Respuestas del Admin (si escalado)

**Badges que ve:**
- Chat Coordinador: `unreadCoordinatorMessages`
- Chat Entrenador: `unreadCoachMessages`
- Chat Admin: visible solo si `hasActiveAdminConversation`
- Convocatorias: `pendingCallups`
- Firmas: `pendingSignatures`

**Prioridad de notificaciones:**
1. 🔴 Firmas federación (urgente, legal)
2. 🔴 Convocatorias próximas (<48h)
3. 🟡 Mensajes del coordinador
4. 🟡 Pagos vencidos
5. 🟢 Mensajes del entrenador
6. 🟢 Anuncios

---

### **🎓 COORDINADOR**

**Notificaciones que recibe:**
- 💬 Mensajes de familias (múltiples conversaciones)
- 💼 Mensajes del Staff
- ⚠️ Escalaciones desde entrenadores
- 🏆 Convocatorias (si es entrenador también)
- 📊 Observaciones de partidos pendientes

**Badges que ve:**
- Familias: `unreadCoordinatorForStaff`
- Chat Staff: `unreadStaffMessages`
- Convocatorias: `pendingCallupResponses`
- Observaciones: `pendingMatchObservations`

**Prioridad:**
1. 🔴 Conversaciones prioritarias (palabra urgente)
2. 🔴 Escalaciones desde entrenadores
3. 🟡 Mensajes nuevos de familias
4. 🟡 Observaciones pendientes
5. 🟢 Staff interno

---

### **🏃 ENTRENADOR**

**Notificaciones que recibe:**
- 💬 Mensajes de familias (grupo + individuales)
- 💼 Mensajes del Staff
- 🏆 Respuestas a convocatorias
- 📊 Recordatorios de observaciones

**Badges que ve:**
- Familias: `unreadCoachForStaff` (suma grupo + individuales)
- Chat Staff: `unreadStaffMessages`
- Convocatorias: `pendingCallupResponses`
- Observaciones: `pendingMatchObservations`

**Detalle contador familias:**
```javascript
// Suma de:
unreadCoachForStaff = 
  mensajesGrupoNoLeidos + conversacionesPrivadasNoLeidas;

// Mensajes grupo
ChatMessage.filter({ 
  tipo: 'padre_a_grupo',
  grupo_id: miCategoria,
  leido_por: { $not: { $elemMatch: { email: miEmail } } }
});

// + Conversaciones privadas
CoachConversation.filter({ 
  entrenador_email: miEmail,
  no_leidos_entrenador: { $gt: 0 }
});
```

---

### **🛡️ ADMINISTRADOR**

**Notificaciones que recibe:**
- 🚨 Escalaciones críticas (prioridad máxima)
- 💼 Mensajes del Staff
- 💳 Pagos en revisión
- 👥 Jugadores requieren revisión
- 📧 Solicitudes de invitación
- 🛍️ Pedidos pendientes
- 🎫 Solicitudes de socio
- Y TODAS las demás...

**Badges que ve:**
- Críticas: `unresolvedAdminChats`
- Staff: `unreadStaffMessages`
- Pagos: `paymentsInReview`
- Jugadores: `playersNeedingReview`
- Invitaciones: `pendingInvitations`
- Pedidos ropa: `pendingClothingOrders`
- Lotería: `pendingLotteryOrders`
- Socios: `pendingMemberRequests`

**PROBLEMA:**
- ❌ Admin recibe DEMASIADAS notificaciones
- ❌ Difícil separar urgente de normal
- ❌ Badge "Staff Chat" siempre visible aunque no haya mensajes

---

## ⚡ OPTIMIZACIONES APLICADAS

### **1. Lazy Loading Condicional**
```javascript
// ANTES: Todos cargan todo
loadCoordinatorConversations();
loadCoachConversations();
loadStaffMessages();

// DESPUÉS: Solo cargar lo necesario
const shouldLoadCoord = user.es_coordinador || esFamiliaNormal;
const shouldLoadCoach = user.es_entrenador || tieneJugadores;
const shouldLoadStaff = esStaff;

if (shouldLoadCoord) loadCoordinatorConversations();
if (shouldLoadCoach) loadCoachConversations();
if (shouldLoadStaff) loadStaffMessages();
```

**REDUCCIÓN:** ~40% menos queries iniciales

---

### **2. Throttling en Subscriptions**
```javascript
// Evitar updates cada milisegundo
let lastUpdate = 0;
subscription.subscribe((event) => {
  const now = Date.now();
  if (now - lastUpdate < 1000) return;  // Max 1 update/segundo
  lastUpdate = now;
  // ... procesar
});
```

---

### **3. Batching de Updates**
```javascript
// Agrupar updates en 250ms
let queue = [];
let timer = null;

subscription.subscribe((event) => {
  queue.push(event);
  if (!timer) {
    timer = setTimeout(() => {
      processQueue(queue);
      queue = [];
      timer = null;
    }, 250);
  }
});
```

---

### **4. Staggered Loading**
```javascript
// No cargar todo a la vez
setTimeout(() => loadCoordinator(), 100);
setTimeout(() => loadCoach(), 300);
setTimeout(() => loadStaff(), 3500);
setTimeout(() => loadPayments(), 8500);
// ... spread en 12 segundos
```

---

## 📈 MÉTRICAS DE RENDIMIENTO

### **ANTES de optimización:**
```
🔴 QUERIES INICIALES: 23 (0-12s)
🔴 SUBSCRIPTIONS: 17 activas simultáneas
🔴 POLLING: 180 llamadas/min (×3 queries @2s)
🔴 TOTAL: ~230-280 llamadas/min
```

### **DESPUÉS de optimización:**
```
✅ QUERIES INICIALES: 12-15 (lazy por rol)
✅ SUBSCRIPTIONS: 12-15 (solo necesarias)
✅ POLLING: ELIMINADO (solo subscriptions)
✅ TOTAL: ~70-120 llamadas/min

📉 REDUCCIÓN: 60% menos tráfico
```

---

## 🎯 RECOMENDACIONES FINALES

### **ALTA PRIORIDAD** 🔴
1. ✅ **Eliminar polling redundante** - Solo usar subscriptions
2. ⏳ **Agrupar notificaciones** - "5 mensajes nuevos" en vez de 5 separadas
3. ⏳ **Debounce en sonidos** - Max 1 sonido cada 3s
4. ⏳ **Priorizar por tipo** - Urgente primero

### **MEDIA PRIORIDAD** 🟡
5. ⏳ **Batch creates** - bulkCreate para notificaciones masivas
6. ⏳ **Smart badges** - Ocultar badge si 0 para admin
7. ⏳ **Do Not Disturb** - Respetar silencio del dispositivo
8. ⏳ **Cleanup automático** - Borrar notifs >30 días

### **BAJA PRIORIDAD** 🟢
9. ⏳ **Push notifications** - Web Push API
10. ⏳ **Email digest** - Resumen diario por email
11. ⏳ **Analytics** - Métricas de engagement
12. ⏳ **A/B testing** - Optimal notification frequency

---

## 🔍 DEBUGGING Y TESTING

### **Ver estado global:**
```javascript
// En consola del navegador
console.log(window.__BASE44_UNIFIED_NOTIFICATIONS_STATE);
```

### **Forzar recalculo:**
```javascript
window.dispatchEvent(new CustomEvent('b44_unified_notifications_updated'));
```

### **Ver subscriptions activas:**
```javascript
// Contar cuántas subscriptions hay
let count = 0;
const original = base44.entities.ChatMessage.subscribe;
base44.entities.ChatMessage.subscribe = (...args) => {
  count++;
  console.log(`📡 Subscription ${count} creada`);
  return original(...args);
};
```

---

## ✅ CONCLUSIÓN

**ESTADO ACTUAL:** Sistema robusto y funcional con notificaciones real-time

**FORTALEZAS:**
- ✅ Real-time en todos los chats
- ✅ Múltiples mecanismos de conteo (adaptados a cada caso)
- ✅ Notificaciones visuales + sonoras
- ✅ Respuestas automáticas (modo ausente, horario)

**DEBILIDADES:**
- ⚠️ Posible spam de notificaciones
- ⚠️ No hay agrupación
- ⚠️ Admin recibe demasiadas

**PRÓXIMOS PASOS:**
1. Implementar agrupación de notificaciones
2. Añadir debounce a sonidos
3. Smart badges para admin
4. Push notifications nativas

---

*Análisis generado: 23/01/2026 - CD Bustarviejo*