import { useState, useEffect } from 'react';
import { Plane, BarChart3, TrendingUp, Settings, Upload, Clock, Euro, Activity, Trash2, Database, ChevronRight } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const API = '';

// Helper: Format minutes to Hh MMm
function formatMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

// Helper: ISO Date to DD.MM.YYYY
function formatDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
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
            <div className="stat-label"><Activity size={14} style={{ display: 'inline', marginRight: 4 }} />Flüge gesamt</div>
            <div className="stat-value">{stats?.total_flights ?? 0}</div>
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <div className="stat-label"><Clock size={14} style={{ display: 'inline', marginRight: 4 }} />Flugzeit gesamt</div>
            <div className="stat-value">{formatMinutes(stats?.total_flight_minutes ?? 0)}</div>
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <div className="stat-label"><Euro size={14} style={{ display: 'inline', marginRight: 4 }} />Gesamtkosten</div>
            <div className="stat-value">{(stats?.total_cost ?? 0).toFixed(2)} €</div>
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <div className="stat-label"><TrendingUp size={14} style={{ display: 'inline', marginRight: 4 }} />Ø Kosten / h</div>
            <div className="stat-value">{(stats?.cost_per_hour ?? 0).toFixed(0)} €</div>
          </div>
        </div>

        <div className="glass-panel">
          <h2>Kostenentwicklung</h2>
          {months.length > 0 ? (
            <Line
              data={{
                labels: months,
                datasets: [{ label: 'Kosten (€)', data: costs, borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.1)', tension: 0.4, fill: true }]
              }}
              options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { color: 'rgba(255,255,255,0.05)' } } } }}
            />
          ) : <p style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: 40 }}>Noch keine Kostendaten</p>}
        </div>

        <div className="glass-panel">
          <h2>Flugzeit pro Flugzeug</h2>
          {aircraftLabels.length > 0 ? (
            <Doughnut
              data={{
                labels: aircraftLabels,
                datasets: [{ data: aircraftMinutes, backgroundColor: ['#38bdf8', '#8b5cf6', '#f59e0b', '#10b981'], borderWidth: 0 }]
              }}
              options={{
                cutout: '70%',
                plugins: {
                  legend: { position: 'bottom', labels: { color: '#f8fafc' } },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        return `${context.label}: ${formatMinutes(context.parsed)}`;
                      }
                    }
                  }
                }
              }}
            />
          ) : <p style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: 40 }}>Keine Flugzeugdaten</p>}
        </div>
      </main>
    </>
  );
}

