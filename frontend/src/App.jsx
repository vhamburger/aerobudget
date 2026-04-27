import { useState, useEffect } from 'react';
import { Plane, BarChart3, TrendingUp, Settings, Upload, Clock, Euro, Activity } from 'lucide-react';
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
import './index.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const API = '';

function formatMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

// Convert ISO date YYYY-MM-DD → DD.MM.YYYY for display
function formatDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate; // fallback
  return `${d}.${m}.${y}`;
}

function Dashboard({ stats }) {
  const months = stats?.monthly_costs?.map(m => m.month) ?? [];
  const costs = stats?.monthly_costs?.map(m => m.cost) ?? [];
  const aircraftLabels = stats?.aircraft_stats?.map(a => a.aircraft) ?? [];
  const aircraftMinutes = stats?.aircraft_stats?.map(a => a.minutes) ?? [];

  return (
    <>
      <header className="header">
        <h1>✈️ Aerobudget</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Dein Pilot Cost Tracker</p>
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
          ) : <p style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: 40 }}>Noch keine Kostendaten – weise Rechnungen zu!</p>}
        </div>

        <div className="glass-panel">
          <h2>Flugzeit pro Flugzeug</h2>
          {aircraftLabels.length > 0 ? (
            <Doughnut
              data={{
                labels: aircraftLabels,
                datasets: [{ data: aircraftMinutes, backgroundColor: ['#38bdf8', '#8b5cf6', '#f59e0b', '#10b981'], borderWidth: 0 }]
              }}
              options={{ cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#f8fafc' } } } }}
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
                  <td style={{ padding: '10px 12px' }}>{f.cost > 0 ? `${f.cost.toFixed(2)} €` : <span style={{ color: 'var(--text-secondary)' }}>—</span>}</td>
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
      <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
        <Upload size={48} style={{ color: '#38bdf8', marginBottom: 16 }} />
        <h2 style={{ marginBottom: 8 }}>Logbuch importieren</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>B4 Takeoff CSV Export hochladen</p>
        <label style={{ cursor: 'pointer' }}>
          <input type="file" accept=".csv" onChange={handleUpload} style={{ display: 'none' }} id="csv-upload" />
          <span style={{ background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)', color: 'white', padding: '12px 28px', borderRadius: 8, fontWeight: 600 }}>
            {loading ? 'Lädt...' : 'CSV Datei auswählen'}
          </span>
        </label>
        {status && <p style={{ marginTop: 20, color: status.includes('Fehler') ? '#f87171' : '#4ade80' }}>{status}</p>}
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [flights, setFlights] = useState([]);

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

  const navItems = [
    { id: 'dashboard', icon: <BarChart3 size={16} />, label: 'Dashboard' },
    { id: 'flights', icon: <Plane size={16} />, label: 'Flüge' },
    { id: 'import', icon: <Upload size={16} />, label: 'Import' },
    { id: 'settings', icon: <Settings size={16} />, label: 'Einstellungen' },
  ];

  return (
    <div className="app-container">
      <nav className="glass-panel" style={{ margin: '24px', display: 'flex', gap: '8px', justifyContent: 'center', padding: '12px 24px' }}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="nav-btn"
            style={{ background: activeTab === item.id ? 'rgba(56,189,248,0.2)' : 'transparent', color: activeTab === item.id ? '#38bdf8' : 'inherit' }}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </nav>

      {activeTab === 'dashboard' && <Dashboard stats={stats} flights={flights} />}
      {activeTab === 'flights' && <FlightTable flights={flights} />}
      {activeTab === 'import' && <ImportView onImported={loadData} />}
      {activeTab === 'settings' && (
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="glass-panel" style={{ textAlign: 'center', padding: '64px' }}>
            <Settings size={48} style={{ color: 'var(--text-secondary)', marginBottom: 16 }} />
            <h2>Einstellungen</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Kommt bald...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
