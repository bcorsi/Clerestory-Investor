/* ══════════════════════════════════════════════════════════════
   CLERESTORY — Global Styles
   Dark industrial theme for CRE brokerage intelligence
   ══════════════════════════════════════════════════════════════ */

@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  /* Surfaces — Ice Blue */
  --bg-root:       #eef3f9;
  --bg-panel:      #ffffff;
  --bg-card:       #ffffff;
  --bg-card-hover: #f0f4fa;
  --bg-input:      #f4f7fb;
  --bg-modal:      #ffffff;

  /* Borders */
  --border:        #d4dce8;
  --border-focus:  #2563eb;
  --border-subtle: #e8edf5;

  /* Text */
  --text-primary:   #1a2332;
  --text-secondary: #5a6577;
  --text-muted:     #8d96a5;
  --text-inverse:   #ffffff;

  /* Accent */
  --accent:        #2563eb;
  --accent-hover:  #1d4ed8;
  --accent-soft:   rgba(37, 99, 235, 0.08);
  --accent-glow:   rgba(37, 99, 235, 0.15);

  /* Status */
  --green:   #16a34a;
  --green-soft: rgba(22, 163, 74, 0.08);
  --red:     #dc2626;
  --red-soft: rgba(220, 38, 38, 0.07);
  --amber:   #d97706;
  --amber-soft: rgba(217, 119, 6, 0.08);
  --purple:  #7c3aed;
  --purple-soft: rgba(124, 58, 237, 0.08);

  /* Layout */
  --sidebar-w: 240px;
  --header-h:  56px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;

  /* Font */
  --font-sans: 'DM Sans', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Transitions */
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body { height: 100%; overflow: hidden; }

body {
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.55;
  color: var(--text-primary);
  background: var(--bg-root);
  -webkit-font-smoothing: antialiased;
}

/* ─── SCROLLBARS ──────────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #c5cdd8; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #a0aab8; }

/* ─── APP LAYOUT ──────────────────────────────────────────── */
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
}

/* ─── SIDEBAR ─────────────────────────────────────────────── */
.sidebar {
  width: var(--sidebar-w);
  min-width: var(--sidebar-w);
  background: var(--bg-panel);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 50;
}

.sidebar-header {
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.sidebar-logo {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar-logo-icon {
  width: 28px;
  height: 28px;
  background: var(--accent);
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: white;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 10px;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 20px;
}

.nav-section-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 0 10px;
  margin-bottom: 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14.5px;
  font-weight: 500;
  transition: all 0.15s var(--ease);
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}

.nav-item:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--accent-soft);
  color: var(--accent);
}

.nav-item-icon {
  width: 20px;
  font-size: 16px;
  text-align: center;
  flex-shrink: 0;
}

.nav-item-badge {
  margin-left: auto;
  background: var(--bg-card);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 10px;
  font-family: var(--font-mono);
}

.nav-item.active .nav-item-badge {
  background: var(--accent-soft);
  color: var(--accent);
}

/* ─── MAIN CONTENT AREA ──────────────────────────────────── */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.main-header {
  height: var(--header-h);
  min-height: var(--header-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-panel);
}

.main-header h1 {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* ─── BUTTONS ─────────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 0.15s var(--ease);
  border: 1px solid transparent;
  white-space: nowrap;
}

.btn-primary {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
.btn-primary:hover { background: var(--accent-hover); }

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: var(--border);
}
.btn-ghost:hover {
  background: var(--bg-card);
  color: var(--text-primary);
  border-color: var(--text-muted);
}

.btn-sm { padding: 5px 12px; font-size: 13px; }
.btn-icon {
  padding: 6px;
  width: 32px;
  height: 32px;
  justify-content: center;
  font-size: 16px;
}

/* ─── INPUTS ──────────────────────────────────────────────── */
.input, .select, .textarea {
  width: 100%;
  padding: 9px 14px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  font-family: var(--font-sans);
  transition: border-color 0.15s var(--ease);
  outline: none;
}

.input:focus, .select:focus, .textarea:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235c6270'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}

.select option { background: #ffffff; color: var(--text-primary); }

.textarea { min-height: 80px; resize: vertical; }

.form-group { margin-bottom: 14px; }
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 5px;
}
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

/* ─── SEARCH BAR ──────────────────────────────────────────── */
.search-bar {
  position: relative;
  width: 280px;
}

.search-bar input {
  width: 100%;
  padding: 8px 12px 8px 34px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  font-family: var(--font-sans);
  outline: none;
  transition: all 0.15s var(--ease);
}

.search-bar input:focus {
  border-color: var(--border-focus);
  background: var(--bg-input);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.search-bar-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 14px;
  pointer-events: none;
}

.search-kbd {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  background: var(--bg-panel);
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid var(--border);
}

/* ─── CARDS ───────────────────────────────────────────────── */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px;
}

.card-hover { cursor: pointer; transition: all 0.15s var(--ease); }
.card-hover:hover {
  background: var(--bg-card-hover);
  border-color: var(--text-muted);
}

/* ─── STAT CARDS ──────────────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 18px 20px;
}

.stat-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.stat-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* ─── TABLE ───────────────────────────────────────────────── */
.table-container {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.table-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}

