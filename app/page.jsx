'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { insertRecord } from '../lib/useSupabase';
import { supabase } from '../lib/supabase';
import { useWarnSync } from '../lib/useWarnSync';
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
import LeaseCompDetail from '../components/LeaseCompDetail.jsx';
import SaleCompDetail from '../components/SaleCompDetail.jsx';

/* ─── ErrorBoundary ──────────────────────────────────────────────── */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(e) { return { hasError: true, error: e }; }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 40, color: '#C03C18' }}>
        <h3>Page Error</h3>
        <pre style={{ fontSize: 12, opacity: 0.7 }}>{this.state.error?.message}</pre>
        <button onClick={() => this.setState({ hasError: false })}>Retry</button>
      </div>
    );
    return this.props.children;
  }
}

/* ─── Toast ──────────────────────────────────────────────────────── */
function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: t.type === 'error' ? '#C03C18' : t.type === 'success' ? '#1A7A48' : '#3B5F8A',
          color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          animation: 'slideUp 0.2s ease',
          pointerEvents: 'auto',
          maxWidth: 320,
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  /* ── Page / nav state ── */
  const [page, setPage] = useState('dashboard');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedLeaseComp, setSelectedLeaseComp] = useState(null);
  const [selectedSaleComp, setSelectedSaleComp] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  /* ── Supabase data ── */
  const [properties, setProperties] = useState([]);
  const [deals, setDeals] = useState([]);
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leaseComps, setLeaseComps] = useState([]);
  const [saleComps, setSaleComps] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Toast ── */
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  /* ── WARN sync ── */
  const { filings: warnFilings, newCount: warnNewCount, syncing: warnSyncing, lastSync: warnLastSync, error: warnError, syncFailed: warnSyncFailed, sync: warnSync } = useWarnSync();

  /* ── Load all data from Supabase ── */
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, d, l, c, a, t, lc, sc] = await Promise.all([
        supabase.from('properties').select('*').order('created_at', { ascending: false }),
        supabase.from('deals').select('*').order('updated_at', { ascending: false }),
        supabase.from('leads').select('*').order('score', { ascending: false }),
        supabase.from('contacts').select('*').order('name'),
        supabase.from('accounts').select('*').order('name'),
        supabase.from('tasks').select('*').eq('completed', false).order('due_date'),
        supabase.from('lease_comps').select('*').order('start_date', { ascending: false }),
        supabase.from('sale_comps').select('*').order('sale_date', { ascending: false }),
      ]);
      setProperties(p.data ?? []);
      setDeals(d.data ?? []);
      setLeads(l.data ?? []);
      setContacts(c.data ?? []);
      setAccounts(a.data ?? []);
      setTasks(t.data ?? []);
      setLeaseComps(lc.data ?? []);
      setSaleComps(sc.data ?? []);
    } catch (err) {
      console.error('loadAllData error:', err);
      toast('Failed to load data — check your connection', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  /* ── Auto-sync WARN once per day ── */
  useEffect(() => {
    const lastSync = localStorage.getItem('clerestory_warn_last_sync');
    if (!lastSync) { warnSync(); return; }
    const hoursSinceSync = (Date.now() - new Date(lastSync)) / (1000 * 60 * 60);
    if (hoursSinceSync >= 20) warnSync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Dynamic browser tab titles ── */
  useEffect(() => {
    const titles = {
      'command-center': 'Clerestory',
      'properties': 'Properties — Clerestory',
      'pipeline': 'Pipeline — Clerestory',
      'lead-gen': 'Lead Gen — Clerestory',
      'warn-intel': 'WARN Intel — Clerestory',
      'lease-comps': 'Lease Comps — Clerestory',
      'sale-comps': 'Sale Comps — Clerestory',
      'comp-analytics': 'Comp Analytics — Clerestory',
      'map-view': 'Map View — Clerestory',
      'owner-search': 'Owner Search — Clerestory',
      'campaigns': 'Campaigns — Clerestory',
      'news': 'News Feed — Clerestory',
      'tasks': 'Tasks — Clerestory',
      'accounts': 'Accounts — Clerestory',
      'contacts': 'Contacts — Clerestory',
    };
    document.title = titles[page] ?? 'Clerestory';
  }, [page]);

  /* ── Convert to Deal ── */
  const handleConvertToDeal = useCallback(async (source) => {
    try {
      const newDeal = {
        deal_name: source.owner || source.address || source.lead_name || source.company,
        address: source.address,
        city: source.city,
        market: source.market,
        stage: 'Tracking',
        deal_type: 'Investment Sale',
        property_id: source.prop_type ? source.id : null,
        lead_id: source.catalyst_tags ? source.id : null,
        deal_value: source.est_value || null,
        probability: 25,
        priority: 'Medium',
        notes: `Converted from: ${source.address || source.company}`,
      };
      const created = await insertRecord('deals', newDeal);
      await loadAllData();
      toast(`Deal created: ${created.deal_name}`, 'success');
      setSelectedDeal(created);
      setPage('deals');
    } catch (e) {
      toast(`Error creating deal: ${e.message}`, 'error');
    }
  }, [loadAllData, toast]);

  /* ── Create Property from Lead ── */
  const handleCreateProperty = useCallback(async (lead) => {
    try {
      const created = await insertRecord('properties', {
        address: lead.address,
        city: lead.city,
        market: lead.market,
        submarket: lead.submarket,
        building_sf: lead.building_sf,
        prop_type: lead.prop_type || 'Industrial',
        owner: lead.owner || lead.company,
        catalyst_tags: lead.catalyst_tags,
        notes: lead.notes,
      });
      await loadAllData();
      toast('Property record created', 'success');
      setSelectedProperty(created);
      setPage('properties');
    } catch (e) {
      toast(`Error: ${e.message}`, 'error');
    }
  }, [loadAllData, toast]);

  /* ── Navigation helpers ── */
  const navigate = (p) => {
    setPage(p);
    setSelectedProperty(null); setSelectedDeal(null); setSelectedLead(null);
    setSelectedAccount(null); setSelectedContact(null); setSelectedTask(null);
    setSelectedLeaseComp(null); setSelectedSaleComp(null);
  };
  const openProperty  = (p) => setSelectedProperty(p);
  const openDeal      = (d) => setSelectedDeal(d);
  const openLead      = (l) => setSelectedLead(l);
  const openAccount   = (a) => setSelectedAccount(a);
  const openContact   = (c) => setSelectedContact(c);
  const openTask      = (t) => setSelectedTask(t);

  /* ── Sidebar badge counts ── */
  const counts = {
    properties: properties.length || 18,
    leads:      leads.length      || 237,
    deals:      deals.filter(d => !['Closed Won','Dead'].includes(d.stage)).length || 12,
    contacts:   contacts.length   || 94,
    accounts:   accounts.length   || 68,
    tasks:      tasks.length      || 26,
    leaseComps: leaseComps.length || 175,
    saleComps:  saleComps.length  || 22,
    warn:       warnNewCount      || 4,
  };

  const marginLeft = sidebarCollapsed ? 64 : 242;

  /* ── Shared data props passed to every page ── */
  const dataProps = {
    properties, deals, leads, contacts, accounts, tasks, leaseComps, saleComps,
    loading, onRefresh: loadAllData, toast,
  };

  const renderPage = () => {
    // Detail views checked BEFORE page switch
    if (selectedLeaseComp) return <LeaseCompDetail comp={selectedLeaseComp} onBack={() => setSelectedLeaseComp(null)} onNavigate={navigate} />;
    if (selectedSaleComp)  return <SaleCompDetail  comp={selectedSaleComp}  onBack={() => setSelectedSaleComp(null)}  onNavigate={navigate} />;
    if (selectedProperty)  return <PropertyDetail  property={selectedProperty} onBack={() => setSelectedProperty(null)} onNavigate={navigate} onSelectAccount={openAccount} onConvertToDeal={handleConvertToDeal} deals={deals} leads={leads} contacts={contacts} leaseComps={leaseComps} saleComps={saleComps} onRefresh={loadAllData} toast={toast} />;
    if (selectedDeal)      return <DealDetail      deal={selectedDeal} onBack={() => { setSelectedDeal(null); setPage('deals'); }} onNavigate={navigate} onSelectAccount={openAccount} properties={properties} contacts={contacts} leaseComps={leaseComps} saleComps={saleComps} onSelectProperty={openProperty} onRefresh={loadAllData} toast={toast} />;
    if (selectedLead)      return <LeadDetail      lead={selectedLead} onBack={() => setSelectedLead(null)} onNavigate={navigate} onConvertToDeal={handleConvertToDeal} onCreateProperty={handleCreateProperty} deals={deals} contacts={contacts} leaseComps={leaseComps} saleComps={saleComps} onRefresh={loadAllData} toast={toast} />;
    if (selectedAccount)   return <AccountDetailPage account={selectedAccount} onBack={() => setSelectedAccount(null)} onNavigate={navigate} onSelectContact={openContact} onSelectProperty={openProperty} onSelectDeal={openDeal} properties={properties} deals={deals} contacts={contacts} />;
    if (selectedContact)   return <ContactDetailPage contact={selectedContact} onBack={() => setSelectedContact(null)} onNavigate={navigate} onSelectAccount={openAccount} onSelectProperty={openProperty} onSelectDeal={openDeal} />;
    if (selectedTask)      return <TaskDetailPage   task={selectedTask} onBack={() => setSelectedTask(null)} onNavigate={navigate} />;

    switch (page) {
      case 'dashboard':    return <CommandCenter onNavigate={navigate} counts={counts} />;
      case 'properties':   return <PropertiesList  {...dataProps} onSelectProperty={openProperty} />;
      case 'leads':        return <LeadGenList     {...dataProps} onSelectLead={openLead} onNavigate={navigate} />;
      case 'deals':        return <DealPipeline    {...dataProps} onSelectDeal={openDeal} />;
      case 'warn':         return <WarnIntel filings={warnFilings} newCount={warnNewCount} syncing={warnSyncing} lastSync={warnLastSync} syncFailed={warnSyncFailed} onSync={warnSync} onCreateLead={() => setPage('leads')} onNavigate={navigate} toast={toast} onRefresh={loadAllData} />;
      case 'accounts':     return <Accounts        {...dataProps} onSelectAccount={openAccount} />;
      case 'contacts':     return <ContactsList    {...dataProps} onSelectContact={openContact} />;
      case 'tasks':        return <Tasks           {...dataProps} onSelectTask={openTask} onSelectProperty={openProperty} onSelectDeal={openDeal} onSelectLead={openLead} />;
      case 'lease-comps':  return <LeaseCompsPage  onNavigate={navigate} onSelectComp={c => setSelectedLeaseComp(c)} leaseComps={leaseComps} loading={loading} onRefresh={loadAllData} />;
      case 'sale-comps':   return <SaleCompsPage   onNavigate={navigate} onSelectComp={c => setSelectedSaleComp(c)} saleComps={saleComps} loading={loading} onRefresh={loadAllData} />;
      case 'map':          return <MapViewPage      onNavigate={navigate} onSelectProperty={openProperty} onSelectLead={openLead} properties={properties} leads={leads} />;
      case 'owner-search': return <OwnerSearchPage  onNavigate={navigate} onSelectAccount={openAccount} accounts={accounts} />;
      case 'news':         return <NewsFeed         onNavigate={navigate} />;
      case 'campaigns':    return <Campaigns        onNavigate={navigate} />;
      case 'comp-analytics': return <CompAnalytics  onNavigate={navigate} leaseComps={leaseComps} saleComps={saleComps} onSelectLeaseComp={c => { setSelectedLeaseComp(c); setPage('lease-comps'); }} onSelectSaleComp={c => { setSelectedSaleComp(c); setPage('sale-comps'); }} />;
      default:             return (
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
        <ErrorBoundary key={page}>
          {renderPage()}
        </ErrorBoundary>
      </div>
      <Toast toasts={toasts} />
    </div>
  );
}
