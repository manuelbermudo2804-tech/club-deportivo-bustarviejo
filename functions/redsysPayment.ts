import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import CryptoJS from 'npm:crypto-js@4.2.0';

// Configuración de Redsys
const REDSYS_URL_TEST = 'https://sis-t.redsys.es:25443/sis/realizarPago';
const REDSYS_URL_PROD = 'https://sis.redsys.es/sis/realizarPago';

// Usar entorno de pruebas por defecto hasta que se configure producción
const REDSYS_URL = REDSYS_URL_TEST;

// Función para codificar en Base64 URL-safe
function base64UrlEncode(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Función para generar la firma HMAC SHA256
function generateSignature(merchantParameters, order, secretKey) {
  // Decodificar la clave secreta de Base64
  const key = CryptoJS.enc.Base64.parse(secretKey);
  
  // Cifrar el número de pedido con 3DES
  const iv = CryptoJS.enc.Hex.parse('0000000000000000');
  const cipher = CryptoJS.TripleDES.encrypt(order, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.ZeroPadding
  });
  
  // Generar HMAC SHA256 con la clave derivada
  const hmac = CryptoJS.HmacSHA256(merchantParameters, cipher.ciphertext);
  
  return CryptoJS.enc.Base64.stringify(hmac);
}

// Función para crear los parámetros del comerciante
function createMerchantParameters(paymentData) {
  const params = {
    DS_MERCHANT_AMOUNT: Math.round(paymentData.amount * 100).toString(), // Céntimos
    DS_MERCHANT_ORDER: paymentData.orderId,
    DS_MERCHANT_MERCHANTCODE: Deno.env.get('REDSYS_MERCHANT_CODE'),
    DS_MERCHANT_CURRENCY: '978', // EUR
    DS_MERCHANT_TRANSACTIONTYPE: '0', // Autorización
    DS_MERCHANT_TERMINAL: Deno.env.get('REDSYS_TERMINAL') || '001',
    DS_MERCHANT_MERCHANTURL: paymentData.notificationUrl,
    DS_MERCHANT_URLOK: paymentData.successUrl,
    DS_MERCHANT_URLKO: paymentData.errorUrl,
    DS_MERCHANT_PRODUCTDESCRIPTION: paymentData.description,
    DS_MERCHANT_TITULAR: paymentData.titular,
  };
  
  return btoa(JSON.stringify(params));
}

