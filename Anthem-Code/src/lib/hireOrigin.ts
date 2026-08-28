export type HireOriginFilter = "all" | "project" | "package";

type HireOriginFields = {
  service_id?: string | null;
};

export function hireRequestServiceId(req: HireOriginFields): string | null {
  const id = req.service_id;
  return typeof id === "string" && id.trim() ? id : null;
}

/** Hire started from a creator package (not a project brief). */
export function hireHasPackageOrigin(req: HireOriginFields): boolean {
  return !!hireRequestServiceId(req);
}

export function filterHiresByOrigin<T extends HireOriginFields>(
  rows: T[],
  origin: HireOriginFilter,
): T[] {
  if (origin === "all") return rows;
  if (origin === "package") return rows.filter(hireHasPackageOrigin);
  return rows.filter((r) => !hireHasPackageOrigin(r));
}

export function countHiresByOrigin(rows: HireOriginFields[]): {
  all: number;
  project: number;
  package: number;
} {
  let fromPackage = 0;
  for (const row of rows) {
    if (hireHasPackageOrigin(row)) fromPackage += 1;
  }
  return {
    all: rows.length,
    package: fromPackage,
    project: rows.length - fromPackage,
  };
}