function FlightTable({ flights }) {
  return (
    <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
      <div className="glass-panel">
        <h2 style={{ marginBottom: 20 }}>Alle Flüge ({flights.length})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                {['Datum', 'Kennzeichen', 'Von', 'Nach', 'Blockzeit', 'Flugzeit', 'Kosten', 'Pilot'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flights.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px 12px' }}>{formatDate(f.date)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', borderRadius: 4, padding: '2px 8px' }}>{f.aircraft}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{f.departure}</td>
                  <td style={{ padding: '10px 12px' }}>{f.arrival}</td>
                  <td style={{ padding: '10px 12px' }}>{formatMinutes(f.block_minutes)}</td>
                  <td style={{ padding: '10px 12px' }}>{formatMinutes(f.flight_minutes)}</td>
                  <td style={{ padding: '10px 12px' }}>{f.cost > 0 ? `${f.cost.toFixed(2)} €` : '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{f.pilot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ flights, selectedIds, setSelectedIds, onBatchDelete }) {
  const [subTab, setSubTab] = useState('data'); // Default to data for this task

  const toggleAll = () => {
    if (selectedIds.length === flights.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(flights.map(f => f.id));
    }
  };

  const toggleOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="dashboard-grid" style={{ gridTemplateColumns: '260px 1fr' }}>
      {/* Sidebar Sub-Menu */}
      <div className="glass-panel" style={{ height: 'fit-content' }}>
        <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>Einstellungen</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={() => setSubTab('general')}
            className="nav-btn"
            style={{ width: '100%', justifyContent: 'flex-start', background: subTab === 'general' ? 'rgba(56,189,248,0.15)' : 'transparent', color: subTab === 'general' ? '#38bdf8' : 'inherit' }}
          >
            <Settings size={14} style={{ marginRight: 8 }} /> Allgemein
          </button>
          <button
            onClick={() => setSubTab('data')}
            className="nav-btn"
            style={{ width: '100%', justifyContent: 'flex-start', background: subTab === 'data' ? 'rgba(56,189,248,0.15)' : 'transparent', color: subTab === 'data' ? '#38bdf8' : 'inherit' }}
          >
            <Database size={14} style={{ marginRight: 8 }} /> Datenverwaltung
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="glass-panel">
        {subTab === 'general' && (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Settings size={48} style={{ color: 'var(--text-secondary)', marginBottom: 16 }} />
            <h2>Allgemeine Einstellungen</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Hier kannst du bald dein Profil und deine Präferenzen verwalten.</p>
          </div>
        )}

        {subTab === 'data' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2>Datenverwaltung</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Importierte Flüge bereinigen oder korrigieren</p>
              </div>
              <button
                onClick={onBatchDelete}
                disabled={selectedIds.length === 0}
                className="nav-btn"
                style={{
                  backgroundColor: selectedIds.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                  color: selectedIds.length > 0 ? '#f87171' : 'var(--text-secondary)',
                  border: selectedIds.length > 0 ? '1px solid #f87171' : '1px solid transparent'
                }}
              >
                <Trash2 size={16} style={{ marginRight: 8 }} />
                {selectedIds.length === 0 ? 'Auswahl löschen' : `${selectedIds.length} Flüge löschen`}
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>
                      <input
                        type="checkbox"
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                        checked={selectedIds.length === flights.length && flights.length > 0}
                        onChange={toggleAll}
                      />
                    </th>
                    <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Datum</th>
                    <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Flugzeug</th>
                    <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Route</th>
                  </tr>
                </thead>
                <tbody>
                  {flights.map(f => (
                    <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="checkbox"
                          style={{ width: 16, height: 16, cursor: 'pointer' }}
                          checked={selectedIds.includes(f.id)}
                          onChange={() => toggleOne(f.id)}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>{formatDate(f.date)}</td>
                      <td style={{ padding: '12px' }}>{f.aircraft}</td>
                      <td style={{ padding: '12px' }}>{f.departure} → {f.arrival}</td>
                    </tr>
                  ))}
                  {flights.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Keine Daten vorhanden.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
    <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
      <div className="glass-panel" style={{ textAlign: 'center', padding: '64px 24px' }}>
        <div style={{ background: 'rgba(56,189,248,0.1)', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Upload size={32} style={{ color: '#38bdf8' }} />
        </div>
        <h2 style={{ marginBottom: 8 }}>Logbuch importieren</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32, maxWidth: '400px', margin: '0 auto 32px' }}>Lade deinen B4 Takeoff CSV Export hoch, um deine Flugdaten zu synchronisieren.</p>
        <label style={{ cursor: 'pointer' }}>
          <input type="file" accept=".csv" onChange={handleUpload} style={{ display: 'none' }} id="csv-upload" />
          <span style={{ background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)', color: 'white', padding: '14px 32px', borderRadius: 8, fontWeight: 600, display: 'inline-block', boxShadow: '0 4px 15px rgba(56,189,248,0.3)' }}>
            {loading ? 'Lädt...' : 'CSV Datei auswählen'}
          </span>
        </label>
        {status && <div style={{ marginTop: 24, padding: '12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: status.includes('Fehler') ? '#f87171' : '#4ade80', display: 'inline-block' }}>{status}</div>}
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [flights, setFlights] = useState([]);
  const [selectedFlightIds, setSelectedFlightIds] = useState([]);

  async function loadData() {
    try {
      const [statsRes, flightsRes] = await Promise.all([
        fetch(`${API}/api/stats`),
        fetch(`${API}/api/flights`)
      ]);
      setStats(await statsRes.json());
      setFlights(await flightsRes.json());
    } catch (err) {
      console.error('API error:', err);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function deleteSelectedFlights() {
    if (selectedFlightIds.length === 0) return;
    if (!window.confirm(`${selectedFlightIds.length} Flüge wirklich löschen?`)) return;

    try {
      const response = await fetch(`${API}/api/flights/delete-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedFlightIds })
      });

      if (response.ok) {
        setSelectedFlightIds([]);
        loadData();
      } else {
        alert('Fehler beim Batch-Löschen');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Netzwerkfehler beim Löschen');
    }
  }

  const navItems = [
    { id: 'dashboard', icon: <BarChart3 size={16} />, label: 'Dashboard' },
    { id: 'flights', icon: <Plane size={16} />, label: 'Flüge' },
    { id: 'import', icon: <Upload size={16} />, label: 'Import' },
    { id: 'settings', icon: <Settings size={16} />, label: 'Einstellungen' },
  ];

  return (
    <div className="app-container">
      <nav className="glass-panel" style={{ margin: '24px', display: 'flex', gap: '8px', justifyContent: 'center', padding: '12px 24px', position: 'sticky', top: '24px', zIndex: 100 }}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="nav-btn"
            style={{
              background: activeTab === item.id ? 'rgba(56,189,248,0.2)' : 'transparent',
              color: activeTab === item.id ? '#38bdf8' : 'inherit',
              padding: '8px 16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </nav>

      <div style={{ padding: '0 24px 24px 24px' }}>
        {activeTab === 'dashboard' && <Dashboard stats={stats} />}
        {activeTab === 'flights' && <FlightTable flights={flights} />}
        {activeTab === 'import' && <ImportView onImported={loadData} />}
        {activeTab === 'settings' && (
          <SettingsView
            flights={flights}
            selectedIds={selectedFlightIds}
            setSelectedIds={setSelectedFlightIds}
            onBatchDelete={deleteSelectedFlights}
          />
        )}
      </div>
    </div>
  );
}

export default App;