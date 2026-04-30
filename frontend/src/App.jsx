import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';
import { Plane, BarChart3, TrendingUp, Settings, Upload, Clock, Euro, Activity, Trash2, Database, Building2, RefreshCcw, FileText, Sun, Moon, GraduationCap, FileSpreadsheet, Edit2, Star, Search, X, Sliders, LogOut, Globe, Lock } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Line, Doughnut, Bar, Pie } from 'react-chartjs-2';
import logo from './assets/AeroBudget-transparent-logo.png';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

ChartJS.defaults.font.family = "'Inter', sans-serif";


const API = '';

function LoginView({ onLogin }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      const data = await res.json();
      onLogin(data);
    } else {
      setError(t('login.error'));
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src={logo} alt="Logo" style={{ height: '80px', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{t('login.welcome')}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{t('login.subtitle')}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>{t('login.username')}</label>
            <input type="text" className="input-field" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>{t('login.password')}</label>
            <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p style={{ color: '#ef4444', marginBottom: '16px', textAlign: 'center' }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>{t('login.submit')}</button>
        </form>
      </div>
    </div>
  );
}

function ChangePasswordDialog({ onComplete, onCancel }) {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t('changePassword.errorMatch'));
      return;
    }
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/api/change-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ new_password: newPassword })
    });
    if (res.ok) {
      onComplete();
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
        <h2 style={{ marginBottom: '16px' }}>{t('changePassword.title')}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{t('changePassword.subtitle')}</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>{t('changePassword.newPassword')}</label>
            <input type="password" className="input-field" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>{t('changePassword.confirmPassword')}</label>
            <input type="password" className="input-field" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>
          {error && <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('changePassword.submit')}</button>
            {onCancel && <button type="button" onClick={onCancel} className="nav-btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }}>{t('changePassword.cancel')}</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

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
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat(i18n.language).format(date);
}

function formatNumber(val, decimals = 0) {
  return new Intl.NumberFormat(i18n.language, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val);
}

function formatCurrency(val) {
  return new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR' }).format(val);
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

function Dashboard({ stats, flights, theme, airportData }) {
  const { t } = useTranslation();
  const [showAllMonths, setShowAllMonths] = useState(false);
  const textColor = theme === 'dark' ? '#f8fafc' : '#0f172a';
  
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
            <div className="stat-label"><Activity size={14} style={{ display: 'inline', marginRight: 4 }} />{t('dashboard.flights')}</div>
            <div className="stat-value">{stats?.total_flights ?? 0}</div>
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <div className="stat-label"><Clock size={14} style={{ display: 'inline', marginRight: 4 }} />{t('dashboard.totalHours')}</div>
            <div className="stat-value">{formatMinutes(stats?.total_flight_minutes ?? 0)}</div>
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <div className="stat-label"><Euro size={14} style={{ display: 'inline', marginRight: 4 }} />{t('dashboard.cost')}</div>
            <div className="stat-value">{formatCurrency(stats?.total_cost ?? 0)}</div>
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <div className="stat-label"><TrendingUp size={14} style={{ display: 'inline', marginRight: 4 }} />{t('dashboard.avgCost')}</div>
            <div className="stat-value">{formatNumber(stats?.cost_per_hour ?? 0)} €</div>
          </div>
        </div>

        <div className="glass-panel">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><GraduationCap size={18} /> {t('dashboard.trainingBreakdown')}</h2>
          {trainingLabels.length > 0 ? (
            <Pie
              key={`training-${theme}`}
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
                    labels: { color: textColor, padding: 20 } 
                  },
                  tooltip: { 
                    callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}` } 
                  }
                }
              }}
            />
          ) : <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>{t('dashboard.noTrainingActive')}</p>}
        </div>

        <div className="glass-panel">
          <h2>{t('dashboard.costsByAircraft')}</h2>
          <Doughnut
            key={`aircraft-${theme}`}
            data={{
              labels: aircraftLabels,
              datasets: [{ data: aircraftMinutes, backgroundColor: aircraftColors, borderWidth: 0 }]
            }}
            options={{
              cutout: '70%',
              plugins: {
                legend: { position: 'bottom', labels: { color: textColor, padding: 20 } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatMinutes(ctx.parsed)}` } }
              }
            }}
          />
        </div>        <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
          <h2>{t('dashboard.airfieldInsights')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', opacity: 0.6, marginBottom: 16 }}>{t('dashboard.landingFeeTrend')}</h3>
              {Object.keys(airportData || {}).length > 0 ? (
                <Line
                  data={{
                    labels: [...new Set(Object.values(airportData).flat().map(d => d.year))].sort(),
                    datasets: Object.entries(airportData).slice(0, 5).map(([icao, data]) => {
                      const years = [...new Set(Object.values(airportData).flat().map(d => d.year))].sort();
                      const values = years.map(y => {
                        const match = data.find(d => d.year === y);
                        if (match) return match.landing_fee;
                        const lastKnown = [...data].reverse().find(d => d.year < y);
                        return lastKnown ? lastKnown.landing_fee : (data[0]?.landing_fee || 0);
                      });
                      return {
                        label: icao,
                        data: values,
                        borderColor: getColor(icao),
                        tension: 0.3
                      };
                    })
                  }}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, fontSize: 10, color: textColor } } },
                    scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } }
                  }}
                />
              ) : <p style={{ opacity: 0.5, textAlign: 'center', padding: '20px' }}>{t('dashboard.noData')}</p>}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '0.9rem', color: '#f87171', marginBottom: 12 }}>{t('dashboard.expensiveAirports')}</h3>
                {Object.keys(airportData || {}).length > 0 ? Object.entries(airportData)
                  .map(([icao, data]) => ({ icao, fee: data[data.length - 1].landing_fee }))
                  .sort((a, b) => b.fee - a.fee)
                  .slice(0, 5)
                  .map(a => (
                    <div key={a.icao} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span>{a.icao}</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(a.fee)}</span>
                    </div>
                  )) : <p style={{ opacity: 0.3, fontSize: '0.8rem' }}>—</p>}
              </div>
              <div>
                <h3 style={{ fontSize: '0.9rem', color: '#4ade80', marginBottom: 12 }}>{t('dashboard.cheapestAirports')}</h3>
                {Object.keys(airportData || {}).length > 0 ? Object.entries(airportData)
                  .map(([icao, data]) => ({ icao, fee: data[data.length - 1].landing_fee }))
                  .sort((a, b) => a.fee - b.fee)
                  .slice(0, 5)
                  .map(a => (
                    <div key={a.icao} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span>{a.icao}</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(a.fee)}</span>
                    </div>
                  )) : <p style={{ opacity: 0.3, fontSize: '0.8rem' }}>—</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>{t('dashboard.monthlyEvolution')}</h2>
            <button 
              onClick={() => setShowAllMonths(!showAllMonths)}
              className="nav-btn" 
              style={{ fontSize: '0.8rem', padding: '4px 12px', background: 'rgba(56,189,248,0.1)' }}
            >
              {showAllMonths ? t('dashboard.last12Months') : t('dashboard.showAll')}
            </button>
          </div>
          {months.length > 0 ? (
            <Line
              key={`costs-${theme}`}
              data={{
                labels: months,
                datasets: [{ label: t('dashboard.cost'), data: costs, borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.1)', tension: 0.4, fill: true }]
              }}
              options={{ 
                responsive: true, 
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: textColor } },
                  y: { ticks: { color: textColor } }
                }
              }}
            />
          ) : <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>{t('dashboard.noData')}</p>}
        </div>
      </main>
    </>
  );
}

