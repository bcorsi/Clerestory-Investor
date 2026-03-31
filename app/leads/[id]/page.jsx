'use client';

import { useParams } from 'next/navigation';
import LeadDetail from '@/components/LeadDetail';

export default function LeadDetailPage() {
  const { id } = useParams();
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 0 64px' }}>
      <LeadDetail leadId={id} />
    </div>
  );
}
