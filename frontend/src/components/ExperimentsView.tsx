import React, { useState } from 'react';
import { Play, Activity, ShieldAlert, BarChart2, DollarSign, Clock, Users } from 'lucide-react';
import { Shop, CustomerConfig, SimulationResult } from '../App';

interface ExperimentsViewProps {
  apiUrl: string;
  shops: Shop[];
  customers: CustomerConfig[];
}

export default function ExperimentsView({ apiUrl, shops, customers }: ExperimentsViewProps) {
  // Scenario A setup
  const [shopA, setShopA] = useState<number>(shops[0]?.id || 0);
  const [custA, setCustA] = useState<number>(customers[0]?.id || 0);

  // Scenario B setup
  const [shopB, setShopB] = useState<number>(shops[1]?.id || shops[0]?.id || 0);
  const [custB, setCustB] = useState<number>(customers[0]?.id || 0);

  const [resultA, setResultA] = useState<SimulationResult | null>(null);
  const [resultB, setResultB] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);

  const runExperiment = async () => {
    if (!shopA || !custA || !shopB || !custB) return;
    setRunning(true);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`${apiUrl}/simulation/run?days=30&shopId=${shopA}&customerConfigId=${custA}`, { method: 'POST' }).then(r => r.json()),
        fetch(`${apiUrl}/simulation/run?days=30&shopId=${shopB}&customerConfigId=${custB}`, { method: 'POST' }).then(r => r.json())
      ]);
      setResultA(resA);
      setResultB(resB);
    } catch (e) {
      console.error("Experiment failed", e);
    } finally {
      setRunning(false);
    }
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getPercentageDiff = (valA: number, valB: number) => {
    if (valA === 0) return '0%';
    const diff = ((valB - valA) / valA) * 100;
    return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '32px', fontWeight: 800 }}>Business Experiments</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          Compare operational parameters side-by-side to find the most profitable business plan.
        </p>
      </div>

      {/* Selectors Panel */}
      <div className="glass-panel" style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '20px', alignItems: 'end' }}>
        
        {/* Scenario A Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '15px', color: 'var(--accent-purple)', fontFamily: 'Outfit' }}>Scenario A</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label">Shop Model</label>
              <select className="form-select" value={shopA} onChange={e => setShopA(parseInt(e.target.value))}>
                {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Customer Profile</label>
              <select className="form-select" value={custA} onChange={e => setCustA(parseInt(e.target.value))}>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Scenario B Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '15px', color: 'var(--accent-pink)', fontFamily: 'Outfit' }}>Scenario B</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label">Shop Model</label>
              <select className="form-select" value={shopB} onChange={e => setShopB(parseInt(e.target.value))}>
                {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Customer Profile</label>
              <select className="form-select" value={custB} onChange={e => setCustB(parseInt(e.target.value))}>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Action Trigger */}
        <button 
          className="btn-primary" 
          onClick={runExperiment} 
          disabled={running} 
          style={{ height: '42px', padding: '0 30px' }}
        >
          <Play size={16} />
          <span>{running ? 'Simulating...' : 'Run Experiment'}</span>
        </button>

      </div>

      {/* Comparison results */}
      {resultA && resultB && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-slide-in">
          
          {/* Main Side-by-side grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            
            {/* Profit compare card */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>
                <DollarSign size={16} style={{ color: 'var(--success)' }} />
                <span>NET PROFIT (30D)</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: 600 }}>A</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: resultA.netProfit >= 0 ? 'var(--success)' : 'var(--error)' }}>
                    {formatINR(resultA.netProfit)}
                  </div>
                </div>
                
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>vs</span>
                
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--accent-pink)', fontWeight: 600 }}>B</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: resultB.netProfit >= 0 ? 'var(--success)' : 'var(--error)' }}>
                    {formatINR(resultB.netProfit)}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '12px', paddingTop: '8px', fontSize: '12px', textAlign: 'center' }}>
                Variance: <strong style={{ color: (resultB.netProfit - resultA.netProfit) >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {getPercentageDiff(resultA.netProfit, resultB.netProfit)}
                </strong>
              </div>
            </div>

            {/* Waiting Time compare card */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>
                <Clock size={16} style={{ color: 'var(--accent-blue)' }} />
                <span>AVG CLIENT WAIT TIME</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: 600 }}>A</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {resultA.avgWaitingTime.toFixed(1)}m
                  </div>
                </div>
                
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>vs</span>
                
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--accent-pink)', fontWeight: 600 }}>B</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {resultB.avgWaitingTime.toFixed(1)}m
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '12px', paddingTop: '8px', fontSize: '12px', textAlign: 'center' }}>
                Variance: <strong style={{ color: (resultB.avgWaitingTime - resultA.avgWaitingTime) <= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {getPercentageDiff(resultA.avgWaitingTime, resultB.avgWaitingTime)}
                </strong>
              </div>
            </div>

            {/* Walk-away clients comparison */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>
                <Users size={16} style={{ color: 'var(--accent-pink)' }} />
                <span>LOST WALK-AWAYS</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: 600 }}>A</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {resultA.walkAwayCount} clients
                  </div>
                </div>
                
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>vs</span>
                
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--accent-pink)', fontWeight: 600 }}>B</span>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {resultB.walkAwayCount} clients
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '12px', paddingTop: '8px', fontSize: '12px', textAlign: 'center' }}>
                Variance: <strong style={{ color: (resultB.walkAwayCount - resultA.walkAwayCount) <= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {getPercentageDiff(resultA.walkAwayCount, resultB.walkAwayCount)}
                </strong>
              </div>
            </div>

          </div>

          {/* Detailed Side-by-side comparison tables */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '20px', fontFamily: 'Outfit' }}>Financial & Operational Breakdown</h3>
            
            <div className="custom-table-container">
              <table className="custom-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Operating Metric</th>
                    <th>Scenario A</th>
                    <th>Scenario B</th>
                    <th>Delta Comparison</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Total Revenue</strong></td>
                    <td>{formatINR(resultA.totalRevenue)}</td>
                    <td>{formatINR(resultB.totalRevenue)}</td>
                    <td style={{ color: resultB.totalRevenue >= resultA.totalRevenue ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
                      {getPercentageDiff(resultA.totalRevenue, resultB.totalRevenue)}
                    </td>
                  </tr>
                  <tr>
                    <td>- Membership subscription fees</td>
                    <td>{formatINR(resultA.membershipRevenue)}</td>
                    <td>{formatINR(resultB.membershipRevenue)}</td>
                    <td>{getPercentageDiff(resultA.membershipRevenue, resultB.membershipRevenue)}</td>
                  </tr>
                  <tr>
                    <td>- Service checkouts</td>
                    <td>{formatINR(resultA.serviceRevenue)}</td>
                    <td>{formatINR(resultB.serviceRevenue)}</td>
                    <td>{getPercentageDiff(resultA.serviceRevenue, resultB.serviceRevenue)}</td>
                  </tr>
                  <tr>
                    <td><strong>Total Operating Expenses</strong></td>
                    <td>{formatINR(resultA.totalExpenses)}</td>
                    <td>{formatINR(resultB.totalExpenses)}</td>
                    <td style={{ color: resultB.totalExpenses <= resultA.totalExpenses ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
                      {getPercentageDiff(resultA.totalExpenses, resultB.totalExpenses)}
                    </td>
                  </tr>
                  <tr>
                    <td>- Rent overheads</td>
                    <td>{formatINR(resultA.rentExpense)}</td>
                    <td>{formatINR(resultB.rentExpense)}</td>
                    <td>{getPercentageDiff(resultA.rentExpense, resultB.rentExpense)}</td>
                  </tr>
                  <tr>
                    <td>- Electricity & power overheads</td>
                    <td>{formatINR(resultA.electricityExpense)}</td>
                    <td>{formatINR(resultB.electricityExpense)}</td>
                    <td>{getPercentageDiff(resultA.electricityExpense, resultB.electricityExpense)}</td>
                  </tr>
                  <tr>
                    <td>- Staff salary cost pool</td>
                    <td>{formatINR(resultA.salaryExpense)}</td>
                    <td>{formatINR(resultB.salaryExpense)}</td>
                    <td>{getPercentageDiff(resultA.salaryExpense, resultB.salaryExpense)}</td>
                  </tr>
                  <tr>
                    <td>- Product consumption costs</td>
                    <td>{formatINR(resultA.productExpense)}</td>
                    <td>{formatINR(resultB.productExpense)}</td>
                    <td>{getPercentageDiff(resultA.productExpense, resultB.productExpense)}</td>
                  </tr>
                  <tr>
                    <td><strong>Total Clients Served</strong></td>
                    <td>{resultA.totalCustomersServed} served</td>
                    <td>{resultB.totalCustomersServed} served</td>
                    <td>{getPercentageDiff(resultA.totalCustomersServed, resultB.totalCustomersServed)}</td>
                  </tr>
                  <tr>
                    <td><strong>Inventory Stockouts Count</strong></td>
                    <td>{resultA.stockoutCount} stockouts</td>
                    <td>{resultB.stockoutCount} stockouts</td>
                    <td style={{ color: resultB.stockoutCount <= resultA.stockoutCount ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
                      {resultB.stockoutCount - resultA.stockoutCount} difference
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* Default placeholder */}
      {!resultA && (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Activity size={48} style={{ color: 'var(--accent-purple)', margin: '0 auto 15px' }} />
          <h3>No experiment active</h3>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>
            Select your shops and customer configuration profiles above and click "Run Experiment" to compare metrics.
          </p>
        </div>
      )}

    </div>
  );
}
