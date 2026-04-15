'use client';
import { useParams } from 'next/navigation';
import PropertyDetail from '@/components/PropertyDetail';

export default function PropertyPage() {
  const { id } = useParams();
  return <PropertyDetail id={id} />;
}
