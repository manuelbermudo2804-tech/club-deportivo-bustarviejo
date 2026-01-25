import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Usar Service Role para permisos de admin
        const client = base44.asServiceRole;

        // 1. Corregir ReferralReward
        const rewards = await client.entities.ReferralReward.list();
        let fixedRewards = 0;
        for (const r of rewards) {
            if (r.temporada && r.temporada.includes('/')) {
                const newTemporada = r.temporada.replace(/\//g, '-');
                await client.entities.ReferralReward.update(r.id, { temporada: newTemporada });
                fixedRewards++;
            }
        }

        // 2. Corregir ReferralHistory
        const history = await client.entities.ReferralHistory.list();
        let fixedHistory = 0;
        for (const h of history) {
            if (h.temporada && h.temporada.includes('/')) {
                const newTemporada = h.temporada.replace(/\//g, '-');
                await client.entities.ReferralHistory.update(h.id, { temporada: newTemporada });
                fixedHistory++;
            }
        }
        
        // 3. Corregir ClubMember
        const members = await client.entities.ClubMember.list();
        let fixedMembers = 0;
        for (const m of members) {
             if (m.temporada && m.temporada.includes('/')) {
                const newTemporada = m.temporada.replace(/\//g, '-');
                await client.entities.ClubMember.update(m.id, { temporada: newTemporada });
                fixedMembers++;
            }
        }

        return Response.json({ 
            success: true, 
            fixedRewards, 
            fixedHistory, 
            fixedMembers 
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});