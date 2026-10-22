import { useCallback, useEffect, useRef, useState } from 'react';

import { saveRepairTodoProgress } from '../services/toolboxStorage';

const AUTO_SAVE_DELAY_MS = 500;

export default function useRepairProgressPersistence({
  initialRepairTodoId,
  progressSnapshot,
  onRepairTodoIdChange,
}) {
  const [activeRepairTodoId, setActiveRepairTodoId] = useState(initialRepairTodoId);
  const activeRepairTodoIdRef = useRef(initialRepairTodoId);
  const latestSnapshotRef = useRef(progressSnapshot);
  const queuedSnapshotRef = useRef(null);
  const saveQueuePromiseRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const isInitialSaveRef = useRef(true);
  const onRepairTodoIdChangeRef = useRef(onRepairTodoIdChange);

  latestSnapshotRef.current = progressSnapshot;
  onRepairTodoIdChangeRef.current = onRepairTodoIdChange;

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const drainSaveQueue = useCallback(async () => {
    while (isMountedRef.current && queuedSnapshotRef.current) {
      const snapshot = queuedSnapshotRef.current;
      queuedSnapshotRef.current = null;

      try {
        const savedRepair = await saveRepairTodoProgress({
          ...snapshot,
          repairId: activeRepairTodoIdRef.current,
        });

        if (!isMountedRef.current) return;

        if (savedRepair?.id && savedRepair.id !== activeRepairTodoIdRef.current) {
          activeRepairTodoIdRef.current = savedRepair.id;
          setActiveRepairTodoId(savedRepair.id);
          onRepairTodoIdChangeRef.current?.(savedRepair.id);
        }
      } catch (error) {
        // Persistence failures must not interrupt the active repair flow.
      }
    }
  }, []);

  const enqueueSave = useCallback((snapshot) => {
    if (!isMountedRef.current || !snapshot) return Promise.resolve();

    // Only the newest not-yet-started snapshot needs to be persisted.
    queuedSnapshotRef.current = snapshot;

    if (!saveQueuePromiseRef.current) {
      saveQueuePromiseRef.current = drainSaveQueue().finally(() => {
        saveQueuePromiseRef.current = null;

        // Cover a snapshot queued as the previous drain was settling.
        if (isMountedRef.current && queuedSnapshotRef.current) {
          enqueueSave(queuedSnapshotRef.current);
        }
      });
    }

    return saveQueuePromiseRef.current;
  }, [drainSaveQueue]);

  const saveNow = useCallback(async () => {
    clearDebounceTimer();
    await enqueueSave(latestSnapshotRef.current);

    // Await a follow-up drain if a newer snapshot arrived at the queue boundary.
    if (saveQueuePromiseRef.current) {
      await saveQueuePromiseRef.current;
    }
  }, [clearDebounceTimer, enqueueSave]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearDebounceTimer();
      queuedSnapshotRef.current = null;
    };
  }, [clearDebounceTimer]);

  useEffect(() => {
    if (isInitialSaveRef.current) {
      isInitialSaveRef.current = false;
      enqueueSave(progressSnapshot);
      return undefined;
    }

    clearDebounceTimer();
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      enqueueSave(latestSnapshotRef.current);
    }, AUTO_SAVE_DELAY_MS);

    return clearDebounceTimer;
  }, [clearDebounceTimer, enqueueSave, progressSnapshot]);

  return {
    activeRepairTodoId,
    saveNow,
  };
}
