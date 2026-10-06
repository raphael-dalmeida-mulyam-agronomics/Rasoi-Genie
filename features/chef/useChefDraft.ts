import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChefRecipeFormState } from './types';

const DRAFT_STORAGE_PREFIX = '@rasoi_chef_recipe_draft_';

export type DraftStatus = 'idle' | 'saving' | 'saved';

export function useChefDraft(chefId: string) {
  const [saveStatus, setSaveStatus] = useState<DraftStatus>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const debounceTimerRef = useRef<any>(null);
  const key = `${DRAFT_STORAGE_PREFIX}${chefId || 'anonymous'}`;

  const loadDraft = useCallback(async (): Promise<Partial<ChefRecipeFormState> | null> => {
    try {
      let raw: string | null = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        raw = window.localStorage.getItem(key);
      }
      if (!raw) {
        raw = await AsyncStorage.getItem(key);
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed;
      }
    } catch (e) {
      console.warn('[useChefDraft] Error loading draft:', e);
    }
    return null;
  }, [key]);

  const saveDraftNow = useCallback(
    async (state: ChefRecipeFormState) => {
      try {
        setSaveStatus('saving');
        const json = JSON.stringify(state);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, json);
        }
        await AsyncStorage.setItem(key, json);
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (e) {
        console.warn('[useChefDraft] Error saving draft:', e);
        setSaveStatus('idle');
      }
    },
    [key],
  );

  const scheduleDraftSave = useCallback(
    (state: ChefRecipeFormState) => {
      setSaveStatus('saving');
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        saveDraftNow(state);
      }, 1000);
    },
    [saveDraftNow],
  );

  const clearDraft = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      await AsyncStorage.removeItem(key);
      setSaveStatus('idle');
      setLastSavedTime(null);
    } catch (e) {
      console.warn('[useChefDraft] Error clearing draft:', e);
    }
  }, [key]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    lastSavedTime,
    loadDraft,
    saveDraftNow,
    scheduleDraftSave,
    clearDraft,
  };
}
