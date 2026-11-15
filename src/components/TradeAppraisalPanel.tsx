import React, { useState, useRef } from 'react';
import { Plus, X, Wrench, Loader2, Car, Check, Copy } from 'lucide-react';
import { TradeDetails, TradeAppraisalResult } from '../types/dealership';
import { AVAILABLE_RECON_FLAWS } from '../data/pythonEngineCode';
import { MarkdownRenderer } from './MarkdownRenderer';

interface TradeAppraisalPanelProps {
  tradeDetails: TradeDetails;
  onTradeDetailsChange: (next: TradeDetails) => void;
  appraisal: TradeAppraisalResult;
  compact?: boolean;
}

export const TradeAppraisalPanel: React.FC<TradeAppraisalPanelProps> = ({
  tradeDetails,
  onTradeDetailsChange,
  appraisal,
  compact = false,
}) => {
  const [customFlaw, setCustomFlaw] = useState('');
  const [imgError, setImgError] = useState(false);
  const [defenseBrief, setDefenseBrief] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const toggleFlaw = (flawLabel: string) => {
    const exists = tradeDetails.flaws.includes(flawLabel);
    const nextFlaws = exists
      ? tradeDetails.flaws.filter((f) => f !== flawLabel)
      : [...tradeDetails.flaws, flawLabel];
    onTradeDetailsChange({ ...tradeDetails, flaws: nextFlaws });
  };

  const handleAddCustomFlaw = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customFlaw.trim();
    if (!trimmed) return;
    if (!tradeDetails.flaws.includes(trimmed)) {
      onTradeDetailsChange({ ...tradeDetails, flaws: [...tradeDetails.flaws, trimmed] });
    }
    setCustomFlaw('');
  };

  const generateWalkaroundBrief = async () => {
    if (isStreaming) return;
    setIsStreaming(true);
    setDefenseBrief('');

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const summaryPayload = `Trade Vehicle: ${appraisal.tradeVehicle} (VIN: ${appraisal.vin})
Odometer: ${appraisal.mileage.toLocaleString()} miles (Excess over 60k baseline: ${appraisal.excessMileage.toLocaleString()} mi -> -$${appraisal.mileageDeduction.toFixed(2)})
KBB / Black Book Baseline: $${appraisal.baseMarketValue.toLocaleString()}
Itemized Recon Flaws: ${
      Object.entries(appraisal.itemizedDeductions)
        .map(([k, v]) => `${k} (-$${v})`)
        .join(', ') || 'None'
    }
Total Reconditioning Cost: -$${appraisal.totalRecondCost.toLocaleString()}
Calculated Actual Cash Value (ACV): $${appraisal.acv.toLocaleString()}
10-Day Lien Payoff: $${appraisal.payoffAmount.toLocaleString()}
Net Trade Equity Injected to Four-Square: $${appraisal.netTradeEquity.toLocaleString()}`;

    try {
      const response = await fetch('/api/dealership/agent-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'appraisal_justification', payload: summaryPayload }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) throw new Error('Failed to generate appraisal brief.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let acc = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim();
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            if (parsed.text) {
              acc += parsed.text;
              setDefenseBrief(acc);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setDefenseBrief('Unable to generate walkaround brief right now. Check connection and retry.');
      }
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Trade-In Appraisal &amp; Recon Devaluation Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
            <span>VIN {appraisal.vin}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>{appraisal.mileage.toLocaleString()} mi</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>ACV ${appraisal.acv.toLocaleString()}</span>
          </p>
        </div>

        <button
          type="button"
          disabled={isStreaming}
          onClick={generateWalkaroundBrief}
          className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {isStreaming ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>Drafting ACV Script...</span>
            </>
          ) : (
            <>
              <Wrench className="w-3.5 h-3.5 text-slate-600" />
              <span>Generate ACV Defense Script</span>
            </>
          )}
        </button>
      </div>

      {/* Inspection Bay Photo + Editable Vehicle Specs */}
      {!compact && (
        <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-slate-200">
          <div className="lg:col-span-5 relative min-h-48 bg-slate-100 border-b lg:border-b-0 lg:border-r border-slate-200">
            {!imgError ? (
              <img
                src="/src/assets/images/trade_in_sedan_inspection_1794707466034.jpg"
                alt={`${appraisal.tradeVehicle} in dealership service lane`}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-slate-500">
                <Car className="w-8 h-8 mb-2 text-slate-400" />
                <span className="text-xs font-medium">{appraisal.tradeVehicle} Service Bay</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="trade-year" className="block text-xs text-slate-500 mb-1">
                Model Year (&ge;2018 = $16k Base)
              </label>
              <input
                id="trade-year"
                type="number"
                min={2005}
                max={2026}
                value={tradeDetails.year}
                onChange={(e) =>
                  onTradeDetailsChange({ ...tradeDetails, year: Number(e.target.value) || 2018 })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label htmlFor="trade-make" className="block text-xs text-slate-500 mb-1">
                Make
              </label>
              <input
                id="trade-make"
                type="text"
                value={tradeDetails.make}
                onChange={(e) => onTradeDetailsChange({ ...tradeDetails, make: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label htmlFor="trade-model" className="block text-xs text-slate-500 mb-1">
                Model &amp; Trim
              </label>
              <input
                id="trade-model"
                type="text"
                value={tradeDetails.model}
                onChange={(e) => onTradeDetailsChange({ ...tradeDetails, model: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label htmlFor="trade-mileage" className="block text-xs text-slate-500 mb-1">
                Odometer ($0.10/mi &gt; 60k)
              </label>
              <input
                id="trade-mileage"
                type="number"
                step={1000}
                value={tradeDetails.mileage}
                onChange={(e) =>
                  onTradeDetailsChange({ ...tradeDetails, mileage: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label htmlFor="trade-payoff" className="block text-xs text-slate-500 mb-1">
                10-Day Lien Payoff ($)
              </label>
              <input
                id="trade-payoff"
                type="number"
                step={250}
                value={tradeDetails.payoff}
                onChange={(e) =>
                  onTradeDetailsChange({ ...tradeDetails, payoff: Math.max(0, Number(e.target.value) || 0) })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label htmlFor="trade-vin" className="block text-xs text-slate-500 mb-1">
                Trade VIN
              </label>
              <input
                id="trade-vin"
                type="text"
                value={tradeDetails.vin}
                onChange={(e) => onTradeDetailsChange({ ...tradeDetails, vin: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* Condition Deductions & Waterfall Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Left: Physical & Mechanical Flaw Selector */}
        <div className="lg:col-span-6 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900">
              Itemized Reconditioning Deductions
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {tradeDetails.flaws.length} active items
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {AVAILABLE_RECON_FLAWS.map((item) => {
              const active = tradeDetails.flaws.includes(item.label);
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => toggleFlaw(item.label)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="font-mono tabular-nums opacity-80">-${item.cost}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Flaw Tags */}
          {tradeDetails.flaws.some(
            (f) => !AVAILABLE_RECON_FLAWS.some((preset) => preset.label === f)
          ) && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tradeDetails.flaws
                .filter((f) => !AVAILABLE_RECON_FLAWS.some((preset) => preset.label === f))
                .map((custom) => (
                  <button
                    key={custom}
                    type="button"
                    onClick={() => toggleFlaw(custom)}
                    className="px-2.5 py-1 rounded-md bg-slate-800 text-white text-xs flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span>{custom}</span>
                    <span className="font-mono tabular-nums text-slate-300">
                      -${appraisal.itemizedDeductions[custom] ?? 400}
                    </span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
            </div>
          )}

          <form onSubmit={handleAddCustomFlaw} className="flex gap-2 pt-1">
            <input
              type="text"
              value={customFlaw}
              onChange={(e) => setCustomFlaw(e.target.value)}
              placeholder="Add inspection flaw (e.g. Worn front tires, Brake pads)..."
              className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              disabled={!customFlaw.trim()}
              className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Deduct</span>
            </button>
          </form>
        </div>

        {/* Right: ACV & Equity Waterfall Ledger */}
        <div className="lg:col-span-6 p-5">
          <div className="text-xs font-semibold text-slate-900 mb-2.5">
            ACV Valuation Waterfall (Synced to Four-Square)
          </div>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-slate-100">
              <tr className="h-8">
                <td className="text-slate-600">KBB / Black Book Wholesale Baseline</td>
                <td className="text-right font-mono tabular-nums font-medium text-slate-900">
                  ${appraisal.baseMarketValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="h-8">
                <td className="text-slate-600">
                  Excess Mileage Penalty ({appraisal.excessMileage.toLocaleString()} mi &times; $0.10)
                </td>
                <td className="text-right font-mono tabular-nums text-amber-700">
                  -${appraisal.mileageDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="h-8">
                <td className="text-slate-600">Shop Reconditioning Deductions</td>
                <td className="text-right font-mono tabular-nums text-amber-700">
                  -${appraisal.totalRecondCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="h-9 bg-slate-50/80 font-semibold">
                <td className="text-slate-900 pl-2">Final Actual Cash Value (ACV)</td>
                <td className="text-right font-mono tabular-nums text-slate-900 pr-2">
                  ${appraisal.acv.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="h-8">
                <td className="text-slate-600">Less Verified 10-Day Lien Payoff</td>
                <td className="text-right font-mono tabular-nums text-slate-700">
                  -${appraisal.payoffAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="h-10 border-t-2 border-slate-200 font-bold text-sm">
                <td className="text-slate-900">Net Trade Equity Injected</td>
                <td
                  className={`text-right font-mono tabular-nums ${
                    appraisal.netTradeEquity >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {appraisal.netTradeEquity >= 0 ? '+' : ''}$
                  {appraisal.netTradeEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Optional AI Walkaround Defense Brief */}
      {defenseBrief && (
        <div className="p-5 border-t border-slate-200 bg-slate-50/60 animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-900">
              Appraiser Walkaround &amp; ACV Justification Script
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(defenseBrief);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-lg">
            <MarkdownRenderer content={defenseBrief} />
          </div>
        </div>
      )}
    </div>
  );
};
