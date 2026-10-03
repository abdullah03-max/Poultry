// =============================================================================
// SHAN POULTRY PROTEIN - Supabase Realtime Subscriptions Hook
// Listens for live INSERT, UPDATE, DELETE on collections table
// =============================================================================

import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Collection } from '../types/database';
import { api } from '../services/api';

export const useRealtimeCollections = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [realtimeActive, setRealtimeActive] = useState<boolean>(false);
  const [latestLiveEvent, setLatestLiveEvent] = useState<{
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    collection?: Collection;
    timestamp: Date;
  } | null>(null);

  const refreshCollections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getCollections({ limit: 100 });
      setCollections(res.collections);
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCollections();

    if (!isSupabaseConfigured()) {
      setRealtimeActive(false);
      return;
    }

    // Subscribe to Postgres changes on collections table
    const channel = supabase
      .channel('public:collections-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'collections' },
        async (payload) => {
          console.log('[Supabase Realtime] Event received:', payload.eventType, payload);

          if (payload.eventType === 'INSERT') {
            // Fetch joined details for the newly inserted record
            try {
              const res = await api.getCollections({ limit: 1 });
              const newSlip = res.collections.find(c => c.id === payload.new.id) || (payload.new as Collection);
              
              setCollections((prev) => [newSlip, ...prev.filter(c => c.id !== newSlip.id)]);
              setLatestLiveEvent({
                type: 'INSERT',
                collection: newSlip,
                timestamp: new Date(),
              });
            } catch (err) {
              console.error('Error fetching new realtime collection:', err);
            }
          } else if (payload.eventType === 'UPDATE') {
            setCollections((prev) =>
              prev.map((c) => (c.id === payload.new.id ? { ...c, ...(payload.new as Collection) } : c))
            );
            setLatestLiveEvent({
              type: 'UPDATE',
              collection: payload.new as Collection,
              timestamp: new Date(),
            });
          } else if (payload.eventType === 'DELETE') {
            setCollections((prev) => prev.filter((c) => c.id !== payload.old.id));
            setLatestLiveEvent({
              type: 'DELETE',
              timestamp: new Date(),
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeActive(true);
        } else {
          setRealtimeActive(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshCollections]);

  return {
    collections,
    loading,
    realtimeActive,
    latestLiveEvent,
    refreshCollections,
  };
};
