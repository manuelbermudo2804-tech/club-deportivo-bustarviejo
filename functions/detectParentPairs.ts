import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admin puede ejecutar esto
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Solo admins pueden ejecutar esto' }, { status: 403 });
    }

    // Obtener todos los jugadores
    const players = await base44.entities.Player.list();
    
    // Mapear padres con sus jugadores
    const parentMap = {};
    
    (players || []).forEach(p => {
      if (p.email_padre) {
        if (!parentMap[p.email_padre]) {
          parentMap[p.email_padre] = { 
            email: p.email_padre, 
            name: p.nombre_tutor_legal,
            players: [],
            tutorSecundarios: new Set()
          };
        }
        parentMap[p.email_padre].players.push(p.id);
      }
      if (p.email_tutor_2) {
        if (!parentMap[p.email_tutor_2]) {
          parentMap[p.email_tutor_2] = { 
            email: p.email_tutor_2, 
            name: p.nombre_tutor_2,
            players: [],
            tutorSecundarios: new Set()
          };
        }
        parentMap[p.email_tutor_2].players.push(p.id);
      }
    });

    // Detectar parejas: padres que comparten jugadores
    const pairs = [];
    const processed = new Set();

    Object.keys(parentMap).forEach(email1 => {
      if (processed.has(email1)) return;
      
      const parent1 = parentMap[email1];
      const sharedPlayers = parent1.players;

      Object.keys(parentMap).forEach(email2 => {
        if (email1 >= email2 || processed.has(email2)) return;
        
        const parent2 = parentMap[email2];
        
        // Checar si comparten AL MENOS UN jugador
        const common = sharedPlayers.filter(id => parent2.players.includes(id));
        
        if (common.length > 0) {
          pairs.push({
            email1,
            name1: parent1.name || email1,
            email2,
            name2: parent2.name || email2,
            sharedPlayerCount: common.length
          });
          processed.add(email1);
          processed.add(email2);
        }
      });
    });

    // Actualizar usuarios con su pareja
    const users = await base44.entities.User.list();
    
    for (const pair of pairs) {
      const user1 = (users || []).find(u => u.email === pair.email1);
      const user2 = (users || []).find(u => u.email === pair.email2);
      
      if (user1) {
        await base44.auth.updateMeAsAdmin?.(user1.id, {
          parent_pair_email: pair.email2,
          parent_pair_name: pair.name2
        }).catch(() => {
          // Silent fail - actualizar via entity si no funciona updateMeAsAdmin
          return base44.asServiceRole.entities.User.update(user1.id, {
            parent_pair_email: pair.email2,
            parent_pair_name: pair.name2
          });
        });
      }
      
      if (user2) {
        await base44.auth.updateMeAsAdmin?.(user2.id, {
          parent_pair_email: pair.email1,
          parent_pair_name: pair.name1
        }).catch(() => {
          return base44.asServiceRole.entities.User.update(user2.id, {
            parent_pair_email: pair.email1,
            parent_pair_name: pair.name1
          });
        });
      }
    }

    return Response.json({ 
      success: true,
      pairsDetected: pairs.length,
      pairs: pairs.map(p => ({
        ...p,
        sharedPlayerCount: p.sharedPlayerCount
      }))
    });
  } catch (error) {
    console.error('Error detectando parejas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});