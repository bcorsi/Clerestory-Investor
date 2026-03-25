'use client';
import { useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import CommandCenter from '../components/CommandCenter.jsx';
import PropertiesList from '../components/PropertiesList.jsx';
import LeadGenList from '../components/LeadGenList.jsx';
import DealPipeline from '../components/DealPipeline.jsx';
import DealDetail from '../components/DealDetail.jsx';
import PropertyDetail from '../components/PropertyDetail.jsx';
import WarnIntel from '../components/WarnIntel.jsx';
import LeadDetail from '../components/LeadDetail.jsx';
import Accounts from '../components/Accounts.jsx';
import ContactsList from '../components/ContactsList.jsx';
import Tasks from '../components/Tasks.jsx';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navigate = (p) => { setPage(p); setSelectedProperty(null); setSelectedDeal(null); setSelectedLead(null); };

  const counts = { properties: 18, leads: 237, deals: 12, contacts: 94, accounts: 68, tasks: 26, leaseComps: 175, saleComps: 22, warn: 4 };

  const marginLeft = sidebarCollapsed ? 64 : 242;

  const renderPage = () => {
    if (selectedProperty) return <PropertyDetail property={selectedProperty} onBack={() => setSelectedProperty(null)} />;
    if (selectedDeal) return <DealDetail deal={selectedDeal} onBack={() => { setSelectedDeal(null); setPage('deals'); }} />;
    if (selectedLead) return <LeadDetail lead={selectedLead} onBack={() => setSelectedLead(null)} />;

    switch (page) {
      case 'dashboard':  return <CommandCenter onNavigate={navigate} counts={counts} />;
      case 'properties': return <PropertiesList onSelectProperty={(p) => setSelectedProperty(p)} />;
      case 'leads':      return <LeadGenList onSelectLead={(l) => setSelectedLead(l)} onNavigate={navigate} />;
      case 'deals':      return <DealPipeline onSelectDeal={(d) => setSelectedDeal(d)} />;
      case 'warn':       return <WarnIntel onCreateLead={() => setPage('leads')} />;
      case 'accounts':   return <Accounts />;
      case 'contacts':   return <ContactsList />;
      case 'tasks':      return <Tasks />;
      default:           return (
        <div style={{ padding: 40, color: 'var(--ink3)', fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontStyle: 'italic' }}>
          {page.charAt(0).toUpperCase() + page.slice(1)} — coming soon
        </div>
      );
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar currentPage={page} onNavigate={navigate} counts={counts} onCollapseChange={setSidebarCollapsed} />
      <div style={{ flex: 1, marginLeft, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 0, transition: 'margin-left 0.25s ease' }}>
        {renderPage()}
      </div>
    </div>
  );
}
