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
import LeaseCompsPage from '../components/LeaseCompsPage.jsx';
import SaleCompsPage from '../components/SaleCompsPage.jsx';
import MapViewPage from '../components/MapViewPage.jsx';
import OwnerSearchPage from '../components/OwnerSearchPage.jsx';
import AccountDetailPage from '../components/AccountDetailPage.jsx';
import ContactDetailPage from '../components/ContactDetailPage.jsx';
import TaskDetailPage from '../components/TaskDetailPage.jsx';
import NewsFeed from '../components/NewsFeed.jsx';
import Campaigns from '../components/Campaigns.jsx';
import CompAnalytics from '../components/CompAnalytics.jsx';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // navigate() — used by sidebar, resets all detail state
  const navigate = (p) => {
    setPage(p);
    setSelectedProperty(null);
    setSelectedDeal(null);
    setSelectedLead(null);
    setSelectedAccount(null);
    setSelectedContact(null);
    setSelectedTask(null);
  };

  // openXxx() — used by list row clicks, ONLY sets the selected item (no page reset)
  const openProperty = (p) => setSelectedProperty(p);
  const openDeal = (d) => setSelectedDeal(d);
  const openLead = (l) => setSelectedLead(l);
  const openAccount = (a) => setSelectedAccount(a);
  const openContact = (c) => setSelectedContact(c);
  const openTask = (t) => setSelectedTask(t);

  const counts = { properties: 18, leads: 237, deals: 12, contacts: 94, accounts: 68, tasks: 26, leaseComps: 175, saleComps: 22, warn: 4 };

  const marginLeft = sidebarCollapsed ? 64 : 242;

  const renderPage = () => {
    // Detail views — checked BEFORE the page switch so they overlay any list page
    if (selectedProperty) return <PropertyDetail property={selectedProperty} onBack={() => setSelectedProperty(null)} onNavigate={navigate} onSelectAccount={openAccount} />;
    if (selectedDeal) return <DealDetail deal={selectedDeal} onBack={() => { setSelectedDeal(null); setPage('deals'); }} onNavigate={navigate} onSelectAccount={openAccount} />;
    if (selectedLead) return <LeadDetail lead={selectedLead} onBack={() => setSelectedLead(null)} onNavigate={navigate} />;
    if (selectedAccount) return <AccountDetailPage account={selectedAccount} onBack={() => setSelectedAccount(null)} onNavigate={navigate} />;
    if (selectedContact) return <ContactDetailPage contact={selectedContact} onBack={() => setSelectedContact(null)} onNavigate={navigate} />;
    if (selectedTask) return <TaskDetailPage task={selectedTask} onBack={() => setSelectedTask(null)} onNavigate={navigate} />;

    switch (page) {
      case 'dashboard':     return <CommandCenter onNavigate={navigate} counts={counts} />;
      case 'properties':    return <PropertiesList onSelectProperty={openProperty} />;
      case 'leads':         return <LeadGenList onSelectLead={openLead} onNavigate={navigate} />;
      case 'deals':         return <DealPipeline onSelectDeal={openDeal} />;
      case 'warn':          return <WarnIntel onCreateLead={() => setPage('leads')} onNavigate={navigate} />;
      case 'accounts':      return <Accounts onSelectAccount={openAccount} />;
      case 'contacts':      return <ContactsList onSelectContact={openContact} />;
      case 'tasks':         return <Tasks onSelectTask={openTask} />;
      case 'lease-comps':   return <LeaseCompsPage onNavigate={navigate} />;
      case 'sale-comps':    return <SaleCompsPage onNavigate={navigate} />;
      case 'map':           return <MapViewPage onNavigate={navigate} />;
      case 'owner-search':  return <OwnerSearchPage onNavigate={navigate} />;
      case 'news':          return <NewsFeed onNavigate={navigate} />;
      case 'campaigns':     return <Campaigns onNavigate={navigate} />;
      case 'comp-analytics': return <CompAnalytics onNavigate={navigate} />;
      default:              return (
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
