'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

function fmt(n) { return n != null ? Number(n).toLocaleString() : '—'; }
function fmtM(n) { if(n==null) return '—'; const v=Number(n); return v>=1e6?'$'+(v/1e6).toFixed(1)+'M':'$'+fmt(v); }
function fmtPct(n) { return n!=null?Number(n).toFixed(1)+'%':'—'; }
function fmtDate(d) { if(!d) return '—'; return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }

const STAGES = ['Tracking','Underwriting','Offer / LOI','Under Contract','Due Diligence','Non-Contingent','Closed'];
const STAGE_MAP = {'Off-Market Outreach':'Offer / LOI','Marketing':'Offer / LOI','LOI':'Offer / LOI','LOI Accepted':'Under Contract','PSA Negotiation':'Under Contract','Closed Won':'Closed'};

export default function AcquisitionDetail() {
  const { id } = useParams();
  const [deal, setDeal] = useState(null);
  const [activities, setActivities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [logType, setLogType] = useState('call');
  const [logNote, setLogNote] = useState('');
  const [synth, setSynth] = useState(null);
  const [synthLoading, setSynthLoading] = useState(false);

  useEffect(() => { if(id) loadAll(); }, [id]);

  async function loadAll() {
    setLoading(true);
    try {
      const supabase = createClient();
      const [{ data: d }, { data: a }, { data: c }, { data: t }, { data: f }] = await Promise.all([
        supabase.from('deals').select('*').eq('id', id).single(),
        supabase.from('activities').select('*').eq('deal_id', id).order('created_at', { ascending: false }),
        supabase.from('deal_contacts').select('*, contacts(*)').eq('deal_id', id),
        supabase.from('tasks').select('*').eq('deal_id', id).order('due_date', { ascending: true }),
        supabase.from('file_attachments').select('*').eq('deal_id', id).order('created_at', { ascending: false }),
      ]);
      setDeal(d); setActivities(a||[]); setContacts(c||[]); setTasks(t||[]); setFiles(f||[]);
      if(d?.ai_synthesis) setSynth(d.ai_synthesis);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function logActivity() {
    if(!logNote.trim()) return;
    try {
      const supabase = createClient();
      await supabase.from('activities').insert({
        deal_id: id, activity_type: logType, subject: logNote,
        activity_date: new Date().toISOString(),
      });
      setLogNote('');
      loadAll();
    } catch(e) { console.error(e); }
  }

  async function generateSynthesis() {
    if(!deal) return;
    setSynthLoading(true);
    try {
      const prompt = `You are an institutional real estate acquisitions analyst. Generate a concise acquisition thesis for this deal:\n\nProperty: ${deal.deal_name || deal.address}\nAddress: ${deal.address}\nSF: ${deal.building_sf || '—'}\nAsking: ${fmtM(deal.deal_value)}\nGoing-in Cap: ${fmtPct(deal.going_in_cap)}\nTarget IRR: ${fmtPct(deal.target_irr)}\nStrategy: ${deal.strategy_type || deal.deal_type || '—'}\nStage: ${deal.stage}\nNotes from timeline: ${activities.slice(0,5).map(a => a.subject).join('. ')}\n\nWrite 3-4 sentences covering: investment thesis, key metrics, risk factors, and recommended next step. Be direct and specific.`;
      const resp = await fetch('/api/ai/synthesize', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });
      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content || data?.content?.[0]?.text || 'Synthesis unavailable.';
      setSynth(text);
      const supabase = createClient();
      await supabase.from('deals').update({ ai_synthesis: text }).eq('id', id);
    } catch(e) { console.error(e); setSynth('AI synthesis unavailable. Check API route.'); }
    finally { setSynthLoading(false); }
  }

  async function advanceStage() {
    if(!deal) return;
    const currentIdx = STAGES.indexOf(deal.stage);
    const mappedIdx = STAGES.indexOf(STAGE_MAP[deal.stage] || deal.stage);
    const idx = Math.max(currentIdx, mappedIdx);
    if(idx < STAGES.length - 1) {
      const next = STAGES[idx + 1];
      const supabase = createClient();
      await supabase.from('deals').update({ stage: next }).eq('id', id);
      await supabase.from('activities').insert({ deal_id: id, activity_type: 'stage_change', subject: 'Stage → ' + next });
      loadAll();
    }
  }

  if(loading) return <div className="cl-loading"><div className="cl-spinner"/>Loading acquisition…</div>;
  if(!deal) return <div style={{padding:40,textAlign:'center',color:'#78726A'}}>Acquisition not found.</div>;

  const mappedStage = STAGE_MAP[deal.stage] || deal.stage;
  const stageIdx = STAGES.indexOf(mappedStage);
  const basisPSF = deal.deal_value && deal.building_sf ? Math.round(Number(deal.deal_value)/Number(deal.building_sf)) : null;

  const TABS = ['Overview','Underwriting','IC Memo','Property','Contacts','Seller Outreach','Tasks','Files'];

  return (
    <div>
      {/* ── DEAL HEADER (clean, inline) ── */}
      <div style={{background:'#fff',borderBottom:'1px solid rgba(0,0,0,0.08)',padding:'16px 24px',display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:11,color:'#888',marginBottom:4}}>
            <Link href="/deals" style={{color:'var(--blue)',textDecoration:'none'}}>Acq Pipeline</Link>
            <span style={{margin:'0 5px',opacity:0.4}}>›</span>
            {deal.deal_name || deal.address}
          </div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:'#0E1520',marginBottom:5}}>{deal.deal_name || deal.company || deal.address}</h1>
          <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'#888',marginBottom:8,letterSpacing:'0.02em'}}>
            {(deal.address||'').toUpperCase()} {deal.city ? '· '+deal.city.toUpperCase() : ''} {deal.building_sf ? '· '+fmt(deal.building_sf)+' SF' : ''}
          </div>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            <Badge c="#156636" bg="rgba(21,102,54,0.08)" b="rgba(21,102,54,0.25)">Acquisition</Badge>
            <Badge c="#8C5A04" bg="rgba(140,90,4,0.08)" b="rgba(140,90,4,0.25)">● {mappedStage}</Badge>
            {deal.priority && <Badge c="#B83714" bg="rgba(184,55,20,0.08)" b="rgba(184,55,20,0.25)">{deal.priority}</Badge>}
            {(deal.strategy_type||deal.deal_type) && <Badge c="#5838A0" bg="rgba(88,56,160,0.08)" b="rgba(88,56,160,0.25)">{deal.strategy_type||deal.deal_type}</Badge>}
          </div>
        </div>
        <div style={{display:'flex',gap:7,flexShrink:0}}>
          <Btn onClick={logActivity}>+ Activity</Btn>
          <Btn green onClick={advanceStage}>Advance Stage →</Btn>
        </div>
      </div>

      {/* ── STAGE TRACK ── */}
      <div style={{background:'#fff',borderBottom:'1px solid rgba(0,0,0,0.08)',padding:'7px 24px',display:'flex',alignItems:'center',overflowX:'auto'}}>
        {STAGES.map((s,i) => (
          <div key={s} style={{display:'flex',alignItems:'center',flexShrink:0}}>
            <span style={{
              fontSize:12,padding:'4px 10px',borderRadius:4,fontWeight:i===stageIdx?600:500,cursor:'pointer',
              background:i<stageIdx?'rgba(21,102,54,0.08)':i===stageIdx?'#156636':'transparent',
              color:i<stageIdx?'#156636':i===stageIdx?'#fff':'#BBB',
            }}>{i===stageIdx?'● ':''}{s}</span>
            {i<STAGES.length-1 && <span style={{color:'rgba(0,0,0,0.12)',margin:'0 3px',fontSize:14}}>›</span>}
          </div>
        ))}
      </div>

      {/* ── KPI STRIP ── */}
      <div style={{display:'flex',background:'#FAFAF8',borderBottom:'1px solid rgba(0,0,0,0.08)'}}>
        <DKPI l="Acq Price" v={fmtM(deal.deal_value)} s={basisPSF?'~$'+basisPSF+'/SF':null} />
        <DKPI l="Going-In Cap" v={fmtPct(deal.going_in_cap)} vc="#156636" s={deal.stabilized_noi?fmtM(deal.stabilized_noi)+' NOI':null} />
        <DKPI l="Target IRR" v={fmtPct(deal.target_irr)} vc="#156636" s="levered · 5yr hold" />
        <DKPI l="Equity Required" v={fmtM(deal.equity_required)} vc="#4E6E96" s={deal.ltv_pct?deal.ltv_pct+'% LTV':null} />
        <DKPI l="Basis vs Replace" v={deal.replacement_cost_psf&&basisPSF?Math.round(basisPSF/Number(deal.replacement_cost_psf)*100)+'%':'—'} vc="#156636" s={deal.replacement_cost_psf?'$'+basisPSF+' vs $'+Math.round(Number(deal.replacement_cost_psf))+'/SF':null} />
        <DKPI l="Strategy" v={deal.strategy_type||deal.deal_type||'—'} s={deal.hold_period_years?deal.hold_period_years+'yr hold':null} last />
      </div>

      {/* ── TABS ── */}
      <div style={{background:'#fff',borderBottom:'1px solid rgba(0,0,0,0.08)',display:'flex',padding:'0 24px',overflowX:'auto'}}>
        {TABS.map((t,i) => (
          <div key={t} onClick={() => setTab(i)} style={{
            padding:'10px 14px',fontSize:13,color:i===tab?'#156636':'#888',cursor:'pointer',
            borderBottom:i===tab?'2px solid #156636':'2px solid transparent',fontWeight:i===tab?500:400,
            whiteSpace:'nowrap',flexShrink:0,
          }}>{t}
            {t==='Contacts'&&contacts.length>0&&<span style={{fontFamily:'var(--font-mono)',fontSize:10,background:'rgba(0,0,0,0.06)',borderRadius:7,padding:'1px 5px',marginLeft:4}}>{contacts.length}</span>}
            {t==='Tasks'&&tasks.length>0&&<span style={{fontFamily:'var(--font-mono)',fontSize:10,background:'rgba(0,0,0,0.06)',borderRadius:7,padding:'1px 5px',marginLeft:4}}>{tasks.length}</span>}
            {t==='Files'&&files.length>0&&<span style={{fontFamily:'var(--font-mono)',fontSize:10,background:'rgba(0,0,0,0.06)',borderRadius:7,padding:'1px 5px',marginLeft:4}}>{files.length}</span>}
            {t==='IC Memo'&&<span style={{fontSize:9,background:'rgba(21,102,54,0.08)',color:'#156636',borderRadius:7,padding:'1px 5px',marginLeft:4,fontWeight:600}}>AI</span>}
          </div>
        ))}
      </div>

      {/* ════ TAB 0: OVERVIEW ════ */}
      {tab===0 && (
        <div style={{display:'flex',padding:'18px 24px',gap:16,alignItems:'flex-start'}}>
          <div style={{flex:1,display:'flex',flexDirection:'column',gap:14}}>

            {/* Investment Returns */}
            <Card hdr="Investment Returns" act="Edit Assumptions">
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
                <RetCell l="Unlevered IRR" v={fmtPct(deal.unlevered_irr)} s="5-year hold" />
                <RetCell l="Levered IRR" v={fmtPct(deal.target_irr)} s={deal.ltv_pct?deal.ltv_pct+'% LTV':null} />
                <RetCell l="Equity Multiple" v={deal.equity_multiple?deal.equity_multiple+'×':'—'} s={deal.equity_required?fmtM(deal.equity_required)+' equity':null} last />
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)'}}>
                <SmRet l="Stabilized Yield" v={deal.stabilized_noi&&deal.deal_value?(Number(deal.stabilized_noi)/Number(deal.deal_value)*100).toFixed(1)+'%':'—'} vc="#156636" />
                <SmRet l="Cash-on-Cash Yr 1" v="—" vc="#4E6E96" />
                <SmRet l="Breakeven Occ." v="—" />
                <SmRet l="DSCR Yr 1" v="—" vc="#156636" last />
              </div>
            </Card>

            {/* AI Synthesis */}
            <div style={{background:'rgba(21,102,54,0.06)',border:'1px solid rgba(21,102,54,0.2)',borderRadius:8,overflow:'hidden'}}>
              <div style={{background:'rgba(21,102,54,0.1)',padding:'9px 14px',borderBottom:'1px solid rgba(21,102,54,0.15)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:11,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'#156636'}}>✦ AI Synthesis</span>
                <span onClick={generateSynthesis} style={{fontSize:12,color:'#156636',cursor:'pointer',fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic'}}>
                  {synthLoading ? 'Generating…' : synth ? 'Refresh' : 'Generate'}
                </span>
              </div>
              <div style={{padding:'12px 14px',fontSize:14,lineHeight:1.75,color:'#444'}}>
                {synth || <div style={{textAlign:'center',padding:'16px 0',color:'#888'}}>
                  <div style={{marginBottom:8}}>No synthesis yet. Generate an AI acquisition brief.</div>
                  <button onClick={generateSynthesis} style={{background:'#156636',color:'#fff',border:'none',padding:'8px 20px',borderRadius:6,fontSize:13,fontWeight:500,cursor:'pointer'}}>Generate Synthesis</button>
                </div>}
              </div>
            </div>

            {/* Activity Timeline */}
            <Card hdr="Activity Timeline" act="+ Log Activity">
              <div style={{padding:'8px 0 0'}}>
                <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center'}}>
                  <select value={logType} onChange={e=>setLogType(e.target.value)} style={{padding:'6px 10px',borderRadius:6,border:'1px solid rgba(0,0,0,0.08)',fontSize:13,fontFamily:'var(--font-body)'}}>
                    <option value="call">Call</option><option value="email">Email</option><option value="note">Note</option><option value="meeting">Meeting</option>
                  </select>
                  <input value={logNote} onChange={e=>setLogNote(e.target.value)} placeholder="Notes…" onKeyDown={e=>e.key==='Enter'&&logActivity()}
                    style={{flex:1,padding:'6px 10px',borderRadius:6,border:'1px solid rgba(0,0,0,0.08)',fontSize:13}} />
                  <button onClick={logActivity} style={{background:'#156636',color:'#fff',border:'none',padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:500,cursor:'pointer'}}>Log</button>
                </div>
                {activities.length === 0 ? <div style={{padding:16,textAlign:'center',color:'#888',fontSize:13}}>No activity yet.</div>
                : activities.map(a => (
                  <div key={a.id} style={{display:'flex',gap:9,padding:'9px 0',borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
                    <div style={{width:27,height:27,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0,
                      background:a.activity_type==='call'?'rgba(78,110,150,0.08)':a.activity_type==='stage_change'?'rgba(21,102,54,0.08)':a.activity_type==='email'?'rgba(88,56,160,0.08)':'rgba(140,90,4,0.08)',
                      color:a.activity_type==='call'?'#4E6E96':a.activity_type==='stage_change'?'#156636':a.activity_type==='email'?'#5838A0':'#8C5A04',
                    }}>{a.activity_type==='call'?'☏':a.activity_type==='stage_change'?'↑':a.activity_type==='email'?'✉':'✎'}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:500,color:'#1A1A1A'}}>{a.subject||a.activity_type}</div>
                      <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'#888',marginTop:2}}>{fmtDate(a.activity_date||a.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* 3-col Intel Grid */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
              {/* Seller Intelligence */}
              <Card hdr="Seller Intelligence">
                <DR k="Owner Readiness" v={deal.readiness_score?deal.readiness_score:'—'} vc={deal.readiness_score>=60?'#8C5A04':undefined} />
                <DR k="Hold Period" v={deal.hold_period_years?deal.hold_period_years+' yrs':'—'} />
                <DR k="Owner" v={deal.owner||'—'} />
                <DR k="Owner Type" v={deal.owner_type||'—'} />
              </Card>
              {/* Active Catalysts */}
              <Card hdr="Active Catalysts">
                {deal.catalyst_tags ? (
                  (typeof deal.catalyst_tags === 'string' ? JSON.parse(deal.catalyst_tags) : deal.catalyst_tags).map((tag,i) => {
                    const label = typeof tag === 'object' ? tag.tag : tag;
                    return <div key={i} style={{padding:'5px 0',borderBottom:'1px solid rgba(0,0,0,0.04)',fontSize:12,color:'#444'}}>{label}</div>;
                  })
                ) : <div style={{color:'#888',fontSize:12,padding:'8px 0'}}>No catalysts tagged yet</div>}
              </Card>
              {/* Broker Intel */}
              <Card hdr="Broker Intel">
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8,paddingBottom:6,borderBottom:'1px solid rgba(0,0,0,0.06)'}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:'#8C5A04'}}></div>
                  <span style={{fontSize:12,fontWeight:600,color:'#1A1A1A'}}>No Active Listing</span>
                </div>
                <DR k="Listing Broker" v="None on file" vc="#4E6E96" />
                <DR k="Last Sale Broker" v="—" />
                <div style={{marginTop:8,paddingTop:6,borderTop:'1px solid rgba(0,0,0,0.06)'}}>
                  <div style={{fontSize:9,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',color:'#156636',marginBottom:4}}>⚡ Recommendation</div>
                  <div style={{fontSize:12,color:'#1A1A1A',lineHeight:1.5,fontWeight:500}}>Go direct to owner. Off-market approach recommended.</div>
                </div>
              </Card>
            </div>
          </div>

          {/* ── SIDEBAR ── */}
          <div style={{width:260,flexShrink:0,display:'flex',flexDirection:'column',gap:12}}>
            {/* Portfolio Fit Score */}
            <Card hdr="Portfolio Fit Score">
              <div style={{textAlign:'center',padding:'8px 0'}}>
                <div style={{width:76,height:76,borderRadius:'50%',border:'4px solid #156636',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:26,fontWeight:600,color:'#156636'}}>{deal.portfolio_fit_score||'—'}</span>
                </div>
                <div style={{fontSize:13,fontWeight:600,color:'#1A1A1A'}}>{deal.portfolio_fit_grade||'—'}</div>
                <div style={{fontSize:11,color:'#888',marginTop:2}}>Portfolio fit assessment</div>
              </div>
            </Card>
            {/* Acquisition Details */}
            <Card hdr="Acquisition Details" act="Edit">
              <DR k="Strategy" v={deal.strategy_type||deal.deal_type||'—'} />
              <DR k="Stage" v={mappedStage} vc="#8C5A04" />
              <DR k="Priority" v={deal.priority||'—'} vc={deal.priority==='High'||deal.priority==='Critical'?'#B83714':undefined} />
              <DR k="Market" v={deal.market||'—'} />
              <DR k="Submarket" v={deal.submarket||'—'} />
              <DR k="Building SF" v={deal.building_sf?fmt(deal.building_sf)+' SF':'—'} mono />
              <DR k="Year Built" v={deal.year_built||'—'} mono />
              <DR k="Target Close" v={deal.target_close_date?fmtDate(deal.target_close_date):'—'} vc="#8C5A04" />
            </Card>
          </div>
        </div>
      )}

      {/* ════ TAB 1: UNDERWRITING ════ */}
      {tab===1 && <div style={{padding:'18px 24px'}}><Card hdr="Underwriting"><div style={{padding:40,textAlign:'center',color:'#888',fontSize:14}}>Full underwriting form coming next. Quick UW inputs + Returns Dashboard + NOI Build + Sensitivity table.</div></Card></div>}

      {/* ════ TAB 2: IC MEMO ════ */}
      {tab===2 && <div style={{padding:'18px 24px'}}><Card hdr="Investment Committee Memo"><div style={{padding:40,textAlign:'center',color:'#888',fontSize:14}}>AI-generated IC Memo with investment grade, thesis, risks, and recommendation. Coming next.</div></Card></div>}

      {/* ════ TAB 3: PROPERTY ════ */}
      {tab===3 && <div style={{padding:'18px 24px'}}><Card hdr="Property Details">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0}}>
          <div style={{padding:'11px 13px',borderRight:'1px solid rgba(0,0,0,0.06)'}}>
            <DR k="Building SF" v={deal.building_sf?fmt(deal.building_sf):'—'} mono /><DR k="Land Acres" v={deal.land_acres||'—'} mono />
            <DR k="Year Built" v={deal.year_built||'—'} mono /><DR k="Clear Height" v={deal.clear_height?deal.clear_height+"'":' —'} mono />
          </div>
          <div style={{padding:'11px 13px'}}>
            <DR k="Dock Doors" v={deal.dock_doors||'—'} mono /><DR k="Zoning" v={deal.zoning||'—'} mono />
            <DR k="Power" v={deal.power||'—'} mono /><DR k="Sprinklers" v={deal.sprinklers||'—'} mono />
          </div>
        </div>
      </Card></div>}

      {/* ════ TAB 4: CONTACTS ════ */}
      {tab===4 && <div style={{padding:'18px 24px'}}>
        {contacts.length===0 ? <Card hdr="Contacts"><div style={{padding:20,textAlign:'center',color:'#888'}}>No contacts linked to this deal yet.</div></Card>
        : contacts.map(dc => {
          const c = dc.contacts || dc;
          return <div key={dc.id} style={{background:'#FAFAF8',border:'1px solid rgba(0,0,0,0.06)',borderRadius:8,padding:12,marginBottom:8,display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'#4E6E96',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:'#fff'}}>{(c.name||'?').slice(0,2).toUpperCase()}</div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#1A1A1A'}}>{c.name}</div><div style={{fontSize:11,color:'#888'}}>{c.title} {c.company?'· '+c.company:''}</div></div>
            {c.phone && <span style={{fontSize:11,color:'#4E6E96',fontFamily:'var(--font-mono)'}}>{c.phone}</span>}
          </div>;
        })}
      </div>}

      {/* ════ TAB 5: SELLER OUTREACH ════ */}
      {tab===5 && <div style={{padding:'18px 24px'}}><Card hdr="Seller Outreach Log">
        {activities.filter(a=>['call','email','meeting'].includes(a.activity_type)).length===0
          ? <div style={{padding:20,textAlign:'center',color:'#888'}}>No outreach logged yet. Use the activity logger above.</div>
          : activities.filter(a=>['call','email','meeting'].includes(a.activity_type)).map(a => (
            <div key={a.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid rgba(0,0,0,0.04)',fontSize:13}}>
              <span style={{fontSize:10,fontWeight:600,padding:'2px 6px',borderRadius:3,
                background:a.activity_type==='call'?'rgba(78,110,150,0.08)':a.activity_type==='email'?'rgba(88,56,160,0.08)':'rgba(21,102,54,0.08)',
                color:a.activity_type==='call'?'#4E6E96':a.activity_type==='email'?'#5838A0':'#156636',
              }}>{a.activity_type}</span>
              <span style={{flex:1,color:'#444'}}>{a.subject}</span>
              <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'#888'}}>{fmtDate(a.activity_date||a.created_at)}</span>
            </div>
          ))}
      </Card></div>}

      {/* ════ TAB 6: TASKS ════ */}
      {tab===6 && <div style={{padding:'18px 24px'}}><Card hdr="Tasks">
        {tasks.length===0 ? <div style={{padding:20,textAlign:'center',color:'#888'}}>No tasks for this acquisition.</div>
        : tasks.map(t => (
          <div key={t.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
            <div style={{width:18,height:18,border:'2px solid '+(t.status==='done'?'#156636':'rgba(0,0,0,0.15)'),borderRadius:4,background:t.status==='done'?'#156636':'transparent'}}></div>
            <span style={{flex:1,fontSize:13,color:t.status==='done'?'#888':'#1A1A1A',textDecoration:t.status==='done'?'line-through':'none'}}>{t.title}</span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:t.due_date&&new Date(t.due_date)<new Date()&&t.status!=='done'?'#B83714':'#888'}}>{fmtDate(t.due_date)}</span>
          </div>
        ))}
      </Card></div>}

      {/* ════ TAB 7: FILES ════ */}
      {tab===7 && <div style={{padding:'18px 24px'}}><Card hdr="Files">
        {files.length===0 ? <div style={{padding:20,textAlign:'center',color:'#888'}}>No files attached yet.</div>
        : files.map(f => (
          <div key={f.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
            <div style={{width:32,height:32,borderRadius:6,background:'rgba(78,110,150,0.08)',color:'#4E6E96',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>📄</div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:'#1A1A1A'}}>{f.file_name||f.name||'File'}</div><div style={{fontSize:10,color:'#888'}}>{fmtDate(f.created_at)}</div></div>
          </div>
        ))}
      </Card></div>}
    </div>
  );
}

