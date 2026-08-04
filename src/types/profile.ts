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
// out name, dateOfBirth, sex and goalWeightKg. Every key here is REQUIRED,
// and every value is explicitly unioned with `undefined`, so a caller must
// mention EVERY field (even if only to pass `undefined`). This is the
// undefined-vs-null convention applied at an API boundary: undefined on the
// way IN means "write null / clear this field", which is only safe once the
// caller has been forced to say so on purpose.
//
// CORRECTION: this used to be written as the one-line mapped type
// `{ [K in keyof Omit<Profile, 'id'>]-?: Profile[K] }`, on the theory that
// `-?` strips optionality while keeping `undefined` in the value type. That
// theory is wrong. In a homomorphic mapped type, TypeScript's `-?` modifier
// ALSO strips `undefined` from the resulting member type outright — that's
// how the built-in `Required<T>` achieves genuinely non-undefined
// properties — and it does this even if the member type expression writes
// `| undefined` explicitly; TS discards it regardless. Confirmed via a
// minimal repro (`{ [K in keyof S]-?: string | undefined }` still rejects
// assigning `undefined`, while the `+?` and no-modifier forms accept it).
// The practical effect: the old definition made every field REQUIRED
// AND non-undefined, so a field could never actually be cleared through
// saveProfile — silently defeating the whole reason this type exists.
// Hand-written below instead, so the semantics are actually what the
// comment above claims.
export type ProfileFields = {
  name: string | undefined;
  dateOfBirth: string | undefined;
  sex: Sex | undefined;
  heightCm: number | undefined;
  goalWeightKg: number | undefined;
};

export type BodyweightEntry = {
  date: string; // 'YYYY-MM-DD', a LOCAL date
  weightKg: number;
};
