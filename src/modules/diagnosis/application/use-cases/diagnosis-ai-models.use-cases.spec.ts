import { IUserQueryPort } from '@modules/user/contracts';
import { IConfigService } from '@shared/config';
import { InMemoryUnitOfWork } from '@shared/database';
import {
  DiagnosisAdminRequiredException,
  DiagnosisInvalidSettingsException,
} from '../../domain';
import { InMemoryDiagnosisSettingsRepository } from '../ports/fakes';
import { GetDiagnosisAiModelsUseCase } from './get-diagnosis-ai-models.use-case';
import { UpdateDiagnosisAiModelsUseCase } from './update-diagnosis-ai-models.use-case';

const config = {
  get: () => ({ describeModel: 'env-describe', verifyModel: 'env-verify' }),
} as unknown as IConfigService;

const defaults = { describeModel: 'env-describe', verifyModel: 'env-verify' };

describe('diagnosis AI models use cases', () => {
  let settings: InMemoryDiagnosisSettingsRepository;
  let users: Record<string, { role: string; isActive: boolean }>;
  let userQuery: IUserQueryPort;

  beforeEach(() => {
    settings = new InMemoryDiagnosisSettingsRepository();
    users = {
      admin: { role: 'ADMIN', isActive: true },
      locked: { role: 'ADMIN', isActive: false },
      farmer: { role: 'FARMER', isActive: true },
    };
    userQuery = {
      findRoleById: async (userId: string) =>
        users[userId] ? { userId, ...users[userId] } : null,
    } as unknown as IUserQueryPort;
  });

  describe('GetDiagnosisAiModelsUseCase', () => {
    const useCase = () =>
      new GetDiagnosisAiModelsUseCase(settings, userQuery, config);

    it('returns no picked model and the env models until an admin picks some', async () => {
      expect(await useCase().execute({ userId: 'admin' })).toEqual({
        describeModel: null,
        verifyModel: null,
        defaults,
      });
    });

    it('returns the picked models', async () => {
      settings.savedAiModels = {
        describeModel: 'gemini-2.5-flash',
        verifyModel: null,
      };

      expect(await useCase().execute({ userId: 'admin' })).toEqual({
        describeModel: 'gemini-2.5-flash',
        verifyModel: null,
        defaults,
      });
    });

    it.each(['farmer', 'locked', 'unknown'])('rejects %s', async (userId) => {
      await expect(useCase().execute({ userId })).rejects.toBeInstanceOf(
        DiagnosisAdminRequiredException,
      );
    });
  });

  describe('UpdateDiagnosisAiModelsUseCase', () => {
    const useCase = () =>
      new UpdateDiagnosisAiModelsUseCase(
        settings,
        userQuery,
        config,
        new InMemoryUnitOfWork(),
      );

    it('saves both models, keeping the other settings', async () => {
      settings.saved = {
        dailyFreeLimit: 7,
        defaultCropType: 'RICE',
        maxImages: 3,
        maxImageBytes: 2 * 1024 * 1024,
        maxImageWidth: 3000,
        maxImageHeight: 2000,
      };
      const before = settings.saved;

      const result = await useCase().execute({
        userId: 'admin',
        describeModel: 'gemini-2.5-flash',
        verifyModel: 'gemini-3-flash-preview',
      });

      expect(result).toEqual({
        describeModel: 'gemini-2.5-flash',
        verifyModel: 'gemini-3-flash-preview',
        defaults,
      });
      expect(settings.savedAiModels).toEqual({
        describeModel: 'gemini-2.5-flash',
        verifyModel: 'gemini-3-flash-preview',
      });
      expect(settings.saved).toEqual(before);
    });

    it('null goes back to the env model', async () => {
      settings.savedAiModels = {
        describeModel: 'gemini-2.5-flash',
        verifyModel: 'gemini-2.5-flash',
      };

      await useCase().execute({
        userId: 'admin',
        describeModel: null,
        verifyModel: 'gemini-2.5-flash',
      });

      expect(settings.savedAiModels).toEqual({
        describeModel: null,
        verifyModel: 'gemini-2.5-flash',
      });
    });

    it('rejects a malformed model id without saving', async () => {
      await expect(
        useCase().execute({
          userId: 'admin',
          describeModel: 'gemini flash',
          verifyModel: null,
        }),
      ).rejects.toBeInstanceOf(DiagnosisInvalidSettingsException);
      expect(settings.saved).toBeNull();
    });

    it.each(['farmer', 'locked', 'unknown'])('rejects %s', async (userId) => {
      await expect(
        useCase().execute({ userId, describeModel: null, verifyModel: null }),
      ).rejects.toBeInstanceOf(DiagnosisAdminRequiredException);
    });
  });
});
