import React, { useState, useEffect } from 'react';
import { 
  Activity, Users, Settings, Briefcase, Plus, Play, RefreshCw, 
  BarChart2, DollarSign, Brain, Scissors, LogIn, Award, ShoppingBag, 
  HelpCircle, Trash2, Check, Star 
} from 'lucide-react';

import DashboardView from './components/DashboardView';
import SimulationView from './components/SimulationView';
import ConfigTabs from './components/ConfigTabs';
import ExperimentsView from './components/ExperimentsView';
import AiAdvisorView from './components/AiAdvisorView';

export interface Shop {
  id: number;
  name: string;
  locationType: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string;
  holidays: string;
  chairs: number;
  facialBeds: number;
  hairStations: number;
  mehndiTables: number;
  waitingAreaCapacity: number;
  monthlyRent: number;
  monthlyElectricity: number;
  activeDefault: boolean;
}

export interface StaffMember {
  id: number;
  name: string;
  role: string;
  salary: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  breakHoursStart: string;
  breakHoursEnd: string;
  skillLevel: string;
  speedMultiplier: number;
  canDoThreading: boolean;
  canDoFacial: boolean;
  canDoHair: boolean;
  canDoMakeup: boolean;
  canDoMehndi: boolean;
  canDoNails: boolean;
  enabled?: boolean;
}

export interface ServiceItem {
  id: number;
  name: string;
  category: string;
  duration: number;
  minDuration: number;
  maxDuration: number;
  sellingPrice: number;
  requiredEquipment: string;
  requiredSkill: string;
  productConsumptionJson: string;
  membershipEligible: boolean;
  enabled?: boolean;
}

export interface ProductItem {
  id: number;
  name: string;
  purchaseCost: number;
  quantity: number;
  unitType: string;
  capacityPerUnit: number;
}

export interface MembershipPlan {
  id: number;
  name: string;
  price: number;
  rulesJson: string;
}

export interface CustomerConfig {
  id: number;
  name: string;
  totalMembers: number;
  nonMembersDaily: number;
  arrivalPattern: string;
  peakHoursJson: string;
  servicePreferenceJson: string;
  heavyUserPct: number;
  normalUserPct: number;
  lowUserPct: number;
  activeDefault: boolean;
}

export interface SimulationRun {
  id: number;
  name: string;
  runTime: string;
  simulatedDays: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  avgWaitingTime: number;
  totalCustomers: number;
  walkAwayCount: number;
  detailsJson: string;
}

export interface SimulationResult {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  avgWaitingTime: number;
  totalCustomersServed: number;
  walkAwayCount: number;
  staffUtilization: Record<string, number>;
  equipmentUtilization: Record<string, number>;
  servicePopularity: Record<string, number>;
  remainingInventory: Record<string, number>;
  timeline: any[];
  dailyReports: any[];
  membershipRevenue: number;
  serviceRevenue: number;
  salaryExpense: number;
  rentExpense: number;
  electricityExpense: number;
  productExpense: number;
  stockoutCount: number;
}

