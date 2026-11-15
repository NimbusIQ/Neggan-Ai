import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Wrench,
  Landmark,
  MapPin,
  Code2,
  Play,
  RotateCcw,
  Download,
  CheckCircle2,
  Clock,
  Menu,
  X,
} from 'lucide-react';
import {
  WorkspaceTab,
  TradeDetails,
  TradeAppraisalResult,
  EvaluatedBankOption,
  InteractionEntry,
} from './types/dealership';
import {
  DEAL_SCENARIO_PRESETS,
  NIMBUS_IQ_PYTHON_ENGINE_CODE,
} from './data/pythonEngineCode';
import { FourSquareDesk } from './components/FourSquareDesk';
import { CallWaveformPanel } from './components/CallWaveformPanel';
import { TradeAppraisalPanel } from './components/TradeAppraisalPanel';
import { ThreeBankMatrixPanel } from './components/ThreeBankMatrixPanel';
import { TexasOperationsMap } from './components/TexasOperationsMap';
import { EngineArchitecturePanel } from './components/EngineArchitecturePanel';

function computeClientAppraisal(trade: TradeDetails): TradeAppraisalResult {
  const baseMarketValue = trade.year >= 2018 ? 16000.0 : 10000.0;
  const excessMileage = Math.max(0, trade.mileage - 60000);
  const mileageDeduction = Math.round(excessMileage * 0.1 * 100) / 100;

  let totalRecondCost = 0;
  const itemizedDeductions: Record<string, number> = {};

  for (const flaw of trade.flaws) {
    const lower = flaw.toLowerCase();
    let cost = 400.0;
    if (lower.includes('tire') || lower.includes('tread')) {
      cost = 650.0;
    } else if (lower.includes('dent') || lower.includes('scratch')) {
      cost = 450.0;
    } else if (lower.includes('brake')) {
      cost = 500.0;
    } else if (lower.includes('detail') || lower.includes('interior')) {
      cost = 300.0;
    }
    totalRecondCost += cost;
    itemizedDeductions[flaw] = cost;
  }

  const acv = Math.round((baseMarketValue - mileageDeduction - totalRecondCost) * 100) / 100;
  const netTradeEquity = Math.round((acv - trade.payoff) * 100) / 100;

  return {
    vin: trade.vin,
    tradeVehicle: `${trade.year} ${trade.make} ${trade.model}`,
    mileage: trade.mileage,
    baseMarketValue,
    excessMileage,
    mileageDeduction,
    itemizedDeductions,
    totalRecondCost,
    acv,
    payoffAmount: trade.payoff,
    netTradeEquity,
  };
}