function FlightTable({ flights, authFetch, loadData }) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editingFlight, setEditingFlight] = useState(null);
  const [editForm, setEditForm] = useState({ flight_cost: 0, fuel_cost: 0, landing_fee: 0, approach_fee: 0 });

  const handleEditClick = (f) => {
    setEditingFlight(f);
    setEditForm({ 
      flight_cost: f.flight_cost, 
      fuel_cost: f.fuel_cost || 0, 
      landing_fee: f.landing_fee, 
      approach_fee: f.approach_fee 
    });
  };

  const handleSaveCosts = async () => {
    const res = await authFetch(`${API}/api/flights/${editingFlight.id}/costs`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    });
    if (res.ok) {
      setEditingFlight(null);
      loadData();
    }
  };

  const handleExport = async () => {
    const res = await authFetch(`${API}/api/export/flights`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aerobudget_flights_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleViewInvoice = async (invoiceId) => {
    const res = await authFetch(`${API}/api/invoices/${invoiceId}/pdf`);
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  const filteredFlights = flights.filter(f => {
    const s = searchTerm.toLowerCase();
    const dateStr = formatDate(f.date).toLowerCase();
    const flightDate = f.date; // YYYY-MM-DD
    
    const matchesSearch = (
      f.aircraft.toLowerCase().includes(s) ||
      dateStr.includes(s) ||
      f.departure.toLowerCase().includes(s) ||
      f.arrival.toLowerCase().includes(s) ||
      (f.training_type || '').toLowerCase().includes(s)
    );

    const matchesFrom = !dateFrom || flightDate >= dateFrom;
    const matchesTo = !dateTo || flightDate <= dateTo;

    return matchesSearch && matchesFrom && matchesTo;
  });

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>{t('flights.title')} ({filteredFlights.length})</h2>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>{t('flights.from')}</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field" style={{ padding: '4px', border: 'none', background: 'transparent' }} />
            <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>{t('flights.to')}</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field" style={{ padding: '4px', border: 'none', background: 'transparent' }} />
          </div>

          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            <input 
              placeholder={t('flights.search')}
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ width: '100%', paddingLeft: '36px', paddingRight: '36px' }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={14} /></button>
            )}
          </div>

          <button onClick={handleExport} className="nav-btn" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: 'none', cursor: 'pointer' }}>
            <FileSpreadsheet size={16} style={{ marginRight: 8 }} /> {t('flights.export')}
          </button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
              {[
                t('flights.table.date'), 
                t('flights.table.aircraft'), 
                t('flights.table.departure'), 
                t('flights.table.arrival'), 
                t('flights.table.block'), 
                t('flights.table.flight'), 
                t('flights.table.rule'), 
                t('flights.table.training'), 
                t('flights.table.cost'), 
                t('flights.table.details')
              ].map(h => (
                <th key={h} style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredFlights.length > 0 ? filteredFlights.map(f => (
              <tr key={f.id} style={{ borderBottom: '1px solid rgba(128,128,128,0.07)' }}>
                <td style={{ padding: '12px' }}>{formatDate(f.date)}</td>
                <td style={{ padding: '12px' }}>
                  <button 
                    onClick={() => setSearchTerm(f.aircraft)}
                    style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', borderRadius: 4, padding: '2px 8px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
                    title={t('flights.table.showOnly', { aircraft: f.aircraft })}
                  >
                    {f.aircraft}
                  </button>
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
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#4ade80', fontWeight: 600 }}>{formatCurrency(f.cost)}</span>
                        {f.manual_override && <Lock size={12} style={{ opacity: 0.4 }} title={t('flights.editModal.manualIndicator')} />}
                      </div>
                      {f.flight_cost > 0 && f.flight_cost !== f.cost && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t('flights.table.flightFee', { cost: formatCurrency(f.flight_cost) })}</span>}
                    </div>
                  ) : (
                    <span style={{ color: '#f87171' }}>{t('flights.table.missing')}</span>
                  )}
                </td>
                <td style={{ padding: '12px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {f.landing_fee > 0 && <div>{t('flights.table.landingFee', { cost: formatCurrency(f.landing_fee) })}</div>}
                  {f.approach_fee > 0 && <div>{t('flights.table.approachFee', { cost: formatCurrency(f.approach_fee) })}</div>}
                  {!(f.landing_fee > 0 || f.approach_fee > 0) && <span style={{ opacity: 0.3 }}>—</span>}
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {f.invoice_id ? (
                      <button 
                        onClick={() => handleViewInvoice(f.invoice_id)} 
                        className="nav-btn" 
                        style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)' }}
                      >
                        PDF
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>—</span>
                    )}
                    <button 
                      onClick={() => handleEditClick(f)}
                      className="nav-btn"
                      style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="11" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Search size={32} style={{ opacity: 0.1, marginBottom: 12 }} />
                  <p>{t('flights.noFlightsFound')}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingFlight && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div className="glass-panel" style={{ width: '400px', padding: '32px' }}>
            <h3 style={{ marginTop: 0, marginBottom: 24 }}>{t('flights.editModal.title')}</h3>
            <p style={{ opacity: 0.6, fontSize: '0.8rem', marginBottom: 24 }}>{editingFlight.aircraft} | {formatDate(editingFlight.date)}</p>
            
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', opacity: 0.7 }}>{t('flights.editModal.flightCost')}</label>
                <input type="number" step="0.01" value={editForm.flight_cost} onChange={e => setEditForm({...editForm, flight_cost: parseFloat(e.target.value) || 0})} className="input-field" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', opacity: 0.7 }}>{t('flights.editModal.fuelCost')}</label>
                <input type="number" step="0.01" value={editForm.fuel_cost} onChange={e => setEditForm({...editForm, fuel_cost: parseFloat(e.target.value) || 0})} className="input-field" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', opacity: 0.7 }}>{t('flights.editModal.landingFee')}</label>
                <input type="number" step="0.01" value={editForm.landing_fee} onChange={e => setEditForm({...editForm, landing_fee: parseFloat(e.target.value) || 0})} className="input-field" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', opacity: 0.7 }}>{t('flights.editModal.approachFee')}</label>
                <input type="number" step="0.01" value={editForm.approach_fee} onChange={e => setEditForm({...editForm, approach_fee: parseFloat(e.target.value) || 0})} className="input-field" style={{ width: '100%' }} />
              </div>
            </div>

            <div style={{ marginTop: 32, padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>{t('flights.editModal.total')}:</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>
                {formatCurrency((parseFloat(editForm.flight_cost) || 0) + (parseFloat(editForm.fuel_cost) || 0) + (parseFloat(editForm.landing_fee) || 0) + (parseFloat(editForm.approach_fee) || 0))}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button onClick={handleSaveCosts} className="nav-btn" style={{ flex: 1, background: '#38bdf8', color: 'white' }}>{t('flights.editModal.save')}</button>
              <button onClick={() => setEditingFlight(null)} className="nav-btn" style={{ flex: 1 }}>{t('flights.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ForecastView({ authFetch }) {
  const [rates, setRates] = useState([]);
  const [selectedAircraft, setSelectedAircraft] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [persons, setPersons] = useState(1);

  useEffect(() => {
    authFetch(`${API}/api/aircraft/rates`).then(res => res.json()).then(setRates);
  }, []);

  const rate = rates.find(r => r.aircraft === selectedAircraft);
  const totalFlight = rate ? rate.rate_per_min * minutes : 0;
  const perPerson = persons > 0 ? totalFlight / persons : 0;

  return (
    <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 350px' }}>
      <div className="glass-panel">
        <h2 style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <TrendingUp size={24} style={{ color: '#38bdf8' }} /> Flugkosten Forecast
        </h2>
        
        <div style={{ display: 'grid', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Flugzeug auswählen</label>
            <select 
              className="input-field" 
              style={{ width: '100%', fontSize: '1.1rem' }}
              value={selectedAircraft}
              onChange={e => setSelectedAircraft(e.target.value)}
            >
              <option value="">Bitte wählen...</option>
              {rates.map(r => <option key={r.aircraft} value={r.aircraft}>{r.aircraft}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Geplante Blockzeit (Min.)</label>
              <input 
                type="number" 
                value={minutes} 
                onChange={e => setMinutes(Number(e.target.value))} 
                className="input-field" 
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Personen (Split)</label>
              <input 
                type="number" 
                min="1"
                value={persons} 
                onChange={e => setPersons(Number(e.target.value))} 
                className="input-field" 
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {rate && (
            <div style={{ marginTop: 12, padding: '20px', background: 'rgba(56,189,248,0.05)', borderRadius: '12px', border: '1px solid rgba(56,189,248,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ opacity: 0.6 }}>Basis-Rate (letzte Rechnung):</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(rate.rate_per_min * 60)} / h</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.5 }}>
                <span>Zusatzkosten (Schätzwert Heimatplatz):</span>
                <span>Ldg: {formatCurrency(rate.landing_fee)} | ACG: {formatCurrency(rate.approach_fee)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
        <p style={{ fontSize: '0.9rem', opacity: 0.6, marginBottom: 8 }}>VORAUSSICHTLICHE KOSTEN</p>
        <div style={{ fontSize: '3rem', fontWeight: 800, color: '#38bdf8', marginBottom: 4 }}>
          {formatCurrency(totalFlight)}
        </div>
        {persons > 1 && (
          <div style={{ fontSize: '1.2rem', opacity: 0.8, color: '#4ade80' }}>
            {formatCurrency(perPerson)} <span style={{ fontSize: '0.9rem' }}>pro Person</span>
          </div>
        )}
        <p style={{ marginTop: 24, fontSize: '0.7rem', opacity: 0.4, fontStyle: 'italic' }}>
          * Schätzung basierend auf der letzten Rechnung für {selectedAircraft || '---'}. <br/>
          Exklusive Lande- und Anfluggebühren am Zielplatz.
        </p>
      </div>
    </div>
  );
}

function SettingsView({ flights, selectedIds, setSelectedIds, onBatchDelete, authFetch, loadData }) {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState('data');
  const [clubs, setClubs] = useState([]);
  const [newClub, setNewClub] = useState({ name: '', search_term: '', heuristic: 'highest_value', flight_amount_keyword: '', landing_fee_keyword: '', approach_fee_keyword: '', invoice_number_keyword: '', invoice_number_numeric_only: false, is_dry: false });
  const [editingClub, setEditingClub] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [newTraining, setNewTraining] = useState({ name: '', start_date: '', end_date: '' });
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState({ name: '', delimiter: ';', has_header: true, date_format: '02.01.2006', date_col: 0, aircraft_col: 1, departure_col: 4, arrival_col: 5, block_minutes_col: 6, flight_minutes_col: 7, pilot_col: 3, training_type_col: 11, flight_rule_col: 2, is_default: false });
  const [appSettings, setAppSettings] = useState({});

  const refreshLocalData = async () => {
    const [c, t, tmpl, s] = await Promise.all([
      authFetch(`${API}/api/clubs`),
      authFetch(`${API}/api/trainings`),
      authFetch(`${API}/api/csv-templates`),
      authFetch(`${API}/api/settings`)
    ]);
    setClubs(await c.json());
    setTrainings(await t.json());
    setTemplates(await tmpl.json());
    setAppSettings(await s.json());
  };

  useEffect(() => { refreshLocalData(); }, []);

  const addClub = async (e) => {
    e.preventDefault();
    if (!newClub.name) return;
    const isEdit = !!editingClub;
    const url = isEdit ? `${API}/api/clubs/${editingClub.id}` : `${API}/api/clubs`;
    const method = isEdit ? 'PUT' : 'POST';

    await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClub)
    });
    setNewClub({ name: '', search_term: '', heuristic: 'highest_value', flight_amount_keyword: '', landing_fee_keyword: '', approach_fee_keyword: '', invoice_number_keyword: '', invoice_number_numeric_only: false, is_dry: false });
    setEditingClub(null);
    refreshLocalData();
  };

  const deleteClub = async (id) => {
    if (!confirm(t('settings.confirmDeleteClub'))) return;
    await authFetch(`${API}/api/clubs/${id}`, { method: 'DELETE' });
    refreshLocalData();
  };

  const triggerReconcile = async () => {
    const res = await authFetch(`${API}/api/reconcile`, { method: 'POST' });
    const data = await res.json();
    alert(t('settings.reconcileComplete'));
  };

  const resetReconcile = async () => {
    if (!confirm(t('settings.confirmResetReconcile'))) return;
    await authFetch(`${API}/api/reconcile/reset`, { method: 'POST' });
    alert(t('settings.reconcileReset'));
    window.location.reload();
  };

  const updateSetting = async (key, value) => {
    await authFetch(`${API}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
    refreshLocalData();
  };

  return (
    <div className="dashboard-grid" style={{ gridTemplateColumns: '260px 1fr' }}>
      <div className="glass-panel" style={{ height: 'fit-content' }}>
        <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', letterSpacing: '0.05em' }}>{t('settings.sectionTitle')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button onClick={() => setSubTab('data')} className="nav-btn" style={{ background: subTab === 'data' ? 'rgba(56,189,248,0.15)' : 'transparent', color: subTab === 'data' ? '#38bdf8' : 'inherit', justifyContent: 'flex-start' }}>
            <Database size={14} style={{ marginRight: 8 }} /> {t('settings.dataManagement')}
          </button>
          <button onClick={() => setSubTab('clubs')} className="nav-btn" style={{ background: subTab === 'clubs' ? 'rgba(56,189,248,0.15)' : 'transparent', color: subTab === 'clubs' ? '#38bdf8' : 'inherit', justifyContent: 'flex-start' }}>
            <Building2 size={14} style={{ marginRight: 8 }} /> {t('settings.clubsAndBilling')}
          </button>
          <button onClick={() => setSubTab('trainings')} className="nav-btn" style={{ background: subTab === 'trainings' ? 'rgba(56,189,248,0.15)' : 'transparent', color: subTab === 'trainings' ? '#38bdf8' : 'inherit', justifyContent: 'flex-start' }}>
            <GraduationCap size={14} style={{ marginRight: 8 }} /> {t('settings.trainings')}
          </button>
          <button onClick={() => setSubTab('templates')} className="nav-btn" style={{ background: subTab === 'templates' ? 'rgba(56,189,248,0.15)' : 'transparent', color: subTab === 'templates' ? '#38bdf8' : 'inherit', justifyContent: 'flex-start' }}>
            <FileSpreadsheet size={14} style={{ marginRight: 8 }} /> {t('settings.csvTemplates')}
          </button>
          <button onClick={() => setSubTab('advanced')} className="nav-btn" style={{ background: subTab === 'advanced' ? 'rgba(56,189,248,0.15)' : 'transparent', color: subTab === 'advanced' ? '#38bdf8' : 'inherit', justifyContent: 'flex-start' }}>
            <Sliders size={14} style={{ marginRight: 8 }} /> {t('settings.advanced')}
          </button>
        </div>
      </div>

      <div className="glass-panel">
        {subTab === 'data' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>{t('settings.dataManagement')}</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={triggerReconcile} className="nav-btn" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                  <RefreshCcw size={14} style={{ marginRight: 8 }} /> {t('settings.reconcile')}
                </button>
                <button onClick={resetReconcile} className="nav-btn" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>
                  <Trash2 size={14} style={{ marginRight: 8 }} /> {t('settings.resetMatches')}
                </button>
                <button onClick={onBatchDelete} disabled={selectedIds.length === 0} className="nav-btn" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                  <Trash2 size={14} style={{ marginRight: 8 }} /> {t('settings.delete')} ({selectedIds.length})
                </button>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}><input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? flights.map(f => f.id) : [])} /></th>
                  <th style={{ padding: '10px' }}>{t('flights.table.date')}</th>
                  <th style={{ padding: '10px' }}>{t('flights.table.aircraft')}</th>
                  <th style={{ padding: '10px' }}>{t('flights.table.cost')}</th>
                </tr>
              </thead>
              <tbody>
                {flights.map(f => (
                  <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px' }}><input type="checkbox" checked={selectedIds.includes(f.id)} onChange={() => setSelectedIds(prev => prev.includes(f.id) ? prev.filter(i => i !== f.id) : [...prev, f.id])} /></td>
                    <td style={{ padding: '10px' }}>{formatDate(f.date)}</td>
                    <td style={{ padding: '10px' }}>{f.aircraft}</td>
                    <td style={{ padding: '10px' }}>{f.cost > 0 ? formatCurrency(f.cost) : <span style={{ color: '#f87171' }}>{t('flights.table.missing')}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'clubs' && (
          <div>
            <h2>Vereine & Aufschlüsselung</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Lege fest, wie Rechnungen pro Verein geparst und Kosten aufgeteilt werden.</p>

            <form onSubmit={addClub} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem' }}>Vereinsname</label>
                  <input placeholder="z.B. FlyLinz" value={newClub.name} onChange={e => setNewClub({ ...newClub, name: e.target.value })} className="input-field" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem' }}>Suchbegriff in PDF</label>
                  <input placeholder="z.B. Fly Linz GmbH" value={newClub.search_term} onChange={e => setNewClub({ ...newClub, search_term: e.target.value })} className="input-field" style={{ width: '100%' }} />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem' }}>Heuristik</label>
                <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Automatisch (Spalten/Keywords)</div>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', opacity: 0.7 }}>Keyword Rechnungs-Nr.</label>
                    <input placeholder="z.B. Rechnungsnummer" value={newClub.invoice_number_keyword} onChange={e => setNewClub({...newClub, invoice_number_keyword: e.target.value})} className="input-field" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem', opacity: 0.7 }}>Keyword Flugkosten</label>
                    <input placeholder="z.B. Fluggebühr" value={newClub.flight_amount_keyword} onChange={e => setNewClub({...newClub, flight_amount_keyword: e.target.value})} className="input-field" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem' }}>Keyw. Landegebühr</label>
                  <input placeholder="z.B. Landegebühr" value={newClub.landing_fee_keyword} onChange={e => setNewClub({ ...newClub, landing_fee_keyword: e.target.value })} className="input-field" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.8rem' }}>Keyw. Anfluggebühr</label>
                  <input placeholder="z.B. ACG" value={newClub.approach_fee_keyword} onChange={e => setNewClub({ ...newClub, approach_fee_keyword: e.target.value })} className="input-field" style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '24px', marginTop: '-4px', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', opacity: 0.7, cursor: 'pointer' }}>
                  <input type="checkbox" checked={newClub.invoice_number_numeric_only} onChange={e => setNewClub({...newClub, invoice_number_numeric_only: e.target.checked})} style={{ marginRight: 8 }} />
                  Rechnungsnummer besteht nur aus Zahlen (ignoriert Sonderzeichen wie #)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', opacity: 0.7, cursor: 'pointer' }}>
                  <input type="checkbox" checked={newClub.is_dry} onChange={e => setNewClub({...newClub, is_dry: e.target.checked})} style={{ marginRight: 8 }} />
                  <strong>{t('settings.dryRental')}</strong> ({t('settings.dryRentalDesc')})
                </label>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px' }}>
                <button type="submit" className="nav-btn" style={{ background: '#38bdf8', color: 'white', flex: 1 }}>
                  {editingClub ? 'Verein aktualisieren' : 'Verein Hinzufügen'}
                </button>
                {editingClub && (
                  <button type="button" onClick={() => { setEditingClub(null); setNewClub({ name: '', search_term: '', heuristic: 'highest_value', flight_amount_keyword: '', landing_fee_keyword: '', approach_fee_keyword: '' }); }} className="nav-btn" style={{ background: 'rgba(255,255,255,0.1)' }}>Abbrechen</button>
                )}
              </div>
            </form>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Verein / Suchbegriff</th>
                  <th style={{ padding: '12px' }}>Aufschlüsselung</th>
                  <th style={{ padding: '12px' }}></th>
                </tr>
              </thead>
              <tbody>
                {clubs.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px' }}>
                      <strong>{c.name}</strong><br/>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>PDF: {c.search_term || '—'}</span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {c.flight_amount_keyword && `Flug: "${c.flight_amount_keyword}" `}
                      {c.landing_fee_keyword && `Ldg: "${c.landing_fee_keyword}" `}
                      {c.approach_fee_keyword && `ACG: "${c.approach_fee_keyword}" `}
                      {c.is_dry && <span style={{ color: '#fbbf24', fontWeight: 600 }}>[DRY]</span>}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', verticalAlign: 'middle' }}>
                      <button onClick={() => { setEditingClub(c); setNewClub(c); }} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', marginRight: 8 }}><Edit2 size={16} /></button>
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
              await authFetch(`${API}/api/trainings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTraining) });
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
                      <button onClick={async () => { await authFetch(`${API}/api/trainings/${t.id}`, { method: 'DELETE' }); refreshLocalData(); }} style={{ color: '#f87171', background: 'none', border: 'none' }}><Trash2 size={16} /></button>
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

              await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTemplate)
              });

              setNewTemplate({ name: '', delimiter: ';', has_header: true, date_format: '02.01.2006', date_col: 0, aircraft_col: 1, departure_col: 4, arrival_col: 5, block_minutes_col: 6, flight_minutes_col: 7, pilot_col: 3, training_type_col: 11, flight_rule_col: 2, is_default: false });
              refreshLocalData();
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
                        <button onClick={async () => { await authFetch(`${API}/api/csv-templates/${t.id}/set-default`, { method: 'POST' }); refreshLocalData(); }} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }} title="Als Standard setzen"><Star size={16} /></button>
                      )}
                      {t.is_default && (
                        <Star size={16} style={{ color: '#f59e0b', fill: '#f59e0b', marginTop: 8 }} />
                      )}
                      <button onClick={() => setNewTemplate(t)} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 8 }} title="Bearbeiten"><Edit2 size={16} /></button>
                      <button onClick={async () => { if (confirm('Löschen?')) { await authFetch(`${API}/api/csv-templates/${t.id}`, { method: 'DELETE' }); refreshLocalData(); } }} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', marginTop: 8 }} title="Löschen"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'advanced' && (
          <div>
            <h2 style={{ marginBottom: 24 }}>Systemeinstellungen</h2>
            <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Debug Modus</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', opacity: 0.5 }}>Erhöht die Detailtiefe der Logs (Parser, Matching, Dateinamen).</p>
                </div>
                <button 
                  onClick={() => updateSetting('debug_mode', appSettings.debug_mode === 'true' ? 'false' : 'true')}
                  className="nav-btn"
                  style={{ 
                    background: appSettings.debug_mode === 'true' ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.05)',
                    color: appSettings.debug_mode === 'true' ? '#38bdf8' : 'inherit',
                    padding: '8px 16px'
                  }}
                >
                  {appSettings.debug_mode === 'true' ? 'AKTIVIERT' : 'DEAKTIVIERT'}
                </button>
              </div>
            </div>
            <div style={{ marginTop: 24, fontSize: '0.8rem', opacity: 0.3, fontStyle: 'italic' }}>
              Die Logs können über die Container-Konsole (z.B. in Portainer) eingesehen werden.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ImportView({ onImported, authFetch }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  useEffect(() => {
    authFetch(`${API}/api/csv-templates`).then(res => res.json()).then(data => {
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
    setStatus(t('import.uploading'));
    const form = new FormData();
    form.append('file', file);
    form.append('template_id', selectedTemplate);
    try {
      const res = await authFetch(`${API}/api/import/logbook`, { method: 'POST', body: form });
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
      <h2>{t('import.csv')}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{t('import.dropFiles')}</p>

      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('import.selectTemplate')}:</span>
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
          {loading ? t('import.uploading') : t('import.selectCSV')}
        </span>
      </label>
      {status && <p style={{ marginTop: 20 }}>{status}</p>}
    </div>
  );
}

function App() {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [flights, setFlights] = useState([]);
  const [airportData, setAirportData] = useState({});
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  useEffect(() => {
    if (user && user.locale) {
      i18n.changeLanguage(user.locale);
    }
  }, [user, i18n]);

  const handleLanguageChange = async (lng) => {
    await i18n.changeLanguage(lng);
    if (token) {
      await authFetch(`${API}/api/user/locale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: lng })
      });
      setUser(prev => prev ? { ...prev, locale: lng } : null);
      loadData();
    }
  };

  const authFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.status === 401) {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
    }
    return res;
  };

  useEffect(() => {
    if (token) {
      authFetch(`${API}/api/me`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setUser(data);
          else {
            setToken(null);
            localStorage.removeItem('token');
          }
        });
    }
  }, [token]);

  const [rates, setRates] = useState([]);
  useEffect(() => {
    if (token && user) {
      authFetch(`${API}/api/aircraft/rates`).then(res => res.json()).then(setRates);
    }
  }, [token, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, fRes, aRes] = await Promise.all([
        authFetch(`${API}/api/stats`),
        authFetch(`${API}/api/flights`),
        authFetch(`${API}/api/stats/airports`)
      ]);
      const s = await sRes.json();
      const f = await fRes.json();
      const a = await aRes.json();
      setStats(s);
      setFlights(f);
      setAirportData(a);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    if (token && user) loadData();
  }, [token, user]);

  const [clubs, setClubs] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [settings, setSettings] = useState({});

  const [selectedIds, setSelectedIds] = useState([]);

  const batchDelete = async () => {
    if (!confirm(`${selectedIds.length} Flüge löschen?`)) return;
    await authFetch(`${API}/api/flights/delete-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds })
    });
    setSelectedIds([]);
    loadData();
  };

  const loadSettingsData = async () => {
    const [cRes, tRes, tmRes, sRes] = await Promise.all([
      authFetch(`${API}/api/clubs`),
      authFetch(`${API}/api/trainings`),
      authFetch(`${API}/api/csv-templates`),
      authFetch(`${API}/api/settings`)
    ]);
    setClubs(await cRes.json());
    setTrainings(await tRes.json());
    setTemplates(await tmRes.json());
    setSettings(await sRes.json());
  };

  useEffect(() => {
    if (activeTab === 'settings' && token && user) loadSettingsData();
  }, [activeTab, token, user]);

  const saveClub = async (club) => {
    const url = club.id ? `${API}/api/clubs/${club.id}` : `${API}/api/clubs`;
    const method = club.id ? 'PUT' : 'POST';
    await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(club)
    });
    loadSettingsData();
  };

  const deleteClub = async (id) => {
    await authFetch(`${API}/api/clubs/${id}`, { method: 'DELETE' });
    loadSettingsData();
  };

  const reconcile = async () => {
    const res = await authFetch(`${API}/api/reconcile`, { method: 'POST' });
    if (res.ok) {
      alert(t('settings.reconcileComplete'));
      setTimeout(loadData, 500); // Give backend a moment to start processing
    }
  };

  const resetMatches = async () => {
    if (confirm('Alle Verknüpfungen wirklich löschen?')) {
      await authFetch(`${API}/api/reconcile/reset`, { method: 'POST' });
      loadData();
    }
  };

  const saveSetting = async (key, value) => {
    await authFetch(`${API}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!token || !user) {
    return <LoginView onLogin={(data) => {
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('token', data.token);
    }} />;
  }

  return (
    <div className="app-container" onClick={() => setShowUserMenu(false)}>
      {(user.requires_password_change || showPasswordChange) && (
        <ChangePasswordDialog 
          onComplete={() => {
            setShowPasswordChange(false);
            authFetch(`${API}/api/me`).then(res => res.json()).then(setUser);
          }}
          onCancel={user.requires_password_change ? null : () => setShowPasswordChange(false)}
        />
      )}
      
      <nav className="glass-panel" style={{ margin: '24px', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', padding: '12px 24px' }}>
        <button onClick={() => setActiveTab('dashboard')} className="nav-btn" style={{ background: activeTab === 'dashboard' ? 'rgba(56,189,248,0.2)' : 'transparent', color: activeTab === 'dashboard' ? '#38bdf8' : 'var(--text-primary)' }}>
          <BarChart3 size={16} style={{ marginRight: 8 }} /> {t('nav.dashboard')}
        </button>
        <button onClick={() => setActiveTab('flights')} className="nav-btn" style={{ background: activeTab === 'flights' ? 'rgba(56,189,248,0.2)' : 'transparent', color: activeTab === 'flights' ? '#38bdf8' : 'var(--text-primary)' }}>
          <Database size={16} style={{ marginRight: 8 }} /> {t('nav.flights')}
        </button>
        <button onClick={() => setActiveTab('forecast')} className="nav-btn" style={{ background: activeTab === 'forecast' ? 'rgba(56,189,248,0.2)' : 'transparent', color: activeTab === 'forecast' ? '#38bdf8' : 'var(--text-primary)' }}>
          <TrendingUp size={16} style={{ marginRight: 8 }} /> {t('nav.forecast')}
        </button>
        <button onClick={() => setActiveTab('import')} className="nav-btn" style={{ background: activeTab === 'import' ? 'rgba(56,189,248,0.2)' : 'transparent', color: activeTab === 'import' ? '#38bdf8' : 'var(--text-primary)' }}>
          <Upload size={16} style={{ marginRight: 8 }} /> {t('nav.import')}
        </button>
        <button onClick={() => setActiveTab('settings')} className="nav-btn" style={{ background: activeTab === 'settings' ? 'rgba(56,189,248,0.2)' : 'transparent', color: activeTab === 'settings' ? '#38bdf8' : 'var(--text-primary)' }}>
          <Settings size={16} style={{ marginRight: 8 }} /> {t('nav.settings')}
        </button>
        
        <div style={{ borderLeft: '1px solid rgba(128,128,128,0.3)', height: '24px', margin: '0 8px' }}></div>
        
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <button 
            className="nav-btn" 
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{ color: showUserMenu ? '#38bdf8' : 'var(--text-secondary)' }}
          >
            <Activity size={16} style={{ marginRight: 8 }} /> {user.username}
          </button>
          
          {showUserMenu && (
            <div className="glass-panel" style={{ position: 'absolute', top: '100%', left: 0, marginTop: 12, padding: '4px', minWidth: 180, zIndex: 100, display: 'flex', flexDirection: 'column', gap: '2px', backdropFilter: 'blur(20px)', background: 'var(--glass-bg)' }}>
              <button 
                className="nav-btn" 
                style={{ padding: '10px 16px', justifyContent: 'flex-start', borderRadius: 10, width: '100%', fontSize: '0.85rem' }} 
                onClick={() => { setShowPasswordChange(true); setShowUserMenu(false); }}
              >
                <RefreshCcw size={14} style={{ marginRight: 10, opacity: 0.7 }} /> {t('nav.changePassword')}
              </button>
              
              <div style={{ height: '1px', background: 'var(--glass-border)', margin: '4px 8px' }}></div>
              
              <div style={{ padding: '4px 8px', display: 'flex', gap: '4px' }}>
                <button 
                  className="nav-btn" 
                  style={{ flex: 1, justifyContent: 'center', padding: '6px', fontSize: '0.75rem', background: i18n.language === 'de' ? 'rgba(56,189,248,0.2)' : 'transparent', color: i18n.language === 'de' ? '#38bdf8' : 'var(--text-secondary)' }}
                  onClick={(e) => { e.stopPropagation(); handleLanguageChange('de'); setShowUserMenu(false); }}
                >
                  <span style={{ marginRight: 6 }}>🇦🇹</span> DE
                </button>
                <button 
                  className="nav-btn" 
                  style={{ flex: 1, justifyContent: 'center', padding: '6px', fontSize: '0.75rem', background: i18n.language.startsWith('en') ? 'rgba(56,189,248,0.2)' : 'transparent', color: i18n.language.startsWith('en') ? '#38bdf8' : 'var(--text-secondary)' }}
                  onClick={(e) => { e.stopPropagation(); handleLanguageChange('en'); setShowUserMenu(false); }}
                >
                  <span style={{ marginRight: 6 }}>🇬🇧</span> EN
                </button>
              </div>

              <div style={{ height: '1px', background: 'var(--glass-border)', margin: '4px 8px' }}></div>
              
              <button 
                className="nav-btn" 
                style={{ padding: '10px 16px', justifyContent: 'flex-start', borderRadius: 10, width: '100%', fontSize: '0.85rem', color: '#f87171' }} 
                onClick={() => {
                  setToken(null);
                  setUser(null);
                  localStorage.removeItem('token');
                }}
              >
                <LogOut size={14} style={{ marginRight: 10, opacity: 0.7 }} /> {t('nav.logout')}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="nav-btn"
          title={t('nav.toggleTheme')}
          style={{ padding: '8px' }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>

      <header className="header" style={{ marginBottom: '32px' }}>
        <img src={logo} alt="AeroBudget Logo" style={{ height: '100px', width: 'auto' }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.05em', marginBottom: 4 }}>AEROBUDGET</p>
        <p style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: 0 }}>v1.5.0</p>
      </header>

      <div style={{ padding: '0 24px 24px' }}>
        {activeTab === 'dashboard' && <Dashboard stats={stats} flights={flights} theme={theme} airportData={airportData} />}
        {activeTab === 'flights' && <FlightTable flights={flights} authFetch={authFetch} loadData={loadData} />}
        {activeTab === 'forecast' && <ForecastView authFetch={authFetch} />}
        {activeTab === 'import' && <ImportView onImported={loadData} authFetch={authFetch} />}
        {activeTab === 'settings' && <SettingsView flights={flights} selectedIds={selectedIds} setSelectedIds={setSelectedIds} onBatchDelete={batchDelete} authFetch={authFetch} loadData={loadData} />}
      </div>
    </div>
  );
}

export default App;