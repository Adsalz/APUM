// src/hooks/useUndoShortcut.js
import { useEffect } from 'react';

/**
 * Branche Ctrl+Z (⌘+Z sur macOS) sur une action d'annulation.
 *
 * Combler un planning demande des dizaines d'affectations d'affilée : sans
 * annulation, corriger une erreur oblige à retrouver la case à la main.
 * Le raccourci est ignoré quand la frappe vise un champ de saisie, pour ne pas
 * voler l'annulation native du texte (recherche dans le sélecteur de médecin).
 *
 * @param {boolean}  actif  n'écoute que si vrai (mode édition)
 * @param {Function} onUndo action à déclencher
 */
export default function useUndoShortcut(actif, onUndo) {
  useEffect(() => {
    if (!actif) { return undefined; }
    const surTouche = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z') { return; }
      const cible = e.target;
      if (cible instanceof HTMLElement
        && (cible.tagName === 'INPUT' || cible.tagName === 'TEXTAREA' || cible.isContentEditable)) {
        return;
      }
      e.preventDefault();
      onUndo();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [actif, onUndo]);
}
