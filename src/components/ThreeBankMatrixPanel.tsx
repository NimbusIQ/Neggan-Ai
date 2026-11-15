import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  Award,
  Loader2,
  Check,
  Copy,
  SlidersHorizontal,
} from 'lucide-react';
import { EvaluatedBankOption } from '../types/dealership';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ThreeBankMatrixPanelProps {
  creditTier: 'Tier 1 Super Prime' | 'Tier 2 Prime' | 'Tier 3 Near-Prime';
  onCreditTierChange: (tier: 'Tier 1 Super Prime' | 'Tier 2 Prime' | 'Tier 3 Near-Prime') => void;
  netPrice: number;
  agreedMonthly: number;
  evaluatedBanks: EvaluatedBankOption[];
  winningBank: EvaluatedBankOption;
  postSaleRenegotiated: boolean;
  onTogglePostSaleRenegotiated: (val: boolean) => void;
}

const FI_PRODUCTS: Record<string, { label: string; retailValue: number }> = {
  VSC: { label: 'Vehicle Service Contract (VSC)', retailValue: 2400 },
  GAP: { label: 'Guaranteed Asset Protection (GAP)', retailValue: 895 },
  Tire_and_Wheel: { label: 'Road Hazard Tire & Wheel', retailValue: 995 },
  Prepaid_Maintenance: { label: '36-Mo Prepaid Maintenance', retailValue: 710 },
};

