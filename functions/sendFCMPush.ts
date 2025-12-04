import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Firebase Cloud Messaging para notificaciones push reales en móvil
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID");
const FIREBASE_CLIENT_EMAIL = Deno.env.get("FIREBASE_CLIENT_EMAIL");
const FIREBASE_PRIVATE_KEY = Deno.env.get("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, '\n');

// Obtener access token de Firebase
async function getFirebaseAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
    sub: FIREBASE_CLIENT_EMAIL,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: expiry,
    scope: "https://www.googleapis.com/auth/firebase.messaging"
  };

  // Crear JWT
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Importar clave privada
  const pemContents = FIREBASE_PRIVATE_KEY
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Firmar
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signatureB64}`;

  // Intercambiar JWT por access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Enviar notificación FCM
async function sendFCMNotification(accessToken, fcmToken, notification) {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: {
            title: notification.title,
            body: notification.body
          },
          webpush: {
            notification: {
              icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
              badge: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
              requireInteraction: true
            },
            fcm_options: {
              link: notification.url || "https://club-gestion-bustarviejo-1fb134d6.base44.app"
            }
          },
          data: notification.data || {}
        }
      })
    }
  );

  const result = await response.json();
  return { success: response.ok, data: result };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, body, recipientEmails, data, url } = await req.json();

    if (!title || !body) {
      return Response.json({ error: 'Title and body are required' }, { status: 400 });
    }

    // Obtener access token de Firebase
    const accessToken = await getFirebaseAccessToken();

    // Obtener usuarios con push habilitado
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    let targetUsers = allUsers;
    if (recipientEmails && recipientEmails.length > 0) {
      targetUsers = allUsers.filter(u => recipientEmails.includes(u.email));
    }

    // Filtrar usuarios con fcm_token
    const usersWithPush = targetUsers.filter(u => u.fcm_token && u.push_enabled);

    const results = {
      sent: 0,
      failed: 0,
      noToken: targetUsers.length - usersWithPush.length,
      errors: []
    };

    const notification = { title, body, url, data };

    // Enviar a cada usuario
    for (const targetUser of usersWithPush) {
      try {
        const result = await sendFCMNotification(accessToken, targetUser.fcm_token, notification);

        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({ email: targetUser.email, error: JSON.stringify(result.data) });
          
          // Si el token no es válido, limpiarlo
          if (result.data?.error?.code === 404 || result.data?.error?.code === 'UNREGISTERED') {
            await base44.asServiceRole.entities.User.update(targetUser.id, {
              fcm_token: null,
              push_enabled: false
            });
          }
        }
      } catch (err) {
        results.failed++;
        results.errors.push({ email: targetUser.email, error: err.message });
      }
    }

    // Registrar notificación
    await base44.asServiceRole.entities.PushNotification.create({
      titulo: title,
      mensaje: body,
      enviado_por: user.email,
      destinatarios: recipientEmails?.length ? `Específicos: ${recipientEmails.length}` : 'Todos',
      enviados: results.sent,
      fallidos: results.failed,
      fecha_envio: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: `Notificación enviada a ${results.sent} usuarios`,
      ...results
    });

  } catch (error) {
    console.error('FCM Push error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});