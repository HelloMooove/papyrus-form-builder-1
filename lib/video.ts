export interface VideoEmbed {
  provider: 'youtube' | 'vimeo';
  embedUrl: string;
}

/**
 * Reconnaît une URL YouTube ou Vimeo et renvoie l'URL d'embed.
 * Supporte : youtu.be/ID · youtube.com/watch?v=ID · youtube.com/embed/ID · youtube.com/shorts/ID · vimeo.com/ID.
 */
export function parseVideoEmbed(input: string): VideoEmbed | null {
  if (!input) return null;
  let trimmed = input.trim();

  // Si c'est un tag iframe, on extrait l'URL du src
  if (trimmed.includes('<iframe')) {
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/);
    if (srcMatch) {
      trimmed = srcMatch[1];
    }
  }

  // YouTube
  const yt = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([\w-]{11})/
  );
  if (yt) {
    return { provider: 'youtube', embedUrl: `https://www.youtube.com/embed/${yt[1]}` };
  }

  // Vimeo
  const vimeo = trimmed.match(/vimeo\.com\/(?:video\/|channels\/[^/]+\/|groups\/[^/]+\/videos\/)?(\d+)/);
  if (vimeo) {
    return { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeo[1]}` };
  }

  return null;
}
