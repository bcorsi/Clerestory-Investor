import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  );
}

// CA EDD WARN report URL
const EDD_WARN_URL = 'https://edd.ca.gov/siteassets/files/jobs_and_training/warn/warn_report.xlsx';

// Counties that map to our markets
const TARGET_COUNTIES = {
  'Los Angeles': 'SGV',
  'San Bernardino': 'IE West',
  'Riverside': 'IE East',
  'Orange': 'OC',
};

// SGV/IE city keywords for finer market assignment
const CITY_MARKET_MAP = {
  'city of industry': 'SGV', 'baldwin park': 'SGV', 'irwindale': 'SGV',
  'el monte': 'SGV', 'azusa': 'SGV', 'covina': 'SGV', 'pomona': 'SGV',
  'walnut': 'SGV', 'rowland heights': 'SGV', 'hacienda heights': 'SGV',
  'south el monte': 'SGV', 'santa fe springs': 'SGV', 'whittier': 'SGV',
  'commerce': 'SGV', 'vernon': 'SGV', 'pico rivera': 'SGV',
  'ontario': 'IE West', 'fontana': 'IE West', 'rancho cucamonga': 'IE West',
  'chino': 'IE West', 'mira loma': 'IE West', 'jurupa valley': 'IE West',
  'rialto': 'IE West', 'bloomington': 'IE West', 'upland': 'IE West',
  'montclair': 'IE West', 'eastvale': 'IE West', 'norco': 'IE West',
  'san bernardino': 'IE East', 'riverside': 'IE East', 'moreno valley': 'IE East',
  'perris': 'IE East', 'redlands': 'IE East', 'corona': 'IE East',
  'colton': 'IE East', 'loma linda': 'IE East',
};

export async function GET(request) {
  try {
    // 1. Download EDD WARN Excel
    const response = await fetch(EDD_WARN_URL, {
      headers: { 'User-Agent': 'Clerestory CRE Intelligence' },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch EDD file', status: response.status },
        { status: 500 }
      );
    }

    const buffer = await response.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    // 2. Map EDD columns to our schema
    const filings = rows.map(row => ({
      company:       row['Company'] || row['Employer'] || '',
      address:       row['Address'] || '',
      city:          row['City'] || '',
      county:        row['County'] || '',
      zip:           String(row['Zip'] || ''),
      workers:       parseInt(row['No. Of Employees'] || row['Employees'] || 0),
      type:          row['Layoff/Closure'] || row['Type'] || 'Layoff',
      notice_date:   row['Notice Date'] || row['Date'] || '',
      effective_date: row['Effective Date'] || '',
      received_date: row['Received Date'] || '',
    })).filter(f => f.company && f.workers > 0);

    // 3. Filter to our markets only
    const relevant = filings.filter(f => {
      const county = (f.county || '').trim();
      const city = (f.city || '').toLowerCase().trim();
      return TARGET_COUNTIES[county] || CITY_MARKET_MAP[city];
    });

    // 4. Assign market and prepare for Supabase
    const withMarket = relevant.map(f => ({
      company: f.company,
      address: f.address,
      city: f.city,
      county: f.county,
      zip: f.zip,
      workers: f.workers,
      notice_type: f.type,
      notice_date: f.notice_date || null,
      effective_date: f.effective_date || null,
      received_date: f.received_date || null,
      market: CITY_MARKET_MAP[f.city.toLowerCase().trim()] ||
              TARGET_COUNTIES[f.county] || 'SGV',
      is_closure: (f.type || '').toLowerCase().includes('clos'),
    }));

    // 5. Upsert into Supabase warn_notices table (deduplicate by company + notice_date)
    let inserted = 0;
    let skipped = 0;

    if (withMarket.length > 0) {
      // Fetch existing filings to deduplicate
      const { data: existing } = await getSupabase()
        .from('warn_notices')
        .select('company, notice_date');

      const existingSet = new Set(
        (existing || []).map(e => `${(e.company || '').toLowerCase()}|${e.notice_date || ''}`)
      );

      const newFilings = withMarket.filter(f => {
        const key = `${f.company.toLowerCase()}|${f.notice_date || ''}`;
        return !existingSet.has(key);
      });

      skipped = withMarket.length - newFilings.length;

      if (newFilings.length > 0) {
        // Insert in batches of 50
        for (let i = 0; i < newFilings.length; i += 50) {
          const batch = newFilings.slice(i, i + 50);
          const { error } = await getSupabase().from('warn_notices').insert(batch);
          if (error) {
            console.error('[warn-sync] insert error:', error);
          } else {
            inserted += batch.length;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      total_in_file: filings.length,
      relevant_count: withMarket.length,
      inserted,
      skipped,
      synced_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[warn-sync]', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
