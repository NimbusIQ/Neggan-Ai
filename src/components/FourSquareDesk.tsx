import React, { useState } from 'react';
import { Check, PenLine, RotateCcw, Car } from 'lucide-react';
import { TradeAppraisalResult } from '../types/dealership';

interface FourSquareDeskProps {
  customerName: string;
  targetVehicleName: string;
  targetVehicleStock: string;
  targetVehiclePrice: number;
  onTargetVehiclePriceChange: (price: number) => void;
  customerTargetDown: number;
  onCustomerTargetDownChange: (down: number) => void;
  customerTargetMonthly: number;
  onCustomerTargetMonthlyChange: (monthly: number) => void;
  appraisal: TradeAppraisalResult;
  activePencilTurn: 1 | 2 | 3;
  onSelectPencilTurn: (turn: 1 | 2 | 3) => void;
  commitmentSigned: boolean;
  onToggleCommitmentSigned: (signed: boolean) => void;
}

export const FourSquareDesk: React.FC<FourSquareDeskProps> = ({
  customerName,
  targetVehicleName,
  targetVehicleStock,
  targetVehiclePrice,
  onTargetVehiclePriceChange,
  customerTargetDown,
  onCustomerTargetDownChange,
  customerTargetMonthly,
  onCustomerTargetMonthlyChange,
  appraisal,
  activePencilTurn,
  onSelectPencilTurn,
  commitmentSigned,
  onToggleCommitmentSigned,
}) => {
  const [imgError, setImgError] = useState(false);

  const netDifference = Math.max(0, targetVehiclePrice - appraisal.netTradeEquity);
  const docAndTitleFees = 425;
  const estSalesTax = Math.round(Math.max(0, targetVehiclePrice - appraisal.acv) * 0.0625);
  const totalOutTheDoor = netDifference + docAndTitleFees + estSalesTax;

  // Pencil progression matching nimbus_iq_dealership_engine.py
  const pencilConfigs: Record<
    1 | 2 | 3,
    { label: string; down: number; monthly: number; termMonths: number; aprNote: string }
  > = {
    1: {
      label: 'Pencil 1 · Initial Desk',
      down: 3000,
      monthly: 650,
      termMonths: 60,
      aprNote: 'Standard desk reserve',
    },
    2: {
      label: 'Pencil 2 · Manager Re-Desk',
      down: 1500,
      monthly: 520,
      termMonths: 66,
      aprNote: 'Preston Beard re-pencil',
    },
    3: {
      label: 'Pencil 3 · Hard Commitment',
      down: customerTargetDown,
      monthly: customerTargetMonthly + 50,
      termMonths: 72,
      aprNote: 'Buyer commitment lock',
    },
  };

  const currentPencil = pencilConfigs[activePencilTurn];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header & Pencil Turn Switcher */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Four-Square Desking Worksheet</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            <span>Desk Manager: Preston Beard</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>Closer: Mark Gonzales</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Loop {activePencilTurn} of 5</span>
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {([1, 2, 3] as const).map((turn) => (
            <button
              key={turn}
              type="button"
              onClick={() => onSelectPencilTurn(turn)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activePencilTurn === turn
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Turn {turn}
            </button>
          ))}
        </div>
      </div>

      {/* Showroom Vehicle Strip */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-200 bg-slate-50/50">
        <div className="md:col-span-4 relative h-36 md:h-auto overflow-hidden border-b md:border-b-0 md:border-r border-slate-200 bg-slate-100">
          {!imgError ? (
            <img
              src="/src/assets/images/target_dealership_suv_1794707465402.jpg"
              alt={targetVehicleName}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500 p-4 text-center">
              <Car className="w-6 h-6 mb-1 text-slate-400" />
              <span className="text-xs font-medium text-slate-700">{targetVehicleName}</span>
            </div>
          )}
        </div>

        <div className="md:col-span-8 p-4 flex flex-col justify-between gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-900">{targetVehicleName}</div>
              <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                Stock {targetVehicleStock} · TX Trade Tax Credit Applied · Buyer: {customerName}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-500">Out-The-Door Financed</div>
              <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                ${totalOutTheDoor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200/80 text-xs">
            <div>
              <label htmlFor="selling-price-input" className="block text-slate-500 mb-1">
                Selling Price ($)
              </label>
              <input
                id="selling-price-input"
                type="number"
                step={100}
                value={targetVehiclePrice}
                onChange={(e) => onTargetVehiclePriceChange(Math.max(5000, Number(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
            <div>
              <label htmlFor="target-down-input" className="block text-slate-500 mb-1">
                Buyer Goal Down ($)
              </label>
              <input
                id="target-down-input"
                type="number"
                step={100}
                value={customerTargetDown}
                onChange={(e) => onCustomerTargetDownChange(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
            <div>
              <label htmlFor="target-monthly-input" className="block text-slate-500 mb-1">
                Buyer Goal Monthly ($)
              </label>
              <input
                id="target-monthly-input"
                type="number"
                step={25}
                value={customerTargetMonthly}
                onChange={(e) => onCustomerTargetMonthlyChange(Math.max(150, Number(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Classic 2x2 Dealership Four-Square Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-b border-slate-200">
        {/* Top-Left Quadrant: Selling Price & Difference */}
        <div className="p-5 flex flex-col justify-between sm:border-b border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>01. Selling Price & Net Difference</span>
            <span className="font-mono tabular-nums">Tax +${estSalesTax.toLocaleString()}</span>
          </div>
          <div className="space-y-1.5 my-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-slate-600">Market Selling Price</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                ${targetVehiclePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-slate-600">Less Net Trade Equity</span>
              <span className="font-mono tabular-nums font-medium text-emerald-700">
                -${appraisal.netTradeEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-xs font-medium text-slate-500">Net Cash Difference</span>
              <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                ${netDifference.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Top-Right Quadrant: Trade-In Allowance & Payoff */}
        <div className="p-5 flex flex-col justify-between sm:border-b border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>02. Trade-In Equity Injection</span>
            <span className="font-mono tabular-nums">{appraisal.tradeVehicle}</span>
          </div>
          <div className="space-y-1.5 my-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-slate-600">Actual Cash Value (ACV)</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                ${appraisal.acv.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-slate-600">10-Day Lien Payoff</span>
              <span className="font-mono tabular-nums text-slate-700">
                -${appraisal.payoffAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-xs font-medium text-slate-500">Net Trade Equity</span>
              <span
                className={`text-xl font-bold font-mono tabular-nums ${
                  appraisal.netTradeEquity >= 0 ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {appraisal.netTradeEquity >= 0 ? '+' : ''}$
                {appraisal.netTradeEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom-Left Quadrant: Cash Down Pencil */}
        <div className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>03. Cash Down Investment</span>
            <span>Customer Goal: ${customerTargetDown.toLocaleString()}</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-3">
              {activePencilTurn > 1 && (
                <span className="text-sm font-mono tabular-nums text-slate-400 line-through">
                  $3,000
                </span>
              )}
              {activePencilTurn === 3 && (
                <span className="text-sm font-mono tabular-nums text-slate-400 line-through">
                  $1,500
                </span>
              )}
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                ${currentPencil.down.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {activePencilTurn === 1 && 'Initial desk anchor protects front-end LTV ratio.'}
              {activePencilTurn === 2 && 'Cut in half by Preston Beard to test buyer commitment.'}
              {activePencilTurn === 3 && 'Matched customer down-payment limit to close today.'}
            </p>
          </div>
        </div>

        {/* Bottom-Right Quadrant: Monthly Payment Pencil */}
        <div className="p-5 flex flex-col justify-between bg-slate-50/60">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>04. Monthly Payment ({currentPencil.termMonths} mos)</span>
            <span>Goal: ${customerTargetMonthly.toLocaleString()}/mo</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-3">
              {activePencilTurn > 1 && (
                <span className="text-sm font-mono tabular-nums text-slate-400 line-through">
                  $650/mo
                </span>
              )}
              {activePencilTurn === 3 && (
                <span className="text-sm font-mono tabular-nums text-slate-400 line-through">
                  $520/mo
                </span>
              )}
              <span className="text-2xl font-bold font-mono tabular-nums text-blue-600">
                ${currentPencil.monthly.toLocaleString()}/mo
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {activePencilTurn < 3
                ? `${currentPencil.label} · ${currentPencil.aprNote}`
                : `+$50/mo bump accepted over $${customerTargetMonthly}/mo target`}
            </p>
          </div>
        </div>
      </div>

      {/* Hard Commitment Buyer Signature Bar */}
      <div className="px-5 py-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="text-xs font-semibold text-slate-900">
            Hard Commitment Write-Up: &ldquo;I will take delivery right now at ${currentPencil.down.toLocaleString()} down and ${currentPencil.monthly.toLocaleString()}/mo&rdquo;
          </div>
          <div className="text-xs text-slate-500">
            {commitmentSigned ? (
              <span className="text-emerald-700 font-medium">
                Signed by {customerName} · Deal jacket unlocked for 3-Bank F&amp;I Matrix
              </span>
            ) : (
              <span>Awaiting customer signature on Pencil {activePencilTurn} before F&amp;I routing</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {commitmentSigned ? (
            <>
              <div className="px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap">
                <Check className="w-3.5 h-3.5" />
                <span>Signed: {customerName}</span>
              </div>
              <button
                type="button"
                onClick={() => onToggleCommitmentSigned(false)}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-Open Desk</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                onSelectPencilTurn(3);
                onToggleCommitmentSigned(true);
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>Sign Commitment Sheet</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
