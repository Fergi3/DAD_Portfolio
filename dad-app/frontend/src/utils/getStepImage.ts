import { repairImages } from '../data/imageRegistry';

export function getStepImage(imagePath?: string) {
  if (!imagePath) return null;

  const image = repairImages[imagePath as keyof typeof repairImages];

  if (!image) {
    console.warn('Missing image for path:', imagePath);
  }

  return image ?? null;
}
