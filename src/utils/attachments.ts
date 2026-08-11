const INLINE_SAFE_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

/**
 * Opens a downloaded attachment blob in a new tab only for content types the
 * browser cannot execute as active content (images, PDF). Any other type
 * (including anything mislabeled before the backend enforced an upload
 * allow-list) is forced to save-as instead of being rendered inline, since a
 * `blob:` URL ignores the server's Content-Disposition header entirely.
 */
export function openOrDownloadAttachment(blob: Blob, contentType: string | undefined, fileName: string): void {
  const url = URL.createObjectURL(blob);

  if (contentType && INLINE_SAFE_CONTENT_TYPES.has(contentType)) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
