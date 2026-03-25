'use client';
import { useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import CommandCenter from '../components/CommandCenter.jsx';
import LeadGenList from '../components/LeadGenList.jsx';
import DealPipeline from '../components/DealPipeline.jsx';
import DealDetail from '../components/DealDetail.jsx';
import PropertyDetail from '../components/PropertyDetail.jsx';
import WarnIntel from '../components/WarnIntel.jsx';
import LeadDetail from '../components/LeadDetail.jsx';

// Add more imports as you build them:
// import PropertiesList from '../components/PropertiesList';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  const navigate = (p) => { setPage(p); setSelectedProperty(null); setSelectedDeal(null); setSelectedLead(null); };

  // Counts for sidebar badges — replace with Supabase live counts
  const counts = { properties: 18, leads: 237, deals: 12, contacts: 94, accounts: 68, tasks: 26, leaseComps: 175, saleComps: 22, warn: 4 };

  const renderPage = () => {
    // Detail views
    if (selectedProperty) return <PropertyDetail property={selectedProperty} onBack={() => setSelectedProperty(null)} />;
    if (selectedDeal) return <DealDetail deal={selectedDeal} onBack={() => { setSelectedDeal(null); setPage('deals'); }} />;
    if (selectedLead) return <LeadDetail lead={selectedLead} onBack={() => setSelectedLead(null)} />;

    switch (page) {
      case 'dashboard':    return <CommandCenter onNavigate={navigate} counts={counts} />;
      case 'properties':   return (
        // Placeholder until PropertiesList is built
        <div style={{ padding: 40, color: 'var(--ink3)' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, color: 'var(--ink)', marginBottom: 8 }}>Properties</div>
          <div>PropertiesList component coming soon. Click any property to open detail.</div>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SAMPLE_PROPERTIES.map(p => (
              <div key={p.id} style={{ padding: '12px 16px', background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line2)', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center' }}
                onClick={() => setSelectedProperty(p)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: 'var(--ink2)' }}>{p.address}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink4)', marginTop: 2 }}>{p.city} · {p.buildingSF?.toLocaleString()} SF</div>
                </div>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--ink4)' }}>→ Open detail</span>
              </div>
            ))}
          </div>
        </div>
      );
      case 'leads':        return <LeadGenList onSelectLead={(l) => setSelectedLead(l)} onNavigate={navigate} />;
      case 'deals':        return <DealPipeline onSelectDeal={(d) => setSelectedDeal(d)} />;
      case 'warn':         return <WarnIntel onCreateLead={(f) => { setPage('leads'); }} />;
      default:             return (
        <div style={{ padding: 40, color: 'var(--ink3)', fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontStyle: 'italic' }}>
          {page.charAt(0).toUpperCase() + page.slice(1)} — coming soon
        </div>
      );
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar currentPage={page} onNavigate={navigate} counts={counts} />
      <div style={{ flex: 1, marginLeft: 242, display: 'flex', flexDirection: 'column' }}>
        {renderPage()}
      </div>
    </div>
  );
}

const SAMPLE_PROPERTIES = [
  { id: 1, address: '14022 Nelson Ave E', city: 'Baldwin Park', buildingSF: 186400, lat: 34.0887, lng: -117.9712 },
  { id: 2, address: '4900 Workman Mill Rd', city: 'City of Industry', buildingSF: 312000, lat: 34.0058, lng: -117.9775 },
];
