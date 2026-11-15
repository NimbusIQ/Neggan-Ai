import React, { useState, useRef } from 'react';
import { Copy, Check, Download, FileText, Loader2 } from 'lucide-react';
import { NIMBUS_IQ_PYTHON_ENGINE_CODE } from '../data/pythonEngineCode';
import { MarkdownRenderer } from './MarkdownRenderer';

interface EngineArchitecturePanelProps {
  customerName: string;
  tradeVehicle: string;
  acv: number;
  netEquity: number;
  winningLenderName: string;
  finalPvr: number;
}

export const EngineArchitecturePanel: React.FC<EngineArchitecturePanelProps> = ({
  customerName,
  tradeVehicle,
  acv,
  netEquity,
  winningLenderName,
  finalPvr,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [vcMemo, setVcMemo] = useState('');
  const [isGeneratingMemo, setIsGeneratingMemo] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleCopyPython = () => {
    navigator.clipboard.writeText(NIMBUS_IQ_PYTHON_ENGINE_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadPython = () => {
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

  const generateVcDeckMemo = async () => {
    if (isGeneratingMemo) return;
    setIsGeneratingMemo(true);
    setVcMemo('');

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const payload = `Active Simulated Deal Telemetry:
- Customer: ${customerName}
- Trade-In: ${tradeVehicle} | ACV: $${acv.toLocaleString()} | Net Trade Equity Injected: $${netEquity.toLocaleString()}
- Winning F&I Lender: ${winningLenderName}
- Final Post-Renegotiation Backend PVR Gross: $${finalPvr.toLocaleString()}
- Ecosystem Inheritance: Nimbus iQ CRM/DMS data connectors, centralized customer profiles, enterprise security guardrails, and Gemini + Claude multi-model division of labor.`;

    try {
      const response = await fetch('/api/dealership/agent-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'vc_memo', payload }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) throw new Error('Failed to generate VC memo.');

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
              setVcMemo(acc);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setVcMemo('Unable to generate VC brief right now. Please retry.');
      }
    } finally {
      setIsGeneratingMemo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Multi-Model & Nimbus iQ Ecosystem Inheritance Overview */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Nimbus iQ Ecosystem Architecture &amp; Multi-Model Division of Labor
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inherits enterprise CRM/DMS connectors, centralized customer profiles, and security guardrails without standalone middleware bloat
            </p>
          </div>

          <button
            type="button"
            disabled={isGeneratingMemo}
            onClick={generateVcDeckMemo}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {isGeneratingMemo ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing VC Brief...</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5" />
                <span>Generate VC Deck Executive Brief</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          <div className="p-5 space-y-2">
            <div className="text-xs text-slate-500">Real-Time Execution &amp; Multimodal Engine</div>
            <h3 className="text-sm font-semibold text-slate-900">
              01. Google Gemini (Voice Streams, OCR &amp; Sub-Second Tooling)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Powers inbound BDC voice call duplexing, real-time 5-liner credit application OCR, driver&apos;s license and insurance binder verification, and sub-second tool dispatch across the Four-Square desk and Trade Appraisal Engine.
            </p>
          </div>

          <div className="p-5 space-y-2">
            <div className="text-xs text-slate-500">Deep Analytical Reasoning &amp; Compliance Auditor</div>
            <h3 className="text-sm font-semibold text-slate-900">
              02. Anthropic Claude (Contract Auditing &amp; Bank Renegotiation)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Executes Truth-in-Lending (Reg Z) and backend product cap compliance checks, audits Proof-of-Income (POI) and residence stability stips, and orchestrates post-sale lender buy-rate renegotiation across human-agent handoffs.
            </p>
          </div>
        </div>

        {vcMemo && (
          <div className="p-5 border-t border-slate-200 bg-slate-50/70 animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900">
                Investor &amp; Enterprise Architecture Memo (Live Deal Economics Included)
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(vcMemo);
                  setCopiedMemo(true);
                  setTimeout(() => setCopiedMemo(false), 2000);
                }}
                className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                {copiedMemo ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedMemo ? 'Copied' : 'Copy Brief'}</span>
              </button>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-lg">
              <MarkdownRenderer content={vcMemo} />
            </div>
          </div>
        )}
      </div>

      {/* Production Python Engine Code Viewer */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 font-mono">
              nimbus_iq_dealership_engine.py
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Production Python Multi-Agent Orchestrator · AgentMemoryState · TradeAppraisalEngine · ThreeBankFIMatrix
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPython}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied Python' : 'Copy Code'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPython}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .py</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-950 text-slate-100 p-5 overflow-x-auto max-h-[540px] overflow-y-auto">
          <pre className="text-xs font-mono leading-relaxed whitespace-pre">
            {NIMBUS_IQ_PYTHON_ENGINE_CODE}
          </pre>
        </div>
      </div>
    </div>
  );
};
