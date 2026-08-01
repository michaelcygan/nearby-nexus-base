/**
 * Browser-side image compression. We only ever upload the compressed
 * derivative, which keeps storage and bandwidth costs low.
 */
export const MAX_IMAGES = 4;
export const MAX_UPLOAD_BYTES = 400 * 1024;
const MAX_EDGE = 1600;
const QUALITY_STEPS = [0.72, 0.62, 0.5, 0.4, 0.32];

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be read as an image."));
    };
    image.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be attached.");
  }

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not process that image.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let smallest: Blob | null = null;
  for (const quality of QUALITY_STEPS) {
    const blob = await toBlob(canvas, quality);
    if (!blob) continue;
    smallest = blob;
    if (blob.size <= MAX_UPLOAD_BYTES) break;
  }

  if (!smallest) throw new Error("This browser could not process that image.");
  if (smallest.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      "That photo is still too large after compressing. Try a smaller crop or a simpler image.",
    );
  }

  const name = `${file.name.replace(/\.[^.]+$/, "")}.jpg`;
  return new File([smallest], name, { type: "image/jpeg" });
}

export function formatBytes(bytes: number) {
  return `${Math.round(bytes / 1024)} KB`;
}
