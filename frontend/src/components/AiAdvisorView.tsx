import React, { useState, useEffect } from 'react';
import { Brain, HelpCircle, UserCheck, AlertOctagon, TrendingUp, RefreshCw, Scissors, Users, ShieldAlert } from 'lucide-react';
import { Shop, CustomerConfig, SimulationResult } from '../App';

interface AiAdvisorViewProps {
  apiUrl: string;
  shop: Shop | null;
  customer: CustomerConfig | null;
  simResult: SimulationResult | null;
}

interface StaffRecommendation {
  role: string;
  recommendedCount: number;
  rationale: string;
}

interface PlanRecommendation {
  planName: string;
  price: number;
  expectedMonthlyCostPerMember: number;
  netMarginPerMember: number;
  status: 'highly_profitable' | 'profitable' | 'loss_making';
  advice: string;
  breakEvenMembers: number;
}

interface BottleneckReport {
  primaryBottlenecks: string[];
  secondaryBottlenecks: string[];
  summaryText: string;
  actionPlan: string;
}

export default function AiAdvisorView({ apiUrl, shop, customer, simResult }: AiAdvisorViewProps) {
  const [activeQuestion, setActiveQuestion] = useState<'bottlenecks' | 'staff' | 'plans' | null>(null);
  
  // States for recommendations
  const [bottlenecks, setBottlenecks] = useState<BottleneckReport | null>(null);
  const [staffNeed, setStaffNeed] = useState<StaffRecommendation[]>([]);
  const [plansEval, setPlansEval] = useState<PlanRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  // Helper inputs
  const [targetMembers, setTargetMembers] = useState<number>(500);

  const fetchBottlenecks = async () => {
    setLoading(true);
    setActiveQuestion('bottlenecks');
    try {
      const res = await fetch(`${apiUrl}/simulation/recommendations/bottlenecks?shopId=${shop?.id}&customerConfigId=${customer?.id}`);
      const data = await res.json();
      setBottlenecks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffNeeds = async (members = targetMembers) => {
    setLoading(true);
    setActiveQuestion('staff');
    try {
      const res = await fetch(`${apiUrl}/simulation/recommendations/staff?targetMembers=${members}&shopId=${shop?.id}&customerConfigId=${customer?.id}`);
      const data = await res.json();
      setStaffNeed(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlansProfitability = async () => {
    setLoading(true);
    setActiveQuestion('plans');
    try {
      const res = await fetch(`${apiUrl}/simulation/recommendations/plans?shopId=${shop?.id}&customerConfigId=${customer?.id}`);
      const data = await res.json();
      setPlansEval(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Header banner */}
      <div className="glass-panel animate-slide-in" style={{ padding: '30px', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(236, 72, 153, 0.15))', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))', padding: '16px', borderRadius: '50%', boxShadow: 'var(--shadow-glow)' }}>
          <Brain size={36} style={{ color: 'white' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '26px', fontFamily: 'Outfit' }}>AI Advisor Panel</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            Your simulated business intelligence twin. Select a consulting prompt below to analyze configuration health, bottlenecks, or staffing scales.
          </p>
        </div>
      </div>

      {/* Prompts list */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        
        {/* Promp 1 */}
        <div 
          className="glass-panel" 
          style={{ padding: '20px', cursor: 'pointer', borderColor: activeQuestion === 'bottlenecks' ? 'var(--accent-purple)' : '' }}
          onClick={fetchBottlenecks}
        >
          <AlertOctagon size={24} style={{ color: 'var(--accent-pink)', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontFamily: 'Outfit' }}>Where is my bottleneck?</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Inspect wait times, equipment saturation rates, and lost walk-aways from simulated traffic.
          </p>
        </div>

        {/* Promp 2 */}
        <div 
          className="glass-panel" 
          style={{ padding: '20px', cursor: 'pointer', borderColor: activeQuestion === 'staff' ? 'var(--accent-purple)' : '' }}
          onClick={() => fetchStaffNeeds(targetMembers)}
        >
          <UserCheck size={24} style={{ color: 'var(--accent-blue)', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontFamily: 'Outfit' }}>How many staff do I need?</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Optimize payroll. Run a math model to recommend Beauticians vs Hair Stylists for member counts.
          </p>
        </div>

        {/* Promp 3 */}
        <div 
          className="glass-panel" 
          style={{ padding: '20px', cursor: 'pointer', borderColor: activeQuestion === 'plans' ? 'var(--accent-purple)' : '' }}
          onClick={fetchPlansProfitability}
        >
          <TrendingUp size={24} style={{ color: 'var(--accent-gold)', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontFamily: 'Outfit' }}>Which membership plan is profitable?</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Audit subscription pricing rules against product usage expenses to flag loss-making rules.
          </p>
        </div>

      </div>

      {/* Advisory Console Log Output */}
      <div className="glass-panel" style={{ padding: '24px', minHeight: '300px' }}>
        
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '15px' }}>
            <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--accent-purple)' }} />
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Consulting simulator engine...</span>
          </div>
        )}

        {!loading && activeQuestion === null && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)' }}>
            <HelpCircle size={36} style={{ marginBottom: '10px' }} />
            <p>Select a question above to generate an advice report.</p>
          </div>
        )}

        {/* Bottlenecks output */}
        {!loading && activeQuestion === 'bottlenecks' && bottlenecks && (
          <div className="animate-slide-in">
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}><AlertOctagon size={20} style={{ color: 'var(--accent-pink)' }} /> Bottleneck Audit Report</h3>
            
            <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.15)', borderLeft: '4px solid var(--accent-pink)', marginBottom: '20px', fontSize: '14px', lineHeight: '1.6' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Executive Summary:</div>
              <div style={{ whiteSpace: 'pre-line' }}>{bottlenecks.summaryText}</div>
            </div>

            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>Actionable Recommendations:</div>
              <div style={{ whiteSpace: 'pre-line', background: 'rgba(168,85,247,0.05)', padding: '15px', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                {bottlenecks.actionPlan}
              </div>
            </div>
          </div>
        )}

        {/* Staffing recommendation output */}
        {!loading && activeQuestion === 'staff' && (
          <div className="animate-slide-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><UserCheck size={20} style={{ color: 'var(--accent-blue)' }} /> Staff Allocation Advisor</h3>
              
              {/* Target slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Target Member Pool:</span>
                <input 
                  type="number" 
                  className="form-input" 
                  value={targetMembers} 
                  onChange={e => {
                    const val = parseInt(e.target.value) || 10;
                    setTargetMembers(val);
                  }}
                  style={{ width: '100px', padding: '6px' }}
                />
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => fetchStaffNeeds(targetMembers)}>
                  Recalculate
                </button>
              </div>
            </div>

            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Staff Role Category</th>
                    <th>Recommended Staff Size</th>
                    <th>Logic Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {staffNeed.map((req, i) => (
                    <tr key={i}>
                      <td><strong>{req.role}</strong></td>
                      <td style={{ color: 'var(--accent-blue)', fontSize: '16px', fontWeight: 700 }}>{req.recommendedCount} staff</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{req.rationale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Membership Profitability output */}
        {!loading && activeQuestion === 'plans' && (
          <div className="animate-slide-in">
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}><TrendingUp size={20} style={{ color: 'var(--accent-gold)' }} /> Plan Profitability Audit</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {plansEval.map((p, i) => (
                <div key={i} className="glass-panel" style={{ padding: '16px', borderColor: p.status === 'loss_making' ? 'var(--error)' : 'rgba(168,85,247,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <h4 style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{p.planName} Plan</h4>
                    <span className={`badge ${p.status === 'loss_making' ? 'badge-danger' : p.status === 'highly_profitable' ? 'badge-success' : 'badge-warning'}`}>
                      {p.status.replace('_',' ')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '15px 0', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subscription Price:</span>
                      <strong>{formatINR(p.price)}/mo</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Expected Product Cost per client:</span>
                      <strong style={{ color: 'var(--accent-pink)' }}>{formatINR(p.expectedMonthlyCostPerMember)}/mo</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                      <span>Net margin per subscriber:</span>
                      <strong style={{ color: p.netMarginPerMember >= 0 ? 'var(--success)' : 'var(--error)' }}>
                        {formatINR(p.netMarginPerMember)}/mo
                      </strong>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '10px' }}>
                    {p.advice}
                  </div>

                  {p.netMarginPerMember > 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Break-even requires: <strong>{p.breakEvenMembers} member subscriptions</strong>
                    </div>
                  )}
                </div>
              ))}
              {plansEval.length === 0 && (
                <p style={{ color: 'var(--text-muted)' }}>No plans defined. Please create a plan first in configurations.</p>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
