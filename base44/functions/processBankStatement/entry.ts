import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || (user.role !== 'admin' && !user.es_tesorero)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { file_url, temporada } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url requerido' }, { status: 400 });
    }

    // Extraer transacciones del extracto bancario (CSV/Excel/PDF)
    const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          transacciones: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fecha: { type: "string", description: "Fecha de la transacción (formato: DD/MM/YYYY o YYYY-MM-DD)" },
                concepto: { type: "string", description: "Descripción/concepto de la transacción" },
                importe: { type: "number", description: "Importe (positivo para ingresos, negativo para gastos)" },
                saldo: { type: "number", description: "Saldo después de la transacción (opcional)" }
              }
            }
          }
        }
      }
    });

    if (extractResult.status !== 'success' || !extractResult.output?.transacciones) {
      return Response.json({ 
        error: 'No se pudieron extraer transacciones del archivo',
        details: extractResult.details 
      }, { status: 400 });
    }

    const transacciones = extractResult.output.transacciones;

    // Obtener datos para categorización inteligente
    const [payments, players, clothingOrders, lotteryOrders] = await Promise.all([
      base44.asServiceRole.entities.Payment.filter({ temporada }),
      base44.asServiceRole.entities.Player.list(),
      base44.asServiceRole.entities.ClothingOrder.filter({ temporada }),
      base44.asServiceRole.entities.LotteryOrder.filter({ temporada })
    ]);

    // Categorizar cada transacción con IA
    const categorizadas = [];
    
    for (const tx of transacciones) {
      const concepto = (tx.concepto || '').toLowerCase();
      const importe = tx.importe || 0;
      const esIngreso = importe > 0;

      let categoria = null;
      let sugerencia = null;
      let confianza = 0;
      let entidadVinculada = null;

      // 1. Buscar coincidencias exactas con jugadores (nombres, apellidos, DNI)
      if (esIngreso) {
        for (const player of players) {
          const nombreCompleto = (player.nombre || '').toLowerCase();
          const apellidos = nombreCompleto.split(' ').slice(1).join(' ');
          const dni = (player.dni_jugador || '').toLowerCase();
          
          if (concepto.includes(nombreCompleto) || 
              (apellidos && concepto.includes(apellidos)) ||
              (dni && concepto.includes(dni))) {
            
            // Buscar pagos pendientes de este jugador
            const pagosPendientes = payments.filter(p => 
              p.jugador_id === player.id && 
              (p.estado === 'Pendiente' || p.estado === 'En revisión')
            );
            
            if (pagosPendientes.length > 0) {
              const pago = pagosPendientes[0];
              categoria = 'Cuota Jugador';
              sugerencia = `Cuota ${pago.mes} - ${player.nombre}`;
              confianza = 95;
              entidadVinculada = {
                tipo: 'Payment',
                id: pago.id,
                jugador_id: player.id
              };
              break;
            }
          }
        }
      }

      // 2. Búsqueda por conceptos clave
      if (!categoria) {
        const keywords = {
          'cuota': { cat: 'Cuota Jugador', conf: 70 },
          'inscripcion': { cat: 'Cuota Jugador', conf: 70 },
          'ropa': { cat: 'Pedido Ropa', conf: 80 },
          'equipacion': { cat: 'Pedido Ropa', conf: 80 },
          'loteria': { cat: 'Lotería', conf: 90 },
          'socio': { cat: 'Cuota Socio', conf: 85 },
          'nomina': { cat: 'Gasto Personal', conf: 90 },
          'entrenador': { cat: 'Gasto Personal', conf: 85 },
          'federacion': { cat: 'Gasto Federación', conf: 90 },
          'arbitro': { cat: 'Gasto Arbitraje', conf: 90 },
          'material': { cat: 'Gasto Material', conf: 75 },
          'luz': { cat: 'Gasto Suministros', conf: 85 },
          'agua': { cat: 'Gasto Suministros', conf: 85 },
          'seguro': { cat: 'Gasto Seguros', conf: 90 }
        };

        for (const [word, data] of Object.entries(keywords)) {
          if (concepto.includes(word)) {
            categoria = data.cat;
            confianza = data.conf;
            sugerencia = categoria;
            break;
          }
        }
      }

      // 3. Si no encuentra nada, usar IA para categorización avanzada
      if (!categoria || confianza < 60) {
        try {
          const aiResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Analiza esta transacción bancaria y categorízala:
Concepto: "${tx.concepto}"
Importe: ${tx.importe}€
Es ${esIngreso ? 'INGRESO' : 'GASTO'}

Categorías posibles:
- Ingresos: Cuota Jugador, Pedido Ropa, Lotería, Cuota Socio, Patrocinio, Donación, Otros Ingresos
- Gastos: Gasto Personal, Gasto Federación, Gasto Arbitraje, Gasto Material, Gasto Suministros, Gasto Seguros, Gasto Instalaciones, Otros Gastos

Responde SOLO con la categoría más apropiada y un nivel de confianza (0-100).`,
            response_json_schema: {
              type: "object",
              properties: {
                categoria: { type: "string" },
                confianza: { type: "number" },
                razon: { type: "string" }
              }
            }
          });

          if (aiResult.categoria) {
            categoria = aiResult.categoria;
            confianza = aiResult.confianza || 50;
            sugerencia = aiResult.razon || categoria;
          }
        } catch (aiError) {
          console.log('IA categorización falló, usando genérico:', aiError);
          categoria = esIngreso ? 'Otros Ingresos' : 'Otros Gastos';
          confianza = 30;
        }
      }

      categorizadas.push({
        fecha: tx.fecha,
        concepto: tx.concepto,
        importe: tx.importe,
        saldo: tx.saldo,
        categoria_sugerida: categoria,
        sugerencia: sugerencia || categoria,
        confianza,
        entidad_vinculada: entidadVinculada,
        estado: 'pendiente_revision'
      });
    }

    return Response.json({
      success: true,
      transacciones: categorizadas,
      total_extraidas: transacciones.length,
      con_coincidencia_alta: categorizadas.filter(t => t.confianza >= 80).length
    });

  } catch (error) {
    console.error('Error procesando extracto bancario:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});