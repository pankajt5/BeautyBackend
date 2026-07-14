import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, SkipForward, Users, Scissors, 
  Clock, TrendingUp, ShieldAlert, Award, FileText 
} from 'lucide-react';
import { Shop, CustomerConfig } from '../App';

interface SimulationViewProps {
  shop: Shop | null;
  customer: CustomerConfig | null;
  apiUrl: string;
  products: any[];
  services: any[];
}

interface SimEvent {
  minute: number;
  time: string;
  type: 'CUSTOMER_ARRIVE' | 'SERVICE_START' | 'SERVICE_END' | 'WALK_AWAY' | 'STOCKOUT';
  customer: string;
  service?: string;
  staff?: string;
  duration?: number;
  price?: number;
  product?: string;
  reason?: string;
}

interface ActiveServiceUI {
  customer: string;
  service: string;
  staff: string;
  equipment: string;
  startMinute: number;
  duration: number;
  elapsed: number;
  price: number;
}

interface TickerLogEntry {
  time: string;
  type: 'info' | 'arrive' | 'start' | 'end' | 'walk_away' | 'stockout' | 'consume';
  message: string;
}

export default function SimulationView({ shop, customer, apiUrl, products, services }: SimulationViewProps) {
  // Sim play state
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(10); // 1 real second = X simulated minutes
  const [currentMinute, setCurrentMinute] = useState(540); // 09:00 AM standard
  const [timeline, setTimeline] = useState<SimEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState<any | null>(null);
  
  // Real-time animation states
  const [waitingQueue, setWaitingQueue] = useState<{name: string, service: string, entryTime: number}[]>([]);
  const [activeServices, setActiveServices] = useState<ActiveServiceUI[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [walkAwayCount, setWalkAwayCount] = useState(0);
  const [stockoutCount, setStockoutCount] = useState(0);
  const [liveRevenue, setLiveRevenue] = useState(0);
  const [liveExpenses, setLiveExpenses] = useState(0);
  const [tickerLogs, setTickerLogs] = useState<TickerLogEntry[]>([]);
  const [liveProducts, setLiveProducts] = useState<{name: string, quantity: number, unitType: string}[]>([]);
  
  // Refs
  const playbackIntervalRef = useRef<any | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const startMin = shop ? parseTimeToMinutes(shop.workingHoursStart) : 540;
  const endMin = shop ? parseTimeToMinutes(shop.workingHoursEnd) : 1260;

  // Load a 1-day timeline from backend
  const loadTimeline = async () => {
    setLoading(true);
    resetSimulation();
    try {
      const res = await fetch(`${apiUrl}/simulation/run?days=1&shopId=${shop?.id}&customerConfigId=${customer?.id}`, {
        method: 'POST'
      });
      const data = await res.json();
      setSimResult(data);
      setTimeline(data.timeline || []);
      setLiveProducts(products.map(p => ({
        name: p.name,
        quantity: p.quantity,
        unitType: p.unitType
      })));
      
      // Seed initial prorated fixed expenses (rent + electricity + standard salary)
      const dailyRent = (shop?.monthlyRent || 0) / 30;
      const dailyElectric = (shop?.monthlyElectricity || 0) / 30;
      const baseSalary = 50000 / 30; // standard daily salary pool
      setLiveExpenses(dailyRent + dailyElectric + baseSalary);
      
      // Seed membership revenue prorated
      const dailyMembersRev = ((customer?.totalMembers || 0) * 499) / 30;
      setLiveRevenue(dailyMembersRev);

      addLog({ time: formatMinutesToTime(startMin), type: 'info', message: `Loaded digital twin configuration. Open: ${formatMinutesToTime(startMin)} - Close: ${formatMinutesToTime(endMin)}.` });
      addLog({ time: formatMinutesToTime(startMin), type: 'info', message: `Projected member pool: ${customer?.totalMembers} subscriptions.` });
    } catch (e) {
      console.error("Failed to load timeline", e);
      addLog({ time: formatMinutesToTime(startMin), type: 'info', message: "Failed to establish digital twin connection." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
    return () => stopPlayback();
  }, [shop, customer]);

  // Handle scrolling of logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tickerLogs]);

  // Main playback tick loop
  useEffect(() => {
    if (isPlaying) {
      // Calculate interval millisecond based on speed:
      // Say, 1 real second = 'speed' simulated minutes.
      // So, 1 simulated minute takes (1000 / speed) milliseconds.
      const tickMs = Math.max(1, 1000 / speed);
      
      playbackIntervalRef.current = setInterval(() => {
        setCurrentMinute((prevMin) => {
          if (prevMin >= endMin) {
            stopPlayback();
            addLog({ time: formatMinutesToTime(endMin), type: 'info', message: `Shop closed at ${formatMinutesToTime(endMin)}.` });
            return endMin;
          }
          
          const nextMin = prevMin + 1;
          processEventsForMinute(nextMin);
          processServiceDurations(nextMin);
          return nextMin;
        });
      }, tickMs);
    } else {
      stopPlayback();
    }
    return () => stopPlayback();
  }, [isPlaying, speed, timeline]);

  const stopPlayback = () => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  };

  const resetSimulation = () => {
    setIsPlaying(false);
    setCurrentMinute(startMin);
    setWaitingQueue([]);
    setActiveServices([]);
    setCompletedCount(0);
    setWalkAwayCount(0);
    setStockoutCount(0);
    setLiveRevenue(0);
    setLiveExpenses(0);
    setTickerLogs([]);
    setLiveProducts(products.map(p => ({
      name: p.name,
      quantity: p.quantity,
      unitType: p.unitType
    })));
    
    if (shop && customer) {
      const dailyRent = shop.monthlyRent / 30;
      const dailyElectric = shop.monthlyElectricity / 30;
      setLiveExpenses(dailyRent + dailyElectric + 1600); // 1600 base salaries
      setLiveRevenue((customer.totalMembers * 499) / 30);
    }
  };

  const stepForward = () => {
    if (currentMinute >= endMin) return;
    setCurrentMinute(prev => {
      const next = prev + 1;
      processEventsForMinute(next);
      processServiceDurations(next);
      return next;
    });
  };

  const addLog = (log: TickerLogEntry) => {
    setTickerLogs(prev => [...prev, log]);
  };

  // Process timeline events matching this minute
  const processEventsForMinute = (min: number) => {
    const events = timeline.filter(e => e.minute === min);
    
    events.forEach(e => {
      if (e.type === 'CUSTOMER_ARRIVE') {
        setWaitingQueue(prev => [...prev, { name: e.customer, service: e.service || 'Service', entryTime: min }]);
        addLog({ time: e.time, type: 'arrive', message: `${e.customer} arrived looking for ${e.service || 'Service'}.` });
      } 
      else if (e.type === 'SERVICE_START') {
        // Remove from waiting queue
        setWaitingQueue(prev => prev.filter(c => c.name !== e.customer));
        
        // Add to active
        const equip = getEquipmentForCategory(e.service || '');
        setActiveServices(prev => [...prev, {
          customer: e.customer,
          service: e.service || '',
          staff: e.staff || '',
          equipment: equip,
          startMinute: min,
          duration: e.duration || 10,
          elapsed: 0,
          price: e.price || 0
        }]);
        addLog({ time: e.time, type: 'start', message: `${e.customer} started ${e.service} with ${e.staff} (${e.duration} min).` });

        // Real-time stock consumption & live expenses update
        const svcObj = services.find(s => s.name === e.service);
        if (svcObj && svcObj.productConsumptionJson) {
          try {
            const consumption = JSON.parse(svcObj.productConsumptionJson);
            Object.entries(consumption).forEach(([prodName, consumedQty]: [string, any]) => {
              setLiveProducts(prevStock => prevStock.map(p => {
                if (p.name === prodName) {
                  return { ...p, quantity: Math.max(0, p.quantity - consumedQty) };
                }
                return p;
              }));
              
              addLog({ time: e.time, type: 'consume', message: `Consumed ${consumedQty} units of ${prodName} for ${e.customer}.` });

              const matchingProduct = products.find(p => p.name === prodName);
              if (matchingProduct) {
                const cost = consumedQty * matchingProduct.purchaseCost;
                setLiveExpenses(prevExp => prevExp + cost);
              }
            });
          } catch (err) {
            console.error("Error parsing product consumption JSON", err);
          }
        }
      } 
      else if (e.type === 'SERVICE_END') {
        // Remove from active
        setActiveServices(prev => prev.filter(c => c.customer !== e.customer));
        setCompletedCount(prev => prev + 1);
        
        // Increment revenue if paid
        if (e.price && e.price > 0) {
          setLiveRevenue(prev => prev + (e.price || 0));
        }
        addLog({ time: e.time, type: 'end', message: `${e.customer} completed ${e.service}. Billing: ₹${e.price || 0}.` });
      } 
      else if (e.type === 'WALK_AWAY') {
        setWaitingQueue(prev => prev.filter(c => c.name !== e.customer));
        setWalkAwayCount(prev => prev + 1);
        addLog({ time: e.time, type: 'walk_away', message: `${e.customer} walked away. Reason: ${e.reason || 'Wait time exceeded patience'}.` });
      } 
      else if (e.type === 'STOCKOUT') {
        setWaitingQueue(prev => prev.filter(c => c.name !== e.customer));
        setStockoutCount(prev => prev + 1);
        addLog({ time: e.time, type: 'stockout', message: `Stockout alert! ${e.customer} left due to missing stock of ${e.product}.` });
      }
    });
  };

  const processServiceDurations = (min: number) => {
    setActiveServices(prev => prev.map(s => {
      const elapsed = min - s.startMinute;
      return { ...s, elapsed: Math.min(s.duration, elapsed) };
    }));
  };

  function parseTimeToMinutes(hhmm: string): number {
    const parts = hhmm.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }

  function formatMinutesToTime(mins: number): string {
    const hrs = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    const hr12 = hrs % 12 === 0 ? 12 : hrs % 12;
    return `${hr12}:${m < 10 ? '0' : ''}${m} ${ampm}`;
  }

  function getEquipmentForCategory(serviceName: string): string {
    const name = serviceName.toLowerCase();
    if (name.includes("waxing") || name.includes("facial") || name.includes("cleanup") || name.includes("bleach") || name.includes("polishing")) {
      return "Facial Bed";
    }
    if (name.includes("hair") || name.includes("blow dry") || name.includes("colouring") || name.includes("highlights") || name.includes("smoothening") || name.includes("keratin")) {
      return "Hair Station";
    }
    if (name.includes("mehndi")) {
      return "Mehndi Table";
    }
    if (name.includes("nail") || name.includes("manicure") || name.includes("pedicure") || name.includes("paint") || name.includes("art")) {
      return "Chair"; // Nail / Mani-Pedi care is seated
    }
    if (name.includes("threading") || name.includes("makeup")) {
      return "Chair";
    }
    return "Chair";
  }

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <RotateCcw size={36} className="animate-spin" style={{ color: 'var(--accent-purple)', margin: '0 auto 15px' }} />
        <h3>Preparing simulation timeline...</h3>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulseGlow {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; filter: drop-shadow(0 0 6px rgba(168, 85, 247, 0.4)); }
          100% { transform: scale(1); opacity: 0.8; }
        }
        @keyframes floatUp {
          0% { transform: translateY(5px) scale(0.8); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-18px) scale(1.1); opacity: 0; }
        }
        @keyframes borderPulse {
          0% { border-color: rgba(34, 197, 94, 0.3); box-shadow: 0 0 2px rgba(34, 197, 94, 0.05); }
          50% { border-color: rgba(34, 197, 94, 0.7); box-shadow: 0 0 8px rgba(34, 197, 94, 0.2); }
          100% { border-color: rgba(34, 197, 94, 0.3); box-shadow: 0 0 2px rgba(34, 197, 94, 0.05); }
        }
        .working-dot {
          animation: pulseGlow 1.5s infinite ease-in-out;
        }
        .active-workstation-card {
          animation: borderPulse 2s infinite ease-in-out;
        }
        .floating-particle {
          position: absolute;
          top: 10px;
          right: 15px;
          font-size: 16px;
          pointer-events: none;
          animation: floatUp 1.8s infinite ease-in-out;
        }
      `}} />
      
      {/* Playback & Controls Header */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontFamily: 'Outfit' }}>Parlour Simulator Twin Player</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>
            Interactive discrete step player for visual bottleneck auditing.
          </p>
        </div>

        {/* Speed dials and triggers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          
          {/* Active Sim clock */}
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '10px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '130px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>SIMULATED TIME</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-gold)' }}>{formatMinutesToTime(currentMinute)}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn-secondary" 
              onClick={() => setIsPlaying(!isPlaying)}
              style={{ background: isPlaying ? 'rgba(239, 68, 68, 0.15)' : '', borderColor: isPlaying ? '#ef4444' : '' }}
            >
              {isPlaying ? <Pause size={16} style={{ color: '#ef4444' }} /> : <Play size={16} />}
              <span>{isPlaying ? 'Pause' : 'Start'}</span>
            </button>
            
            <button className="btn-secondary" onClick={stepForward} disabled={isPlaying || currentMinute >= endMin}>
              <SkipForward size={16} />
              <span>Step</span>
            </button>

            <button className="btn-secondary" onClick={resetSimulation}>
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
          </div>

          {/* Speed selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>PLAYBACK SPEED</label>
            <select 
              className="form-select" 
              value={speed} 
              onChange={(e) => setSpeed(parseInt(e.target.value))}
              style={{ width: '120px', padding: '6px' }}
            >
              <option value="1">1x Real Time</option>
              <option value="10">10x Speed</option>
              <option value="50">50x Speed</option>
              <option value="150">150x Speed</option>
              <option value="500">500x Speed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ticking Financial Tickers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        
        {/* Money Earned (Revenue) */}
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>MONEY EARNED (REVENUE)</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              ₹{liveRevenue.toFixed(0)}
            </div>
          </div>
          <TrendingUp size={24} style={{ color: 'var(--accent-purple)' }} />
        </div>

        {/* Money Spent (Expenses) */}
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>MONEY SPENT (EXPENSES)</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              ₹{liveExpenses.toFixed(0)}
            </div>
          </div>
          <Clock size={24} style={{ color: 'var(--accent-pink)' }} />
        </div>

        {/* Net Profit / Loss */}
        <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: (liveRevenue - liveExpenses) >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>NET PROFIT / LOSS</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: (liveRevenue - liveExpenses) >= 0 ? 'var(--success)' : 'var(--error)', marginTop: '4px' }}>
              ₹{(liveRevenue - liveExpenses).toFixed(0)}
            </div>
          </div>
          <Award size={24} style={{ color: (liveRevenue - liveExpenses) >= 0 ? 'var(--success)' : 'var(--error)' }} />
        </div>

      </div>

      {/* Main Floor Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Salon floor layout plan */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', color: 'var(--accent-gold)' }}>Live Digital Twin: Floor Layout Plan</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>Real-time 2D seat occupancy and visual queue monitor.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: '15px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} /> Empty / Open</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} /> Active Work</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
            
            {/* Waiting lounge capacity */}
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: '13px', color: 'var(--accent-purple)', marginBottom: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                🛋️ Lounge Queue ({waitingQueue.length}/{shop?.waitingAreaCapacity || 10})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                {Array.from({ length: shop?.waitingAreaCapacity || 10 }).map((_, idx) => {
                  const customerInSeat = waitingQueue[idx];
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        padding: '8px 12px', 
                        background: customerInSeat ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255,255,255,0.02)', 
                        border: customerInSeat ? '1px solid rgba(168, 85, 247, 0.3)' : '1px dashed rgba(255,255,255,0.05)', 
                        borderRadius: '8px',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>{customerInSeat ? '👩' : '🪑'}</span>
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        {customerInSeat ? (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {customerInSeat.name}
                              </span>
                              <span style={{ background: 'rgba(168, 85, 247, 0.2)', padding: '1px 5px', borderRadius: '8px', fontSize: '9px', fontWeight: 'bold', color: '#c084fc' }}>
                                ⏱️ {currentMinute - customerInSeat.entryTime}m wait
                              </span>
                            </div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Wants: {customerInSeat.service} (₹{services.find(s => s.name === customerInSeat.service)?.sellingPrice || 0})
                            </div>
                          </>
                        ) : (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Empty Lounge Seat</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Workstations Chairs & Beds Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              
              {/* Hair Stations */}
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--accent-purple)', marginBottom: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  💇 Hair Stations ({activeServices.filter(s => s.equipment === 'Hair Station').length}/{shop?.hairStations || 2})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Array.from({ length: shop?.hairStations || 2 }).map((_, idx) => {
                    const activeHair = activeServices.filter(s => s.equipment === 'Hair Station')[idx];
                    return (
                      <div 
                        key={idx} 
                        className={activeHair ? 'active-workstation-card' : ''}
                        style={{ 
                          position: 'relative',
                          padding: '10px', 
                          background: activeHair ? 'rgba(34, 197, 94, 0.06)' : 'rgba(255,255,255,0.01)', 
                          border: activeHair ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255,255,255,0.03)', 
                          borderRadius: '8px',
                          minHeight: '75px'
                        }}
                      >
                        {activeHair ? (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>💈 Chair {idx + 1}: {activeHair.customer}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ background: 'rgba(34, 197, 94, 0.15)', padding: '1px 5px', borderRadius: '8px', fontSize: '9px', fontWeight: 'bold', color: '#4ade80' }}>
                                  ⏱️ {activeHair.duration - activeHair.elapsed}m left
                                </span>
                                <span className="working-dot" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                              </div>
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{activeHair.service} (₹{activeHair.price}) • {activeHair.staff}</div>
                            <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                              <div style={{ width: `${(activeHair.elapsed / activeHair.duration) * 100}%`, height: '100%', background: '#22c55e' }} />
                            </div>
                            <span className="floating-particle">✂️</span>
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '55px', color: 'var(--text-muted)', fontSize: '11px', border: '1px dashed rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                            💈 Chair {idx + 1} Open
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Facial Beds */}
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--accent-pink)', marginBottom: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🛌 Facial Beds ({activeServices.filter(s => s.equipment === 'Facial Bed').length}/{shop?.facialBeds || 2})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Array.from({ length: shop?.facialBeds || 2 }).map((_, idx) => {
                    const activeBed = activeServices.filter(s => s.equipment === 'Facial Bed')[idx];
                    return (
                      <div 
                        key={idx} 
                        className={activeBed ? 'active-workstation-card' : ''}
                        style={{ 
                          position: 'relative',
                          padding: '10px', 
                          background: activeBed ? 'rgba(236, 72, 153, 0.06)' : 'rgba(255,255,255,0.01)', 
                          border: activeBed ? '1px solid rgba(236, 72, 153, 0.3)' : '1px solid rgba(255,255,255,0.03)', 
                          borderRadius: '8px',
                          minHeight: '75px'
                        }}
                      >
                        {activeBed ? (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>🛌 Bed {idx + 1}: {activeBed.customer}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ background: 'rgba(236, 72, 153, 0.15)', padding: '1px 5px', borderRadius: '8px', fontSize: '9px', fontWeight: 'bold', color: '#f472b6' }}>
                                  ⏱️ {activeBed.duration - activeBed.elapsed}m left
                                </span>
                                <span className="working-dot" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#ec4899', boxShadow: '0 0 6px #ec4899' }} />
                              </div>
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{activeBed.service} (₹{activeBed.price}) • {activeBed.staff}</div>
                            <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                              <div style={{ width: `${(activeBed.elapsed / activeBed.duration) * 100}%`, height: '100%', background: '#ec4899' }} />
                            </div>
                            <span className="floating-particle">✨</span>
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '55px', color: 'var(--text-muted)', fontSize: '11px', border: '1px dashed rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                            🛌 Bed {idx + 1} Open
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Threading & Makeup chairs */}
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🪑 Beauty Chairs ({activeServices.filter(s => s.equipment === 'Chair').length}/{shop?.chairs || 2})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Array.from({ length: shop?.chairs || 2 }).map((_, idx) => {
                    const activeChair = activeServices.filter(s => s.equipment === 'Chair')[idx];
                    return (
                      <div 
                        key={idx} 
                        className={activeChair ? 'active-workstation-card' : ''}
                        style={{ 
                          position: 'relative',
                          padding: '10px', 
                          background: activeChair ? 'rgba(234, 179, 8, 0.06)' : 'rgba(255,255,255,0.01)', 
                          border: activeChair ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid rgba(255,255,255,0.03)', 
                          borderRadius: '8px',
                          minHeight: '75px'
                        }}
                      >
                        {activeChair ? (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>🪑 Chair {idx + 1}: {activeChair.customer}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ background: 'rgba(234, 179, 8, 0.15)', padding: '1px 5px', borderRadius: '8px', fontSize: '9px', fontWeight: 'bold', color: '#facc15' }}>
                                  ⏱️ {activeChair.duration - activeChair.elapsed}m left
                                </span>
                                <span className="working-dot" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#eab308', boxShadow: '0 0 6px #eab308' }} />
                              </div>
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{activeChair.service} (₹{activeChair.price}) • {activeChair.staff}</div>
                            <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                              <div style={{ width: `${(activeChair.elapsed / activeChair.duration) * 100}%`, height: '100%', background: '#eab308' }} />
                            </div>
                            <span className="floating-particle">💄</span>
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '55px', color: 'var(--text-muted)', fontSize: '11px', border: '1px dashed rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                            🪑 Chair {idx + 1} Open
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mehndi Tables */}
              <div style={{ background: 'rgba(0,0,0,0.15)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ fontSize: '13px', color: 'var(--accent-purple)', marginBottom: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🌿 Mehndi Tables ({activeServices.filter(s => s.equipment === 'Mehndi Table').length}/{shop?.mehndiTables || 0})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Array.from({ length: shop?.mehndiTables || 0 }).map((_, idx) => {
                    const activeMehndi = activeServices.filter(s => s.equipment === 'Mehndi Table')[idx];
                    return (
                      <div 
                        key={idx} 
                        className={activeMehndi ? 'active-workstation-card' : ''}
                        style={{ 
                          position: 'relative',
                          padding: '10px', 
                          background: activeMehndi ? 'rgba(168, 85, 247, 0.06)' : 'rgba(255,255,255,0.01)', 
                          border: activeMehndi ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(255,255,255,0.03)', 
                          borderRadius: '8px',
                          minHeight: '75px'
                        }}
                      >
                        {activeMehndi ? (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>🌿 Table {idx + 1}: {activeMehndi.customer}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '1px 5px', borderRadius: '8px', fontSize: '9px', fontWeight: 'bold', color: '#c084fc' }}>
                                  ⏱️ {activeMehndi.duration - activeMehndi.elapsed}m left
                                </span>
                                <span className="working-dot" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 6px #a855f7' }} />
                              </div>
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>{activeMehndi.service} (₹{activeMehndi.price}) • {activeMehndi.staff}</div>
                            <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                              <div style={{ width: `${(activeMehndi.elapsed / activeMehndi.duration) * 100}%`, height: '100%', background: '#a855f7' }} />
                            </div>
                            <span className="floating-particle">🎨</span>
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '55px', color: 'var(--text-muted)', fontSize: '11px', border: '1px dashed rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                            🌿 Table {idx + 1} Open
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {(shop?.mehndiTables || 0) === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '55px', color: 'var(--text-muted)', fontSize: '11px', border: '1px dashed rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                      No tables configured
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column: Feed and Inventory */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Live event scrolling feed */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '290px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px', fontFamily: 'Outfit' }}>System Activity Feed</h3>
            
            <div style={{ flexGrow: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              {tickerLogs.map((log, i) => {
                let icon = '⚙️';
                let iconBg = 'rgba(255,255,255,0.05)';
                let iconColor = 'var(--text-secondary)';
                
                if (log.type === 'arrive') {
                  icon = '👋';
                  iconBg = 'rgba(16, 185, 129, 0.15)';
                  iconColor = '#34d399';
                } else if (log.type === 'start') {
                  icon = '💇';
                  iconBg = 'rgba(168, 85, 247, 0.15)';
                  iconColor = '#c084fc';
                } else if (log.type === 'consume') {
                  icon = '📦';
                  iconBg = 'rgba(245, 158, 11, 0.12)';
                  iconColor = '#fbbf24';
                } else if (log.type === 'end') {
                  icon = '✅';
                  iconBg = 'rgba(236, 72, 153, 0.15)';
                  iconColor = '#f472b6';
                } else if (log.type === 'walk_away') {
                  icon = '🚶';
                  iconBg = 'rgba(239, 68, 68, 0.15)';
                  iconColor = '#f87171';
                } else if (log.type === 'stockout') {
                  icon = '🚨';
                  iconBg = 'rgba(239, 68, 68, 0.25)';
                  iconColor = '#ef4444';
                }
                
                return (
                  <div 
                    key={i} 
                    className="animate-slide-in"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '10px', 
                      padding: '8px 10px', 
                      background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid rgba(255,255,255,0.03)', 
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      background: iconBg, 
                      fontSize: '11px',
                      flexShrink: 0
                    }}>
                      {icon}
                    </div>
                    
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: iconColor }}>
                          {log.type === 'arrive' && 'Arrival'}
                          {log.type === 'start' && 'Service Started'}
                          {log.type === 'consume' && 'Stock Consumption'}
                          {log.type === 'end' && 'Service Completed'}
                          {log.type === 'walk_away' && 'Client Left'}
                          {log.type === 'stockout' && 'Stockout Alert'}
                          {log.type === 'info' && 'System Notice'}
                        </span>
                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '6px', fontSize: '9px', color: 'var(--text-muted)' }}>
                          {log.time}
                        </span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-primary)', marginTop: '2px', lineHeight: '1.3' }}>
                        {log.message}
                      </p>
                    </div>
                  </div>
                );
              })}
              {tickerLogs.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '11px', textAlign: 'center', padding: '20px 0' }}>Press "Start" to trigger the activity feed.</div>
              )}
              <div ref={logsEndRef} />
            </div>

            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Completed: <strong>{completedCount}</strong></span>
              <span>Walk-aways: <strong style={{ color: walkAwayCount > 0 ? '#f87171' : '' }}>{walkAwayCount}</strong></span>
              <span>Stockouts: <strong style={{ color: stockoutCount > 0 ? '#f87171' : '' }}>{stockoutCount}</strong></span>
            </div>
          </div>

          {/* Live Inventory Stock */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '290px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '4px', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📦 Live Inventory Stock
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '12px' }}>
              Real-time consumption during simulation playback.
            </p>
            
            <div style={{ flexGrow: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {liveProducts.map(p => {
                const initialProduct = (products || []).find(ip => ip.name === p.name);
                const initialQty = initialProduct ? initialProduct.quantity : p.quantity;
                const ratio = initialQty > 0 ? (p.quantity / initialQty) : 1;
                const pct = Math.max(0, ratio * 100);
                const isLow = pct < 20;

                return (
                  <div key={p.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                        {p.name}
                      </span>
                      <span style={{ color: isLow ? '#f87171' : '#34d399', fontWeight: 'bold' }}>
                        {p.quantity.toFixed(2)} {p.unitType}
                      </span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: isLow ? '#f87171' : '#34d399', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                );
              })}
              {liveProducts.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                  No inventory products loaded.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Simulation Audit Report Panel */}
      {simResult && currentMinute >= endMin && (
        <div className="glass-panel animate-slide-in" style={{ padding: '24px', border: '1px solid rgba(168, 85, 247, 0.4)', background: 'linear-gradient(135deg, rgba(168,85,247,0.05), rgba(236,72,153,0.05))', marginTop: '20px' }}>
          <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', color: 'var(--accent-gold)', marginBottom: '4px', fontWeight: 600 }}>
            📊 Digital Twin Optimization & Audit Report
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '20px' }}>
            Data-driven recommendations to maximize profitability and eliminate operational bottlenecks.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            
            {/* 1. Staff & Resource Utilization */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: '13px', color: 'var(--accent-purple)', marginBottom: '12px', fontWeight: 'bold' }}>
                👥 Productivity & Utilization
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>STAFF UTILIZATION</span>
                  {Object.entries(simResult.staffUtilization || {}).map(([name, util]: any) => (
                    <div key={name} style={{ marginTop: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span>{name}</span>
                        <span style={{ fontWeight: 'bold' }}>{(util * 100).toFixed(0)}%</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${util * 100}%`, height: '100%', background: util > 0.8 ? '#f87171' : 'var(--accent-purple)' }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>EQUIPMENT UTILIZATION</span>
                  {Object.entries(simResult.equipmentUtilization || {}).map(([eq, util]: any) => {
                    const pct = util * 100;
                    const isBottleneck = pct > 75;
                    return (
                      <div key={eq} style={{ marginTop: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span>{eq}s</span>
                          <span style={{ fontWeight: 'bold', color: isBottleneck ? '#f87171' : 'var(--text-primary)' }}>
                            {pct.toFixed(0)}% {isBottleneck && '⚠️'}
                          </span>
                        </div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: isBottleneck ? '#f87171' : 'var(--accent-pink)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. Inventory Projection */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: '13px', color: 'var(--accent-pink)', marginBottom: '12px', fontWeight: 'bold' }}>
                📦 Inventory Status
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                {Object.entries(simResult.remainingInventory || {}).map(([prod, qty]: any) => {
                  const initialProduct = (products || []).find(p => p.name === prod);
                  const initialQty = initialProduct ? initialProduct.quantity : qty;
                  const ratio = initialQty > 0 ? (qty / initialQty) : 1;
                  const pct = Math.max(0, ratio * 100);
                  const isLow = pct < 20;
                  return (
                    <div key={prod}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>{prod}</span>
                        <span style={{ fontWeight: 'bold', color: isLow ? '#f87171' : '#34d399' }}>
                          {qty.toFixed(1)} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: isLow ? '#f87171' : '#34d399' }} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(simResult.remainingInventory || {}).length === 0 && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No products seeded.</span>
                )}
              </div>
            </div>

            {/* 3. Decision Support & Recommendations */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px', fontWeight: 'bold' }}>
                  💡 Optimization Suggestions
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {(() => {
                    const recs = [];
                    // Check bottlenecks
                    const bottlenecks = Object.entries(simResult.equipmentUtilization || {}).filter(([_, util]: any) => util > 0.75);
                    if (bottlenecks.length > 0) {
                      recs.push(`⚠️ High demand detected on **${bottlenecks.map(([eq]) => eq).join(', ')}**. Consider adding more chairs/beds to reduce walk-aways.`);
                    }
                    // Check walkaways
                    if (simResult.walkAwayCount > 3) {
                      recs.push(`👥 **${simResult.walkAwayCount} clients walked away** due to long queues. Try extending work shifts or adding part-time staff.`);
                    }
                    // Check stockouts
                    if (simResult.stockoutCount > 0) {
                      recs.push(`🛑 Stockouts occurred **${simResult.stockoutCount} times**. Increase safety stock thresholds inside inventory configuration.`);
                    }
                    // Check low utilization staff
                    const lowUtilStaff = Object.entries(simResult.staffUtilization || {}).filter(([_, util]: any) => util < 0.25);
                    if (lowUtilStaff.length > 0) {
                      recs.push(`💸 Staff member **${lowUtilStaff.map(([n]) => n).join(', ')}** had less than 25% utilization. Consider optimizing shift schedules.`);
                    }
                    if (recs.length === 0) {
                      recs.push(`✨ Operational flow is fully optimized! Scenario achieved positive margins and balanced utilization.`);
                    }
                    return recs.slice(0, 3).map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--accent-gold)' }}>✦</span>
                        <span dangerouslySetInnerHTML={{ __html: r.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div style={{ marginTop: '15px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '6px' }}>FINAL PROFIT CALCULATION</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '11.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>💰 Money Earned (Revenue):</span>
                    <span style={{ color: '#34d399', fontWeight: 'bold' }}>+ ₹{simResult.totalRevenue.toFixed(0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                    <span>💸 Money Spent (Expenses):</span>
                    <span style={{ color: '#f87171', fontWeight: 'bold' }}>- ₹{simResult.totalExpenses.toFixed(0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px', paddingTop: '4px' }}>
                    <span>🏆 Net Profit:</span>
                    <span style={{ color: (simResult.totalRevenue - simResult.totalExpenses) >= 0 ? 'var(--success)' : 'var(--error)' }}>
                      ₹{(simResult.totalRevenue - simResult.totalExpenses).toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
