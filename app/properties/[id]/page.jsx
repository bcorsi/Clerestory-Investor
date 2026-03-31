import PropertyDetail from '@/components/PropertyDetail';

export default function PropertyDetailPage({ params }) {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 28px 64px' }}>
      <PropertyDetail id={params.id} />
    </div>
  );
}
