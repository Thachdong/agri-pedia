import {
  IVisionDiagnosisProvider,
  TVisionProviderInfo,
} from '../vision-diagnosis.provider';

export class FakeVisionDiagnosisProvider implements IVisionDiagnosisProvider {
  info(): TVisionProviderInfo {
    return {
      provider: 'GEMINI',
      model: 'describe-model+verify-model',
      promptVersion: 'd1+v1',
    };
  }
}
