'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import DealDetail from '@/components/DealDetail';

export default function DealDetailPage() {
  const { id } = useParams();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setDeal(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return (
    <div className="cl-loading" style={{ padding: 60 }}>
      <div className="cl-spinner" />Loading deal…
    </div>
  );

  return (
    <div style={{ maxWidth: 1700, margin: '0 auto', padding: '0 0 64px' }}>
      <DealDetail deal={deal} />
    </div>
  );
}
