import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

// ─── Generic fetch hook ───────────────────────────────────────────
export function useTable(table, options = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from(table).select(options.select || '*');
      if (options.filter) {
        Object.entries(options.filter).forEach(([col, val]) => {
          query = query.eq(col, val);
        });
      }
      if (options.order) query = query.order(options.order, { ascending: options.asc ?? false });
      if (options.limit) query = query.limit(options.limit);

      const { data: rows, error: err } = await query;
      if (err) throw err;
      setData(rows || []);
    } catch (err) {
      setError(err.message);
      console.error(`Error fetching ${table}:`, err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, JSON.stringify(options)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ─── Insert a record ──────────────────────────────────────────────
export async function insertRecord(table, record) {
  const { data, error } = await supabase
    .from(table)
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Update a record ──────────────────────────────────────────────
export async function updateRecord(table, id, updates) {
  const { data, error } = await supabase
    .from(table)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Delete a record ──────────────────────────────────────────────
export async function deleteRecord(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

// ─── Log an activity ──────────────────────────────────────────────
export async function logActivity(activity) {
  return insertRecord('activities', {
    activity_type: activity.type,
    subject: activity.subject,
    notes: activity.notes,
    activity_date: activity.date || new Date().toISOString(),
    property_id: activity.propertyId || null,
    lead_id: activity.leadId || null,
    deal_id: activity.dealId || null,
    contact_id: activity.contactId || null,
    completed: true,
  });
}

// ─── Create a task ────────────────────────────────────────────────
export async function createTask(task) {
  return insertRecord('tasks', {
    title: task.title,
    description: task.description || null,
    due_date: task.dueDate || null,
    priority: task.priority || 'Medium',
    completed: false,
    property_id: task.propertyId || null,
    lead_id: task.leadId || null,
    deal_id: task.dealId || null,
    contact_id: task.contactId || null,
    account_id: task.accountId || null,
  });
}

// ─── Upsert warn notice ───────────────────────────────────────────
export async function upsertWarnNotice(filing) {
  const { error } = await supabase.from('warn_notices').upsert({
    company: filing.company,
    address: filing.address,
    city: filing.city,
    county: filing.county,
    market: filing.market,
    workers: filing.workers,
    type: filing.type,
    notice_date: filing.notice_date,
    effective_date: filing.effective_date || null,
  }, { onConflict: 'company,city,notice_date' });
  if (error) console.error('upsertWarnNotice error:', error);
}

// ─── Toast helper (used in components) ───────────────────────────
let _toastFn = null;
export function registerToast(fn) { _toastFn = fn; }
export function showToast(msg, type = 'error') { _toastFn?.(msg, type); }
