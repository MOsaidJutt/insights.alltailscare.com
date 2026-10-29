// Report sections an admin can grant to a viewer one by one. Admins and the owner always see everything.
export const SECTIONS = [
  ["/", "Overview"],
  ["/funnel", "Funnel"],
  ["/acquisition", "Acquisition"],
  ["/retention", "Retention"],
  ["/engagement", "Engagement"],
  ["/audience", "Audience"],
  ["/links", "Tracked links"],
  ["/notes", "Notes"],
] as const;

export const SECTION_PATHS: string[] = SECTIONS.map(([p]) => p);
export const sectionLabel = (path: string) => SECTIONS.find(([p]) => p === path)?.[1] ?? path;

// null means "everything", which also covers sections added later.
export function sectionsFromForm(form: FormData): string[] | null {
  const picked = form.getAll("sections").map(String).filter((p) => SECTION_PATHS.includes(p));
  return picked.length === 0 || picked.length === SECTION_PATHS.length ? null : picked;
}

export const describeSections = (s: string[] | null) => (s ? s.map(sectionLabel).join(", ") : "Everything");
