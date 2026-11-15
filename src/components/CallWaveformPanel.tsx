import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Send,
  FileScan,
  PhoneCall,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface CallWaveformPanelProps {
  customerName: string;
  phone: string;
  targetVehicleName: string;
  netPrice: number;
  customerTargetDown: number;
  customerTargetMonthly: number;
  rawFiveLinerDoc: string;
  isSimulatingWorkflow: boolean;
}

const OBJECTION_PRESETS = [
  'Way too high! I told you $500 down and $400 a month max, not $650!',
  'CarMax offered me $1,500 more for my Camry last week. Why are you deducting for tires?',
  'Let me sleep on the $520/mo pencil and talk to my spouse tonight before signing.',
];

export const CallWaveformPanel: React.FC<CallWaveformPanelProps> = ({
  customerName,
  phone,
  targetVehicleName,
  netPrice,
  customerTargetDown,
  customerTargetMonthly,
  rawFiveLinerDoc,
  isSimulatingWorkflow,
}) => {
  const [subTab, setSubTab] = useState<'voice_closer' | 'ocr_intake'>('voice_closer');
  const [isVoicePlaying, setIsVoicePlaying] = useState<boolean>(false);
  const [objectionInput, setObjectionInput] = useState<string>(OBJECTION_PRESETS[0]);
  const [ocrDocInput, setOcrDocInput] = useState<string>(rawFiveLinerDoc);

  const [streamOutput, setStreamOutput] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setOcrDocInput(rawFiveLinerDoc);
  }, [rawFiveLinerDoc]);

  const isWaveformActive = isVoicePlaying || isStreaming || isSimulatingWorkflow;

  // Smooth HTML5 Canvas Voice Stream Waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barCount = 48;
      const gap = 4;
      const barWidth = (width - gap * (barCount - 1)) / barCount;

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap);
        let barHeight = 4;

        if (isWaveformActive) {
          const wave1 = Math.sin(phase + i * 0.32) * 0.5 + 0.5;
          const wave2 = Math.cos(phase * 1.7 - i * 0.19) * 0.5 + 0.5;
          const centerEnvelope = 1 - Math.abs((i - barCount / 2) / (barCount / 2)) * 0.55;
          barHeight = Math.max(4, (wave1 * 0.65 + wave2 * 0.35) * (height - 10) * centerEnvelope);
          ctx.fillStyle = i % 3 === 0 ? '#2563eb' : '#0f172a';
        } else {
          ctx.fillStyle = '#cbd5e1';
        }

        const y = (height - barHeight) / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      if (isWaveformActive) {
        phase += 0.14;
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isWaveformActive]);

  const runLiveAgentStream = async (mode: 'closer_negotiation' | 'ocr_5liner', textPayload: string) => {
    if (!textPayload.trim() || isStreaming) return;

    setIsStreaming(true);
    setStreamOutput('');
    setStreamError(null);

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    const contextualPayload =
      mode === 'closer_negotiation'
        ? `Customer: ${customerName} (${phone})
Vehicle: ${targetVehicleName} | Net Price After Trade Equity: $${netPrice.toLocaleString()}
Customer Stated Goal: $${customerTargetDown} Down / $${customerTargetMonthly}/mo
Live Customer Objection on Desking Floor: "${textPayload}"`
        : textPayload;

    try {
      const response = await fetch('/api/dealership/agent-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, payload: contextualPayload }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      if (!response.body) {
        throw new Error('Stream unavailable.');
      }

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
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              acc += parsed.text;
              setStreamOutput(acc);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setStreamError(err.message || 'Failed to stream response from Nimbus iQ agent.');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCopy = () => {
    if (!streamOutput) return;
    navigator.clipboard.writeText(streamOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Top Header & Sub-Mode Switcher */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Real-Time BDC Voice &amp; Multimodal Intake
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            <span>Gemini Real-Time Engine</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{phone}</span>
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('voice_closer')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              subTab === 'voice_closer'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Voice Closer Loop</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('ocr_intake')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              subTab === 'ocr_intake'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileScan className="w-3.5 h-3.5" />
            <span>5-Liner &amp; Stip OCR</span>
          </button>
        </div>
      </div>

      {/* Audio Waveform Monitor */}
      <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsVoicePlaying((v) => !v)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors shrink-0 ${
              isVoicePlaying
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
            aria-label={isVoicePlaying ? 'Stop call monitor' : 'Simulate live BDC voice stream'}
          >
            {isVoicePlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-900 truncate">
              {isWaveformActive
                ? `Active Audio Stream · Mark Gonzales ↔ ${customerName}`
                : 'BDC & Showroom Desk Audio Channel Standby'}
            </div>
            <div className="text-[11px] text-slate-500 font-mono tabular-nums truncate">
              {isWaveformActive ? '24kHz PCM Duplex · Sentiment: Payment Resistance' : 'Click Play or test an objection below'}
            </div>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={240}
          height={36}
          className="w-36 sm:w-52 h-9 shrink-0"
        />
      </div>

      {/* Body Controls */}
      <div className="p-5 space-y-4">
        {subTab === 'voice_closer' ? (
          <div className="space-y-3">
            <div>
              <label htmlFor="customer-objection-input" className="block text-xs font-semibold text-slate-800 mb-1.5">
                Inject Customer Desking Objection (House Game Re-Desk Test)
              </label>
              <textarea
                id="customer-objection-input"
                rows={2}
                value={objectionInput}
                onChange={(e) => setObjectionInput(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-none"
                placeholder="Type what the customer says when shown the 4-Square pencil..."
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {OBJECTION_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setObjectionInput(preset)}
                    className={`px-2.5 py-1 rounded-md text-xs border transition-colors whitespace-nowrap shrink-0 ${
                      objectionInput === preset
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'
                    }`}
                  >
                    Objection {idx + 1}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={isStreaming || !objectionInput.trim()}
                onClick={() => runLiveAgentStream('closer_negotiation', objectionInput)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {isStreaming ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Desking Response...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Run Desk Re-Pencil</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label htmlFor="ocr-5liner-input" className="block text-xs font-semibold text-slate-800 mb-1.5">
                5-Liner Credit App, Driver&apos;s License, POI &amp; Insurance Raw OCR Feed
              </label>
              <textarea
                id="ocr-5liner-input"
                rows={4}
                value={ocrDocInput}
                onChange={(e) => setOcrDocInput(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-y"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                Parses DTI/PTI ratios and deal-jacket stips into Nimbus iQ DMS
              </span>
              <button
                type="button"
                disabled={isStreaming || !ocrDocInput.trim()}
                onClick={() => runLiveAgentStream('ocr_5liner', ocrDocInput)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {isStreaming ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing Stips...</span>
                  </>
                ) : (
                  <>
                    <FileScan className="w-3.5 h-3.5" />
                    <span>Parse 5-Liner &amp; Stips</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {streamError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {streamError}
          </div>
        )}

        {(streamOutput || isStreaming) && (
          <div className="pt-4 border-t border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900">
                {subTab === 'voice_closer'
                  ? 'Live Multi-Agent Desk Output (Preston Beard & Mark Gonzales)'
                  : 'Structured DMS Deal Jacket & Stipulation Verification'}
              </span>
              {streamOutput && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 max-h-72 overflow-y-auto">
              <MarkdownRenderer content={streamOutput || 'Streaming live agent output...'} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
