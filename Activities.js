'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isConfigured, getSession, onAuthStateChange, signOut } from '../lib/supabase';
import { fetchProperties, fetchAll, globalSearch, getTodayBrief, saveDailyBrief } from '../lib/db';
import { DEAL_STAGES, STAGE_COLORS, fmt } from '../lib/constants';
import AuthGate from '../components/AuthGate';
import Sidebar from '../components/Sidebar';
import Dashboard from '../components/Dashboard';
import PropertiesList from '../components/PropertiesList';
import PropertyDetail from '../components/PropertyDetail';
import LeadGen from '../components/LeadGen';
import LeadDetail from '../components/LeadDetail';
import DealPipeline from '../components/DealPipeline';
import DealDetail from '../components/DealDetail';
import ContactsList from '../components/ContactsList';
import ContactDetail from '../components/ContactDetail';
import AccountsList from '../components/AccountsList';
import AccountDetail from '../components/AccountDetail';
import Activities from '../components/Activities';
import Tasks from '../components/Tasks';
import TaskDetail from '../components/TaskDetail';
import LeaseComps from '../components/LeaseComps';
import LeaseCompDetail from '../components/LeaseCompDetail';
import SaleComps from '../components/SaleComps';
import ProfileSettings from '../components/ProfileSettings';
import CsvUpload from '../components/CsvUpload';
import AddPropertyModal from '../components/AddPropertyModal';
import AddLeadModal from '../components/AddLeadModal';
import AddDealModal from '../components/AddDealModal';
import AddContactModal from '../components/AddContactModal';
import AddAccountModal from '../components/AddAccountModal';
import AddActivityModal from '../components/AddActivityModal';
import AddTaskModal from '../components/AddTaskModal';
import AddLeaseCompModal from '../components/AddLeaseCompModal';
import AddSaleCompModal from '../components/AddSaleCompModal';
import WarnIntel from '../components/WarnIntel';
import CatalystView from '../components/CatalystView';
import MapView from '../components/MapView';

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [properties, setProperties] = useState([]);
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leaseComps, setLeaseComps] = useState([]);
  const [saleComps, setSaleComps] = useState([]);
  const [notes, setNotes] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedLeaseComp, setSelectedLeaseComp] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [morningBrief, setMorningBrief] = useState(null);
  const [catalystFilter, setCatalystFilter] = useState(null);

  useEffect(() => {
    getSession().then((s) => { setSession(s); setAuthLoading(false); });
    const { data: { subscription } } = onAuthStateChange((s) => setSession(s));
    return () => subscription?.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try { await signOut(); setSession(null); setPage('dashboard'); }
    catch (err) { console.error(err); }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [props, lds, dls, cts, accts, acts, tks, lcs, scs, nts, fus] = await Promise.all([
        fetchProperties(),
        fetchAll('leads', { order: 'created_at' }),
        fetchAll('deals', { order: 'created_at' }),
        fetchAll('contacts', { order: 'created_at' }),
        fetchAll('accounts', { order: 'created_at' }),
        fetchAll('activities', { order: 'created_at' }),
        fetchAll('tasks', { order: 'created_at' }),
        fetchAll('lease_comps', { order: 'created_at' }),
        fetchAll('sale_comps', { order: 'created_at' }),
        fetchAll('notes', { order: 'created_at' }).catch(() => []),
        fetchAll('follow_ups', { order: 'created_at' }).catch(() => []),
      ]);
      setProperties(props); setLeads(lds); setDeals(dls); setContacts(cts);
      setAccounts(accts); setActivities(acts); setTasks(tks);
      setLeaseComps(lcs); setSaleComps(scs);
      setNotes(nts); setFollowUps(fus);
      setSelectedProperty((prev) => prev ? props.find((p) => p.id === prev.id) || prev : prev);
      setSelectedLead((prev) => prev ? lds.find((l) => l.id === prev.id) || prev : prev);
      setSelectedDeal((prev) => prev ? dls.find((d) => d.id === prev.id) || prev : prev);
      setSelectedContact((prev) => prev ? cts.find((c) => c.id === prev.id) || prev : prev);
      setSelectedAccount((prev) => prev ? accts.find((a) => a.id === prev.id) || prev : prev);
      setSelectedLeaseComp((prev) => prev ? lcs.find((c) => c.id === prev.id) || prev : prev);
      setSelectedTask((prev) => prev ? tks.find((t) => t.id === prev.id) || prev : prev);
    } catch (err) { console.error('Load error:', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (session || !isConfigured()) loadData(); }, [loadData, session]);

  // Load today's AI brief on startup
  useEffect(() => {
    if (session || !isConfigured()) {
      getTodayBrief().then(b => { if (b?.content) setMorningBrief(b.content); });
    }
  }, [session]);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults(null); return; }
    const timer = setTimeout(async () => { setSearchResults(await globalSearch(searchQuery)); }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowSearch((s) => !s); }
      if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); setSearchResults(null); setModal(null); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const openProperty = (prop) => { setSelectedProperty(prop); setPage('property-detail'); };
  const openLead = (lead) => { setSelectedLead(lead); setPage('lead-detail'); };
  const openDeal = (deal) => { setSelectedDeal(deal); setPage('deal-detail'); };
  const openContact = (contact) => { setSelectedContact(contact); setPage('contact-detail'); };
  const openAccount = (account) => { setSelectedAccount(account); setPage('account-detail'); };
  const openTask = (task) => { setSelectedTask(task); setPage('task-detail'); };
  const openLeaseComp = (comp) => { setSelectedLeaseComp(comp); setPage('lease-comp-detail'); };
  const openCatalyst = (tag) => { setCatalystFilter(tag); setPage('catalyst-view'); };
  const openMap = () => { setPage('map-view'); };

  const goBack = () => {
    const backMap = {
      'property-detail': 'properties',
      'lead-detail': 'lead-gen',
      'deal-detail': 'pipeline',
      'contact-detail': 'contacts',
      'account-detail': 'accounts',
      'lease-comp-detail': 'lease-comps',
      'catalyst-view': 'dashboard',
    };
    const back = backMap[page];
    if (back) setPage(back);
    setSelectedProperty(null); setSelectedLead(null); setSelectedDeal(null);
    setSelectedContact(null); setSelectedAccount(null); setSelectedLeaseComp(null);
    setCatalystFilter(null);
  };

  const handleSearchClick = (type, item) => {
    setShowSearch(false); setSearchQuery(''); setSearchResults(null);
    if (type === 'property') openProperty(item);
    else if (type === 'deal') openDeal(item);
    else if (type === 'contact') openContact(item);
    else if (type === 'lead') openLead(item);
    else if (type === 'account') openAccount(item);
  };

  const onRecordAdded = (label) => { setModal(null); loadData(); showToast(`${label} added`); };

  const isDetailPage = ['property-detail', 'lead-detail', 'deal-detail', 'contact-detail', 'account-detail', 'lease-comp-detail', 'catalyst-view'].includes(page);

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-root)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, background: 'var(--accent)', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontWeight: 700, marginBottom: 12 }}>C</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    </div>
  );

  if (!session && isConfigured()) return <AuthGate onAuth={() => getSession().then(setSession)} />;

  const counts = {
    properties: properties.length,
    leads: leads.filter((l) => !['Converted', 'Dead'].includes(l.stage)).length,
    deals: deals.length,
    contacts: contacts.length,
    accounts: accounts.length,
    pendingActivities: activities.filter((a) => !a.completed && a.activity_type === 'To-Do').length,
    pendingTasks: tasks.filter((t) => !t.completed).length,
    leaseComps: leaseComps.length,
    saleComps: saleComps.length,
    hotDeals: deals.filter((d) => !['Closed', 'Dead'].includes(d.stage)).length,
  };

  const pageTitles = {
    dashboard: 'Command Center', properties: 'Properties',
    'property-detail': selectedProperty?.address || 'Property',
    'lead-gen': 'Lead Generation', 'lead-detail': selectedLead?.lead_name || 'Lead',
    pipeline: 'Deal Pipeline', 'deal-detail': selectedDeal?.deal_name || 'Deal',
    contacts: 'Contacts', 'contact-detail': selectedContact?.name || 'Contact',
    accounts: 'Accounts', 'account-detail': selectedAccount?.name || 'Account',
    activities: 'Activities', tasks: 'Tasks', 'task-detail': selectedTask?.title || 'Task',
    'lease-comps': 'Lease Comps', 'lease-comp-detail': selectedLeaseComp?.address || 'Lease Comp',
    'sale-comps': 'Sale Comps', 'warn-intel': 'WARN Intel',
    'catalyst-view': catalystFilter ? `Catalyst: ${catalystFilter}` : 'Catalyst View',
    'map-view': 'Map View',
    settings: 'Settings',
  };

  const pageTitle = pageTitles[page] || 'Clerestory';

  const addButtons = {
    properties: [{ label: '+ Property', modal: 'add-property' }],
    'lead-gen': [{ label: '+ Lead', modal: 'add-lead' }],
    pipeline: [{ label: '+ Deal', modal: 'add-deal' }],
    contacts: [{ label: '+ Contact', modal: 'add-contact' }],
    accounts: [{ label: '+ Account', modal: 'add-account' }],
    activities: [{ label: '+ Activity', modal: 'add-activity' }],
    tasks: [{ label: '+ Task', modal: 'add-task' }],
    'lease-comps': [{ label: '+ Comp', modal: 'add-lease-comp' }],
    'sale-comps': [{ label: '+ Sale Comp', modal: 'add-sale-comp' }],
  };

  return (
    <div className="app-layout">
      <Sidebar page={page} setPage={setPage} counts={counts} user={session?.user} onSignOut={handleSignOut} />

      <div className="main-area">
        <header className="main-header">
          <div className="flex items-center gap-8">
            {isDetailPage && <button className="btn btn-ghost btn-sm" onClick={goBack}>← Back</button>}
            <h1>{pageTitle}</h1>
          </div>

          <div className="header-actions">
            <div className="search-bar">
              <span className="search-bar-icon">⌕</span>
              <input placeholder="Search everything..." value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)} />
              <span className="search-kbd">⌘K</span>
              {showSearch && searchResults && (
                <div className="search-results">
                  {searchResults.properties?.length > 0 && (<>
                    <div className="search-section-label">Properties</div>
                    {searchResults.properties.map((p) => (
                      <div key={p.id} className="search-result-item" onClick={() => handleSearchClick('property', p)}>
                        <div className="result-title">{p.address}</div>
                        <div className="result-sub">{p.city} · {p.submarket}</div>
                      </div>
                    ))}
                  </>)}
                  {searchResults.leads?.length > 0 && (<>
                    <div className="search-section-label">Leads</div>
                    {searchResults.leads.map((l) => (
                      <div key={l.id} className="search-result-item" onClick={() => handleSearchClick('lead', l)}>
                        <div className="result-title">{l.lead_name}</div>
                        <div className="result-sub">{l.stage} · {l.address || ''}</div>
                      </div>
                    ))}
                  </>)}
                  {searchResults.deals?.length > 0 && (<>
                    <div className="search-section-label">Deals</div>
                    {searchResults.deals.map((d) => (
                      <div key={d.id} className="search-result-item" onClick={() => handleSearchClick('deal', d)}>
                        <div className="result-title">{d.deal_name}</div>
                        <div className="result-sub">{d.stage} · {d.deal_value ? fmt.price(d.deal_value) : ''}</div>
                      </div>
                    ))}
                  </>)}
                  {searchResults.contacts?.length > 0 && (<>
                    <div className="search-section-label">Contacts</div>
                    {searchResults.contacts.map((c) => (
                      <div key={c.id} className="search-result-item" onClick={() => handleSearchClick('contact', c)}>
                        <div className="result-title">{c.name}</div>
                        <div className="result-sub">{c.company} · {c.contact_type}</div>
                      </div>
                    ))}
                  </>)}
                  {searchResults.accounts?.length > 0 && (<>
                    <div className="search-section-label">Accounts</div>
                    {searchResults.accounts.map((a) => (
                      <div key={a.id} className="search-result-item" onClick={() => handleSearchClick('account', a)}>
                        <div className="result-title">{a.name}</div>
                        <div className="result-sub">{a.account_type} · {a.city || ''}</div>
                      </div>
                    ))}
                  </>)}
                  {!searchResults.properties?.length && !searchResults.deals?.length && !searchResults.contacts?.length && !searchResults.leads?.length && !searchResults.accounts?.length && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No results for "{searchQuery}"</div>
                  )}
                </div>
              )}
            </div>

            {(addButtons[page] || []).map((btn) => (
              <button key={btn.modal} className="btn btn-primary" onClick={() => setModal(btn.modal)}>{btn.label}</button>
            ))}
            {page !== 'settings' && !isDetailPage && (
              <button className="btn btn-ghost btn-sm" onClick={() => setModal('csv-upload')}>↑ Import</button>
            )}
          </div>
        </header>

        <div className="main-content" onClick={() => { setShowSearch(false); setSearchResults(null); }}>
          {loading ? (
            <div className="empty-state"><div className="empty-state-icon">◌</div><div className="empty-state-title">Loading...</div></div>
          ) : (<>
            {page === 'dashboard' && <Dashboard properties={properties} deals={deals} leads={leads} contacts={contacts} leaseComps={leaseComps} saleComps={saleComps} tasks={tasks} activities={activities} onPropertyClick={openProperty} onDealClick={openDeal} onLeadClick={openLead} onContactClick={openContact} setPage={setPage} morningBrief={morningBrief} setMorningBrief={setMorningBrief} saveDailyBrief={saveDailyBrief} />}
            {page === 'properties' && <PropertiesList properties={properties} onPropertyClick={openProperty} />}
            {page === 'property-detail' && selectedProperty && <PropertyDetail property={selectedProperty} deals={deals} leads={leads} contacts={contacts} leaseComps={leaseComps} saleComps={saleComps} activities={activities} tasks={tasks} notes={notes} followUps={followUps} onLeaseCompClick={openLeaseComp} onDealClick={openDeal} onLeadClick={openLead} onContactClick={openContact} onAccountClick={openAccount} onCatalystClick={openCatalyst} onAddActivity={(propId) => setModal({ type: 'add-activity', defaultPropertyId: propId })} onAddTask={(propId) => setModal({ type: 'add-task', defaultPropertyId: propId })} accounts={accounts} showToast={showToast} onRefresh={loadData} />}
            {page === 'lead-gen' && <LeadGen leads={leads} onRefresh={loadData} showToast={showToast} onLeadClick={openLead} />}
            {page === 'lead-detail' && selectedLead && <LeadDetail lead={selectedLead} activities={activities} tasks={tasks} properties={properties} contacts={contacts} accounts={accounts} notes={notes} followUps={followUps} onRefresh={loadData} showToast={showToast} onPropertyClick={openProperty} onContactClick={openContact} onAccountClick={openAccount} onCatalystClick={openCatalyst} onAddActivity={(leadId) => setModal({ type: 'add-activity', defaultLeadId: leadId })} onAddTask={(leadId) => setModal({ type: 'add-task', defaultLeadId: leadId })} onConverted={() => setPage('pipeline')} />}
            {page === 'pipeline' && <DealPipeline deals={deals} onRefresh={loadData} showToast={showToast} onDealClick={openDeal} />}
            {page === 'deal-detail' && selectedDeal && <DealDetail deal={selectedDeal} activities={activities} tasks={tasks} properties={properties} contacts={contacts} accounts={accounts} notes={notes} followUps={followUps} onRefresh={loadData} showToast={showToast} onPropertyClick={openProperty} onContactClick={openContact} onAccountClick={openAccount} onCatalystClick={openCatalyst} onAddActivity={(leadId, dealId) => setModal({ type: 'add-activity', defaultDealId: dealId })} onAddTask={(dealId) => setModal({ type: 'add-task', defaultDealId: dealId })} />}
            {page === 'contacts' && <ContactsList contacts={contacts} onContactClick={openContact} />}
            {page === 'contact-detail' && selectedContact && <ContactDetail contact={selectedContact} activities={activities} tasks={tasks} deals={deals} properties={properties} onRefresh={loadData} showToast={showToast} onDealClick={openDeal} onPropertyClick={openProperty} onAddActivity={(a, b, c, contactId) => setModal({ type: 'add-activity', defaultContactId: contactId })} onAddTask={(a, b, c, contactId) => setModal({ type: 'add-task', defaultContactId: contactId })} />}
            {page === 'accounts' && <AccountsList accounts={accounts} onAccountClick={openAccount} />}
            {page === 'account-detail' && selectedAccount && <AccountDetail account={selectedAccount} contacts={contacts} deals={deals} properties={properties} activities={activities} tasks={tasks} onRefresh={loadData} showToast={showToast} onContactClick={openContact} onDealClick={openDeal} onPropertyClick={openProperty} />}
            {page === 'activities' && <Activities activities={activities} onRefresh={loadData} showToast={showToast} onAdd={() => setModal('add-activity')} />}
            {page === 'tasks' && <Tasks tasks={tasks} leads={leads} deals={deals} properties={properties} contacts={contacts} onRefresh={loadData} showToast={showToast} onAdd={() => setModal('add-task')} onTaskClick={openTask} onLeadClick={openLead} onDealClick={openDeal} onPropertyClick={openProperty} onContactClick={openContact} />}
            {page === 'task-detail' && selectedTask && <TaskDetail task={selectedTask} leads={leads} deals={deals} properties={properties} contacts={contacts} accounts={accounts} activities={activities} onRefresh={loadData} showToast={showToast} onLeadClick={openLead} onDealClick={openDeal} onPropertyClick={openProperty} onContactClick={openContact} onAccountClick={openAccount} onBack={() => setPage('tasks')} />}
            {page === 'lease-comps' && <LeaseComps comps={leaseComps} onCompClick={openLeaseComp} />}
            {page === 'lease-comp-detail' && selectedLeaseComp && <LeaseCompDetail comp={selectedLeaseComp} properties={properties} />}
            {page === 'sale-comps' && <SaleComps comps={saleComps} />}
            {page === 'warn-intel' && <WarnIntel properties={properties} leads={leads} onRefresh={loadData} showToast={showToast} />}
            {page === 'catalyst-view' && catalystFilter && <CatalystView tag={catalystFilter} properties={properties} leads={leads} deals={deals} onPropertyClick={openProperty} onLeadClick={openLead} onDealClick={openDeal} onClear={() => { setCatalystFilter(null); setPage('dashboard'); }} />}
            {page === 'map-view' && <MapView properties={properties} leads={leads} deals={deals} onPropertyClick={openProperty} onLeadClick={openLead} onDealClick={openDeal} />}
            {page === 'settings' && <ProfileSettings user={session?.user} showToast={showToast} />}
          </>)}
        </div>
      </div>

      {/* Modals */}
      {modal === 'add-property' && <AddPropertyModal onClose={() => setModal(null)} onSave={() => onRecordAdded('Property')} />}
      {modal === 'add-lead' && <AddLeadModal onClose={() => setModal(null)} onSave={() => onRecordAdded('Lead')} />}
      {modal === 'add-deal' && <AddDealModal onClose={() => setModal(null)} onSave={() => onRecordAdded('Deal')} />}
      {modal === 'add-contact' && <AddContactModal onClose={() => setModal(null)} onSave={() => onRecordAdded('Contact')} />}
      {modal === 'add-account' && <AddAccountModal onClose={() => setModal(null)} onSave={() => onRecordAdded('Account')} />}
      {modal === 'add-lease-comp' && <AddLeaseCompModal onClose={() => setModal(null)} onSave={() => onRecordAdded('Comp')} />}
      {modal === 'add-sale-comp' && <AddSaleCompModal onClose={() => setModal(null)} onSave={() => onRecordAdded('Sale comp')} />}
      {(modal === 'add-activity' || modal?.type === 'add-activity') && (
        <AddActivityModal onClose={() => setModal(null)} onSave={() => onRecordAdded('Activity')}
          defaultLeadId={modal?.defaultLeadId} defaultDealId={modal?.defaultDealId} defaultContactId={modal?.defaultContactId}
          leads={leads} deals={deals} properties={properties} contacts={contacts} />
      )}
      {(modal === 'add-task' || modal?.type === 'add-task') && (
        <AddTaskModal onClose={() => setModal(null)} onSave={() => onRecordAdded('Task')}
          defaultLeadId={modal?.defaultLeadId} defaultDealId={modal?.defaultDealId}
          leads={leads} deals={deals} properties={properties} contacts={contacts} />
      )}
      {modal === 'csv-upload' && <CsvUpload onClose={() => setModal(null)} onDone={() => { setModal(null); loadData(); showToast('CSV imported'); }} />}

      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}
