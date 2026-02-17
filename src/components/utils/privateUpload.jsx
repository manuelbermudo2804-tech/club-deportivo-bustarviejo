import { base44 } from "@/api/base44Client";

/**
 * Sube un archivo a almacenamiento PRIVADO.
 * Devuelve el file_uri (NO una URL pública).
 * Para visualizar el archivo hay que pedir una URL firmada temporal via getPrivateFileUrl.
 */
export async function uploadPrivateFile(file) {
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  return file_uri;
}

/**
 * Obtiene una URL firmada temporal (5 min) para visualizar un archivo privado.
 * @param {string} fileUri - El file_uri devuelto por UploadPrivateFile
 * @param {string} [playerId] - ID del jugador para verificar permisos (opcional para admin/staff)
 */
export async function getSignedUrl(fileUri, playerId) {
  if (!fileUri) return null;
  
  // Si es una URL pública (legacy), devolverla directamente
  if (fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
    return fileUri;
  }
  
  const { data } = await base44.functions.invoke('getPrivateFileUrl', {
    file_uri: fileUri,
    player_id: playerId || null
  });
  
  return data.signed_url;
}

/**
 * Determina si un valor es un file_uri privado o una URL pública legacy.
 */
export function isPrivateUri(value) {
  if (!value) return false;
  return !value.startsWith('http://') && !value.startsWith('https://');
}