const API_URL = '/api';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'simulation' | 'config' | 'experiments' | 'ai-advisor'>('dashboard');
  
  // Shared state
  const [shops, setShops] = useState<Shop[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [customerConfigs, setCustomerConfigs] = useState<CustomerConfig[]>([]);
  const [simulationRuns, setSimulationRuns] = useState<SimulationRun[]>([]);
  const [loading, setLoading] = useState(true);

  // Active configurations
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerConfig | null>(null);
  
  // Latest run cache
  const [lastSimResult, setLastSimResult] = useState<SimulationResult | null>(null);

  // Initial Data Fetch
  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [rShops, rStaff, rServices, rProducts, rPlans, rCustomers, rRuns] = await Promise.all([
        fetch(`${API_URL}/shops`).then(res => res.json()),
        fetch(`${API_URL}/staff`).then(res => res.json()),
        fetch(`${API_URL}/services`).then(res => res.json()),
        fetch(`${API_URL}/products`).then(res => res.json()),
        fetch(`${API_URL}/plans`).then(res => res.json()),
        fetch(`${API_URL}/customer-configs`).then(res => res.json()),
        fetch(`${API_URL}/simulation/runs`).then(res => res.json())
      ]);

      setShops(rShops);
      setStaff(rStaff);
      setServices(rServices);
      setProducts(rProducts);
      setPlans(rPlans);
      setCustomerConfigs(rCustomers);
      setSimulationRuns(rRuns);

      // Set active defaults, preserving existing selections if they still exist
      setSelectedShop(prev => {
        if (prev) {
          const stillExists = rShops.find((s: Shop) => s.id === prev.id);
          if (stillExists) return stillExists;
        }
        return rShops.find((s: Shop) => s.activeDefault) || rShops[0] || null;
      });

      setSelectedCustomer(prev => {
        if (prev) {
          const stillExists = rCustomers.find((c: CustomerConfig) => c.id === prev.id);
          if (stillExists) return stillExists;
        }
        return rCustomers.find((c: CustomerConfig) => c.activeDefault) || rCustomers[0] || null;
      });

    } catch (e) {
      console.error("Error loading configuration from backend", e);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Run a default 30-day simulation to populate initial dashboard metrics
  useEffect(() => {
    if (selectedShop && selectedCustomer && !lastSimResult) {
      triggerQuickSimulation();
    }
  }, [selectedShop, selectedCustomer]);

  const triggerQuickSimulation = async () => {
    try {
      const res = await fetch(`${API_URL}/simulation/run?days=30&shopId=${selectedShop?.id}&customerConfigId=${selectedCustomer?.id}`, {
        method: 'POST'
      });
      const data = await res.json();
      setLastSimResult(data);
    } catch (e) {
      console.error("Quick simulation failed", e);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px' }}>
        <RefreshCw size={48} className="animate-spin" style={{ color: '#a855f7' }} />
        <h3 style={{ fontFamily: 'Outfit', fontWeight: 500 }}>Booting Beauty Parlour Simulator Digital Twin...</h3>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Scissors size={26} style={{ filter: 'drop-shadow(0 0 8px rgba(236,72,153,0.5))' }} />
          <span>BeautyTwin v1.0</span>
        </div>

        <nav className="nav-list">
          <li 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart2 size={18} />
            <span>Dashboard Overview</span>
          </li>
          <li 
            className={`nav-item ${activeTab === 'simulation' ? 'active' : ''}`}
            onClick={() => setActiveTab('simulation')}
          >
            <Play size={18} />
            <span>Live Digital Twin</span>
          </li>
          <li 
            className={`nav-item ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <Settings size={18} />
            <span>Configurations</span>
          </li>
          <li 
            className={`nav-item ${activeTab === 'experiments' ? 'active' : ''}`}
            onClick={() => setActiveTab('experiments')}
          >
            <Activity size={18} />
            <span>Business Experiments</span>
          </li>
          <li 
            className={`nav-item ${activeTab === 'ai-advisor' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai-advisor')}
          >
            <Brain size={18} style={{ color: '#f59e0b' }} />
            <span style={{ fontWeight: 600 }}>AI Advisor Panel</span>
          </li>
        </nav>

        {/* Global Shop Selector inside Sidebar footer */}
        <div className="glass-panel" style={{ padding: '12px', border: '1px solid rgba(168, 85, 247, 0.2)', fontSize: '13px' }}>
          <div style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Active Digital Twin:</div>
          <select 
            className="form-select" 
            value={selectedShop?.id || ''} 
            onChange={(e) => {
              const shopId = parseInt(e.target.value);
              const found = shops.find(s => s.id === shopId);
              if (found) {
                setSelectedShop(found);
                setLastSimResult(null); // Clear cache to trigger re-sim
              }
            }}
            style={{ marginBottom: '8px', padding: '6px' }}
          >
            {shops.map(s => <option key={s.id} value={s.id}>{s.name} ({s.locationType})</option>)}
          </select>

          <div style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Customer Profile:</div>
          <select 
            className="form-select" 
            value={selectedCustomer?.id || ''} 
            onChange={(e) => {
              const custId = parseInt(e.target.value);
              const found = customerConfigs.find(c => c.id === custId);
              if (found) {
                setSelectedCustomer(found);
                setLastSimResult(null);
              }
            }}
            style={{ padding: '6px' }}
          >
            {customerConfigs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content animate-slide-in">
        {activeTab === 'dashboard' && (
          <DashboardView 
            simResult={lastSimResult} 
            shop={selectedShop} 
            customer={selectedCustomer} 
            triggerReSim={triggerQuickSimulation} 
            savedRuns={simulationRuns}
            onSaveRun={async (name) => {
              if (!lastSimResult) return;
              const newRun = {
                name,
                simulatedDays: 30,
                totalRevenue: lastSimResult.totalRevenue,
                totalExpenses: lastSimResult.totalExpenses,
                netProfit: lastSimResult.netProfit,
                avgWaitingTime: lastSimResult.avgWaitingTime,
                totalCustomers: lastSimResult.totalCustomersServed,
                walkAwayCount: lastSimResult.walkAwayCount,
                detailsJson: JSON.stringify({
                  staffUtilization: lastSimResult.staffUtilization,
                  equipmentUtilization: lastSimResult.equipmentUtilization,
                  servicePopularity: lastSimResult.servicePopularity,
                  stockoutCount: lastSimResult.stockoutCount
                })
              };
              
              const res = await fetch(`${API_URL}/simulation/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRun)
              });
              const saved = await res.json();
              setSimulationRuns([saved, ...simulationRuns]);
            }}
            onDeleteRun={async (id) => {
              await fetch(`${API_URL}/simulation/runs/${id}`, { method: 'DELETE' });
              setSimulationRuns(simulationRuns.filter(r => r.id !== id));
            }}
          />
        )}

        {activeTab === 'simulation' && (
          <SimulationView 
            shop={selectedShop} 
            customer={selectedCustomer} 
            apiUrl={API_URL}
            products={products}
            services={services}
          />
        )}

        {activeTab === 'config' && (
          <ConfigTabs 
            apiUrl={API_URL}
            onRefresh={() => fetchData(true)}
            shops={shops}
            staff={staff}
            services={services}
            products={products}
            plans={plans}
            customers={customerConfigs}
          />
        )}

        {activeTab === 'experiments' && (
          <ExperimentsView 
            apiUrl={API_URL}
            shops={shops}
            customers={customerConfigs}
          />
        )}

        {activeTab === 'ai-advisor' && (
          <AiAdvisorView 
            apiUrl={API_URL}
            shop={selectedShop}
            customer={selectedCustomer}
            simResult={lastSimResult}
          />
        )}
      </main>
    </div>
  );
}

export default App;
