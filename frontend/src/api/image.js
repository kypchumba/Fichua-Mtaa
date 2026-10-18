export const MAX_IMAGE_BYTES = 512000;
const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Your browser could not process this image.")),
      type,
      quality,
    ),
  );
}

// Resize and encode locally. The server still checks both the bytes and the 500 KB limit.
export async function compressImage(file) {
  if (!acceptedTypes.includes(file.type))
    throw new Error("Choose a JPEG, PNG or WebP image.");
  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;
  if (!width || !height) throw new Error("This image could not be opened.");
  const scale = Math.min(1, 1600 / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const formats = ["image/webp", "image/jpeg"];
  let output;
  for (let dimension = 1; dimension >= 0.5; dimension -= 0.15) {
    canvas.width = Math.max(1, Math.round(width * dimension));
    canvas.height = Math.max(1, Math.round(height * dimension));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const type of formats) {
      for (const quality of [0.86, 0.76, 0.66, 0.56, 0.46]) {
        output = await canvasBlob(canvas, type, quality);
        if (output.type === type && output.size <= MAX_IMAGE_BYTES) {
          bitmap.close();
          return new File(
            [output],
            `compressed.${type === "image/webp" ? "webp" : "jpg"}`,
            { type: output.type },
          );
        }
      }
    }
  }
  bitmap.close();
  throw new Error(
    "This image remains over 500 KB after compression. Choose a smaller image.",
  );
}
