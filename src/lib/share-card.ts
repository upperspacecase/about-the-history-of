import { toBlob } from "html-to-image";
import {
  SHARE_CARD_WIDTH,
  SHARE_CARD_HEIGHT,
  type ShareCardVariant,
} from "@/components/share-card";

export type ShareResult = "shared" | "downloaded" | "cancelled";

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "story"
  );
}

export function cardFileName(
  headline: string,
  variant: ShareCardVariant
): string {
  return `the-long-view-${slugify(headline)}-${variant}.png`;
}

/** Rasterize a full-size (1080x1920) ShareCard node to a PNG File. */
export async function nodeToPngFile(
  node: HTMLElement,
  fileName: string
): Promise<File> {
  const blob = await toBlob(node, {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    pixelRatio: 1,
    cacheBust: true,
    // The card uses only system fonts — skip web-font embedding.
    skipFonts: true,
  });
  if (!blob) throw new Error("Could not render the card image");
  return new File([blob], fileName, { type: "image/png" });
}

function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function canShareFiles(files: File[]): boolean {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.canShare !== "function"
  ) {
    return false;
  }
  // navigator.canShare can throw ("Illegal invocation") in headless or other
  // non-interactive environments — treat a throw as "not shareable".
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

/**
 * Share PNG files via the native share sheet (Instagram / LinkedIn / X) when
 * the platform supports sharing files; otherwise download them.
 */
export async function shareOrDownload(
  files: File[],
  meta: { title: string; text: string }
): Promise<ShareResult> {
  if (canShareFiles(files)) {
    try {
      await navigator.share({ files, title: meta.title, text: meta.text });
      return "shared";
    } catch (err) {
      // User dismissed the share sheet — nothing else to do.
      if (err instanceof DOMException && err.name === "AbortError") {
        return "cancelled";
      }
      // Share failed for another reason: fall through to download.
    }
  }

  files.forEach(downloadFile);
  return "downloaded";
}
