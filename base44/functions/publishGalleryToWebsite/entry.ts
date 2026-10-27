import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const OWNER = 'manuelbermudo2804-tech';
const REPO = 'cdBustarviejo-web';
const BRANCH = 'main';
const FILE_PATH = 'galeria.html';
const MARKER_START = '<!-- INICIO ALBUMES PUBLICADOS DESDE LA APP -->';
const MARKER_END = '<!-- FIN ALBUMES PUBLICADOS DESDE LA APP -->';

function esc(s='') {
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
}
function safeUrl(value='') {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' ? u.href : null;
  } catch { return null; }
}
function slug(value='') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'album';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Solo el administrador puede publicar fotos en la web.' }, { status: 403 });

    const token = Deno.env.get('GITHUB_TOKEN');
    if (!token) return Response.json({
      error: 'Falta configurar el secreto GITHUB_TOKEN en las funciones de la app. No se ha publicado ni modificado nada.',
      setup_required: true
    }, { status: 503 });

    const body = await req.json().catch(() => ({}));
    const albumIds = Array.isArray(body.albumIds) ? [...new Set(body.albumIds.map(String))] : [];
    if (!albumIds.length) return Response.json({ error: 'Selecciona al menos un álbum.' }, { status: 400 });

    const albums = await base44.entities.PhotoGallery.list('-fecha_evento');
    const chosen = albums.filter(a => albumIds.includes(String(a.id)));
    if (chosen.length !== albumIds.length) return Response.json({ error: 'No se han encontrado todos los álbumes seleccionados.' }, { status: 404 });

    const invalid = chosen.filter(a => !a.titulo || !a.categoria || !Array.isArray(a.fotos) || !a.fotos.length);
    if (invalid.length) return Response.json({ error: 'Hay álbumes sin título, categoría o fotografías.' }, { status: 400 });

    const api = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + FILE_PATH;
    const getFile = await fetch(api + '?ref=' + BRANCH, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!getFile.ok) return Response.json({ error: 'GitHub no ha permitido leer la galería (' + getFile.status + '). Comprueba el token y sus permisos.' }, { status: 502 });
    const fileData = await getFile.json();
    const html = decodeURIComponent(escape(atob(fileData.content.replace(/\s/g,''))));
    const start = html.indexOf(MARKER_START);
    const end = html.indexOf(MARKER_END);
    const already = start >= 0 && end > start ? html.slice(start, end + MARKER_END.length) : '';
    let existingHtml = '';
    if (already) existingHtml = already.slice(MARKER_START.length, already.length - MARKER_END.length);

    const publishedUrlSet = new Set([...existingHtml.matchAll(/data-photo-url="([^"]+)"/g)].map(m => m[1]));
    const publishedAlbumSet = new Set([...existingHtml.matchAll(/data-album-id="([^"]+)"/g)].map(m => m[1]));
    const newSections = [];
    const publishedIds = [];
    let addedPhotos = 0;

    for (const album of chosen) {
      if (publishedAlbumSet.has(String(album.id))) continue;
      const photos = album.fotos.map(f => safeUrl(f?.url)).filter(Boolean).filter(url => !publishedUrlSet.has(url));
      if (!photos.length) {
        // Don't mark an empty album published; it may have duplicate images from another album.
        continue;
      }
      const catSlug = slug(album.categoria);
      const sectionId = 'app-' + catSlug + '-' + slug(album.titulo) + '-' + slug(album.id).slice(-24);
      const links = photos.map((url, i) => {
        publishedUrlSet.add(url);
        addedPhotos++;
        return '<a href="' + esc(url) + '" class="glightbox" data-photo-url="' + esc(url) + '"><img src="' + esc(url) + '" alt="' + esc(album.titulo + ' — foto ' + (i + 1)) + '" loading="lazy"></a>';
      }).join('\n');
      const cleanTitle = String(album.titulo || '').replace(/^\s*📸?\s*Chat Entrenador\s*[-–—:]\s*/i, '').trim() || String(album.categoria || 'Galería');
      newSections.push('<div class="galeria-seccion" data-album-id="' + esc(album.id) + '" data-category="' + esc(album.categoria) + '">\n<h2 id="' + esc(sectionId) + '">' + esc(cleanTitle) + '</h2>\n<p>' + esc(album.descripcion || '') + '</p>\n<div class="galeria-grid">\n' + links + '\n</div>\n</div>');
      publishedIds.push(String(album.id));
    }
    if (!newSections.length) return Response.json({ error: 'Los álbumes seleccionados ya están publicados o no contienen enlaces de fotos HTTPS nuevos.', already_published: true });

    const block = MARKER_START + '\n' + existingHtml + (existingHtml ? '\n' : '') + newSections.join('\n\n') + '\n' + MARKER_END;
    let updatedHtml;
    if (start >= 0 && end > start) {
      updatedHtml = html.slice(0, start) + block + html.slice(end + MARKER_END.length);
    } else {
      const insertion = html.lastIndexOf('</section>');
      if (insertion < 0) return Response.json({ error: 'No se encontró el cierre de la galería en galeria.html; no se ha cambiado el archivo.' }, { status: 500 });
      updatedHtml = html.slice(0, insertion) + '\n' + block + '\n' + html.slice(insertion);
    }
    const put = await fetch(api, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Publicar álbumes de la app en la galería web',
        content: btoa(unescape(encodeURIComponent(updatedHtml))),
        sha: fileData.sha,
        branch: BRANCH
      })
    });
    const putData = await put.json().catch(() => ({}));
    if (!put.ok) return Response.json({ error: 'GitHub rechazó la publicación (' + put.status + '). ' + (putData.message || '') }, { status: 502 });
    return Response.json({
      success: true,
      publishedAlbums: publishedIds.length,
      publishedPhotos: addedPhotos,
      commit: putData.commit?.html_url || null,
      message: 'Álbumes guardados en GitHub. La publicación en la web puede tardar unos minutos en desplegarse.'
    });
  } catch (error) {
    console.error('[publishGalleryToWebsite]', error);
    return Response.json({ error: 'Error inesperado al publicar. No se ha confirmado ningún cambio: ' + (error?.message || 'error desconocido') }, { status: 500 });
  }
});