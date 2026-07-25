// src/hooks/useMediaQuery.js
import { useEffect, useState } from 'react';

/**
 * Suit une media query CSS depuis React.
 *
 * Utile quand deux mises en page alternatives sont trop lourdes pour être toutes
 * deux MONTÉES puis masquées en CSS : l'écran d'édition du planning peut contenir
 * plus de 1 000 sélecteurs, les rendre en double (table + cartes) doublerait le
 * DOM et le coût de chaque rendu.
 *
 * @param {string} query  ex. '(min-width: 1024px)'
 */
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') { return undefined; }
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
