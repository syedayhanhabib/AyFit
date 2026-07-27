// Mirrors the columns fetched from the `muscle` table (see supabase/schema.sql).
// `nav_category` is deliberately absent: screens already know which category
// they're showing (it's in the route), so fetching it again would be dead data.
export type Muscle = {
  id: string;
  name: string;
};
