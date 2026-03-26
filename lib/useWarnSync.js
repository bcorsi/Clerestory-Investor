'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  getWarnFilings, saveWarnFilings, mergeNewFilings,
  getNewWarnCount, getLastSyncTime,
} from './warnStore';
import { supabase } from './supabase';
import { insertRecord, upsertWarnNotice } from './useSupabase';

export function useWarnSync() {
  const [filings, setFilings]   = useState([]);
  const [newCount, setNewCount] = useState(0);
  const [syncing, setSyncing]   = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError]       = useState(null);
  const [syncFailed, setSyncFailed] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = getWarnFilings();
    if (stored.length > 0) setFilings(stored);
    setNewCount(getNewWarnCount());
    setLastSync(getLastSyncTime());
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    setSyncFailed(false);
    try {
      const res = await fetch('/api/warn-sync');
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Sync failed');

      const existing = getWarnFilings();
      const { merged, newCount: nc, newFilings } = mergeNewFilings(existing, data.filings);

      saveWarnFilings(merged);
      localStorage.setItem('clerestory_warn_last_sync', new Date().toISOString());
      localStorage.setItem('clerestory_warn_new_count', String(nc));

      setFilings(merged);
      setNewCount(nc);
      setLastSync(new Date().toISOString());

      // Persist new filings to Supabase + auto-create leads
      if (newFilings.length > 0) {
        createDraftLeads(newFilings);
        persistToSupabase(newFilings).catch(e => console.error('WARN Supabase persist error:', e));
      }

      return { success: true, newCount: nc, total: merged.length };
    } catch (err) {
      setError(err.message);
      setSyncFailed(true);
      return { success: false, error: err.message };
    } finally {
      setSyncing(false);
    }
  }, []);

  return { filings, newCount, syncing, lastSync, error, syncFailed, sync };
}

// Persist new WARN filings to Supabase warn_notices + auto-create leads
async function persistToSupabase(newFilings) {
  for (const filing of newFilings) {
    // Upsert to warn_notices table
    await upsertWarnNotice(filing);

    // Auto-create lead record
    try {
      await insertRecord('leads', {
        lead_name: filing.company,
        company: filing.company,
        address: filing.address,
        city: filing.city,
        market: filing.market,
        catalyst_tags: ['warn_notice'],
        score: filing.is_closure ? 82 : 65,
        stage: 'New',
        tier: filing.is_closure ? 'A' : 'B',
        priority: filing.is_closure ? 'High' : 'Medium',
        notes: `WARN filing ${filing.notice_date} — ${filing.workers} workers — ${filing.type}`,
        source: 'WARN Intel',
      });
    } catch (e) {
      // Lead may already exist — ignore duplicate key errors
      if (!e?.message?.includes('duplicate') && !e?.message?.includes('unique')) {
        console.error('Auto-create lead error:', e);
      }
    }
  }
}

// Auto-create draft leads from new WARN filings (localStorage version)
function createDraftLeads(newFilings) {
  try {
    const existingLeads = JSON.parse(localStorage.getItem('clerestory_leads') || '[]');
    const existingKeys = new Set(
      existingLeads.map(l => `${l.company}|${l.city}`)
    );

    const newLeads = newFilings
      .filter(f => !existingKeys.has(`${f.company}|${f.city}`))
      .map(f => ({
        id: `warn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: f.company,
        address: f.address,
        city: f.city,
        market: f.market,
        sf: null,
        propType: 'Industrial',
        score: f.is_closure ? 82 : 65,
        grade: f.is_closure ? 'A' : 'B+',
        warn: true,
        warnDate: f.notice_date,
        warnType: f.type,
        workers: f.workers,
        stage: 'New',
        source: 'WARN Intel',
        catalysts: ['warn_notice'],
        createdAt: new Date().toISOString(),
        status: 'draft',
      }));

    if (newLeads.length > 0) {
      const updated = [...newLeads, ...existingLeads];
      localStorage.setItem('clerestory_leads', JSON.stringify(updated));
    }

    return newLeads;
  } catch (e) {
    console.error('createDraftLeads error', e);
    return [];
  }
}
