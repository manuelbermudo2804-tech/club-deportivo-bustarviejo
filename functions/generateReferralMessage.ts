import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { userName, targetType, referralCode } = await req.json();

        if (!userName || !targetType) {
            return Response.json({ error: "Missing parameters" }, { status: 400 });
        }

        const prompt = `
        Actúa como un experto en marketing deportivo y copywriting.
        Genera un mensaje de invitación corto, entusiasta y persuasivo para WhatsApp.
        
        Contexto:
        - El usuario "${userName}" quiere invitar a un "${targetType}" (ej: amigo del cole, familiar, vecino, compañero de equipo) a unirse al Club Deportivo Bustarviejo.
        - El club es familiar, divertido, con entrenadores titulados y para todas las edades.
        - Hay un programa de premios: si se apuntan, ambos ganan premios (ropa gratis, sorteos, etc.).
        
        Instrucciones:
        - El tono debe ser casual, cercano y divertido (usando emojis).
        - Debe sonar natural, como si lo escribiera un amigo, no un robot corporativo.
        - Debe incluir una llamada a la acción clara.
        - NO incluyas el enlace/link, solo el texto (el enlace se añade después).
        - Menciona explícitamente que pongan a "${userName}" como quien les invitó para ganar los premios.
        - Longitud máxima: 3-4 frases cortas.
        
        Ejemplo de estilo: "¡Hey! Tienes que apuntarte al CD Bustarviejo, el ambiente es brutal y los entrenadores son tops. Además si te apuntas y dices que vas de mi parte, ¡nos regalan ropa a los dos! Vente a probar un día ⚽🔥"
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    message: { type: "string" }
                }
            }
        });

        return Response.json(response);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});