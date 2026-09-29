const MAX_IMAGE_WIDTH = 1600;
const WEBP_QUALITY = 0.78;

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => {
    canvas.toBlob(resolve, "image/webp", WEBP_QUALITY);
  });
}

export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/webp" && file.size < 900_000) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_WIDTH / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvasToBlob(canvas);
  if (!blob || blob.size >= file.size) {
    return file;
  }

  const name = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${name}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}
