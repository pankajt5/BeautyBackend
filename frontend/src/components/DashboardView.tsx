import React, { useState } from 'react';
import { 
  DollarSign, Users, Clock, AlertTriangle, TrendingUp, 
  Layers, RefreshCw, Save, Trash2, Calendar, FileText 
} from 'lucide-react';
import { SimulationResult, Shop, CustomerConfig, SimulationRun } from '../App';

interface DashboardViewProps {
  simResult: SimulationResult | null;
  shop: Shop | null;
  customer: CustomerConfig | null;
  triggerReSim: () => void;
  savedRuns: SimulationRun[];
  onSaveRun: (name: string) => void;
  onDeleteRun: (id: number) => void;
}

export default function DashboardView({
  simResult,
  shop,
  customer,
  triggerReSim,
  savedRuns,
  onSaveRun,
  onDeleteRun
}: DashboardViewProps) {
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!simResult || !shop || !customer) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--accent-purple)', margin: '0 auto 15px' }} />
        <h3>Loading simulation results...</h3>
      </div>
    );
  }

  // Format currency
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Aggregated card calculations
  const dailyRent = shop.monthlyRent / 30;
  const dailyElectricity = shop.monthlyElectricity / 30;
  const walkAwayPct = ((simResult.walkAwayCount) / (simResult.totalCustomersServed + simResult.walkAwayCount || 1)) * 100;

  // Chart data extraction
  const dailyReports = simResult.dailyReports || [];
  
  // Custom SVG Line Path builder
  const getLinePath = (data: any[], key: string, width: number, height: number) => {
    if (data.length === 0) return '';
    const maxVal = Math.max(...data.map(d => d[key]), 1);
    const minVal = Math.min(...data.map(d => d[key]), 0);
    const valRange = maxVal - minVal;
    
    return data.map((d, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((d[key] - minVal) / valRange) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;
    setIsSaving(true);
    onSaveRun(saveName);
    setSaveName('');
    setIsSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Upper header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Beauty Parlour Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Scenario: <strong style={{ color: 'var(--text-primary)' }}>{shop.name}</strong> • 
            Customer Config: <strong style={{ color: 'var(--text-primary)' }}>{customer.name}</strong> • 
            Duration: <strong style={{ color: 'var(--accent-purple)' }}>30-Day Projection</strong>
          </p>
        </div>
        
        <button className="btn-primary" onClick={triggerReSim}>
          <RefreshCw size={18} />
          <span>Refresh Simulation</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="dashboard-grid">
        {/* Profit Card */}
        <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '80px', height: '80px', background: 'radial-gradient(var(--success), transparent 70%)', opacity: 0.15 }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={16} style={{ color: 'var(--success)' }} />
            <span>PROJECTED NET PROFIT (30D)</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: simResult.netProfit >= 0 ? 'var(--success)' : 'var(--error)', margin: '12px 0 6px' }}>
            {formatINR(simResult.netProfit)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Daily Avg: {formatINR(simResult.netProfit / 30)}
          </div>
        </div>

        {/* Revenue Card */}
        <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '80px', height: '80px', background: 'radial-gradient(var(--accent-purple), transparent 70%)', opacity: 0.15 }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={16} style={{ color: 'var(--accent-purple)' }} />
            <span>TOTAL REVENUE (30D)</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: '12px 0 6px' }}>
            {formatINR(simResult.totalRevenue)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '10px' }}>
            <span>Plans: {formatINR(simResult.membershipRevenue)}</span>
            <span>Services: {formatINR(simResult.serviceRevenue)}</span>
          </div>
        </div>

        {/* Customers Served Card */}
        <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={16} style={{ color: 'var(--accent-blue)' }} />
            <span>CUSTOMERS SERVED</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: '12px 0 6px' }}>
            {simResult.totalCustomersServed}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Daily Avg: {(simResult.totalCustomersServed / 30).toFixed(1)} visitors
          </div>
        </div>

        {/* Queue Wait Time / Leakage Card */}
        <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} style={{ color: 'var(--accent-pink)' }} />
            <span>CUSTOMER WAIT & LEAKAGE</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: '12px 0 6px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span>{simResult.avgWaitingTime.toFixed(1)}m</span>
            <span style={{ fontSize: '13px', color: walkAwayPct > 15 ? 'var(--error)' : 'var(--text-secondary)', fontWeight: 500 }}>
              ({walkAwayPct.toFixed(1)}% walk-away)
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            {simResult.stockoutCount > 0 && (
              <span style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <AlertTriangle size={12} /> {simResult.stockoutCount} stockouts
              </span>
            )}
            <span>Lost Clients: {simResult.walkAwayCount}</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        
        {/* Financial Flow Line Graph */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px', fontFamily: 'Outfit' }}>Daily Financial Flow</h3>
          {dailyReports.length > 0 ? (
            <div style={{ position: 'relative' }}>
              <svg width="100%" height="240" viewBox="0 0 600 240" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-purple)" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="var(--accent-purple)" stopOpacity="0.0"/>
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="var(--success)" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="60" x2="600" y2="60" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1="0" y1="120" x2="600" y2="120" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1="0" y1="180" x2="600" y2="180" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                
                {/* Paths */}
                <path 
                  d={getLinePath(dailyReports, 'revenue', 600, 240)} 
                  fill="none" 
                  stroke="var(--accent-purple)" 
                  strokeWidth="3" 
                />
                
                <path 
                  d={getLinePath(dailyReports, 'profit', 600, 240)} 
                  fill="none" 
                  stroke="var(--success)" 
                  strokeWidth="3" 
                  strokeDasharray="4 2"
                />
              </svg>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11px', marginTop: '10px' }}>
                <span>Day 1</span>
                <span>Day 10</span>
                <span>Day 20</span>
                <span>Day 30</span>
              </div>

              {/* Chart Legend */}
              <div style={{ display: 'flex', gap: '20px', marginTop: '15px', justifyContent: 'center', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--accent-purple)', borderRadius: '2px' }} />
                  <span>Revenue</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--success)', borderRadius: '2px' }} />
                  <span>Net Profit (Daily)</span>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No data available to plot flow chart.</p>
          )}
        </div>

        {/* Cost Breakdown Structure */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px', fontFamily: 'Outfit' }}>Expense Breakdown</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', flexGrow: 1 }}>
            
            {/* Salary Expense */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>Staff Salaries</span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatINR(simResult.salaryExpense)}</strong>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${(simResult.salaryExpense / (simResult.totalExpenses || 1)) * 100}%`, 
                  height: '100%', 
                  background: 'var(--accent-purple)' 
                }} />
              </div>
            </div>

            {/* Product consumption */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>Product Consumption</span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatINR(simResult.productExpense)}</strong>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${(simResult.productExpense / (simResult.totalExpenses || 1)) * 100}%`, 
                  height: '100%', 
                  background: 'var(--accent-pink)' 
                }} />
              </div>
            </div>

            {/* Rent */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>Rent</span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatINR(simResult.rentExpense)}</strong>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${(simResult.rentExpense / (simResult.totalExpenses || 1)) * 100}%`, 
                  height: '100%', 
                  background: 'var(--accent-gold)' 
                }} />
              </div>
            </div>

            {/* Electricity */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span>Utilities / Electricity</span>
                <strong style={{ color: 'var(--text-primary)' }}>{formatINR(simResult.electricityExpense)}</strong>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${(simResult.electricityExpense / (simResult.totalExpenses || 1)) * 100}%`, 
                  height: '100%', 
                  background: 'var(--accent-blue)' 
                }} />
              </div>
            </div>
            
          </div>
        </div>

      </div>

      {/* Staff Utilization & Popular Services Rows */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* Staff Utilization Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px', fontFamily: 'Outfit' }}>Staff Utilization Rates</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {Object.entries(simResult.staffUtilization).map(([name, util]) => (
              <div key={name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span>{name}</span>
                  <span style={{ fontWeight: 600, color: util > 85 ? 'var(--error)' : 'var(--text-primary)' }}>
                    {util.toFixed(1)}%
                  </span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${util}%`, 
                    height: '100%', 
                    background: util > 85 ? 'var(--error)' : 'linear-gradient(90deg, var(--accent-purple), var(--accent-blue))'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Service Popularity Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px', fontFamily: 'Outfit' }}>Service Popularity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {Object.entries(simResult.servicePopularity).length > 0 ? (
              Object.entries(simResult.servicePopularity)
                .sort((a, b) => b[1] - a[1])
                .map(([serviceName, count]) => (
                  <div key={serviceName}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span>{serviceName}</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{count} times</strong>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${(count / Math.max(...Object.values(simResult.servicePopularity), 1)) * 100}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, var(--accent-pink), var(--accent-gold))'
                      }} />
                    </div>
                  </div>
                ))
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No services performed yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Scenarios History & Saving */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontFamily: 'Outfit' }}>Saved Scenarios & Runs</h3>
          
          {/* Quick Save form */}
          <form onSubmit={handleSave} style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Name this run (e.g. 3 Staff 300 Members)" 
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              style={{ width: '280px', padding: '8px 12px' }}
            />
            <button type="submit" className="btn-secondary" style={{ padding: '8px 16px' }} disabled={isSaving}>
              <Save size={16} />
              <span>Save Run</span>
            </button>
          </form>
        </div>

        {savedRuns.length > 0 ? (
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Scenario Name</th>
                  <th>Customers</th>
                  <th>Wait Time</th>
                  <th>Revenue</th>
                  <th>Expenses</th>
                  <th>Net Profit</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {savedRuns.map((run) => (
                  <tr key={run.id}>
                    <td><Calendar size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> {new Date(run.runTime).toLocaleDateString()}</td>
                    <td><strong>{run.name}</strong></td>
                    <td>{run.totalCustomers} served ({run.walkAwayCount} lost)</td>
                    <td>{run.avgWaitingTime.toFixed(1)} mins</td>
                    <td>{formatINR(run.totalRevenue)}</td>
                    <td>{formatINR(run.totalExpenses)}</td>
                    <td style={{ color: run.netProfit >= 0 ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
                      {formatINR(run.netProfit)}
                    </td>
                    <td>
                      <button 
                        className="btn-danger" 
                        onClick={() => onDeleteRun(run.id)}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
            No saved runs found. Name and save your current configuration parameters above to track changes.
          </div>
        )}
      </div>

    </div>
  );
}
