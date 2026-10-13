import { IDiagnosisJobRunner, TDiagnosisJob } from '../diagnosis-job-runner';

/** Test fake: records started jobs, runs nothing. */
export class InMemoryDiagnosisJobRunner implements IDiagnosisJobRunner {
  readonly jobs: TDiagnosisJob[] = [];

  start(job: TDiagnosisJob): void {
    this.jobs.push(job);
  }
}