export const ThreeBankMatrixPanel: React.FC<ThreeBankMatrixPanelProps> = ({
  creditTier,
  onCreditTierChange,
  netPrice,
  agreedMonthly,
  evaluatedBanks,
  winningBank,
  postSaleRenegotiated,
  onTogglePostSaleRenegotiated,
}) => {
  const [auditOutput, setAuditOutput] = useState<string>('');
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);

  const addedReserveSpread = postSaleRenegotiated ? 750.0 : 0.0;
  const finalNetPvr = winningBank.netPvrGross + addedReserveSpread;
  const renegotiatedApr = Math.max(2.9, winningBank.bank.buyRate - 0.5);

  const runComplianceAndRateAudit = async () => {
    if (isAuditing) return;
    setIsAuditing(true);
    setAuditOutput('');

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const payload = `Credit Tier: ${creditTier}
Amount Financed (Net Difference): $${netPrice.toLocaleString()}
Customer Signed Commitment Payment: $${agreedMonthly}/mo
Selected Winning Lender: ${winningBank.bank.bankName}
Buy Rate: ${winningBank.bank.buyRate.toFixed(2)}% | Contract Sell Rate: ${winningBank.bank.sellRate.toFixed(2)}%
Front-End Discount Required by Lender: -$${winningBank.frontDiscountCost.toLocaleString()}
Backend Product Cap Utilized: $${winningBank.backendProductProfit.toLocaleString()} (${winningBank.bank.allowedProducts.join(', ') || 'None'})
Initial F&I PVR Gross: $${winningBank.netPvrGross.toLocaleString()}
Business Office Post-Sale Target: Re-negotiate buy rate to ${renegotiatedApr.toFixed(2)}% APR (+$750.00 reserve) -> Final Total PVR $${(winningBank.netPvrGross + 750).toLocaleString()}.`;

    try {
      const response = await fetch('/api/dealership/agent-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'compliance_audit', payload }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) throw new Error('Audit request failed.');

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
              setAuditOutput(acc);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setAuditOutput('Compliance audit unavailable right now. Please retry.');
      }
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header & Credit Tier Selector */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            3-Bank F&amp;I Optimization Matrix &amp; Business Office Funding
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            <span>Claude Compliance &amp; Rate Auditor Role</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Financed Base ${netPrice.toLocaleString()}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Final PVR ${finalNetPvr.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['Tier 1 Super Prime', 'Tier 2 Prime', 'Tier 3 Near-Prime'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => onCreditTierChange(tier)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  creditTier === tier
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tier.replace(' Super Prime', '').replace(' Near-Prime', '')}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={isAuditing}
            onClick={runComplianceAndRateAudit}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {isAuditing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Auditing Deal...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Run Compliance &amp; Stip Audit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* High-Density 3-Lender Comparison Table */}
      <div className="overflow-x-auto border-b border-slate-200">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium h-10">
              <th className="px-5">Competing Lender Approval</th>
              <th className="px-4 text-right">Buy / Sell APR</th>
              <th className="px-4 text-right">Rate Reserve</th>
              <th className="px-4 text-right">Front-End Cut</th>
              <th className="px-4 text-right">Backend Cap</th>
              <th className="px-4">Eligible Menu Products</th>
              <th className="px-5 text-right">Projected Net PVR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {evaluatedBanks.map((option) => {
              const isWinner = option.bank.id === winningBank.bank.id;
              return (
                <tr
                  key={option.bank.id}
                  className={`h-12 transition-colors ${
                    isWinner ? 'bg-blue-50/40' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <td className="px-5 font-medium text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {isWinner && <Award className="w-4 h-4 text-blue-600 shrink-0" />}
                      <div>
                        <div>{option.bank.bankName}</div>
                        <div className="text-[11px] text-slate-500 font-normal">
                          {option.bank.approvalStatus} {isWinner ? '· Optimal PVR Selection' : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                    {option.bank.buyRate.toFixed(2)}% / {option.bank.sellRate.toFixed(2)}%
                  </td>
                  <td className="px-4 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                    +${option.spreadProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 text-right font-mono tabular-nums whitespace-nowrap">
                    {option.frontDiscountCost > 0 ? (
                      <span className="text-amber-700">
                        -${option.frontDiscountCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-slate-400">$0.00</span>
                    )}
                  </td>
                  <td className="px-4 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                    +${option.backendProductProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 text-slate-600">
                    {option.bank.allowedProducts.length > 0
                      ? option.bank.allowedProducts
                          .map((p) => p.replace(/_/g, ' '))
                          .join(' · ')
                      : 'Rate reserve only'}
                  </td>
                  <td className="px-5 text-right font-mono tabular-nums font-bold text-sm whitespace-nowrap">
                    <span className={isWinner ? 'text-blue-700' : 'text-slate-800'}>
                      ${option.netPvrGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Step 5: Business Office Post-Sale Bank Re-Negotiation & Product Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="lg:col-span-6 p-5 space-y-2.5">
          <div className="text-xs font-semibold text-slate-900">
            Included Backend Menu Bundle ({winningBank.bank.bankName})
          </div>
          <div className="divide-y divide-slate-100">
            {Object.entries(FI_PRODUCTS).map(([key, prod]) => {
              const included = winningBank.bank.allowedProducts.includes(key);
              return (
                <div key={key} className="py-2 flex items-center justify-between text-xs">
                  <span className={included ? 'text-slate-800 font-medium' : 'text-slate-400 line-through'}>
                    {prod.label}
                  </span>
                  <span className="font-mono tabular-nums text-slate-700">
                    {included ? `$${prod.retailValue.toLocaleString()}` : 'Capped'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-6 p-5 flex flex-col justify-between bg-slate-50/50 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900">
                Step 05. Business Office Post-Sale Buy-Rate Re-Negotiation
              </span>
              <span className="text-xs font-mono tabular-nums text-emerald-700 font-semibold">
                {postSaleRenegotiated ? '+$750.00 Captured' : 'Pending Execution'}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Audits POI and residence stability stips, then negotiates with{' '}
              <strong className="font-semibold text-slate-900">{winningBank.bank.bankName}</strong> senior buyer
              to lower wholesale buy rate from{' '}
              <span className="font-mono tabular-nums">{winningBank.bank.buyRate.toFixed(2)}%</span> to{' '}
              <span className="font-mono tabular-nums">{renegotiatedApr.toFixed(2)}% APR</span> without altering
              the customer&apos;s signed payment.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-slate-500">Total Dealership Backend PVR Gross</div>
              <div className="text-xl font-bold font-mono tabular-nums text-emerald-700">
                ${finalNetPvr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onTogglePostSaleRenegotiated(!postSaleRenegotiated)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                postSaleRenegotiated
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                {postSaleRenegotiated ? '50 bps Buy-Rate Cut Applied' : 'Execute 50 bps Rate Cut (+$750)'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Compliance & Funding Audit Output */}
      {auditOutput && (
        <div className="p-5 border-t border-slate-200 bg-slate-50/70 animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-900">
              Compliance Guardrail &amp; Senior Lender Buyer Re-Negotiation Memo
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(auditOutput);
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
            <MarkdownRenderer content={auditOutput} />
          </div>
        </div>
      )}
    </div>
  );
};