// ── Shared Components ─────────────────────────────────────────
function Card({hdr,act,children}) {
  return <div style={{background:'#FAFAF8',border:'1px solid rgba(0,0,0,0.08)',borderRadius:8,overflow:'hidden'}}>
    {hdr && <div style={{background:'#EDE8E0',padding:'9px 14px',borderBottom:'1px solid rgba(0,0,0,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <span style={{fontFamily:'var(--font-mono)',fontSize:11,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'#524D46'}}>{hdr}</span>
      {act && <span style={{fontSize:11,color:'var(--blue)',cursor:'pointer',fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic'}}>{act}</span>}
    </div>}
    <div style={{padding:'11px 14px'}}>{children}</div>
  </div>;
}

function DKPI({l,v,vc,s,last}) {
  return <div style={{flex:1,padding:'13px 16px',borderRight:last?'none':'1px solid rgba(0,0,0,0.06)'}}>
    <div style={{fontSize:9,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:'#888',marginBottom:3}}>{l}</div>
    <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:vc||'#1A1A1A',lineHeight:1}}>{v}</div>
    {s && <div style={{fontSize:11,color:'#888',marginTop:2}}>{s}</div>}
  </div>;
}

function RetCell({l,v,s,last}) {
  return <div style={{padding:'16px 18px',borderRight:last?'none':'1px solid rgba(0,0,0,0.06)',textAlign:'center'}}>
    <div style={{fontSize:10,fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase',color:'#888',marginBottom:7}}>{l}</div>
    <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:700,color:'#156636',lineHeight:1}}>{v}</div>
    {s && <div style={{fontSize:11,color:'#888',marginTop:4}}>{s}</div>}
  </div>;
}

function SmRet({l,v,vc,last}) {
  return <div style={{padding:'12px 14px',borderRight:last?'none':'1px solid rgba(0,0,0,0.04)'}}>
    <div style={{fontSize:10,color:'#888',marginBottom:4}}>{l}</div>
    <div style={{fontFamily:'var(--font-mono)',fontSize:16,fontWeight:600,color:vc||'#1A1A1A'}}>{v}</div>
  </div>;
}

function DR({k,v,vc,mono}) {
  return <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'5px 0',borderBottom:'1px solid rgba(0,0,0,0.05)',fontSize:13}}>
    <span style={{color:'#888'}}>{k}</span>
    <span style={{color:vc||'#1A1A1A',fontWeight:500,textAlign:'right',fontFamily:mono?'var(--font-mono)':undefined,fontSize:mono?12:undefined}}>{v}</span>
  </div>;
}

function Badge({c,bg,b,children}) {
  return <span style={{fontSize:11,fontWeight:500,padding:'3px 9px',borderRadius:4,background:bg,color:c,border:'1px solid '+b}}>{children}</span>;
}

function Btn({green,onClick,children}) {
  return <button onClick={onClick} style={{fontSize:12,padding:'7px 13px',borderRadius:5,cursor:'pointer',fontFamily:"'Instrument Sans',sans-serif",fontWeight:500,border:'1px solid '+(green?'#156636':'rgba(0,0,0,0.08)'),background:green?'#156636':'#fff',color:green?'#fff':'#444',whiteSpace:'nowrap'}}>{children}</button>;
}
