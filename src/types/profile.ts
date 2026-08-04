export type Sex = 'male' | 'female';

// Nullable DB columns map to OPTIONAL properties here, not to `null` — per
// CLAUDE.md's undefined-vs-null convention, undefined means no such value
// exists. profile-repo.ts converts at the boundary.
export type Profile = {
  id: string;
  name?: string;
  dateOfBirth?: string; // 'YYYY-MM-DD'
  sex?: Sex;
  heightCm?: number;
  goalWeightKg?: number;
};

// saveProfile is a FULL REPLACE, not a patch — with Omit<Profile, 'id'>
// alone, `saveProfile({ heightCm: 180 })` type-checks and silently nulls
// out name, dateOfBirth, sex and goalWeightKg. `-?` strips optionality
// while keeping `undefined` in each property's type, so a caller must
// mention EVERY field explicitly (even if only to pass `undefined`). This
// is the undefined-vs-null convention applied at an API boundary:
// undefined on the way IN means "write null / clear this field", which is
// only safe once the caller has been forced to say so on purpose.
export type ProfileFields = { [K in keyof Omit<Profile, 'id'>]-?: Profile[K] };

export type BodyweightEntry = {
  date: string; // 'YYYY-MM-DD', a LOCAL date
  weightKg: number;
};
