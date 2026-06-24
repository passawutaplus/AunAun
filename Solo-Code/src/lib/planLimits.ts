/** Free tier: new jobs created per calendar month (UTC+7 approx via local date). */
export const FREE_MONTHLY_JOB_LIMIT = 3;

export function countJobsCreatedThisMonth(
  jobs: ReadonlyArray<{ created_at: string }>,
  now = new Date(),
): number {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return jobs.filter((j) => new Date(j.created_at) >= start).length;
}

export function canCreateJob(isPro: boolean, jobsThisMonth: number): boolean {
  if (isPro) return true;
  return jobsThisMonth < FREE_MONTHLY_JOB_LIMIT;
}

export function jobLimitMessage(used: number): string {
  return `แผน Free สร้างงานได้ ${FREE_MONTHLY_JOB_LIMIT} งาน/เดือน (ใช้ไป ${used}/${FREE_MONTHLY_JOB_LIMIT}) — อัพเกรด Pro เพื่อไม่จำกัด`;
}
