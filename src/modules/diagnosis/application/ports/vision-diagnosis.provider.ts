/** What a diagnosis records about the AI that produced it. */
export type TVisionProviderInfo = {
  provider: string;
  /** `<describe model>+<verify model>`. */
  model: string;
  /** `<describe prompt>+<verify prompt>`, e.g. `d1+v1`. */
  promptVersion: string;
};

export interface IVisionDiagnosisProvider {
  info(): TVisionProviderInfo;
}

export const VISION_DIAGNOSIS_PROVIDER = Symbol('VISION_DIAGNOSIS_PROVIDER');
