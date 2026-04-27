import { useState } from 'react';
import { Plane, Receipt, Map as MapIcon, BarChart3, TrendingUp, Settings } from 'lucide-react';
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
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import './index.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const mockData = {
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  costs: [450, 600, 800, 420, 1200, 950],
  aircrafts: {
    labels: ['D-EXYZ (C172)', 'D-EABC (PA28)'],
    data: [3500, 1200]
  },
  training: {
    labels: ['PIC', 'IFR', 'PPL'],
    data: [2000, 1500, 500]
  }
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="app-container">
      <nav className="glass-panel" style={{ margin: '24px', display: 'flex', gap: '24px', justifyContent: 'center' }}>
        <button onClick={() => setActiveTab('dashboard')} className="nav-btn"><BarChart3 /> Dashboard</button>
        <button onClick={() => setActiveTab('flights')} className="nav-btn"><Plane /> Flüge & Rechnungen</button>
        <button onClick={() => setActiveTab('map')} className="nav-btn"><MapIcon /> Weltkarte</button>
        <button onClick={() => setActiveTab('forecast')} className="nav-btn"><TrendingUp /> Forecast</button>
        <button onClick={() => setActiveTab('settings')} className="nav-btn"><Settings /> Settings</button>
      </nav>

      {activeTab === 'dashboard' && (
        <>
          <header className="header">
            <h1>Aerobudget</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Dein Pilot Cost Tracker</p>
          </header>

          <main className="dashboard-grid">
            <div className="glass-panel">
              <h2>Kostenentwicklung</h2>
              <Line 
                data={{
                  labels: mockData.months,
                  datasets: [{
                    label: 'Kosten (€)',
                    data: mockData.costs,
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    tension: 0.4,
                    fill: true
                  }]
                }}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { color: 'rgba(255,255,255,0.05)' } }
                  }
                }}
              />
            </div>

            <div className="glass-panel">
              <h2>Kosten pro Flugzeug</h2>
              <Doughnut 
                data={{
                  labels: mockData.aircrafts.labels,
                  datasets: [{
                    data: mockData.aircrafts.data,
                    backgroundColor: ['#38bdf8', '#8b5cf6'],
                    borderWidth: 0
                  }]
                }}
                options={{
                  cutout: '70%',
                  plugins: { legend: { position: 'bottom', labels: { color: '#f8fafc' } } }
                }}
              />
            </div>

            <div className="glass-panel">
              <h2>Ausgaben nach Art</h2>
              <Bar 
                data={{
                  labels: mockData.training.labels,
                  datasets: [{
                    label: 'Gesamt (€)',
                    data: mockData.training.data,
                    backgroundColor: '#8b5cf6',
                    borderRadius: 4
                  }]
                }}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                  }
                }}
              />
            </div>
            
            <div className="glass-panel">
              <div className="stat-label">Gesamtkosten (YTD)</div>
              <div className="stat-value">4.420 €</div>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className="stat-label">Flugstunden</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>24h 15m</div>
                </div>
                <div>
                  <div className="stat-label">Ø Kosten / h</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>182 €</div>
                </div>
              </div>
            </div>
          </main>
        </>
      )}
      
      {activeTab !== 'dashboard' && (
        <div className="dashboard-grid">
          <div className="glass-panel" style={{ textAlign: 'center', padding: '64px' }}>
            <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Feature in Entwicklung...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