.table-header-bar h3 {
  font-size: 14px;
  font-weight: 600;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead th {
  position: sticky;
  top: 0;
  background: var(--bg-panel);
  padding: 11px 14px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  text-align: left;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

tbody tr {
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background 0.1s var(--ease);
}

tbody tr:hover { background: var(--bg-card-hover); }
tbody tr:last-child { border-bottom: none; }

td {
  padding: 11px 14px;
  font-size: 14px;
  color: var(--text-secondary);
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

td.text-primary { color: var(--text-primary); font-weight: 500; }

/* ─── TAGS ────────────────────────────────────────────────── */
.tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.tag-blue    { background: var(--accent-soft);  color: var(--accent); }
.tag-green   { background: var(--green-soft);   color: var(--green); }
.tag-red     { background: var(--red-soft);     color: var(--red); }
.tag-amber   { background: var(--amber-soft);   color: var(--amber); }
.tag-purple  { background: var(--purple-soft);  color: var(--purple); }
.tag-ghost   { background: rgba(255,255,255,0.05); color: var(--text-secondary); }

/* ─── KANBAN ──────────────────────────────────────────────── */
.kanban-board {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 20px;
  min-height: calc(100vh - 180px);
}

.kanban-col {
  min-width: 230px;
  max-width: 230px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.kanban-col-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.kanban-col-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.kanban-col-count {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
}

.kanban-col-cards {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kanban-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 14px;
  cursor: pointer;
  transition: all 0.15s var(--ease);
}

.kanban-card:hover {
  background: var(--bg-card-hover);
  border-color: var(--text-muted);
  transform: translateY(-1px);
}

.kanban-card-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 6px;
  line-height: 1.4;
}

.kanban-card-sub {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.kanban-card-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--text-muted);
}

.kanban-card-value {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--green);
  font-size: 13px;
}

/* ─── PROBABILITY BAR ─────────────────────────────────────── */
.prob-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prob-bar-track {
  flex: 1;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
  max-width: 60px;
}

.prob-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s var(--ease);
}

.prob-bar-label {
  font-size: 12px;
  font-family: var(--font-mono);
  font-weight: 500;
  min-width: 32px;
}

/* ─── MODAL ───────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.15s var(--ease);
}

.modal {
  background: var(--bg-modal);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 640px;
  max-height: 85vh;
  overflow-y: auto;
  animation: slideUp 0.2s var(--ease);
}

.modal-lg { max-width: 800px; }
.modal-sm { max-width: 440px; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 20px;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: all 0.15s;
}
.modal-close:hover { color: var(--text-primary); background: var(--bg-card); }

.modal-body { padding: 24px; }

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--border);
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

/* ─── SEARCH RESULTS DROPDOWN ─────────────────────────────── */
.search-results {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--bg-modal);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  max-height: 380px;
  overflow-y: auto;
  z-index: 200;
  box-shadow: 0 12px 40px rgba(0,0,0,0.12);
}

.search-section-label {
  padding: 8px 14px 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background 0.1s;
}

.search-result-item:hover { background: var(--bg-card-hover); }

.search-result-item .result-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.search-result-item .result-sub {
  font-size: 13px;
  color: var(--text-muted);
}

/* ─── DETAIL VIEW ─────────────────────────────────────────── */
.detail-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-subtle);
}

.detail-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 8px;
  padding: 5px 0;
}

.detail-label {
  font-size: 13px;
  color: var(--text-muted);
}

.detail-value {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.detail-apn-table {
  width: 100%;
  font-size: 13px;
}

.detail-apn-table td {
  padding: 6px 0;
  font-family: var(--font-mono);
  font-size: 13px;
}

/* ─── CSV UPLOAD ──────────────────────────────────────────── */
.upload-zone {
  border: 2px dashed var(--border);
  border-radius: var(--radius-md);
  padding: 48px 24px;
  text-align: center;
  transition: all 0.2s var(--ease);
  cursor: pointer;
}

.upload-zone:hover, .upload-zone.dragging {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.upload-zone-icon {
  font-size: 36px;
  margin-bottom: 12px;
  color: var(--text-muted);
}

.upload-zone-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.upload-zone-sub {
  font-size: 12px;
  color: var(--text-muted);
}

/* ─── EMPTY STATE ─────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
}

.empty-state-icon {
  font-size: 40px;
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-state-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.empty-state-desc {
  font-size: 13px;
  color: var(--text-muted);
  max-width: 320px;
  margin-bottom: 20px;
}

/* ─── TOAST ───────────────────────────────────────────────── */
.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 20px;
  font-size: 14px;
  color: var(--text-primary);
  box-shadow: 0 8px 30px rgba(0,0,0,0.1);
  z-index: 300;
  animation: slideUp 0.2s var(--ease);
}

/* ─── RESPONSIVE ──────────────────────────────────────────── */
@media (max-width: 768px) {
  :root { --sidebar-w: 0px; }
  .sidebar { display: none; }
  .main-content { padding: 16px; }
  .detail-grid { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .kanban-col { min-width: 200px; max-width: 200px; }
  .search-bar { width: 200px; }
}

/* ─── MISC ────────────────────────────────────────────────── */
.text-green { color: var(--green); }
.text-red { color: var(--red); }
.text-amber { color: var(--amber); }
.text-accent { color: var(--accent); }
.text-muted { color: var(--text-muted); }
.text-mono { font-family: var(--font-mono); }
.font-medium { font-weight: 500; }
.gap-8 { gap: 8px; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.ml-auto { margin-left: auto; }
.mt-4 { margin-top: 16px; }
.mb-4 { margin-bottom: 16px; }
.mb-6 { margin-bottom: 24px; }
.w-full { width: 100%; }


/* v17 additions */
.show-dd { display: block !important; }