// Función para verificar la firma de respuesta de Redsys
function verifySignature(merchantParameters, receivedSignature, secretKey) {
  const decodedParams = JSON.parse(atob(merchantParameters));
  const order = decodedParams.Ds_Order;
  
  const calculatedSignature = generateSignature(merchantParameters, order, secretKey);
  
  // Normalizar las firmas para comparación
  const normalizedReceived = receivedSignature.replace(/-/g, '+').replace(/_/g, '/');
  const normalizedCalculated = calculatedSignature.replace(/-/g, '+').replace(/_/g, '/');
  
  return normalizedReceived === normalizedCalculated;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Verificar configuración
    const merchantCode = Deno.env.get('REDSYS_MERCHANT_CODE');
    const secretKey = Deno.env.get('REDSYS_SECRET_KEY');
    
    if (!merchantCode || !secretKey) {
      return Response.json({ 
        error: 'Redsys no está configurado. Contacte con el administrador.',
        configured: false 
      }, { status: 503 });
    }

    // ENDPOINT: Iniciar pago
    if (req.method === 'POST' && path !== 'notification') {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'No autorizado' }, { status: 401 });
      }

      const body = await req.json();
      const { 
        amount, 
        description, 
        paymentType, // 'cuota', 'ropa', 'loteria', 'socio', 'extra'
        entityId,    // ID del Payment, ClothingOrder, etc.
        returnUrl 
      } = body;

      if (!amount || !description || !paymentType || !entityId) {
        return Response.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
      }

      // Generar ID de pedido único (12 caracteres alfanuméricos)
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderId = `${timestamp}${random}`.substring(0, 12);

      // URLs de callback
      const baseUrl = url.origin;
      const notificationUrl = `${baseUrl}/api/redsysPayment/notification`;
      const successUrl = `${returnUrl}?status=success&orderId=${orderId}`;
      const errorUrl = `${returnUrl}?status=error&orderId=${orderId}`;

      // Crear parámetros del comerciante
      const merchantParameters = createMerchantParameters({
        amount,
        orderId,
        description: description.substring(0, 125),
        titular: user.full_name || 'Cliente',
        notificationUrl,
        successUrl,
        errorUrl
      });

      // Generar firma
      const signature = generateSignature(merchantParameters, orderId, secretKey);

      // Guardar referencia del pago para la notificación
      // Creamos un registro temporal para trackear el pago
      await base44.asServiceRole.entities.Payment.create({
        jugador_id: entityId,
        jugador_nombre: description,
        tipo_pago: 'Único',
        mes: 'Redsys',
        temporada: new Date().getFullYear().toString(),
        cantidad: amount,
        estado: 'Pendiente',
        metodo_pago: 'Redsys',
        notas: JSON.stringify({
          redsys_order_id: orderId,
          payment_type: paymentType,
          entity_id: entityId,
          status: 'initiated'
        })
      });

      return Response.json({
        success: true,
        redsysUrl: REDSYS_URL,
        params: {
          Ds_SignatureVersion: 'HMAC_SHA256_V1',
          Ds_MerchantParameters: merchantParameters,
          Ds_Signature: signature
        },
        orderId
      });
    }

    // ENDPOINT: Notificación de Redsys (webhook)
    if (path === 'notification') {
      const formData = await req.formData();
      const merchantParameters = formData.get('Ds_MerchantParameters');
      const signature = formData.get('Ds_Signature');

      if (!merchantParameters || !signature) {
        return new Response('KO', { status: 400 });
      }

      // Verificar firma
      if (!verifySignature(merchantParameters, signature, secretKey)) {
        console.error('Firma de Redsys inválida');
        return new Response('KO', { status: 400 });
      }

      // Decodificar parámetros
      const params = JSON.parse(atob(merchantParameters));
      const responseCode = parseInt(params.Ds_Response, 10);
      const orderId = params.Ds_Order;
      const amount = parseInt(params.Ds_Amount, 10) / 100;

      // Buscar el pago por el orderId en las notas
      const payments = await base44.asServiceRole.entities.Payment.list();
      const payment = payments.find(p => {
        try {
          const notes = JSON.parse(p.notas || '{}');
          return notes.redsys_order_id === orderId;
        } catch {
          return false;
        }
      });

      if (payment) {
        const notes = JSON.parse(payment.notas || '{}');
        
        // Código de respuesta 0-99 = OK
        if (responseCode >= 0 && responseCode <= 99) {
          await base44.asServiceRole.entities.Payment.update(payment.id, {
            estado: 'Pagado',
            fecha_pago: new Date().toISOString().split('T')[0],
            notas: JSON.stringify({
              ...notes,
              status: 'completed',
              redsys_response: responseCode,
              redsys_auth_code: params.Ds_AuthorisationCode
            })
          });

          // Si es un pago de ropa, actualizar también ClothingOrder
          if (notes.payment_type === 'ropa') {
            try {
              await base44.asServiceRole.entities.ClothingOrder.update(notes.entity_id, {
                pagado: true,
                estado: 'Confirmado',
                fecha_pago: new Date().toISOString().split('T')[0]
              });
            } catch (e) {
              console.error('Error actualizando pedido de ropa:', e);
            }
          }

          // Si es cuota de socio
          if (notes.payment_type === 'socio') {
            try {
              await base44.asServiceRole.entities.ClubMember.update(notes.entity_id, {
                estado_pago: 'Pagado',
                metodo_pago: 'Redsys',
                fecha_pago: new Date().toISOString().split('T')[0]
              });
            } catch (e) {
              console.error('Error actualizando socio:', e);
            }
          }

          // Si es lotería
          if (notes.payment_type === 'loteria') {
            try {
              await base44.asServiceRole.entities.LotteryOrder.update(notes.entity_id, {
                pagado: true,
                fecha_pago: new Date().toISOString().split('T')[0]
              });
            } catch (e) {
              console.error('Error actualizando lotería:', e);
            }
          }

        } else {
          // Pago fallido
          await base44.asServiceRole.entities.Payment.update(payment.id, {
            notas: JSON.stringify({
              ...notes,
              status: 'failed',
              redsys_response: responseCode,
              redsys_error: getRedsysErrorMessage(responseCode)
            })
          });
        }
      }

      return new Response('OK', { status: 200 });
    }

    // ENDPOINT: Verificar estado de pago
    if (req.method === 'GET') {
      const orderId = url.searchParams.get('orderId');
      
      if (!orderId) {
        return Response.json({ error: 'Falta orderId' }, { status: 400 });
      }

      const payments = await base44.asServiceRole.entities.Payment.list();
      const payment = payments.find(p => {
        try {
          const notes = JSON.parse(p.notas || '{}');
          return notes.redsys_order_id === orderId;
        } catch {
          return false;
        }
      });

      if (!payment) {
        return Response.json({ error: 'Pago no encontrado' }, { status: 404 });
      }

      const notes = JSON.parse(payment.notas || '{}');
      
      return Response.json({
        orderId,
        status: notes.status,
        paymentStatus: payment.estado,
        amount: payment.cantidad
      });
    }

    return Response.json({ error: 'Método no permitido' }, { status: 405 });

  } catch (error) {
    console.error('Error en redsysPayment:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Función auxiliar para mensajes de error de Redsys
function getRedsysErrorMessage(code) {
  const errors = {
    101: 'Tarjeta caducada',
    102: 'Tarjeta bloqueada temporalmente',
    104: 'Operación no permitida',
    106: 'Intentos de PIN excedidos',
    116: 'Disponible insuficiente',
    118: 'Tarjeta no registrada',
    129: 'Código de seguridad incorrecto',
    180: 'Tarjeta no válida',
    184: 'Error en autenticación del titular',
    190: 'Denegación sin especificar motivo',
    191: 'Fecha de caducidad errónea',
    202: 'Tarjeta bloqueada por posible fraude',
    904: 'Comercio no registrado',
    909: 'Error de sistema',
    912: 'Emisor no disponible',
    913: 'Pedido repetido',
    944: 'Sesión incorrecta',
    950: 'Operación de devolución no permitida',
    9064: 'Número de posiciones de tarjeta incorrecto',
    9078: 'Tipo de operación no permitida',
    9093: 'Tarjeta no existe',
    9094: 'Rechazo internacional',
    9104: 'Comercio con titular seguro',
    9218: 'No se pueden realizar operaciones seguras',
    9253: 'Tarjeta no cumple check-digit',
    9256: 'Comercio no puede realizar preautorizaciones',
    9257: 'Tarjeta no permite preautorizaciones',
    9261: 'Operación detenida por superar control de fraude',
    9915: 'Cancelado por el usuario',
    9997: 'Operación en proceso',
    9998: 'Operación en espera de envío',
    9999: 'Operación enviada al SIS'
  };
  
  return errors[code] || `Error desconocido (código ${code})`;
}