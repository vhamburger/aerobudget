import { useState, useEffect } from 'react';
import { Plane, BarChart3, TrendingUp, Settings, Upload, Clock, Euro, Activity, Trash2, Database, Building2, RefreshCcw } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

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
          ) : <p>Keine Daten</p>}
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
    alert(`${data.matched} Flüge erfolgreich zugeordnet.`);
  };

  return (
    <div className="dashboard-grid" style={{ gridTemplateColumns: '260px 1fr' }}>
      <div className="glass-panel" style={{ height: 'fit-content' }}>
        <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>SETTING MENU</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button onClick={() => setSubTab('data')} className="nav-btn" style={{ background: subTab === 'data' ? 'rgba(56,189,248,0.15)' : 'transparent', color: subTab === 'data' ? '#38bdf8' : 'inherit' }}>
            <Database size={14} style={{ marginRight: 8 }} /> Datenverwaltung
          </button>
          <button onClick={() => setSubTab('clubs')} className="nav-btn" style={{ background: subTab === 'clubs' ? 'rgba(56,189,248,0.15)' : 'transparent', color: subTab === 'clubs' ? '#38bdf8' : 'inherit' }}>
            <Building2 size={14} style={{ marginRight: 8 }} /> Vereine & Heuristik
          </button>
        </div>
      </div>

      <div className="glass-panel">
        {subTab === 'data' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
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
              <tbody>
                {clubs.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px' }}><strong>{c.name}</strong></td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>Heuristik: {c.billing_type}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button onClick={() => deleteClub(c.id)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
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

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [flights, setFlights] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  async function loadData() {
    const [s, f] = await Promise.all([fetch(`${API}/api/stats`), fetch(`${API}/api/flights`)]);
    setStats(await s.json());
    setFlights(await f.json());
  }

  useEffect(() => { loadData(); }, []);

  const batchDelete = async () => {
    if (!confirm("Löschen?")) return;
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
        <button onClick={() => setActiveTab('dashboard')} className="nav-btn" style={{ background: activeTab === 'dashboard' ? 'rgba(56,189,248,0.2)' : 'transparent' }}><BarChart3 size={16} /> Dashboard</button>
        <button onClick={() => setActiveTab('flights')} className="nav-btn" style={{ background: activeTab === 'flights' ? 'rgba(56,189,248,0.2)' : 'transparent' }}><Plane size={16} /> Flüge</button>
        <button onClick={() => setActiveTab('settings')} className="nav-btn" style={{ background: activeTab === 'settings' ? 'rgba(56,189,248,0.2)' : 'transparent' }}><Settings size={16} /> Einstellungen</button>
      </nav>

      <div style={{ padding: '0 24px' }}>
        {activeTab === 'dashboard' && <Dashboard stats={stats} />}
        {activeTab === 'flights' && (
          <div className="glass-panel">
            <h2>Flüge</h2>
            {/* Flugtabelle hier (analog zu deiner vorherigen Version) */}
          </div>
        )}
        {activeTab === 'settings' && <SettingsView flights={flights} selectedIds={selectedIds} setSelectedIds={setSelectedIds} onBatchDelete={batchDelete} />}
      </div>
    </div>
  );
}

export default App;