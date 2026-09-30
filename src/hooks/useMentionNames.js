import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Nombres de todos los miembros de un chat (para las @menciones)
export default function useMentionNames(tipo, categoria) {
  const { data = [] } = useQuery({
    queryKey: ["mentionNames", tipo, categoria],
    queryFn: async () => (await base44.functions.invoke("chatMentionNames", { tipo, categoria })).data?.names || [],
    enabled: tipo === "staff" || !!categoria,
    staleTime: 5 * 60 * 1000,
  });
  return data;
}