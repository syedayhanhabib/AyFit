import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // Deliberate hydration guard, not the render-loop this rule protects
    // against: the first client render must match the server/static
    // 'light' value below, and hasHydrated flips to true only AFTER that
    // first paint so React reconciles a matching render instead of a
    // mismatch. There is no way to detect "hydration is complete" without a
    // mount-effect state flip — this is the standard SSR-hydration idiom,
    // not something worth reworking to satisfy a general-purpose lint rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