function computeClientBankMatrix(
  creditTier: 'Tier 1 Super Prime' | 'Tier 2 Prime' | 'Tier 3 Near-Prime',
  totalOtdAmount: number,
  targetMonthlyPmt: number
): { evaluatedResults: EvaluatedBankOption[]; winningOption: EvaluatedBankOption } {
  const tierOffset =
    creditTier === 'Tier 1 Super Prime' ? 0 : creditTier === 'Tier 2 Prime' ? 1.25 : 2.75;

  const banks = [
    {
      id: 'bank_a',
      bankName: 'Bank A (Conservative Capital)',
      approvalStatus: 'APPROVED',
      buyRate: Number((5.0 + tierOffset).toFixed(2)),
      sellRate: Number((7.0 + tierOffset).toFixed(2)),
      frontEndCutRequired: 0.0,
      maxBackendProductAllowance: 0.0,
      allowedProducts: [] as string[],
    },
    {
      id: 'bank_b',
      bankName: 'Bank B (Regional Prime)',
      approvalStatus: 'APPROVED',
      buyRate: Number((4.5 + tierOffset).toFixed(2)),
      sellRate: Number((6.5 + tierOffset).toFixed(2)),
      frontEndCutRequired: 0.0,
      maxBackendProductAllowance: 3000.0,
      allowedProducts: ['VSC', 'GAP'],
    },
    {
      id: 'bank_c',
      bankName: 'Bank C (High-Gross National)',
      approvalStatus: 'APPROVED',
      buyRate: Number((4.0 + tierOffset).toFixed(2)),
      sellRate: Number((6.0 + tierOffset).toFixed(2)),
      frontEndCutRequired: 1000.0,
      maxBackendProductAllowance: 5000.0,
      allowedProducts: ['VSC', 'GAP', 'Tire_and_Wheel', 'Prepaid_Maintenance'],
    },
  ];

  const evaluatedResults: EvaluatedBankOption[] = banks.map((bank) => {
    const spreadProfit =
      Math.round((bank.sellRate - bank.buyRate) * (totalOtdAmount / 100) * 1.5 * 100) / 100;
    const backendProductProfit = bank.maxBackendProductAllowance;
    const frontDiscountCost = bank.frontEndCutRequired;
    const netPvrGross =
      Math.round((spreadProfit + backendProductProfit - frontDiscountCost) * 100) / 100;

    return {
      bank,
      spreadProfit,
      backendProductProfit,
      frontDiscountCost,
      netPvrGross,
      targetMonthlyPmt,
    };
  });

  const winningOption = evaluatedResults.reduce((prev, curr) =>
    curr.netPvrGross > prev.netPvrGross ? curr : prev
  );

  return { evaluatedResults, winningOption };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('command_desk');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active Deal Session State
  const [selectedPresetId, setSelectedPresetId] = useState<string>(DEAL_SCENARIO_PRESETS[0].id);
  const [sessionId, setSessionId] = useState<string>(DEAL_SCENARIO_PRESETS[0].sessionId);
  const [customerName, setCustomerName] = useState<string>(DEAL_SCENARIO_PRESETS[0].customerName);
  const [phone, setPhone] = useState<string>(DEAL_SCENARIO_PRESETS[0].phone);
  const [creditTier, setCreditTier] = useState<
    'Tier 1 Super Prime' | 'Tier 2 Prime' | 'Tier 3 Near-Prime'
  >(DEAL_SCENARIO_PRESETS[0].creditTier);
  const [targetVehicleName, setTargetVehicleName] = useState<string>(
    DEAL_SCENARIO_PRESETS[0].targetVehicleName
  );
  const [targetVehicleStock, setTargetVehicleStock] = useState<string>(
    DEAL_SCENARIO_PRESETS[0].targetVehicleStock
  );
  const [targetVehiclePrice, setTargetVehiclePrice] = useState<number>(
    DEAL_SCENARIO_PRESETS[0].targetVehiclePrice
  );
  const [customerTargetDown, setCustomerTargetDown] = useState<number>(
    DEAL_SCENARIO_PRESETS[0].customerTargetDown
  );
  const [customerTargetMonthly, setCustomerTargetMonthly] = useState<number>(
    DEAL_SCENARIO_PRESETS[0].customerTargetMonthly
  );
  const [tradeDetails, setTradeDetails] = useState<TradeDetails>(
    DEAL_SCENARIO_PRESETS[0].tradeDetails
  );
  const [rawFiveLinerDoc, setRawFiveLinerDoc] = useState<string>(
    DEAL_SCENARIO_PRESETS[0].rawFiveLinerDoc
  );

  // Recursive Loop & Deal Execution State
  const [activePencilTurn, setActivePencilTurn] = useState<1 | 2 | 3>(3);
  const [commitmentSigned, setCommitmentSigned] = useState<boolean>(true);
  const [postSaleRenegotiated, setPostSaleRenegotiated] = useState<boolean>(true);
  const [interactionHistory, setInteractionHistory] = useState<InteractionEntry[]>([]);
  const [logStageFilter, setLogStageFilter] = useState<'ALL' | 'DESKING' | 'APPRAISAL' | 'F_AND_I'>('ALL');
  const [isSimulatingWorkflow, setIsSimulatingWorkflow] = useState<boolean>(false);

  const timersRef = useRef<number[]>([]);

  const appraisal = useMemo(() => computeClientAppraisal(tradeDetails), [tradeDetails]);
  const netPrice = Math.max(0, Math.round((targetVehiclePrice - appraisal.netTradeEquity) * 100) / 100);
  const agreedMonthly = customerTargetMonthly + 50;

  const { evaluatedResults: evaluatedBanks, winningOption: winningBank } = useMemo(
    () => computeClientBankMatrix(creditTier, netPrice, agreedMonthly),
    [creditTier, netPrice, agreedMonthly]
  );

  const finalPvrGross = winningBank.netPvrGross + (postSaleRenegotiated ? 750.0 : 0.0);

  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };

  // Run server-backed workflow simulation on initial load or when user clicks "Run Autonomous Deal Loop"
  const executeAutonomousWorkflow = async (animateSteps = true) => {
    clearTimers();
    setIsSimulatingWorkflow(true);

    if (animateSteps) {
      setInteractionHistory([]);
      setActivePencilTurn(1);
      setCommitmentSigned(false);
      setPostSaleRenegotiated(false);
    }

    try {
      const response = await fetch('/api/dealership/execute-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          customerName,
          phone,
          creditTier,
          targetVehiclePrice,
          customerTargetDown,
          customerTargetMonthly,
          tradeDetails,
        }),
      });

      if (!response.ok) throw new Error('Workflow request failed');
      const data = await response.json();
      const entries: InteractionEntry[] = data.interactionHistory || [];

      if (!animateSteps) {
        setInteractionHistory(entries);
        setActivePencilTurn(3);
        setCommitmentSigned(true);
        setPostSaleRenegotiated(true);
        setIsSimulatingWorkflow(false);
        return;
      }

      entries.forEach((entry, index) => {
        const timerId = window.setTimeout(() => {
          setInteractionHistory((prev) => [...prev, entry]);

          if (entry.stage === 'DESKING_LOOP_1') {
            setActivePencilTurn(1);
          } else if (entry.stage === 'DESKING_LOOP_2') {
            setActivePencilTurn(2);
          } else if (entry.stage === 'COMMITMENT') {
            setActivePencilTurn(3);
            setCommitmentSigned(true);
          } else if (entry.stage === 'BUSINESS_OFFICE') {
            setPostSaleRenegotiated(true);
          }

          if (index === entries.length - 1) {
            setIsSimulatingWorkflow(false);
          }
        }, index * 420);

        timersRef.current.push(timerId);
      });
    } catch (err) {
      console.error('Error executing autonomous deal workflow:', err);
      setIsSimulatingWorkflow(false);
    }
  };

  useEffect(() => {
    void executeAutonomousWorkflow(false);
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectScenario = (presetId: string) => {
    const found = DEAL_SCENARIO_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    clearTimers();
    setSelectedPresetId(found.id);
    setSessionId(found.sessionId);
    setCustomerName(found.customerName);
    setPhone(found.phone);
    setCreditTier(found.creditTier);
    setTargetVehicleName(found.targetVehicleName);
    setTargetVehicleStock(found.targetVehicleStock);
    setTargetVehiclePrice(found.targetVehiclePrice);
    setCustomerTargetDown(found.customerTargetDown);
    setCustomerTargetMonthly(found.customerTargetMonthly);
    setTradeDetails(found.tradeDetails);
    setRawFiveLinerDoc(found.rawFiveLinerDoc);
    setActivePencilTurn(3);
    setCommitmentSigned(true);
    setPostSaleRenegotiated(true);

    // Refresh log synchronously from server with new scenario data
    setTimeout(() => {
      fetch('/api/dealership/execute-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: found.sessionId,
          customerName: found.customerName,
          phone: found.phone,
          creditTier: found.creditTier,
          targetVehiclePrice: found.targetVehiclePrice,
          customerTargetDown: found.customerTargetDown,
          customerTargetMonthly: found.customerTargetMonthly,
          tradeDetails: found.tradeDetails,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.interactionHistory) setInteractionHistory(data.interactionHistory);
        })
        .catch(() => {});
    }, 30);
  };

  const handleExportPython = () => {
    const blob = new Blob([NIMBUS_IQ_PYTHON_ENGINE_CODE], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nimbus_iq_dealership_engine.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredHistory = useMemo(() => {
    if (logStageFilter === 'ALL') return interactionHistory;
    if (logStageFilter === 'DESKING') {
      return interactionHistory.filter((item) =>
        ['INITIAL_DESKING', 'DESKING_LOOP_1', 'DESKING_LOOP_2', 'COMMITMENT'].includes(item.stage)
      );
    }
    if (logStageFilter === 'APPRAISAL') {
      return interactionHistory.filter((item) => item.stage === 'APPRAISAL');
    }
    return interactionHistory.filter((item) =>
      ['F_AND_I', 'BUSINESS_OFFICE'].includes(item.stage)
    );
  }, [interactionHistory, logStageFilter]);

  const navItems: { id: WorkspaceTab; label: string; icon: React.ReactNode }[] = [
    { id: 'command_desk', label: 'Command Desk', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'trade_appraisal', label: 'Trade Appraisal', icon: <Wrench className="w-4 h-4" /> },
    { id: 'fi_matrix', label: '3-Bank F&I Matrix', icon: <Landmark className="w-4 h-4" /> },
    { id: 'rooftop_map', label: 'Rooftop Territory Map', icon: <MapPin className="w-4 h-4" /> },
    { id: 'engine_code', label: 'Python Engine & VC Deck', icon: <Code2 className="w-4 h-4" /> },
  ];

  const activeBreadcrumbLabel = navItems.find((n) => n.id === activeTab)?.label || 'Command Desk';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar (260px Workspace Navigation) */}
      <aside className="hidden lg:flex lg:w-[260px] lg:flex-col lg:fixed lg:inset-y-0 bg-slate-900 text-slate-200 border-r border-slate-800 z-30">
        <div className="h-16 px-5 flex items-center border-b border-slate-800">
          <span className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
            Nimbus iQ Auto
          </span>
        </div>

        <div className="p-4 flex-1 space-y-6 overflow-y-auto">
          <div>
            <div className="px-3 mb-2 text-[11px] font-medium text-slate-400">
              Dealership Operations
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-800 px-3 space-y-3">
            <div className="text-[11px] font-medium text-slate-400">
              Active Deal Jacket Presets
            </div>
            <div className="space-y-1.5">
              {DEAL_SCENARIO_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectScenario(preset.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors border ${
                      isSelected
                        ? 'bg-slate-800 border-slate-700 text-white font-medium'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="truncate">{preset.customerName}</div>
                    <div className="text-[11px] text-slate-400 font-mono tabular-nums truncate mt-0.5">
                      {preset.tradeDetails.year} {preset.tradeDetails.model} · ${preset.targetVehiclePrice.toLocaleString()}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
          <div className="text-slate-200 font-medium">Nimbus iQ Ecosystem</div>
          <div>CRM/DMS Connectors · Guardrails</div>
          <div className="font-mono tabular-nums text-[11px] text-slate-500">{sessionId}</div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 lg:pl-[260px] flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on Left, Primary Actions on Right */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle workspace navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-semibold text-slate-900 whitespace-nowrap">Nimbus iQ</span>
              <span className="text-slate-300" aria-hidden="true">/</span>
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap">Dealership Engine</span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
              <span className="font-medium text-slate-800 truncate">{activeBreadcrumbLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportPython}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Python Engine</span>
            </button>

            <button
              type="button"
              disabled={isSimulatingWorkflow}
              onClick={() => executeAutonomousWorkflow(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {isSimulatingWorkflow ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Running Loop...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Autonomous Deal Loop</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900 text-slate-100 border-b border-slate-800 px-4 py-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === item.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
              {DEAL_SCENARIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    handleSelectScenario(preset.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-2.5 py-1 rounded text-xs ${
                    selectedPresetId === preset.id
                      ? 'bg-white text-slate-900 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {preset.customerName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Viewport Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto space-y-6">
          {/* Full-Width 4-Column Deal Jacket KPI Ledger */}
          <section className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <div className="p-5">
              <div className="text-xs text-slate-500">Trade ACV &amp; Equity Injection</div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  ${appraisal.acv.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span
                  className={`text-xs font-mono tabular-nums font-semibold ${
                    appraisal.netTradeEquity >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {appraisal.netTradeEquity >= 0 ? '+' : ''}${appraisal.netTradeEquity.toLocaleString()} net
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500 truncate">
                {appraisal.tradeVehicle} · Recon -${appraisal.totalRecondCost.toLocaleString()}
              </div>
            </div>

            <div className="p-5">
              <div className="text-xs text-slate-500">Recursive Desking Loop</div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                  ${agreedMonthly.toLocaleString()}/mo
                </span>
                <span className="text-xs font-mono tabular-nums text-slate-600">
                  Turn {activePencilTurn} / 5
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500 truncate">
                {commitmentSigned ? (
                  <span className="text-emerald-700 font-medium">
                    Signed (${customerTargetDown.toLocaleString()} down) · Mark Gonzales
                  </span>
                ) : (
                  <span>Negotiating buyer commitment · Preston Beard</span>
                )}
              </div>
            </div>

            <div className="p-5">
              <div className="text-xs text-slate-500">Winning F&amp;I Lender Matrix</div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-lg font-bold text-slate-900 truncate">
                  {winningBank.bank.bankName.split(' (')[0]}
                </span>
                <span className="text-xs font-mono tabular-nums text-blue-700 font-semibold">
                  {winningBank.bank.buyRate.toFixed(2)}% Buy
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500 truncate">
                Cap +${winningBank.bank.maxBackendProductAllowance.toLocaleString()} · Cut -${winningBank.frontDiscountCost.toLocaleString()}
              </div>
            </div>

            <div className="p-5">
              <div className="text-xs text-slate-500">Final Dealership Backend PVR</div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
                  ${finalPvrGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-mono tabular-nums text-slate-600">
                  {postSaleRenegotiated ? '+$750 Reserve' : 'Base PVR'}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500 truncate">
                {postSaleRenegotiated
                  ? `Re-negotiated to ${Math.max(2.9, winningBank.bank.buyRate - 0.5).toFixed(2)}% APR`
                  : 'Business Office rate audit ready'}
              </div>
            </div>
          </section>

          {/* Tab 1: Unified Multi-Agent Dealership Command Desk */}
          {activeTab === 'command_desk' && (
            <div className="space-y-6">
              {/* Row 1: 4-Square Desk + Live BDC Voice Waveform & 5-Liner OCR */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <div className="xl:col-span-7">
                  <FourSquareDesk
                    customerName={customerName}
                    targetVehicleName={targetVehicleName}
                    targetVehicleStock={targetVehicleStock}
                    targetVehiclePrice={targetVehiclePrice}
                    onTargetVehiclePriceChange={setTargetVehiclePrice}
                    customerTargetDown={customerTargetDown}
                    onCustomerTargetDownChange={setCustomerTargetDown}
                    customerTargetMonthly={customerTargetMonthly}
                    onCustomerTargetMonthlyChange={setCustomerTargetMonthly}
                    appraisal={appraisal}
                    activePencilTurn={activePencilTurn}
                    onSelectPencilTurn={setActivePencilTurn}
                    commitmentSigned={commitmentSigned}
                    onToggleCommitmentSigned={setCommitmentSigned}
                  />
                </div>

                <div className="xl:col-span-5">
                  <CallWaveformPanel
                    customerName={customerName}
                    phone={phone}
                    targetVehicleName={targetVehicleName}
                    netPrice={netPrice}
                    customerTargetDown={customerTargetDown}
                    customerTargetMonthly={customerTargetMonthly}
                    rawFiveLinerDoc={rawFiveLinerDoc}
                    isSimulatingWorkflow={isSimulatingWorkflow}
                  />
                </div>
              </div>

              {/* Row 2: Recursive AgentMemoryState Trace Log */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Recursive Multi-Agent Memory &amp; Execution Ledger (AgentMemoryState)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span>Session {sessionId}</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span>Customer: {customerName}</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span>Gemini Execution + Claude Compliance Orchestration</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    {(
                      [
                        { id: 'ALL', label: 'All Turns' },
                        { id: 'DESKING', label: 'Desking' },
                        { id: 'APPRAISAL', label: 'Appraisal' },
                        { id: 'F_AND_I', label: 'F&I & Funding' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setLogStageFilter(f.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          logStageFilter === f.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredHistory.length === 0 ? (
                  <div className="p-8 text-center">
                    <Clock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 mb-3">
                      {isSimulatingWorkflow
                        ? 'Streaming multi-agent negotiation turns...'
                        : 'No interaction turns match the selected filter.'}
                    </p>
                    {!isSimulatingWorkflow && (
                      <button
                        type="button"
                        onClick={() => setLogStageFilter('ALL')}
                        className="px-3 py-1.5 rounded-md border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Show All Turns
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium h-9">
                          <th className="px-5 w-28">Timestamp</th>
                          <th className="px-4 w-48">Agent / Persona</th>
                          <th className="px-4 w-44">Module / Stage</th>
                          <th className="px-5">Execution &amp; Memory State Trace</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredHistory.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-3 font-mono tabular-nums text-slate-400 whitespace-nowrap align-top">
                              {new Date(entry.timestamp).toLocaleTimeString([], {
                                hour12: false,
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap align-top">
                              <div className="flex items-center gap-1.5">
                                {entry.stage === 'COMMITMENT' || entry.stage === 'BUSINESS_OFFICE' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : null}
                                <span>{entry.agentRole}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap align-top">
                              {entry.engineTag}
                            </td>
                            <td className="px-5 py-3 text-slate-700 leading-relaxed align-top">
                              {entry.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Row 3: Trade Appraisal Summary + 3-Bank F&I Optimization Matrix Side-by-Side / Stacked */}
              <TradeAppraisalPanel
                tradeDetails={tradeDetails}
                onTradeDetailsChange={setTradeDetails}
                appraisal={appraisal}
                compact={true}
              />

              <ThreeBankMatrixPanel
                creditTier={creditTier}
                onCreditTierChange={setCreditTier}
                netPrice={netPrice}
                agreedMonthly={agreedMonthly}
                evaluatedBanks={evaluatedBanks}
                winningBank={winningBank}
                postSaleRenegotiated={postSaleRenegotiated}
                onTogglePostSaleRenegotiated={setPostSaleRenegotiated}
              />
            </div>
          )}

          {/* Tab 2: Full Trade-In Appraisal Engine */}
          {activeTab === 'trade_appraisal' && (
            <TradeAppraisalPanel
              tradeDetails={tradeDetails}
              onTradeDetailsChange={setTradeDetails}
              appraisal={appraisal}
              compact={false}
            />
          )}

          {/* Tab 3: 3-Bank F&I Matrix & Business Office */}
          {activeTab === 'fi_matrix' && (
            <ThreeBankMatrixPanel
              creditTier={creditTier}
              onCreditTierChange={setCreditTier}
              netPrice={netPrice}
              agreedMonthly={agreedMonthly}
              evaluatedBanks={evaluatedBanks}
              winningBank={winningBank}
              postSaleRenegotiated={postSaleRenegotiated}
              onTogglePostSaleRenegotiated={setPostSaleRenegotiated}
            />
          )}

          {/* Tab 4: Regional Dealership Rooftop Explorer (Google Maps Platform) */}
          {activeTab === 'rooftop_map' && <TexasOperationsMap />}

          {/* Tab 5: Production Python Engine & VC Architecture */}
          {activeTab === 'engine_code' && (
            <EngineArchitecturePanel
              customerName={customerName}
              tradeVehicle={appraisal.tradeVehicle}
              acv={appraisal.acv}
              netEquity={appraisal.netTradeEquity}
              winningLenderName={winningBank.bank.bankName}
              finalPvr={finalPvrGross}
            />
          )}
        </main>

        {/* Quiet Enterprise Footer */}
        <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-auto">
          <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div>
              Nimbus iQ Enterprise AI · Multi-Agent Automotive Dealership Platform
            </div>
            <div>
              CRM &amp; DMS Data Inheritance · Multi-Model Execution &amp; Compliance Guardrails
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
