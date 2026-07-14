import React, { useState } from 'react';
import { 
  Plus, Settings, Users, Scissors, ShoppingBag, Award, 
  Trash2, Edit, Save, ToggleLeft, ToggleRight, Info, AlertTriangle
} from 'lucide-react';
import { Shop, StaffMember, ServiceItem, ProductItem, MembershipPlan, CustomerConfig } from '../App';

const defaultShop = {
  name: "New Custom Parlour",
  locationType: "City",
  workingHoursStart: "09:00",
  workingHoursEnd: "21:00",
  workingDays: "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday",
  holidays: "",
  chairs: 3,
  facialBeds: 2,
  hairStations: 2,
  mehndiTables: 1,
  waitingAreaCapacity: 8,
  monthlyRent: 15000,
  monthlyElectricity: 4000,
  activeDefault: false
};

const defaultStaff = {
  name: "New Beautician",
  role: "Beautician",
  salary: 14000,
  workingHoursStart: "09:00",
  workingHoursEnd: "18:00",
  breakHoursStart: "13:00",
  breakHoursEnd: "14:00",
  skillLevel: "Senior",
  speedMultiplier: 1.0,
  canDoThreading: true,
  canDoFacial: true,
  canDoHair: false,
  canDoMakeup: false,
  canDoMehndi: false,
  canDoNails: false,
  enabled: true
};

const defaultService = {
  name: "Basic Clean Up",
  category: "Facial",
  duration: 30,
  minDuration: 20,
  maxDuration: 40,
  sellingPrice: 350,
  requiredEquipment: "Facial Bed",
  requiredSkill: "Facial",
  productConsumptionJson: '{"Facial Kit":0.05}',
  membershipEligible: true,
  enabled: true
};

const defaultProduct = {
  name: "New Styling Gel",
  purchaseCost: 400,
  quantity: 10,
  unitType: "Bottles",
  capacityPerUnit: 30
};

const defaultPlan = {
  name: "Silver Monthly Plan",
  price: 299,
  rulesJson: '{"Eyebrow Threading":{"type":"UNLIMITED"},"Hair Cut & Wash":{"type":"MONTHLY_LIMIT","limit":1}}'
};

const defaultCustomer = {
  name: "City Walk-in & Members",
  totalMembers: 150,
  nonMembersDaily: 8,
  arrivalPattern: "PEAK_HOURS",
  heavyUserPct: 15.0,
  normalUserPct: 70.0,
  lowUserPct: 15.0,
  servicePreferenceJson: '{"Threading":40.0,"Facial":20.0,"Hair":20.0,"Mehndi":10.0,"Nails":10.0}',
  peakHoursJson: '{"11:00-13:00":1.5,"17:00-20:00":2.2}'
};

interface ConfigTabsProps {
  apiUrl: string;
  onRefresh: () => void;
  shops: Shop[];
  staff: StaffMember[];
  services: ServiceItem[];
  products: ProductItem[];
  plans: MembershipPlan[];
  customers: CustomerConfig[];
}

