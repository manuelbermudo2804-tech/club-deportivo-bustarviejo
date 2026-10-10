import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const url = async (uri) => uri ? (await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 3600 })).signed_url : null;

// Muestra el sello y la firma del responsable del club debajo del texto del documento
export default function SelloFirmaClub({ sello, firma, firmante }) {
  const { data } = useQuery({
    queryKey: ["selloFirma", sello, firma],
    queryFn: async () => ({ sello: await url(sello), firma: await url(firma) }),
    enabled: !!(sello || firma),
  });
  if (!sello && !firma) return null;
  return (
    <div className="border rounded-lg p-3 bg-white">
      <p className="text-xs font-semibold text-slate-500 mb-1">Por el CD Bustarviejo</p>
      <div className="flex items-end gap-4">
        {data?.firma && <img src={data.firma} alt="Firma del club" className="h-16 object-contain" />}
        {data?.sello && <img src={data.sello} alt="Sello del club" className="h-20 object-contain" />}
      </div>
      {firmante && <p className="text-xs text-slate-600 mt-1">{firmante}</p>}
    </div>
  );
}