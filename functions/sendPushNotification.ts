import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Firebase Admin SDK para enviar push notifications
async function getFirebaseAccessToken() {
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
  const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY").replace(/\\n/g, '\n');
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");

  // Crear JWT para autenticación con Firebase
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging"
  };

  // Encode header and payload
  const encoder = new TextEncoder();
  const base64url = (str) => btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signatureInput = `${headerB64}.${payloadB64}`;

  // Sign with private key
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = base64url(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${signatureInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function sendFCMMessage(accessToken, fcmToken, title, body, data = {}) {
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  
  const message = {
    message: {
      token: fcmToken,
      notification: {
        title: title,
        body: body
      },
      webpush: {
        notification: {
          icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
          badge: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
          vibrate: [200, 100, 200],
          requireInteraction: true
        },
        fcm_options: {
          link: data.url || "https://club-gestion-bustarviejo-1fb134d6.base44.app"
        }
      },
      data: data
    }
  };

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message)
    }
  );

  const result = await response.json();
  return { success: response.ok, result };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, body, recipientEmails, data } = await req.json();

    if (!title || !body) {
      return Response.json({ error: 'Title and body are required' }, { status: 400 });
    }

    // Obtener access token de Firebase
    const accessToken = await getFirebaseAccessToken();
    
    if (!accessToken) {
      return Response.json({ error: 'Failed to get Firebase access token' }, { status: 500 });
    }

    // Obtener usuarios con FCM tokens
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    let targetUsers = allUsers;
    if (recipientEmails && recipientEmails.length > 0) {
      targetUsers = allUsers.filter(u => recipientEmails.includes(u.email));
    }

    // Filtrar usuarios con FCM token válido
    const usersWithTokens = targetUsers.filter(u => u.fcm_token);

    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    // Enviar a cada usuario
    for (const targetUser of usersWithTokens) {
      try {
        const result = await sendFCMMessage(
          accessToken,
          targetUser.fcm_token,
          title,
          body,
          data || {}
        );

        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({ email: targetUser.email, error: result.result });
          
          // Si el token es inválido, limpiarlo
          if (result.result?.error?.code === 404 || 
              result.result?.error?.details?.some(d => d.errorCode === 'UNREGISTERED')) {
            await base44.asServiceRole.entities.User.update(targetUser.id, {
              fcm_token: null
            });
          }
        }
      } catch (err) {
        results.failed++;
        results.errors.push({ email: targetUser.email, error: err.message });
      }
    }

    return Response.json({
      success: true,
      totalTargeted: targetUsers.length,
      withTokens: usersWithTokens.length,
      ...results
    });

  } catch (error) {
    console.error('Push notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});