export default function ConfigTabs({
  apiUrl,
  onRefresh,
  shops,
  staff,
  services,
  products,
  plans,
  customers
}: ConfigTabsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'shops' | 'staff' | 'services' | 'products' | 'plans' | 'customers'>('shops');
  
  // Inline editing state helpers
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form states
  const [shopForm, setShopForm] = useState<Partial<Shop>>({});
  const [staffForm, setStaffForm] = useState<Partial<StaffMember>>({});
  const [serviceForm, setServiceForm] = useState<Partial<ServiceItem>>({});
  const [productForm, setProductForm] = useState<Partial<ProductItem>>({});
  const [planForm, setPlanForm] = useState<Partial<MembershipPlan>>({});
  const [customerForm, setCustomerForm] = useState<Partial<CustomerConfig>>({});

  // Interactive JSON Editor States
  const [serviceProducts, setServiceProducts] = useState<{productName: string, amount: number}[]>([]);
  const [planRules, setPlanRules] = useState<{serviceName: string, type: 'UNLIMITED' | 'MONTHLY_LIMIT', limit?: number}[]>([]);
  const [preferences, setPreferences] = useState<Record<string, number>>({});
  const [peakHours, setPeakHours] = useState<{range: string, weight: number}[]>([]);

  // Synchronizers
  React.useEffect(() => {
    if (serviceForm.productConsumptionJson) {
      try {
        const parsed = JSON.parse(serviceForm.productConsumptionJson);
        const list = Object.entries(parsed).map(([name, amount]) => ({
          productName: name,
          amount: Number(amount)
        }));
        setServiceProducts(list);
      } catch {
        setServiceProducts([]);
      }
    } else {
      setServiceProducts([]);
    }
  }, [serviceForm.productConsumptionJson]);

  const updateServiceProducts = (newList: {productName: string, amount: number}[]) => {
    setServiceProducts(newList);
    const obj: Record<string, number> = {};
    newList.forEach(item => {
      obj[item.productName] = item.amount;
    });
    setServiceForm(prev => ({ ...prev, productConsumptionJson: JSON.stringify(obj) }));
  };

  React.useEffect(() => {
    if (planForm.rulesJson) {
      try {
        const parsed = JSON.parse(planForm.rulesJson);
        const list = Object.entries(parsed).map(([name, rule]) => ({
          serviceName: name,
          type: (rule as any).type,
          limit: (rule as any).limit
        }));
        setPlanRules(list);
      } catch {
        setPlanRules([]);
      }
    } else {
      setPlanRules([]);
    }
  }, [planForm.rulesJson]);

  const updatePlanRules = (newList: {serviceName: string, type: 'UNLIMITED' | 'MONTHLY_LIMIT', limit?: number}[]) => {
    setPlanRules(newList);
    const obj: Record<string, any> = {};
    newList.forEach(item => {
      obj[item.serviceName] = item.type === 'UNLIMITED' ? { type: 'UNLIMITED' } : { type: 'MONTHLY_LIMIT', limit: item.limit };
    });
    setPlanForm(prev => ({ ...prev, rulesJson: JSON.stringify(obj) }));
  };

  React.useEffect(() => {
    if (customerForm.servicePreferenceJson) {
      try {
        setPreferences(JSON.parse(customerForm.servicePreferenceJson));
      } catch {
        setPreferences({});
      }
    } else {
      setPreferences({});
    }
  }, [customerForm.servicePreferenceJson]);

  const updatePreference = (cat: string, val: number) => {
    const next = { ...preferences, [cat]: val };
    setPreferences(next);
    setCustomerForm(prev => ({ ...prev, servicePreferenceJson: JSON.stringify(next) }));
  };

  React.useEffect(() => {
    if (customerForm.peakHoursJson) {
      try {
        const parsed = JSON.parse(customerForm.peakHoursJson);
        const list = Object.entries(parsed).map(([range, weight]) => ({
          range,
          weight: Number(weight)
        }));
        setPeakHours(list);
      } catch {
        setPeakHours([]);
      }
    } else {
      setPeakHours([]);
    }
  }, [customerForm.peakHoursJson]);

  const updatePeakHours = (newList: {range: string, weight: number}[]) => {
    setPeakHours(newList);
    const obj: Record<string, number> = {};
    newList.forEach(item => {
      obj[item.range] = item.weight;
    });
    setCustomerForm(prev => ({ ...prev, peakHoursJson: JSON.stringify(obj) }));
  };

  // Helper: CRUD API requests
  const handleSave = async (type: string, id: number | undefined, data: any) => {
    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `${apiUrl}/${type}/${id}` : `${apiUrl}/${type}`;
    
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setEditingId(null);
        setIsAddingNew(false);
        onRefresh();
      }
    } catch (e) {
      console.error(`Failed to save ${type}`, e);
    }
  };

  const handleDelete = async (type: string, id: number) => {
    if (!confirm("Are you sure you want to delete this configuration item?")) return;
    try {
      const res = await fetch(`${apiUrl}/${type}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(`Failed to delete ${type}`, e);
    }
  };

  const handleSetDefaultShop = async (id: number) => {
    await fetch(`${apiUrl}/shops/${id}/default`, { method: 'POST' });
    onRefresh();
  };

  const handleSetDefaultCustomer = async (id: number) => {
    await fetch(`${apiUrl}/customer-configs/${id}/default`, { method: 'POST' });
    onRefresh();
  };

  return (
    <div style={{ display: 'flex', gap: '30px' }}>
      
      {/* Configuration Sidebar Tabs */}
      <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em', fontWeight: 700 }}>CONFIG PANELS</h3>
        <button className={`nav-item ${activeSubTab === 'shops' ? 'active' : ''}`} onClick={() => { setActiveSubTab('shops'); setIsAddingNew(false); setEditingId(null); }} style={{ background: 'none', border: 'none', width: '100%' }}>
          <Settings size={16} /> <span>Shop Configurations</span>
        </button>
        <button className={`nav-item ${activeSubTab === 'staff' ? 'active' : ''}`} onClick={() => { setActiveSubTab('staff'); setIsAddingNew(false); setEditingId(null); }} style={{ background: 'none', border: 'none', width: '100%' }}>
          <Users size={16} /> <span>Staff Roster</span>
        </button>
        <button className={`nav-item ${activeSubTab === 'services' ? 'active' : ''}`} onClick={() => { setActiveSubTab('services'); setIsAddingNew(false); setEditingId(null); }} style={{ background: 'none', border: 'none', width: '100%' }}>
          <Scissors size={16} /> <span>Service Catalog</span>
        </button>
        <button className={`nav-item ${activeSubTab === 'products' ? 'active' : ''}`} onClick={() => { setActiveSubTab('products'); setIsAddingNew(false); setEditingId(null); }} style={{ background: 'none', border: 'none', width: '100%' }}>
          <ShoppingBag size={16} /> <span>Inventory Stock</span>
        </button>
        <button className={`nav-item ${activeSubTab === 'plans' ? 'active' : ''}`} onClick={() => { setActiveSubTab('plans'); setIsAddingNew(false); setEditingId(null); }} style={{ background: 'none', border: 'none', width: '100%' }}>
          <Award size={16} /> <span>Membership Plans</span>
        </button>
        <button className={`nav-item ${activeSubTab === 'customers' ? 'active' : ''}`} onClick={() => { setActiveSubTab('customers'); setIsAddingNew(false); setEditingId(null); }} style={{ background: 'none', border: 'none', width: '100%' }}>
          <Users size={16} /> <span>Customer Profiles</span>
        </button>
      </div>

      {/* Configuration Main Grid */}
      <div className="glass-panel" style={{ padding: '24px', flexGrow: 1 }}>
        
        {/* Sub-tab Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontFamily: 'Outfit', textTransform: 'capitalize' }}>
              {activeSubTab.charAt(0).toUpperCase() + activeSubTab.slice(1)} Manager
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
              Add, update, or remove configurations. Changes update the simulation twin instantly.
            </p>
          </div>
          {!isAddingNew && editingId === null && (
            <button className="btn-primary" onClick={() => {
              setIsAddingNew(true);
              setShopForm(defaultShop);
              setStaffForm(defaultStaff);
              setServiceForm(defaultService);
              setProductForm(defaultProduct);
              setPlanForm(defaultPlan);
              setCustomerForm(defaultCustomer);
            }}>
              <Plus size={16} />
              <span>Add New</span>
            </button>
          )}
        </div>

        {/* 1. SHOPS MANAGER */}
        {activeSubTab === 'shops' && (
          <div>
            {isAddingNew || editingId !== null ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSave('shops', shopForm.id, shopForm);
              }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label className="form-label">Shop Scenario Name</label>
                  <input type="text" className="form-input" required value={shopForm.name || ''} onChange={e => setShopForm({...shopForm, name: e.target.value})} placeholder="e.g. Village Express Parlour" />
                </div>
                <div>
                  <label className="form-label">Location Type</label>
                  <select className="form-select" value={shopForm.locationType || 'City'} onChange={e => setShopForm({...shopForm, locationType: e.target.value})}>
                    <option value="City">City (Premium Rent)</option>
                    <option value="Village">Village (Budget Rent)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Operating Hours (Start - Close)</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" className="form-input" required placeholder="09:00" value={shopForm.workingHoursStart || ''} onChange={e => setShopForm({...shopForm, workingHoursStart: e.target.value})} />
                    <input type="text" className="form-input" required placeholder="21:00" value={shopForm.workingHoursEnd || ''} onChange={e => setShopForm({...shopForm, workingHoursEnd: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Monthly Rent (₹)</label>
                  <input type="number" className="form-input" required value={shopForm.monthlyRent || 0} onChange={e => setShopForm({...shopForm, monthlyRent: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="form-label">Chairs count</label>
                  <input type="number" className="form-input" required value={shopForm.chairs || 0} onChange={e => setShopForm({...shopForm, chairs: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="form-label">Facial Beds count</label>
                  <input type="number" className="form-input" required value={shopForm.facialBeds || 0} onChange={e => setShopForm({...shopForm, facialBeds: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="form-label">Hair Stations count</label>
                  <input type="number" className="form-input" required value={shopForm.hairStations || 0} onChange={e => setShopForm({...shopForm, hairStations: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="form-label">Mehndi Tables count</label>
                  <input type="number" className="form-input" required value={shopForm.mehndiTables || 0} onChange={e => setShopForm({...shopForm, mehndiTables: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="form-label">Waiting Lounge capacity</label>
                  <input type="number" className="form-input" required value={shopForm.waitingAreaCapacity || 0} onChange={e => setShopForm({...shopForm, waitingAreaCapacity: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="form-label">Monthly Electricity Pool (₹)</label>
                  <input type="number" className="form-input" required value={shopForm.monthlyElectricity || 0} onChange={e => setShopForm({...shopForm, monthlyElectricity: parseFloat(e.target.value) || 0})} />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button type="submit" className="btn-primary"><Save size={16} /> Save</button>
                  <button type="button" className="btn-secondary" onClick={() => { setIsAddingNew(false); setEditingId(null); }}>Cancel</button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {shops.map(s => (
                  <div key={s.id} className="glass-panel" style={{ padding: '16px', position: 'relative' }}>
                    {s.activeDefault && (
                      <span className="badge badge-success" style={{ position: 'absolute', top: '16px', right: '16px' }}>DEFAULT TWIN</span>
                    )}
                    <h3 style={{ fontSize: '16px' }}>{s.name} ({s.locationType})</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '8px 0' }}>
                      Hours: {s.workingHoursStart} - {s.workingHoursEnd} • Wait Cap: {s.waitingAreaCapacity}
                    </p>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      <span>💺 Chairs: {s.chairs}</span>
                      <span>🛏️ Beds: {s.facialBeds}</span>
                      <span>✂️ Hair: {s.hairStations}</span>
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: '15px' }}>
                      Rent: <strong>₹{s.monthlyRent}/mo</strong> • Power: <strong>₹{s.monthlyElectricity}/mo</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => { setEditingId(s.id); setShopForm(s); }}>
                        <Edit size={12} /> Edit
                      </button>
                      {!s.activeDefault && (
                        <>
                          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleSetDefaultShop(s.id)}>
                            Set Default
                          </button>
                          <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleDelete('shops', s.id)}>
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. STAFF MANAGER */}
        {activeSubTab === 'staff' && (
          <div>
            {isAddingNew || editingId !== null ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSave('staff', staffForm.id, staffForm);
              }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label className="form-label">Employee Name</label>
                  <input type="text" className="form-input" required value={staffForm.name || ''} onChange={e => setStaffForm({...staffForm, name: e.target.value})} placeholder="e.g. Riya Verma" />
                </div>
                <div>
                  <label className="form-label">Role</label>
                  <select className="form-select" value={staffForm.role || 'Beautician'} onChange={e => setStaffForm({...staffForm, role: e.target.value})}>
                    <option value="Beautician">Beautician</option>
                    <option value="Expert Beautician">Expert Beautician</option>
                    <option value="Hair Stylist">Hair Stylist</option>
                    <option value="Mehndi Artist">Mehndi Artist</option>
                    <option value="Nail Technician">Nail Technician</option>
                    <option value="Makeup Artist">Makeup Artist</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Monthly Salary (₹)</label>
                  <input type="number" className="form-input" required value={staffForm.salary || 0} onChange={e => setStaffForm({...staffForm, salary: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="form-label">Shift Hours (Start - Close)</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" className="form-input" required value={staffForm.workingHoursStart || '09:00'} onChange={e => setStaffForm({...staffForm, workingHoursStart: e.target.value})} />
                    <input type="text" className="form-input" required value={staffForm.workingHoursEnd || '18:00'} onChange={e => setStaffForm({...staffForm, workingHoursEnd: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Break Timings (Start - Close)</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" className="form-input" required value={staffForm.breakHoursStart || '13:00'} onChange={e => setStaffForm({...staffForm, breakHoursStart: e.target.value})} />
                    <input type="text" className="form-input" required value={staffForm.breakHoursEnd || '14:00'} onChange={e => setStaffForm({...staffForm, breakHoursEnd: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Skill Level</label>
                  <select className="form-select" value={staffForm.skillLevel || 'Senior'} onChange={e => setStaffForm({...staffForm, skillLevel: e.target.value})}>
                    <option value="Junior">Junior (0.8x Speed)</option>
                    <option value="Senior">Senior (1.0x Speed)</option>
                    <option value="Expert">Expert (1.3x Speed)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Custom Speed Multiplier (e.g. 1.2 = 20% faster)</label>
                  <input type="number" step="0.05" className="form-input" required value={staffForm.speedMultiplier || 1.0} onChange={e => setStaffForm({...staffForm, speedMultiplier: parseFloat(e.target.value) || 1.0})} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '28px' }}>
                  <input type="checkbox" checked={staffForm.enabled !== false} onChange={e => setStaffForm({...staffForm, enabled: e.target.checked})} />
                  <label style={{ fontSize: '13px' }}>Active / Enabled</label>
                </div>
                
                {/* Skill Checkboxes */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ marginBottom: '10px' }}>Service Skillsets Authorized</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <input type="checkbox" checked={staffForm.canDoThreading || false} onChange={e => setStaffForm({...staffForm, canDoThreading: e.target.checked})} /> Threading
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <input type="checkbox" checked={staffForm.canDoFacial || false} onChange={e => setStaffForm({...staffForm, canDoFacial: e.target.checked})} /> Facial
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <input type="checkbox" checked={staffForm.canDoHair || false} onChange={e => setStaffForm({...staffForm, canDoHair: e.target.checked})} /> Hair
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <input type="checkbox" checked={staffForm.canDoMakeup || false} onChange={e => setStaffForm({...staffForm, canDoMakeup: e.target.checked})} /> Makeup
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <input type="checkbox" checked={staffForm.canDoMehndi || false} onChange={e => setStaffForm({...staffForm, canDoMehndi: e.target.checked})} /> Mehndi
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <input type="checkbox" checked={staffForm.canDoNails || false} onChange={e => setStaffForm({...staffForm, canDoNails: e.target.checked})} /> Nails
                    </label>
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button type="submit" className="btn-primary"><Save size={16} /> Save</button>
                  <button type="button" className="btn-secondary" onClick={() => { setIsAddingNew(false); setEditingId(null); }}>Cancel</button>
                </div>
              </form>
            ) : (
              <div className="custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role & Level</th>
                      <th>Shift (Break)</th>
                      <th>Salary</th>
                      <th>Speed</th>
                      <th>Skills</th>
                      <th>Active</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(s => (
                      <tr key={s.id} style={{ opacity: s.enabled === false ? 0.6 : 1 }}>
                        <td><strong>{s.name}</strong></td>
                        <td>{s.role} <span className="badge badge-info" style={{ fontSize: '9px', marginLeft: '4px' }}>{s.skillLevel}</span></td>
                        <td>{s.workingHoursStart}-{s.workingHoursEnd} ({s.breakHoursStart}-{s.breakHoursEnd})</td>
                        <td>₹{s.salary.toLocaleString()}/mo</td>
                        <td>{s.speedMultiplier}x</td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '280px' }}>
                            {s.canDoThreading && <span className="badge badge-success" style={{ fontSize: '9px' }}>Threading</span>}
                            {s.canDoFacial && <span className="badge badge-success" style={{ fontSize: '9px' }}>Facial</span>}
                            {s.canDoHair && <span className="badge badge-success" style={{ fontSize: '9px' }}>Hair</span>}
                            {s.canDoMakeup && <span className="badge badge-success" style={{ fontSize: '9px' }}>Makeup</span>}
                            {s.canDoMehndi && <span className="badge badge-success" style={{ fontSize: '9px' }}>Mehndi</span>}
                            {s.canDoNails && <span className="badge badge-success" style={{ fontSize: '9px' }}>Nails</span>}
                          </div>
                        </td>
                        <td>
                          <button 
                            type="button"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                            onClick={() => handleSave('staff', s.id, { ...s, enabled: s.enabled === false ? true : false })}
                          >
                            {s.enabled !== false ? (
                              <ToggleRight style={{ color: '#34d399' }} size={24} />
                            ) : (
                              <ToggleLeft style={{ color: 'var(--text-muted)' }} size={24} />
                            )}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => { setEditingId(s.id); setStaffForm(s); }}>
                              <Edit size={12} />
                            </button>
                            <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleDelete('staff', s.id)}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. SERVICES MANAGER */}
        {activeSubTab === 'services' && (
          <div>
            {isAddingNew || editingId !== null ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSave('services', serviceForm.id, serviceForm);
              }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label className="form-label">Service Name</label>
                  <input type="text" className="form-input" required value={serviceForm.name || ''} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} placeholder="e.g. Eyebrow Threading" />
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <select className="form-select" value={serviceForm.category || 'Threading'} onChange={e => setServiceForm({...serviceForm, category: e.target.value})}>
                    <option value="Threading">Threading</option>
                    <option value="Facial">Facial</option>
                    <option value="Hair">Hair</option>
                    <option value="Makeup">Makeup</option>
                    <option value="Mehndi">Mehndi</option>
                    <option value="Nails">Nails</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Base Duration (mins)</label>
                  <input type="number" className="form-input" required value={serviceForm.duration || 30} onChange={e => setServiceForm({...serviceForm, duration: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="form-label">Duration Variance (Min - Max mins)</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="number" className="form-input" required placeholder="Min" value={serviceForm.minDuration || 20} onChange={e => setServiceForm({...serviceForm, minDuration: parseInt(e.target.value) || 0})} />
                    <input type="number" className="form-input" required placeholder="Max" value={serviceForm.maxDuration || 40} onChange={e => setServiceForm({...serviceForm, maxDuration: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Selling Price (₹)</label>
                  <input type="number" className="form-input" required value={serviceForm.sellingPrice || 0} onChange={e => setServiceForm({...serviceForm, sellingPrice: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="form-label">Required Equipment</label>
                  <select className="form-select" value={serviceForm.requiredEquipment || 'Chair'} onChange={e => setServiceForm({...serviceForm, requiredEquipment: e.target.value})}>
                    <option value="Chair">Chair / Makeup Chair</option>
                    <option value="Facial Bed">Facial Bed</option>
                    <option value="Hair Station">Hair Station</option>
                    <option value="Mehndi Table">Mehndi Table</option>
                    <option value="None">None (Always Available)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Required Staff Skillset</label>
                  <select className="form-select" value={serviceForm.requiredSkill || 'Threading'} onChange={e => setServiceForm({...serviceForm, requiredSkill: e.target.value})}>
                    <option value="Threading">Threading</option>
                    <option value="Facial">Facial</option>
                    <option value="Hair">Hair</option>
                    <option value="Makeup">Makeup</option>
                    <option value="Mehndi">Mehndi</option>
                    <option value="Nails">Nails</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2', background: 'rgba(0,0,0,0.15)', padding: '15px', borderRadius: '8px' }}>
                  <label className="form-label" style={{ fontWeight: 'bold', marginBottom: '8px', color: 'var(--accent-purple)' }}>Product Consumption per Session</label>
                  
                  {/* List of current product consumption */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {serviceProducts.map((sp, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '4px' }}>
                        <span style={{ fontSize: '13px' }}><strong>{sp.productName}</strong>: {sp.amount} units consumed</span>
                        <button type="button" className="btn-danger" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={() => {
                          const next = serviceProducts.filter((_, i) => i !== idx);
                          updateServiceProducts(next);
                        }}>Remove</button>
                      </div>
                    ))}
                    {serviceProducts.length === 0 && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No products consumed. Add one below if required.</span>}
                  </div>

                  {/* Add Product Inline Form */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flexGrow: 1 }}>
                      <label className="form-label" style={{ fontSize: '11px' }}>Select Product</label>
                      <select id="service-product-select" className="form-select" style={{ fontSize: '12px', padding: '6px' }}>
                        <option value="">-- Choose Product --</option>
                        {products.map(p => <option key={p.id} value={p.name}>{p.name} ({p.unitType})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>Amount Consumed</label>
                      <input id="service-product-amount" type="number" step="0.001" defaultValue="0.05" className="form-input" style={{ width: '100px', fontSize: '12px', padding: '6px' }} />
                    </div>
                    <button type="button" className="btn-secondary" style={{ padding: '8px 12px', fontSize: '12px' }} onClick={() => {
                      const sel = document.getElementById('service-product-select') as HTMLSelectElement;
                      const amt = document.getElementById('service-product-amount') as HTMLInputElement;
                      if (sel && amt && sel.value && parseFloat(amt.value) > 0) {
                        const name = sel.value;
                        const value = parseFloat(amt.value);
                        const existing = serviceProducts.find(p => p.productName === name);
                        let next;
                        if (existing) {
                          next = serviceProducts.map(p => p.productName === name ? { ...p, amount: value } : p);
                        } else {
                          next = [...serviceProducts, { productName: name, amount: value }];
                        }
                        updateServiceProducts(next);
                        sel.value = "";
                        amt.value = "0.05";
                      }
                    }}>Add</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', paddingTop: '30px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={serviceForm.membershipEligible || false} onChange={e => setServiceForm({...serviceForm, membershipEligible: e.target.checked})} />
                    <label style={{ fontSize: '13px' }}>Eligible under Membership Plans</label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={serviceForm.enabled !== false} onChange={e => setServiceForm({...serviceForm, enabled: e.target.checked})} />
                    <label style={{ fontSize: '13px' }}>Active / Enabled</label>
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button type="submit" className="btn-primary"><Save size={16} /> Save</button>
                  <button type="button" className="btn-secondary" onClick={() => { setIsAddingNew(false); setEditingId(null); }}>Cancel</button>
                </div>
              </form>
            ) : (
              <div className="custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Service Name</th>
                      <th>Category</th>
                      <th>Duration</th>
                      <th>Price</th>
                      <th>Equipment</th>
                      <th>Product Consumption</th>
                      <th>Plan Eligible</th>
                      <th>Active</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map(s => (
                      <tr key={s.id} style={{ opacity: s.enabled === false ? 0.6 : 1 }}>
                        <td><strong>{s.name}</strong></td>
                        <td><span className="badge badge-info">{s.category}</span></td>
                        <td>{s.duration} mins ({s.minDuration}-{s.maxDuration}m)</td>
                        <td>₹{s.sellingPrice}</td>
                        <td>{s.requiredEquipment}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{s.productConsumptionJson}</td>
                        <td>{s.membershipEligible ? <span className="badge badge-success">YES</span> : <span className="badge badge-danger">NO</span>}</td>
                        <td>
                          <button 
                            type="button"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                            onClick={() => handleSave('services', s.id, { ...s, enabled: s.enabled === false ? true : false })}
                          >
                            {s.enabled !== false ? (
                              <ToggleRight style={{ color: '#34d399' }} size={24} />
                            ) : (
                              <ToggleLeft style={{ color: 'var(--text-muted)' }} size={24} />
                            )}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => { setEditingId(s.id); setServiceForm(s); }}>
                              <Edit size={12} />
                            </button>
                            <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleDelete('services', s.id)}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. PRODUCTS MANAGER */}
        {activeSubTab === 'products' && (
          <div>
            {isAddingNew || editingId !== null ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSave('products', productForm.id, productForm);
              }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label className="form-label">Product Name</label>
                  <input type="text" className="form-input" required value={productForm.name || ''} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="e.g. Facial Gel Kit" />
                </div>
                <div>
                  <label className="form-label">Purchase Cost (₹)</label>
                  <input type="number" className="form-input" required value={productForm.purchaseCost || 0} onChange={e => setProductForm({...productForm, purchaseCost: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="form-label">Initial Quantity (in Units)</label>
                  <input type="number" step="0.1" className="form-input" required value={productForm.quantity || 0} onChange={e => setProductForm({...productForm, quantity: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="form-label">Unit Type</label>
                  <select className="form-select" value={productForm.unitType || 'Kits'} onChange={e => setProductForm({...productForm, unitType: e.target.value})}>
                    <option value="Kits">Kits</option>
                    <option value="Bottles">Bottles</option>
                    <option value="Cones">Cones</option>
                    <option value="Threads">Threads</option>
                    <option value="Tubes">Tubes</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Capacity (Serves how many clients per Unit?)</label>
                  <input type="number" className="form-input" required value={productForm.capacityPerUnit || 0} onChange={e => setProductForm({...productForm, capacityPerUnit: parseFloat(e.target.value) || 0})} />
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button type="submit" className="btn-primary"><Save size={16} /> Save</button>
                  <button type="button" className="btn-secondary" onClick={() => { setIsAddingNew(false); setEditingId(null); }}>Cancel</button>
                </div>
              </form>
            ) : (
              <div className="custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Purchase Cost</th>
                      <th>Quantity (Stock)</th>
                      <th>Yield Capacity (Per Unit)</th>
                      <th>Cost per Customer Session</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}>
                        <td><strong>{p.name}</strong></td>
                        <td>₹{p.purchaseCost} per {p.unitType.replace(/s$/,'')}</td>
                        <td>{p.quantity} {p.unitType}</td>
                        <td>Serves {p.capacityPerUnit} clients</td>
                        <td style={{ color: 'var(--accent-pink)', fontWeight: 600 }}>
                          ₹{(p.purchaseCost / p.capacityPerUnit).toFixed(2)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => { setEditingId(p.id); setProductForm(p); }}>
                              <Edit size={12} />
                            </button>
                            <button className="btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleDelete('products', p.id)}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 5. MEMBERSHIP PLAN BUILDER */}
        {activeSubTab === 'plans' && (
          <div>
            {isAddingNew || editingId !== null ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSave('plans', planForm.id, planForm);
              }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label className="form-label">Membership Plan Name</label>
                  <input type="text" className="form-input" required value={planForm.name || ''} onChange={e => setPlanForm({...planForm, name: e.target.value})} placeholder="e.g. Beauty Gold Premium" />
                </div>
                <div>
                  <label className="form-label">Subscription Price per Month (₹)</label>
                  <input type="number" className="form-input" required value={planForm.price || 0} onChange={e => setPlanForm({...planForm, price: parseFloat(e.target.value) || 0})} />
                </div>
                <div style={{ gridColumn: 'span 2', background: 'rgba(0,0,0,0.15)', padding: '15px', borderRadius: '8px' }}>
                  <label className="form-label" style={{ fontWeight: 'bold', marginBottom: '8px', color: 'var(--accent-gold)' }}>Membership Plan Rules (Service Benefits)</label>
                  
                  {/* List of current plan rules */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {planRules.map((r, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '4px' }}>
                        <span style={{ fontSize: '13px' }}>
                          <strong>{r.serviceName}</strong>: {r.type === 'UNLIMITED' ? 'Unlimited usage' : `Limit of ${r.limit} times per month`}
                        </span>
                        <button type="button" className="btn-danger" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={() => {
                          const next = planRules.filter((_, i) => i !== idx);
                          updatePlanRules(next);
                        }}>Remove</button>
                      </div>
                    ))}
                    {planRules.length === 0 && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No rules configured. Add service benefits below.</span>}
                  </div>

                  {/* Add Rule Inline Form */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flexGrow: 1 }}>
                      <label className="form-label" style={{ fontSize: '11px' }}>Select Service</label>
                      <select id="plan-service-select" className="form-select" style={{ fontSize: '12px', padding: '6px' }}>
                        <option value="">-- Choose Service --</option>
                        {services.map(s => <option key={s.id} value={s.name}>{s.name} ({s.category})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>Benefit Type</label>
                      <select id="plan-rule-type-select" className="form-select" style={{ fontSize: '12px', padding: '6px' }} onChange={(e) => {
                        const limitInput = document.getElementById('plan-rule-limit-container');
                        if (limitInput) {
                          limitInput.style.display = e.target.value === 'MONTHLY_LIMIT' ? 'block' : 'none';
                        }
                      }}>
                        <option value="UNLIMITED">Unlimited</option>
                        <option value="MONTHLY_LIMIT">Monthly Limit</option>
                      </select>
                    </div>
                    <div id="plan-rule-limit-container" style={{ display: 'none' }}>
                      <label className="form-label" style={{ fontSize: '11px' }}>Monthly Limit</label>
                      <input id="plan-rule-limit" type="number" className="form-input" style={{ width: '80px', fontSize: '12px', padding: '6px' }} placeholder="2" />
                    </div>
                    <button type="button" className="btn-secondary" style={{ padding: '8px 12px', fontSize: '12px' }} onClick={() => {
                      const sel = document.getElementById('plan-service-select') as HTMLSelectElement;
                      const typeSel = document.getElementById('plan-rule-type-select') as HTMLSelectElement;
                      const limInput = document.getElementById('plan-rule-limit') as HTMLInputElement;
                      
                      if (sel && typeSel && sel.value) {
                        const name = sel.value;
                        const type = typeSel.value as 'UNLIMITED' | 'MONTHLY_LIMIT';
                        const limit = type === 'MONTHLY_LIMIT' ? (parseInt(limInput.value) || 1) : undefined;
                        
                        const existing = planRules.find(r => r.serviceName === name);
                        let next;
                        if (existing) {
                          next = planRules.map(r => r.serviceName === name ? { ...r, type, limit } : r);
                        } else {
                          next = [...planRules, { serviceName: name, type, limit }];
                        }
                        updatePlanRules(next);
                        sel.value = "";
                        typeSel.value = "UNLIMITED";
                        limInput.value = "";
                        const limitContainer = document.getElementById('plan-rule-limit-container');
                        if (limitContainer) limitContainer.style.display = 'none';
                      }
                    }}>Add Rule</button>
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button type="submit" className="btn-primary"><Save size={16} /> Save</button>
                  <button type="button" className="btn-secondary" onClick={() => { setIsAddingNew(false); setEditingId(null); }}>Cancel</button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {plans.map(p => (
                  <div key={p.id} className="glass-panel" style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: '18px', color: 'var(--accent-gold)' }}>{p.name}</h3>
                    <div style={{ fontSize: '22px', fontWeight: 800, margin: '8px 0', color: 'var(--text-primary)' }}>
                      ₹{p.price}/month
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', margin: '12px 0', maxHeight: '150px', overflowY: 'auto' }}>
                      <strong style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>INCLUDED BENEFITS:</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(() => {
                          try {
                            const rules = JSON.parse(p.rulesJson);
                            const entries = Object.entries(rules);
                            if (entries.length === 0) return <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No benefits defined</span>;
                            return entries.map(([srv, rule]) => (
                              <div key={srv} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{srv}</span>
                                <span style={{ fontWeight: 'bold', color: (rule as any).type === 'UNLIMITED' ? 'var(--accent-purple)' : 'var(--text-primary)' }}>
                                  {(rule as any).type === 'UNLIMITED' ? '⚡ Unlimited' : `Max ${(rule as any).limit}/mo`}
                                </span>
                              </div>
                            ));
                          } catch {
                            return <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Invalid rules format</span>;
                          }
                        })()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => { setEditingId(p.id); setPlanForm(p); }}>
                        <Edit size={12} /> Edit
                      </button>
                      <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleDelete('plans', p.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                {plans.length === 0 && (
                  <p style={{ gridColumn: 'span 2', color: 'var(--text-muted)', textAlign: 'center' }}>No plans configured. Create one to test subscription flow!</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 6. CUSTOMER PROFILES */}
        {activeSubTab === 'customers' && (
          <div>
            {isAddingNew || editingId !== null ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSave('customer-configs', customerForm.id, customerForm);
              }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label className="form-label">Configuration Profile Name</label>
                  <input type="text" className="form-input" required value={customerForm.name || ''} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} placeholder="e.g. High Member City Pool" />
                </div>
                <div>
                  <label className="form-label">Total Subscribed Members</label>
                  <input type="number" className="form-input" required value={customerForm.totalMembers || 0} onChange={e => setCustomerForm({...customerForm, totalMembers: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="form-label">Expected Daily Walk-in Non-Members</label>
                  <input type="number" className="form-input" required value={customerForm.nonMembersDaily || 0} onChange={e => setCustomerForm({...customerForm, nonMembersDaily: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="form-label">Customer Arrival Pattern</label>
                  <select className="form-select" value={customerForm.arrivalPattern || 'PEAK_HOURS'} onChange={e => setCustomerForm({...customerForm, arrivalPattern: e.target.value})}>
                    <option value="PEAK_HOURS">Peak Hours Model (Lunch & Evenings)</option>
                    <option value="UNIFORM">Uniform Spread (Flat throughout shift)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Customer Activity Breakdown (% Heavy - % Normal - % Low)</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="number" className="form-input" placeholder="Heavy%" value={customerForm.heavyUserPct || ''} onChange={e => setCustomerForm({...customerForm, heavyUserPct: parseFloat(e.target.value) || 0})} />
                    <input type="number" className="form-input" placeholder="Normal%" value={customerForm.normalUserPct || ''} onChange={e => setCustomerForm({...customerForm, normalUserPct: parseFloat(e.target.value) || 0})} />
                    <input type="number" className="form-input" placeholder="Low%" value={customerForm.lowUserPct || ''} onChange={e => setCustomerForm({...customerForm, lowUserPct: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
                <div style={{ gridColumn: 'span 2', background: 'rgba(0,0,0,0.15)', padding: '15px', borderRadius: '8px' }}>
                  <label className="form-label" style={{ fontWeight: 'bold', marginBottom: '8px', color: 'var(--accent-purple)' }}>
                    Service Category Preferences % (Sum: {Object.values(preferences).reduce((a, b) => a + b, 0)}% - Must be 100%)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {["Threading", "Facial", "Hair", "Makeup", "Mehndi", "Nails"].map(cat => (
                      <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '13px', width: '90px' }}>{cat}</span>
                        <input type="range" min="0" max="100" value={preferences[cat] || 0} onChange={e => updatePreference(cat, parseInt(e.target.value) || 0)} style={{ flexGrow: 1 }} />
                        <span style={{ fontSize: '13px', width: '40px', textAlign: 'right' }}>{preferences[cat] || 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2', background: 'rgba(0,0,0,0.15)', padding: '15px', borderRadius: '8px' }}>
                  <label className="form-label" style={{ fontWeight: 'bold', marginBottom: '8px', color: 'var(--accent-purple)' }}>Peak Hours flow Multipliers</label>
                  
                  {/* List of current peak hours */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {peakHours.map((ph, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '4px' }}>
                        <span style={{ fontSize: '13px' }}><strong>{ph.range}</strong>: {ph.weight}x flow multiplier</span>
                        <button type="button" className="btn-danger" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={() => {
                          const next = peakHours.filter((_, i) => i !== idx);
                          updatePeakHours(next);
                        }}>Remove</button>
                      </div>
                    ))}
                    {peakHours.length === 0 && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No custom peak hour multipliers. Flow will be standard (1x) all day.</span>}
                  </div>

                  {/* Add Peak Hour inline form */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>Start Hour</label>
                      <select id="peak-start-hour" className="form-select" style={{ fontSize: '12px', padding: '6px' }}>
                        {Array.from({ length: 24 }).map((_, i) => {
                          const h = String(i).padStart(2, '0');
                          return <option key={i} value={`${h}:00`}>{h}:00</option>
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>End Hour</label>
                      <select id="peak-end-hour" className="form-select" style={{ fontSize: '12px', padding: '6px' }}>
                        {Array.from({ length: 24 }).map((_, i) => {
                          const h = String(i).padStart(2, '0');
                          return <option key={i} value={`${h}:00`}>{h}:00</option>
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>Weight Multiplier</label>
                      <input id="peak-weight" type="number" step="0.1" defaultValue="1.5" className="form-input" style={{ width: '80px', fontSize: '12px', padding: '6px' }} />
                    </div>
                    <button type="button" className="btn-secondary" style={{ padding: '8px 12px', fontSize: '12px' }} onClick={() => {
                      const start = document.getElementById('peak-start-hour') as HTMLSelectElement;
                      const end = document.getElementById('peak-end-hour') as HTMLSelectElement;
                      const weightInput = document.getElementById('peak-weight') as HTMLInputElement;
                      
                      if (start && end && weightInput) {
                        const range = `${start.value}-${end.value}`;
                        const weight = parseFloat(weightInput.value) || 1.0;
                        
                        const existing = peakHours.find(p => p.range === range);
                        let next;
                        if (existing) {
                          next = peakHours.map(p => p.range === range ? { ...p, weight } : p);
                        } else {
                          next = [...peakHours, { range, weight }];
                        }
                        updatePeakHours(next);
                      }
                    }}>Add Multiplier</button>
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button type="submit" className="btn-primary"><Save size={16} /> Save</button>
                  <button type="button" className="btn-secondary" onClick={() => { setIsAddingNew(false); setEditingId(null); }}>Cancel</button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {customers.map(c => (
                  <div key={c.id} className="glass-panel" style={{ padding: '16px', position: 'relative' }}>
                    {c.activeDefault && (
                      <span className="badge badge-success" style={{ position: 'absolute', top: '16px', right: '16px' }}>DEFAULT</span>
                    )}
                    <h3 style={{ fontSize: '16px' }}>{c.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '8px 0' }}>
                      Members: <strong>{c.totalMembers}</strong> • Walk-ins Daily: <strong>{c.nonMembersDaily}</strong>
                    </p>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      Pattern: {c.arrivalPattern} • Breakdown: {c.heavyUserPct}% H, {c.normalUserPct}% N, {c.lowUserPct}% L
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => { setEditingId(c.id); setCustomerForm(c); }}>
                        <Edit size={12} /> Edit
                      </button>
                      {!c.activeDefault && (
                        <>
                          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleSetDefaultCustomer(c.id)}>
                            Set Default
                          </button>
                          <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleDelete('customer-configs', c.id)}>
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
