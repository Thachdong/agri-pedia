import { IKnowledgeQueryPort } from '@modules/knowledge/contracts';
import { IUserQueryPort } from '@modules/user/contracts';
import { InMemoryUnitOfWork } from '@shared/database';
import {
  DiagnosisAdminRequiredException,
  DiagnosisCropNotSupportedException,
  DiagnosisInvalidSettingsException,
  TDiagnosisSettingsProps,
} from '../../domain';
import {
  buildDiagnosis,
  buildDiagnosisCrop,
  InMemoryDiagnosisRepository,
  InMemoryDiagnosisSettingsRepository,
} from '../ports/fakes';
import { GetDiagnosisFormSettingsUseCase } from './get-diagnosis-form-settings.use-case';
import { GetDiagnosisSettingsUseCase } from './get-diagnosis-settings.use-case';
import { UpdateDiagnosisSettingsUseCase } from './update-diagnosis-settings.use-case';

const defaults: TDiagnosisSettingsProps = {
  dailyFreeLimit: 3,
  defaultCropType: null,
  maxImages: 5,
  maxImageBytes: 5 * 1024 * 1024,
  maxImageWidth: 4096,
  maxImageHeight: 4096,
};

const changed: TDiagnosisSettingsProps = {
  dailyFreeLimit: 7,
  defaultCropType: 'RICE',
  maxImages: 3,
  maxImageBytes: 2 * 1024 * 1024,
  maxImageWidth: 3000,
  maxImageHeight: 2000,
};

describe('diagnosis settings use cases', () => {
  let settings: InMemoryDiagnosisSettingsRepository;
  let users: Record<string, { role: string; isActive: boolean }>;
  let crops: Record<string, boolean>;
  let userQuery: IUserQueryPort;
  let knowledgeQuery: IKnowledgeQueryPort;

  beforeEach(() => {
    settings = new InMemoryDiagnosisSettingsRepository();
    users = {
      admin: { role: 'ADMIN', isActive: true },
      locked: { role: 'ADMIN', isActive: false },
      farmer: { role: 'FARMER', isActive: true },
    };
    crops = { RICE: true, DURIAN: false };
    userQuery = {
      findRoleById: async (userId: string) =>
        users[userId] ? { userId, ...users[userId] } : null,
    } as unknown as IUserQueryPort;
    knowledgeQuery = {
      findDiagnosisCrop: async (code: string) =>
        code in crops
          ? buildDiagnosisCrop({ code, enabled: crops[code] })
          : null,
    } as unknown as IKnowledgeQueryPort;
  });

  describe('GetDiagnosisSettingsUseCase', () => {
    const useCase = () => new GetDiagnosisSettingsUseCase(settings, userQuery);

    it('returns the defaults until settings are saved, then the saved ones', async () => {
      expect(await useCase().execute({ userId: 'admin' })).toEqual(defaults);

      settings.saved = changed;
      expect(await useCase().execute({ userId: 'admin' })).toEqual(changed);
    });

    it.each(['farmer', 'locked', 'unknown'])('rejects %s', async (userId) => {
      await expect(useCase().execute({ userId })).rejects.toBeInstanceOf(
        DiagnosisAdminRequiredException,
      );
    });
  });

  describe('UpdateDiagnosisSettingsUseCase', () => {
    const useCase = () =>
      new UpdateDiagnosisSettingsUseCase(
        settings,
        userQuery,
        knowledgeQuery,
        new InMemoryUnitOfWork(),
      );

    it('saves and returns every setting', async () => {
      const result = await useCase().execute({ userId: 'admin', ...changed });

      expect(result).toEqual(changed);
      expect(settings.saved).toEqual(changed);
    });

    it('accepts no default crop', async () => {
      await useCase().execute({
        userId: 'admin',
        ...changed,
        defaultCropType: null,
      });

      expect(settings.saved?.defaultCropType).toBeNull();
    });

    it('rejects a non admin', async () => {
      await expect(
        useCase().execute({ userId: 'farmer', ...changed }),
      ).rejects.toBeInstanceOf(DiagnosisAdminRequiredException);
      expect(settings.saved).toBeNull();
    });

    it.each(['DURIAN', 'MANGO'])(
      'rejects default crop %s (disabled or unknown)',
      async (defaultCropType) => {
        await expect(
          useCase().execute({ userId: 'admin', ...changed, defaultCropType }),
        ).rejects.toBeInstanceOf(DiagnosisCropNotSupportedException);
        expect(settings.saved).toBeNull();
      },
    );

    it('rejects a setting out of range', async () => {
      await expect(
        useCase().execute({ userId: 'admin', ...changed, maxImages: 11 }),
      ).rejects.toBeInstanceOf(DiagnosisInvalidSettingsException);
      expect(settings.saved).toBeNull();
    });
  });

  describe('GetDiagnosisFormSettingsUseCase', () => {
    let diagnoses: InMemoryDiagnosisRepository;
    const useCase = () =>
      new GetDiagnosisFormSettingsUseCase(settings, diagnoses, knowledgeQuery);
    const seed = (userId: string, createdAt: Date) => {
      const diagnosis = buildDiagnosis({ userId, createdAt });
      diagnoses.items.set(diagnosis.id, diagnosis);
    };

    beforeEach(() => {
      diagnoses = new InMemoryDiagnosisRepository();
    });

    it('returns what the form needs; no remaining count for a guest', async () => {
      settings.saved = changed;

      expect(await useCase().execute({ userId: null })).toEqual({
        defaultCropType: 'RICE',
        minImages: 1,
        maxImages: 3,
        maxImageBytes: 2 * 1024 * 1024,
        maxImageWidth: 3000,
        maxImageHeight: 2000,
        remainingToday: null,
      });
    });

    it('counts only the caller diagnoses sent today', async () => {
      settings.saved = changed;
      seed('u1', new Date());
      seed('u1', new Date());
      seed('u1', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));
      seed('u2', new Date());

      expect((await useCase().execute({ userId: 'u1' })).remainingToday).toBe(
        5,
      );
    });

    it('never returns a negative remaining count', async () => {
      for (let i = 0; i < 4; i++) seed('u1', new Date());

      expect((await useCase().execute({ userId: 'u1' })).remainingToday).toBe(
        0,
      );
    });

    it('drops a default crop no longer enabled for diagnosis', async () => {
      settings.saved = changed;
      crops.RICE = false;

      expect(
        (await useCase().execute({ userId: null })).defaultCropType,
      ).toBeNull();
    });

    it('returns the defaults until settings are saved', async () => {
      expect(await useCase().execute({ userId: 'u1' })).toMatchObject({
        defaultCropType: null,
        maxImages: 5,
        remainingToday: 3,
      });
    });
  });
});
