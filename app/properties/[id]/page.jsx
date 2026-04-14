'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import PropertyDetail from '@/components/PropertyDetail';

export default function PropertyDetailPage({ params }) {
  const { id } = params;
  return (
    <div>
      <PropertyDetail id={id} inline={false} />
    </div>
  );
}
