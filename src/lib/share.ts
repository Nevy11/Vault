export async function shareBlob(blob: Blob, filename: string, title?: string, text?: string) {
  const file = new File([blob], filename, { type: blob.type });

  // Try Web Share API with files first
  const nav: any = typeof navigator !== "undefined" ? navigator : undefined;
  try {
    if (nav && nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: title || filename, text: text });
      return { method: "webshare-file" };
    }
  } catch (e) {
    // swallow and fallback
    console.warn("Web Share with files failed", e);
  }

  // Try Web Share API with URL if available
  try {
    const blobUrl = URL.createObjectURL(blob);
    if (nav && nav.share) {
      await nav.share({ url: blobUrl, title: title || filename, text: text });
      // revoke after a tick
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      return { method: "webshare-url", url: blobUrl };
    }
  } catch (e) {
    console.warn("Web Share with URL failed", e);
  }

  // Final fallback: return blob URL so caller can use it (e.g., open mailto or WhatsApp with link)
  const fallbackUrl = URL.createObjectURL(blob);
  return { method: "fallback", url: fallbackUrl };
}

export function openWhatsAppWithText(text: string) {
  const encoded = encodeURIComponent(text);
  const url = `https://wa.me/?text=${encoded}`;
  window.open(url, "_blank");
}

export function openEmail(subject: string, body: string) {
  const params = new URLSearchParams({ subject, body });
  const mailto = `mailto:?${params.toString()}`;
  window.location.href = mailto;
}
