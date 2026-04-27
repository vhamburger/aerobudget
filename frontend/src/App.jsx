import { useState, useEffect } from 'react';
import { Plane, BarChart3, TrendingUp, Settings, Upload, Clock, Euro, Activity, Trash2, Database, Building2, RefreshCcw, FileText } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const API = '';

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

function Dashboard({ stats }) {
  const months = stats?.monthly_costs?.map(m => m.month) ?? [];
  const costs = stats?.monthly_costs?.map(m => m.cost) ?? [];
  const aircraftLabels = stats?.aircraft_stats?.map(a => a.aircraft) ?? [];
  const aircraftMinutes = stats?.aircraft_stats?.map(a => a.minutes) ?? [];

  return (
    <>
      <header className="header" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#38bdf8' }}>✈</span> Aerobudget
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Dein Pilot Kosten Tracker</p>
      </header>

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
          <h2>Kostenentwicklung</h2>
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

        <div className="glass-panel">
          <h2>Flugzeit pro Flugzeug</h2>
          <Doughnut
            data={{
              labels: aircraftLabels,
              datasets: [{ data: aircraftMinutes, backgroundColor: ['#38bdf8', '#8b5cf6', '#f59e0b', '#10b981'], borderWidth: 0 }]
            }}
            options={{
              cutout: '70%',
              plugins: {
                legend: { position: 'bottom', labels: { color: '#f8fafc' } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatMinutes(ctx.parsed)}` } }
              }
            }}
          />
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
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {['Datum', 'Kennzeichen', 'Von', 'Nach', 'Block', 'Flug', 'Kosten'].map(h => (
                <th key={h} style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flights.map(f => (
              <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px' }}>{formatDate(f.date)}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', borderRadius: 4, padding: '2px 8px' }}>{f.aircraft}</span>
                </td>
                <td style={{ padding: '12px' }}>{f.departure}</td>
                <td style={{ padding: '12px' }}>{f.arrival}</td>
                <td style={{ padding: '12px' }}>{formatMinutes(f.block_minutes)}</td>
                <td style={{ padding: '12px' }}>{formatMinutes(f.flight_minutes)}</td>
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

  const loadClubs = async () => {
    const res = await fetch(`${API}/api/clubs`);
    setClubs(await res.json());
  };

  useEffect(() => { loadClubs(); }, []);

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
      </div>
    </div>
  );
}

function ImportView({ onImported }) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setStatus('Importiere...');
    const form = new FormData();
    form.append('file', file);
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
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>CSV Datei hochladen</p>
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
      <nav className="glass-panel" style={{ margin: '24px', display: 'flex', gap: '8px', justifyContent: 'center', padding: '12px 24px' }}>
        <button onClick={() => setActiveTab('dashboard')} className="nav-btn" style={{ background: activeTab === 'dashboard' ? 'rgba(56,189,248,0.2)' : 'transparent', color: activeTab === 'dashboard' ? '#38bdf8' : 'white' }}>
          <BarChart3 size={16} style={{ marginRight: 8 }} /> Dashboard
        </button>
        <button onClick={() => setActiveTab('flights')} className="nav-btn" style={{ background: activeTab === 'flights' ? 'rgba(56,189,248,0.2)' : 'transparent', color: activeTab === 'flights' ? '#38bdf8' : 'white' }}>
          <Plane size={16} style={{ marginRight: 8 }} /> Flüge
        </button>
        <button onClick={() => setActiveTab('import')} className="nav-btn" style={{ background: activeTab === 'import' ? 'rgba(56,189,248,0.2)' : 'transparent', color: activeTab === 'import' ? '#38bdf8' : 'white' }}>
          <Upload size={16} style={{ marginRight: 8 }} /> Import
        </button>
        <button onClick={() => setActiveTab('settings')} className="nav-btn" style={{ background: activeTab === 'settings' ? 'rgba(56,189,248,0.2)' : 'transparent', color: activeTab === 'settings' ? '#38bdf8' : 'white' }}>
          <Settings size={16} style={{ marginRight: 8 }} /> Einstellungen
        </button>
      </nav>

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