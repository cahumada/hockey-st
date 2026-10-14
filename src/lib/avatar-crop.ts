export const AVATAR_CROP_ASPECT = 1;
export const AVATAR_CROP_OUTPUT_PX = 512;
export const AVATAR_CROP_VIEWPORT_PX = 280;

export type AvatarCropTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export function baseCoverScale(
  imageWidth: number,
  imageHeight: number,
  viewport: number,
): number {
  if (imageWidth <= 0 || imageHeight <= 0 || viewport <= 0) {
    return 1;
  }

  return Math.max(viewport / imageWidth, viewport / imageHeight);
}

export function clampPan(
  imageWidth: number,
  imageHeight: number,
  scale: number,
  viewport: number,
  offsetX: number,
  offsetY: number,
): AvatarCropTransform {
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  let nextX = offsetX;
  let nextY = offsetY;

  if (width <= viewport) {
    nextX = 0;
  } else {
    const maxX = (width - viewport) / 2;
    nextX = Math.min(maxX, Math.max(-maxX, nextX));
  }

  if (height <= viewport) {
    nextY = 0;
  } else {
    const maxY = (height - viewport) / 2;
    nextY = Math.min(maxY, Math.max(-maxY, nextY));
  }

  return { scale, offsetX: nextX, offsetY: nextY };
}

export function withZoom(
  imageWidth: number,
  imageHeight: number,
  viewport: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
): AvatarCropTransform {
  const base = baseCoverScale(imageWidth, imageHeight, viewport);
  const scale = base * Math.max(1, zoom);
  return clampPan(imageWidth, imageHeight, scale, viewport, offsetX, offsetY);
}

function imagePixelSize(image: CanvasImageSource & { width: number; height: number }) {
  if ("naturalWidth" in image && image.naturalWidth > 0 && image.naturalHeight > 0) {
    return { width: image.naturalWidth, height: image.naturalHeight };
  }

  return { width: image.width, height: image.height };
}

export async function renderSquareAvatarBlob(
  image: CanvasImageSource & { width: number; height: number },
  transform: AvatarCropTransform,
  viewport: number,
  outputSize: number,
  mimeType: string,
): Promise<Blob> {
  const frame = document.createElement("canvas");
  frame.width = viewport;
  frame.height = viewport;
  const frameContext = frame.getContext("2d");
  if (!frameContext) {
    throw new Error("Canvas is unavailable.");
  }

  const { width: pixelWidth, height: pixelHeight } = imagePixelSize(image);
  const width = pixelWidth * transform.scale;
  const height = pixelHeight * transform.scale;
  const x = (viewport - width) / 2 + transform.offsetX;
  const y = (viewport - height) / 2 + transform.offsetY;
  frameContext.drawImage(image, x, y, width, height);

  const output = document.createElement("canvas");
  output.width = outputSize;
  output.height = outputSize;
  const outputContext = output.getContext("2d");
  if (!outputContext) {
    throw new Error("Canvas is unavailable.");
  }

  outputContext.drawImage(frame, 0, 0, outputSize, outputSize);

  return new Promise((resolve, reject) => {
    output.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not encode the cropped image."));
          return;
        }
        resolve(blob);
      },
      mimeType,
      mimeType === "image/jpeg" ? 0.92 : undefined,
    );
  });
}
