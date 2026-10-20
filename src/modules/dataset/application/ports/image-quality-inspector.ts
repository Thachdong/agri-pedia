export type TImageQuality = {
  width: number;
  height: number;
  /** Laplacian std dev of the greyscale image (long side <= 1024px); lower = blurry. */
  sharpness: number;
  /** Mean greyscale value, 0..255. */
  brightness: number;
};

/** Measures an encoded image; throws when it cannot be decoded. */
export interface IImageQualityInspector {
  inspect(data: Buffer): Promise<TImageQuality>;
}

export const IMAGE_QUALITY_INSPECTOR = Symbol('IMAGE_QUALITY_INSPECTOR');
