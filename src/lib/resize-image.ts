// Browser-only helper: shrinks a photo before it's uploaded so a full-size
// phone photo (often 4–12 MB, 4000px+) doesn't trip the upload size limits.
// 1600px on the long edge at JPEG 0.82 is far more detail than food
// recognition needs and typically lands around 150–500 KB.

const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.82;

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // imageOrientation "from-image" bakes the EXIF rotation into the pixels,
  // so portrait phone photos don't come out sideways once re-encoded.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to the <img> decoder (e.g. older Safari).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
}

/**
 * Returns a downscaled JPEG copy of `file`, or the original when it's already
 * small enough. Throws if the browser can't decode the image at all.
 */
export async function shrinkImage(file: File): Promise<File> {
  const source = await decode(file);
  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;
  if (!width || !height) throw new Error("Image has no size.");

  const scale = Math.min(1, MAX_EDGE_PX / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();

  const blob = await toBlob(canvas);
  if (!blob) throw new Error("Couldn't encode the image.");

  // Already small and already a JPEG: keep the original bytes untouched.
  if (scale === 1 && file.type === "image/jpeg" && blob.size >= file.size) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "meal";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}
