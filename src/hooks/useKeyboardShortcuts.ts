import { useEffect, useCallback } from 'react';

type ShortcutMap = {
  [key: string]: () => void;
};

export const useKeyboardShortcuts = (shortcuts: ShortcutMap) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement instanceof HTMLElement && activeElement.isContentEditable)
      ) {
        // Exception: Allow 'Escape' to blur inputs or close modals
        if (event.key !== 'Escape') {
           return;
        }
      }

      // Construct key combo string (e.g., "Meta+k", "n", "Escape")
      let keyCombo = '';
      if (event.metaKey || event.ctrlKey) keyCombo += 'Meta+';
      if (event.shiftKey) keyCombo += 'Shift+';
      if (event.altKey) keyCombo += 'Alt+';
      
      // Normalize key
      let key = event.key;
      if (key === ' ') key = 'Space';
      if (key.length === 1) key = key.toLowerCase(); // handle case-insensitivity for single chars
      
      keyCombo += key;

      // Also check exact key match if no modifiers were pressed
      if (shortcuts[keyCombo]) {
        event.preventDefault(); // prevent default browser behavior
        shortcuts[keyCombo]();
      } else if (shortcuts[event.key] && !event.metaKey && !event.ctrlKey && !event.altKey) {
        // Fallback for single char triggers like 'n' or '?' without caring about case if it wasn't caught
        event.preventDefault();
        shortcuts[event.key]();
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};
