import { useEffect, useRef } from 'react';

/**
 * Resets the UI after `idleMs` of no input:
 * - closes editor/submap/share modal
 * - clears draft + form
 * - exits explore mode
 * - returns to Chicago @ max zoom (fitBounds with CHI_BOUNDS)
 * - shows attractor
 */
export function useIdleReset({
  // state flags
  draft,
  submapCenter,
  exploring,
  shareOpen,

  // setters
  setShareOpen,          // optional
  setSubmapCenter,
  setHandoff,
  setDraft,
  setSlug,
  setForm,
  setExploring,
  setMapMode,
  setShowAttractor,

  // map + bounds
  mainMapRef,
  CHI_BOUNDS,

  // config
  idleMs = 60_000,
}) {
  const idleTimer = useRef(null);

  const doIdleReset = () => {
    // 1) Close any editing UI
    if (setShareOpen) setShareOpen(false);
    setSubmapCenter(null);
    setHandoff(null);

    // 2) Clear unsaved pin & editor fields
    setDraft(null);
    setSlug(null);
    setForm(f => ({ ...f, name:'', neighborhood:'', hotdog:'', note:'' }));

    // 3) Exit explore mode and force Chicago mode
    setExploring(false);
    setMapMode('chicago');

    // 4) Snap map to max zoomed-out Chicago bounds
    const map = mainMapRef?.current;
    if (map) {
      map.setMaxBounds(CHI_BOUNDS);
      map.fitBounds(CHI_BOUNDS, { animate: false });
    }

    // 5) Show attractor
    setShowAttractor(true);
  };

  const bump = () => {
    clearTimeout(idleTimer.current);
    // hide attractor while actively interacting
    if (draft || submapCenter || exploring || shareOpen) {
      setShowAttractor(false);
    }
    idleTimer.current = setTimeout(doIdleReset, idleMs);
  };

  useEffect(() => {
    // start/reset on mount and when deps change
    bump();
    const onAnyInput = () => bump();

    window.addEventListener('pointerdown', onAnyInput);
    window.addEventListener('keydown', onAnyInput);

    return () => {
      window.removeEventListener('pointerdown', onAnyInput);
      window.removeEventListener('keydown', onAnyInput);
      clearTimeout(idleTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, submapCenter, exploring, shareOpen, idleMs, CHI_BOUNDS]);

  // expose manual bump/reset if you ever need it
  return { bump, doIdleReset };
}
