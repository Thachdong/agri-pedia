// TEMP test script: runs the real diagnosis pipeline on one image and writes a markdown report.
// Usage: npx ts-node -r tsconfig-paths/register scripts/diagnose-test.ts <image> <report.md> [cropType] [plantPart]
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { USER_QUERY_PORT } from '../src/modules/user/contracts';
import {
  CreateDiagnosisUseCase,
  GetDiagnosisUseCase,
} from '../src/modules/diagnosis/application/use-cases';
import { DIAGNOSIS_REPOSITORY } from '../src/modules/diagnosis/application/ports';
import { EPlantPart } from '../src/modules/diagnosis/domain';

const [imagePath, reportPath, cropType = 'RICE', plantPart = 'LEAF'] =
  process.argv.slice(2);

async function main(): Promise<void> {
  const usages: any[] = [];
  (globalThis as any).__aiUsage = usages;
  const userId = randomUUID();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(USER_QUERY_PORT)
    .useValue({
      findRoleById: async (id: string) => ({
        userId: id,
        role: 'FARMER',
        isActive: true,
      }),
      findByIdentifier: async () => null,
      findProfileById: async () => null,
      listProfilesByIds: async () => [],
    })
    .compile();
  const app = moduleRef.createNestApplication();
  await app.init();

  const create = app.get(CreateDiagnosisUseCase);
  const get = app.get(GetDiagnosisUseCase);
  const repo = app.get(DIAGNOSIS_REPOSITORY);

  const started = Date.now();
  const { id } = await create.execute({
    userId,
    cropType,
    note: null,
    files: [readFileSync(imagePath)],
    plantParts: [plantPart as EPlantPart],
  });

  let diagnosis = await repo.findById(id);
  while (diagnosis.status === 'PROCESSING') {
    if (Date.now() - started > 5 * 60_000) throw new Error('Timed out');
    await new Promise((r) => setTimeout(r, 1000));
    diagnosis = await repo.findById(id);
  }
  // Let the media handler record the stored image before reading URLs.
  await new Promise((r) => setTimeout(r, 2000));
  const response = await get.execute({ userId, diagnosisId: id });

  const block = (title: string, value: unknown) => [
    `## ${title}`,
    '',
    '```json',
    JSON.stringify(value, null, 2),
    '```',
    '',
  ];
  const lines: string[] = [`# Diagnosis test report: ${imagePath}`, ''];
  for (const [i, image] of diagnosis.images.entries()) {
    lines.push(...block(`AI_1 response (B1 describe) - image ${i + 1}`, image.b1Raw));
    lines.push(...block(`AI_2 response (B3 verify) - image ${i + 1}`, image.b3Raw));
  }
  lines.push(...block('API response (GET /diagnoses/:id)', response));
  lines.push(
    ...block(
      'Token usage (every AI call, in order; includes retries)',
      usages.map(({ system, ...call }) => ({
        step:
          system.startsWith('You are a careful field observer')
            ? 'AI_1 (B1 describe)'
            : 'AI_2 (B3 verify)',
        ...call,
      })),
    ),
  );

  writeFileSync(reportPath, lines.join('\n'));
  await app.close();
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
