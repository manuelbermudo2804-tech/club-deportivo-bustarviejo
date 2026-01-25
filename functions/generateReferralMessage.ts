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
        
        Instrucciones:
        - El tono debe ser casual, cercano y divertido (usando emojis).
        - Debe sonar natural, como si lo escribiera un amigo, no un robot corporativo.
        - Debe incluir una llamada a la acción clara para que se animen a unirse.
        - NO incluyas el enlace/link, solo el texto (el enlace se añade después).
        - Longitud máxima: 3-4 frases cortas.
        - NO menciones premios, regalos ni sorteos.
        
        Ejemplo de estilo: "¡Hey! Tienes que apuntarte al CD Bustarviejo, el ambiente es brutal y los entrenadores son tops. Es el mejor sitio para hacer deporte y pasarlo bien. ¡Vente a formar parte del equipo! ⚽🔥"
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