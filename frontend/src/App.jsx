import { useState, useEffect } from 'react';
import { Plane, BarChart3, TrendingUp, Settings, Upload, Clock, Euro, Activity, Trash2, Database, Building2, RefreshCcw, FileText, Sun, Moon, GraduationCap, FileSpreadsheet, Edit2, Star } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Line, Doughnut, Bar, Pie } from 'react-chartjs-2';
import logo from './assets/AeroBudget-transparent-logo.png';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);
ChartJS.defaults.color = 'rgba(128,128,128,0.8)'; // Base color for scales
ChartJS.defaults.font.family = "'Inter', sans-serif";


const API = '';

function useTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const stored = localStorage.getItem('theme');
  const [theme, setTheme] = useState(stored || (prefersDark ? 'dark' : 'light'));
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  return [theme, setTheme];
}

function formatMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

function getColor(str) {
  const palette = ['#7b4b94', '#4b8f8c', '#c6ebbe', '#ffa5a5', '#beb2c8'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % palette.length;
  return palette[idx];
}

function Dashboard({ stats }) {
  const [showAllMonths, setShowAllMonths] = useState(false);
  
  const allMonths = stats?.monthly_costs?.map(m => m.month) ?? [];
  const allCosts = stats?.monthly_costs?.map(m => m.cost) ?? [];
  
  const months = showAllMonths ? allMonths : allMonths.slice(-12);
  const costs = showAllMonths ? allCosts : allCosts.slice(-12);
  
  const aircraftLabels = stats?.aircraft_stats?.map(a => a.aircraft) ?? [];
  const aircraftMinutes = stats?.aircraft_stats?.map(a => a.minutes) ?? [];
  const aircraftColors = aircraftLabels.map(l => getColor(l));
  
  const trainingLabels = stats?.training_stats?.map(t => t.name) ?? [];
  const trainingCosts = stats?.training_stats?.map(t => t.cost) ?? [];
  const trainingColors = trainingLabels.map(l => getColor(l));

  return (
    <>
      <main className="dashboard-grid">
        <div className="glass-panel" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', gridColumn: '1 / -1' }}>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <div className="stat-label"><Activity size={14} style={{ display: 'inline', marginRight: 4 }} />Flüge</div>
            <div className="stat-value">{stats?.total_flights ?? 0}</div>
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <div className="stat-label"><Clock size={14} style={{ display: 'inline', marginRight: 4 }} />Flugzeit</div>
            <div className="stat-value">{formatMinutes(stats?.total_flight_minutes ?? 0)}</div>
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <div className="stat-label"><Euro size={14} style={{ display: 'inline', marginRight: 4 }} />Kosten</div>
            <div className="stat-value">{(stats?.total_cost ?? 0).toFixed(2)} €</div>
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <div className="stat-label"><TrendingUp size={14} style={{ display: 'inline', marginRight: 4 }} />Ø / h</div>
            <div className="stat-value">{(stats?.cost_per_hour ?? 0).toFixed(0)} €</div>
          </div>
        </div>

        <div className="glass-panel">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><GraduationCap size={18} /> Ausbildungskosten</h2>
          {trainingLabels.length > 0 ? (
            <Pie
              data={{
                labels: trainingLabels,
                datasets: [{ 
                  data: trainingCosts, 
                  backgroundColor: trainingColors, 
                  borderWidth: 0,
                  hoverOffset: 20
                }]
              }}
              options={{
                plugins: {
                  legend: { 
                    position: 'bottom', 
                    labels: { color: 'var(--text-primary)', padding: 20 } 
                  },
                  tooltip: { 
                    callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed.toFixed(2)} €` } 
                  }
                }
              }}
            />
          ) : <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Keine Ausbildung aktiv</p>}
        </div>

        <div className="glass-panel">
          <h2>Flugzeit pro Flugzeug</h2>
          <Doughnut
            data={{
              labels: aircraftLabels,
              datasets: [{ data: aircraftMinutes, backgroundColor: aircraftColors, borderWidth: 0 }]
            }}
            options={{
              cutout: '70%',
              plugins: {
                legend: { position: 'bottom', labels: { color: 'var(--text-primary)', padding: 20 } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatMinutes(ctx.parsed)}` } }
              }
            }}
          />
        </div>

        <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>Kostenentwicklung</h2>
            <button 
              onClick={() => setShowAllMonths(!showAllMonths)}
              className="nav-btn" 
              style={{ fontSize: '0.8rem', padding: '4px 12px', background: 'rgba(56,189,248,0.1)' }}
            >
              {showAllMonths ? 'Letzte 12 Monate' : 'Alle anzeigen'}
            </button>
          </div>
          {months.length > 0 ? (
            <Line
              data={{
                labels: months,
                datasets: [{ label: 'Kosten', data: costs, borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.1)', tension: 0.4, fill: true }]
              }}
              options={{ responsive: true, plugins: { legend: { display: false } } }}
            />
          ) : <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Keine Daten verfügbar</p>}
        </div>
      </main>
    </>
  );
}

function FlightTable({ flights }) {
  return (
    <div className="glass-panel">
      <h2 style={{ marginBottom: 20 }}>Alle Flüge ({flights.length})</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
              {['Datum', 'Kennzeichen', 'Von', 'Nach', 'Block', 'Flug', 'Art', 'Schulung', 'Kosten'].map(h => (
                <th key={h} style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flights.map(f => (
              <tr key={f.id} style={{ borderBottom: '1px solid rgba(128,128,128,0.07)' }}>
                <td style={{ padding: '12px' }}>{formatDate(f.date)}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', borderRadius: 4, padding: '2px 8px' }}>{f.aircraft}</span>
                </td>
                <td style={{ padding: '12px' }}>{f.departure}</td>
                <td style={{ padding: '12px' }}>{f.arrival}</td>
                <td style={{ padding: '12px' }}>{formatMinutes(f.block_minutes)}</td>
                <td style={{ padding: '12px' }}>{formatMinutes(f.flight_minutes)}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ background: f.flight_rule === 'IFR' ? 'rgba(139,92,246,0.2)' : 'rgba(16,185,129,0.15)', color: f.flight_rule === 'IFR' ? '#a78bfa' : '#34d399', borderRadius: 4, padding: '2px 6px', fontSize: '0.8rem' }}>
                    {f.flight_rule || 'VFR'}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  {f.training_type && f.training_type !== 'Nein' && f.training_type !== '' ? (
                    <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', borderRadius: 4, padding: '2px 6px', fontSize: '0.8rem' }}>{f.training_type}</span>
                  ) : <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>—</span>}
                </td>
                <td style={{ padding: '12px' }}>
                  {f.cost > 0 ? (
                    <span style={{ color: '#4ade80' }}>{f.cost.toFixed(2)} €</span>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>—</span>
                  )}
                  {f.invoice_id && <FileText size={12} style={{ marginLeft: 6, opacity: 0.5 }} title="Rechnung verknüpft" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsView({ flights, selectedIds, setSelectedIds, onBatchDelete }) {
  const [subTab, setSubTab] = useState('data');
  const [clubs, setClubs] = useState([]);
  const [newClub, setNewClub] = useState({ name: '', billing_type: 'highest_value' });
  const [trainings, setTrainings] = useState([]);
  const [newTraining, setNewTraining] = useState({ name: '', start_date: '', end_date: '' });
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState({ name: '', delimiter: ';', has_header: true, date_format: '02.01.2006', date_col: 0, aircraft_col: 1, departure_col: 4, arrival_col: 5, block_minutes_col: 6, flight_minutes_col: 7, pilot_col: 3, training_type_col: 11, flight_rule_col: 2, is_default: false });

  const loadData = async () => {
    const [c, t, tmpl] = await Promise.all([
      fetch(`${API}/api/clubs`),
      fetch(`${API}/api/trainings`),
      fetch(`${API}/api/csv-templates`)
    ]);
    setClubs(await c.json());
    setTrainings(await t.json());
    setTemplates(await tmpl.json());
  };

  useEffect(() => { loadData(); }, []);

  const addClub = async (e) => {
    e.preventDefault();
    if (!newClub.name) return;
    await fetch(`${API}/api/clubs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClub)
    });
    setNewClub({ name: '', billing_type: 'highest_value' });
    loadClubs();
  };

  const deleteClub = async (id) => {
    await fetch(`${API}/api/clubs/${id}`, { method: 'DELETE' });
    loadClubs();
  };

  const triggerReconcile = async () => {
    const res = await fetch(`${API}/api/reconcile`, { method: 'POST' });
    const data = await res.json();
    alert(`${data.matched} Flüge wurden erfolgreich Rechnungen zugeordnet.`);
  };

  return (
    <div className="dashboard-grid" style={{ gridTemplateColumns: '260px 1fr' }}>
      <div className="glass-panel" style={{ height: 'fit-content' }}>
        <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', letterSpacing: '0.05em' }}>EINSTELLUNGEN</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button onClick={() => setSubTab('data')} className="nav-btn" style={{ background: subTab === 'data' ? 'rgba(56,189,248,0.15)' : 'transparent', color: subTab === 'data' ? '#38bdf8' : 'inherit', justifyContent: 'flex-start' }}>
            <Database size={14} style={{ marginRight: 8 }} /> Datenverwaltung
          </button>
          <button onClick={() => setSubTab('clubs')} className="nav-btn" style={{ background: subTab === 'clubs' ? 'rgba(56,189,248,0.15)' : 'transparent', color: subTab === 'clubs' ? '#38bdf8' : 'inherit', justifyContent: 'flex-start' }}>
            <Building2 size={14} style={{ marginRight: 8 }} /> Vereine & Heuristik
          </button>
          <button onClick={() => setSubTab('trainings')} className="nav-btn" style={{ background: subTab === 'trainings' ? 'rgba(56,189,248,0.15)' : 'transparent', color: subTab === 'trainings' ? '#38bdf8' : 'inherit', justifyContent: 'flex-start' }}>
            <GraduationCap size={14} style={{ marginRight: 8 }} /> Ausbildungen
          </button>
          <button onClick={() => setSubTab('templates')} className="nav-btn" style={{ background: subTab === 'templates' ? 'rgba(56,189,248,0.15)' : 'transparent', color: subTab === 'templates' ? '#38bdf8' : 'inherit', justifyContent: 'flex-start' }}>
            <FileSpreadsheet size={14} style={{ marginRight: 8 }} /> CSV Import Formate
          </button>
        </div>
      </div>

      <div className="glass-panel">
        {subTab === 'data' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Flüge verwalten</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={triggerReconcile} className="nav-btn" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                  <RefreshCcw size={14} style={{ marginRight: 8 }} /> Reconcile
                </button>
                <button onClick={onBatchDelete} disabled={selectedIds.length === 0} className="nav-btn" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                  <Trash2 size={14} style={{ marginRight: 8 }} /> Löschen ({selectedIds.length})
                </button>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}><input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? flights.map(f => f.id) : [])} /></th>
                  <th style={{ padding: '10px' }}>Datum</th>
                  <th style={{ padding: '10px' }}>Flugzeug</th>
                  <th style={{ padding: '10px' }}>Kosten</th>
                </tr>
              </thead>
              <tbody>
                {flights.map(f => (
                  <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px' }}><input type="checkbox" checked={selectedIds.includes(f.id)} onChange={() => setSelectedIds(prev => prev.includes(f.id) ? prev.filter(i => i !== f.id) : [...prev, f.id])} /></td>
                    <td style={{ padding: '10px' }}>{formatDate(f.date)}</td>
                    <td style={{ padding: '10px' }}>{f.aircraft}</td>
                    <td style={{ padding: '10px' }}>{f.cost > 0 ? `${f.cost.toFixed(2)} €` : <span style={{ color: '#f87171' }}>Fehlt</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'clubs' && (
          <div>
            <h2>Vereins-Templates</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Lege fest, wie Rechnungen pro Verein geparst werden.</p>

            <form onSubmit={addClub} style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <input
                placeholder="Vereinsname (z.B. FlyLinz)"
                value={newClub.name}
                onChange={e => setNewClub({ ...newClub, name: e.target.value })}
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px', borderRadius: '6px' }}
              />
              <select
                value={newClub.billing_type}
                onChange={e => setNewClub({ ...newClub, billing_type: e.target.value })}
                style={{ background: '#1e293b', color: 'white', padding: '8px', borderRadius: '6px' }}
              >
                <option value="highest_value">Höchster Wert (Total)</option>
                <option value="last_column">Letzte Spalte</option>
                <option value="default">Standard</option>
              </select>
              <button type="submit" className="nav-btn" style={{ background: '#38bdf8', color: 'white' }}>Hinzufügen</button>
            </form>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px' }}>Heuristik</th>
                  <th style={{ padding: '12px' }}></th>
                </tr>
              </thead>
              <tbody>
                {clubs.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px' }}><strong>{c.name}</strong></td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{c.billing_type}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button onClick={() => deleteClub(c.id)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'trainings' && (
          <div>
            <h2>Ausbildungen verwalten</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Definiere Zeiträume für PPL, IFR etc. Kosten werden automatisch zugeordnet.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await fetch(`${API}/api/trainings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTraining) });
              setNewTraining({ name: '', start_date: '', end_date: '' });
              loadData();
            }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', marginBottom: '24px' }}>
              <input placeholder="Name (z.B. PPL)" value={newTraining.name} onChange={e => setNewTraining({ ...newTraining, name: e.target.value })} className="input-field" />
              <input type="date" value={newTraining.start_date} onChange={e => setNewTraining({ ...newTraining, start_date: e.target.value })} className="input-field" />
              <input type="date" value={newTraining.end_date} onChange={e => setNewTraining({ ...newTraining, end_date: e.target.value })} className="input-field" />
              <button type="submit" className="nav-btn" style={{ background: '#38bdf8', color: 'white' }}>Hinzufügen</button>
            </form>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(128,128,128,0.2)', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px' }}>Start</th>
                  <th style={{ padding: '12px' }}>Ende</th>
                  <th style={{ padding: '12px' }}></th>
                </tr>
              </thead>
              <tbody>
                {trainings.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
                    <td style={{ padding: '12px' }}><strong>{t.name}</strong></td>
                    <td style={{ padding: '12px' }}>{formatDate(t.start_date)}</td>
                    <td style={{ padding: '12px' }}>{formatDate(t.end_date)}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button onClick={async () => { await fetch(`${API}/api/trainings/${t.id}`, { method: 'DELETE' }); loadData(); }} style={{ color: '#f87171', background: 'none', border: 'none' }}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'templates' && (
          <div>
            <h2>CSV Import Formate</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Konfiguriere, wie CSV Spalten interpretiert werden.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const isEdit = !!newTemplate.id;
              const url = isEdit ? `${API}/api/csv-templates/${newTemplate.id}` : `${API}/api/csv-templates`;
              const method = isEdit ? 'PUT' : 'POST';

              await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTemplate)
              });

              setNewTemplate({ name: '', delimiter: ';', has_header: true, date_format: '02.01.2006', date_col: 0, aircraft_col: 1, departure_col: 4, arrival_col: 5, block_minutes_col: 6, flight_minutes_col: 7, pilot_col: 3, training_type_col: 11, flight_rule_col: 2, is_default: false });
              loadData();
            }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px', background: 'rgba(128,128,128,0.05)', padding: '16px', borderRadius: '8px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem' }}>Profil Name</label>
                <input placeholder="z.B. B4 Takeoff" value={newTemplate.name} onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })} className="input-field" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem' }}>Trennzeichen</label>
                <input placeholder="z.B. ;" value={newTemplate.delimiter} onChange={e => setNewTemplate({ ...newTemplate, delimiter: e.target.value })} className="input-field" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem' }}>Datumsformat</label>
                <input placeholder="02.01.2006" value={newTemplate.date_format} onChange={e => setNewTemplate({ ...newTemplate, date_format: e.target.value })} className="input-field" style={{ width: '100%' }} />
              </div>

              <div style={{ fontSize: '0.8rem', gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '8px', borderTop: '1px solid rgba(128,128,128,0.1)', paddingTop: '12px' }}>
                {[
                  ['Datum', 'date_col'],
                  ['Flugzeug', 'aircraft_col'],
                  ['Startort', 'departure_col'],
                  ['Zielort', 'arrival_col'],
                  ['Blockzeit', 'block_minutes_col'],
                  ['Flugzeit', 'flight_minutes_col'],
                  ['Pilot (PIC)', 'pilot_col'],
                  ['Schulung', 'training_type_col'],
                  ['Regeln (IFR)', 'flight_rule_col']
                ].map(([label, key]) => (
                  <div key={key}>
                    <label style={{ display: 'block', marginBottom: 4 }}>{label} Spalte</label>
                    <input type="number" value={newTemplate[key]} onChange={e => setNewTemplate({ ...newTemplate, [key]: parseInt(e.target.value) })} className="input-field" style={{ width: '100%' }} />
                  </div>
                ))}
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button type="submit" className="nav-btn" style={{ background: '#38bdf8', color: 'white', flex: 1 }}>
                  {newTemplate.id ? 'Template aktualisieren' : 'Template Speichern'}
                </button>
                {newTemplate.id && (
                  <button type="button" onClick={() => setNewTemplate({ name: '', delimiter: ';', has_header: true, date_format: '02.01.2006', date_col: 0, aircraft_col: 1, departure_col: 4, arrival_col: 5, block_minutes_col: 6, flight_minutes_col: 7, pilot_col: 3, training_type_col: 11, flight_rule_col: 2, is_default: false })} className="nav-btn" style={{ background: 'rgba(128,128,128,0.2)' }}>Abbrechen</button>
                )}
              </div>
            </form>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(128,128,128,0.2)', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px' }}>Konfiguration (Spalten)</th>
                  <th style={{ padding: '12px' }}></th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
                    <td style={{ padding: '12px' }}>
                      <strong>{t.name}</strong> {t.is_default && <span style={{ fontSize: '0.7rem', background: '#38bdf8', color: 'white', padding: '2px 4px', borderRadius: 4, marginLeft: 4 }}>DEFAULT</span>}
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Datum: {t.date_col} | Flugzeug: {t.aircraft_col} | PIC: {t.pilot_col} | Trenner: '{t.delimiter}'
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {!t.is_default && (
                        <button onClick={async () => { await fetch(`${API}/api/csv-templates/${t.id}/set-default`, { method: 'POST' }); loadData(); }} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }} title="Als Standard setzen"><Star size={16} /></button>
                      )}
                      {t.is_default && (
                        <Star size={16} style={{ color: '#f59e0b', fill: '#f59e0b', marginTop: 8 }} />
                      )}
                      <button onClick={() => setNewTemplate(t)} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 8 }} title="Bearbeiten"><Edit2 size={16} /></button>
                      <button onClick={async () => { if (confirm('Löschen?')) { await fetch(`${API}/api/csv-templates/${t.id}`, { method: 'DELETE' }); loadData(); } }} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', marginTop: 8 }} title="Löschen"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ImportView({ onImported }) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  useEffect(() => {
    fetch(`${API}/api/csv-templates`).then(res => res.json()).then(data => {
      setTemplates(data);
      const def = data.find(t => t.is_default);
      if (def) setSelectedTemplate(def.id);
      else if (data.length > 0) setSelectedTemplate(data[0].id);
    });
  }, []);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setStatus('Importiere...');
    const form = new FormData();
    form.append('file', file);
    form.append('template_id', selectedTemplate);
    try {
      const res = await fetch(`${API}/api/import/logbook`, { method: 'POST', body: form });
      const text = await res.text();
      setStatus(text);
      onImported();
    } catch (err) {
      setStatus('Fehler: ' + err.message);
    }
    setLoading(false);
  }

  return (
    <div className="glass-panel" style={{ textAlign: 'center', padding: '64px' }}>
      <Upload size={48} style={{ color: '#38bdf8', marginBottom: 16 }} />
      <h2>Logbuch importieren</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Wähle ein Format und lade deine CSV Datei hoch</p>

      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Format:</span>
        <select
          value={selectedTemplate}
          onChange={e => setSelectedTemplate(e.target.value)}
          className="input-field"
          style={{ width: '200px' }}
        >
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <label style={{ cursor: 'pointer' }}>
        <input type="file" accept=".csv" onChange={handleUpload} style={{ display: 'none' }} />
        <span style={{ background: '#38bdf8', color: 'white', padding: '12px 24px', borderRadius: 8, fontWeight: 600 }}>
          {loading ? 'Lädt...' : 'CSV auswählen'}
        </span>
      </label>
      {status && <p style={{ marginTop: 20 }}>{status}</p>}
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [flights, setFlights] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  async function loadData() {
    try {
      const [s, f] = await Promise.all([fetch(`${API}/api/stats`), fetch(`${API}/api/flights`)]);
      setStats(await s.json());
      setFlights(await f.json());
    } catch (err) {
      console.error("Laden fehlgeschlagen:", err);
    }
  }

  useEffect(() => { loadData(); }, []);

  const batchDelete = async () => {
    if (!confirm(`${selectedIds.length} Flüge löschen?`)) return;
    await fetch(`${API}/api/flights/delete-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds })
    });
    setSelectedIds([]);
    loadData();
  };

  return (
    <div className="app-container">
      <nav className="glass-panel" style={{ margin: '24px', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', padding: '12px 24px' }}>
        <button onClick={() => setActiveTab('dashboard')} className="nav-btn" style={{ background: activeTab === 'dashboard' ? 'rgba(56,189,248,0.2)' : 'transparent', color: activeTab === 'dashboard' ? '#38bdf8' : 'var(--text-primary)' }}>
          <BarChart3 size={16} style={{ marginRight: 8 }} /> Dashboard
        </button>
        <button onClick={() => setActiveTab('flights')} className="nav-btn" style={{ background: activeTab === 'flights' ? 'rgba(56,189,248,0.2)' : 'transparent', color: activeTab === 'flights' ? '#38bdf8' : 'var(--text-primary)' }}>
          <Plane size={16} style={{ marginRight: 8 }} /> Flüge
        </button>
        <button onClick={() => setActiveTab('import')} className="nav-btn" style={{ background: activeTab === 'import' ? 'rgba(56,189,248,0.2)' : 'transparent', color: activeTab === 'import' ? '#38bdf8' : 'var(--text-primary)' }}>
          <Upload size={16} style={{ marginRight: 8 }} /> Import
        </button>
        <button onClick={() => setActiveTab('settings')} className="nav-btn" style={{ background: activeTab === 'settings' ? 'rgba(56,189,248,0.2)' : 'transparent', color: activeTab === 'settings' ? '#38bdf8' : 'var(--text-primary)' }}>
          <Settings size={16} style={{ marginRight: 8 }} /> Einstellungen
        </button>
        <div style={{ borderLeft: '1px solid rgba(128,128,128,0.3)', height: '24px', margin: '0 8px' }}></div>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="nav-btn"
          title="Thema wechseln"
          style={{ padding: '8px' }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>

      <header className="header" style={{ marginBottom: '32px' }}>
        <img src={logo} alt="AeroBudget Logo" style={{ height: '100px', width: 'auto' }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.05em' }}>AEROBUDGET</p>
      </header>

      <div style={{ padding: '0 24px 24px' }}>
        {activeTab === 'dashboard' && <Dashboard stats={stats} />}
        {activeTab === 'flights' && <FlightTable flights={flights} />}
        {activeTab === 'import' && <ImportView onImported={loadData} />}
        {activeTab === 'settings' && <SettingsView flights={flights} selectedIds={selectedIds} setSelectedIds={setSelectedIds} onBatchDelete={batchDelete} />}
      </div>
    </div>
  );
}

export default App;