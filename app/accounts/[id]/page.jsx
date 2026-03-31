'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import AccountDetailPage from '@/components/AccountDetailPage';

export default function AccountDetailRoute() {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setAccount(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return (
    <div className="cl-loading" style={{ padding: 60 }}>
      <div className="cl-spinner" />Loading account…
    </div>
  );

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 0 64px' }}>
      <AccountDetailPage account={account} />
    </div>
  );
}
