import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Initialize Gemini client on server with required telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface TradeInput {
  vin: string;
  year: number;
  make: string;
  model: string;
  mileage: number;
  flaws: string[];
  payoff: number;
}

function runTradeAppraisal(trade: TradeInput) {
  const baseMarketVal = trade.year >= 2018 ? 16000.0 : 10000.0;
  const excessMileage = Math.max(0, trade.mileage - 60000);
  const mileageDeduction = Math.round(excessMileage * 0.1 * 100) / 100;

  let recondDeductions = 0;
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
    recondDeductions += cost;
    itemizedDeductions[flaw] = cost;
  }

  const acv = Math.round((baseMarketVal - mileageDeduction - recondDeductions) * 100) / 100;
  const netEquity = Math.round((acv - trade.payoff) * 100) / 100;

  return {
    vin: trade.vin,
    tradeVehicle: `${trade.year} ${trade.make} ${trade.model}`,
    mileage: trade.mileage,
    baseMarketValue: baseMarketVal,
    excessMileage,
    mileageDeduction,
    itemizedDeductions,
    totalRecondCost: recondDeductions,
    acv,
    payoffAmount: trade.payoff,
    netTradeEquity: netEquity,
  };
}

function evaluateThreeBankMatrix(creditTier: string, totalOtdAmount: number, targetMonthlyPmt: number) {
  const tierRateOffset =
    creditTier.includes('Tier 1') ? 0 : creditTier.includes('Tier 2') ? 1.25 : 2.75;

  const banks = [
    {
      id: 'bank_a',
      bankName: 'Bank A (Conservative Capital)',
      approvalStatus: 'APPROVED',
      buyRate: Number((5.0 + tierRateOffset).toFixed(2)),
      sellRate: Number((7.0 + tierRateOffset).toFixed(2)),
      frontEndCutRequired: 0.0,
      maxBackendProductAllowance: 0.0,
      allowedProducts: [] as string[],
    },
    {
      id: 'bank_b',
      bankName: 'Bank B (Regional Prime)',
      approvalStatus: 'APPROVED',
      buyRate: Number((4.5 + tierRateOffset).toFixed(2)),
      sellRate: Number((6.5 + tierRateOffset).toFixed(2)),
      frontEndCutRequired: 0.0,
      maxBackendProductAllowance: 3000.0,
      allowedProducts: ['VSC', 'GAP'],
    },
    {
      id: 'bank_c',
      bankName: 'Bank C (High-Gross National)',
      approvalStatus: 'APPROVED',
      buyRate: Number((4.0 + tierRateOffset).toFixed(2)),
      sellRate: Number((6.0 + tierRateOffset).toFixed(2)),
      frontEndCutRequired: 1000.0,
      maxBackendProductAllowance: 5000.0,
      allowedProducts: ['VSC', 'GAP', 'Tire_and_Wheel', 'Prepaid_Maintenance'],
    },
  ];

  const evaluatedResults = banks.map((bank) => {
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

  return {
    evaluatedResults,
    winningOption,
  };
}

// Deterministic + State-Tracked Deal Execution Endpoint
app.post('/api/dealership/execute-workflow', (req, res) => {
  try {
    const {
      sessionId = 'NIMBUS-SESSION-99482',
      customerName = 'John Doe',
      phone = '(214) 555-0199',
      creditTier = 'Tier 1 Super Prime',
      targetVehiclePrice = 28755.0,
      customerTargetDown = 500.0,
      customerTargetMonthly = 400.0,
      tradeDetails = {
        vin: 'VIN_TRADE_2018_CAMRY',
        year: 2018,
        make: 'Toyota',
        model: 'Camry SE',
        mileage: 72000,
        flaws: ['Front dent', 'Worn rear tires', 'Interior detail needed'],
        payoff: 8500.0,
      },
    } = req.body || {};

    const assignedSalesperson = 'Mark Gonzales';
    const deskManager = 'Preston Beard';
    const appraisal = runTradeAppraisal(tradeDetails);
    const netPrice = Math.round((targetVehiclePrice - appraisal.netTradeEquity) * 100) / 100;

    const now = Date.now();
    const interactionHistory = [
      {
        id: 'step-1',
        timestamp: new Date(now).toISOString(),
        stage: 'INITIAL_DESKING',
        engineTag: 'Gemini Live BDC Router',
        agentRole: `Desk Manager (${deskManager})`,
        message: `Received inbound lead for ${customerName} (${phone}). Executing House Game lead routing and pulling centralized Nimbus iQ CRM/DMS profile.`,
      },
      {
        id: 'step-2',
        timestamp: new Date(now + 800).toISOString(),
        stage: 'INITIAL_DESKING',
        engineTag: 'Nimbus iQ DMS Sync',
        agentRole: `Desk Manager (${deskManager})`,
        message: `Assigned high-intent showroom up to senior closer: ${assignedSalesperson}.`,
      },
      {
        id: 'step-3',
        timestamp: new Date(now + 1600).toISOString(),
        stage: 'APPRAISAL',
        engineTag: 'Gemini Multimodal Recon',
        agentRole: 'Appraiser Agent',
        message: `Evaluated ${appraisal.tradeVehicle} (${appraisal.vin}). Base $${appraisal.baseMarketValue.toLocaleString()} | Mileage Penalty -$${appraisal.mileageDeduction.toLocaleString()} | Recon -$${appraisal.totalRecondCost.toLocaleString()} | ACV $${appraisal.acv.toLocaleString()} | Net Equity $${appraisal.netTradeEquity.toLocaleString()}.`,
      },
      {
        id: 'step-4',
        timestamp: new Date(now + 2500).toISOString(),
        stage: 'DESKING_LOOP_1',
        engineTag: 'Four-Square Engine',
        agentRole: `Senior Closer (${assignedSalesperson})`,
        message: `Pencil #1 Presented: $3,000 Down | $650/mo on $${netPrice.toLocaleString()} net difference.`,
      },
      {
        id: 'step-5',
        timestamp: new Date(now + 3200).toISOString(),
        stage: 'DESKING_LOOP_1',
        engineTag: 'Voice Sentiment Stream',
        agentRole: `Customer (${customerName})`,
        message: `Payment shock detected: "Way too high. I said $${customerTargetDown.toLocaleString()} down and $${customerTargetMonthly.toLocaleString()}/mo max!"`,
      },
      {
        id: 'step-6',
        timestamp: new Date(now + 4100).toISOString(),
        stage: 'DESKING_LOOP_2',
        engineTag: 'Desk Re-Pencil',
        agentRole: `Desk Manager (${deskManager})`,
        message: `Re-desking Pencil #2 at $1,500 Down | $520/mo. Instructed ${assignedSalesperson} to isolate down payment and secure a signed buyer's order commitment.`,
      },
      {
        id: 'step-7',
        timestamp: new Date(now + 5000).toISOString(),
        stage: 'DESKING_LOOP_2',
        engineTag: 'Voice Sentiment Stream',
        agentRole: `Customer (${customerName})`,
        message: `Counter-offer: "I'll buy right now today if you can do $${customerTargetDown.toLocaleString()} down and $${(customerTargetMonthly + 50).toLocaleString()}/month!"`,
      },
      {
        id: 'step-8',
        timestamp: new Date(now + 5900).toISOString(),
        stage: 'COMMITMENT',
        engineTag: 'Commitment Close',
        agentRole: `Senior Closer (${assignedSalesperson})`,
        message: `Executed Hard Commitment Close: "Write your initials right here — I WILL BUY NOW at $${customerTargetDown.toLocaleString()} down and $${(customerTargetMonthly + 50).toLocaleString()}/mo." Commitment signed.`,
      },
    ];

    const agreedMonthly = customerTargetMonthly + 50;
    const fiMatrix = evaluateThreeBankMatrix(creditTier, netPrice, agreedMonthly);
    const renegotiatedBuyRate = Number(
      Math.max(2.9, fiMatrix.winningOption.bank.buyRate - 0.5).toFixed(2)
    );
    const addedSpreadGross = 750.0;
    const finalPvr = Number((fiMatrix.winningOption.netPvrGross + addedSpreadGross).toFixed(2));

    interactionHistory.push(
      {
        id: 'step-9',
        timestamp: new Date(now + 6800).toISOString(),
        stage: 'F_AND_I',
        engineTag: '3-Bank Matrix Optimizer',
        agentRole: 'F&I Manager Agent',
        message: `Submitted deal jacket to 3 lenders. Selected ${fiMatrix.winningOption.bank.bankName} with $${fiMatrix.winningOption.bank.maxBackendProductAllowance.toLocaleString()} backend cap and Projected Net PVR of $${fiMatrix.winningOption.netPvrGross.toLocaleString()}.`,
      },
      {
        id: 'step-10',
        timestamp: new Date(now + 7800).toISOString(),
        stage: 'BUSINESS_OFFICE',
        engineTag: 'Compliance & Rate Auditor',
        agentRole: 'Business Office Agent',
        message: `Audited POI, residence, and insurance stips. Re-negotiated buy rate with ${fiMatrix.winningOption.bank.bankName} from ${fiMatrix.winningOption.bank.buyRate.toFixed(2)}% to ${renegotiatedBuyRate.toFixed(2)}% APR (+$${addedSpreadGross.toFixed(2)} dealer reserve). Final Backend PVR: $${finalPvr.toLocaleString()}.`,
      }
    );

    res.json({
      sessionId,
      customerName,
      phone,
      assignedSalesperson,
      deskManager,
      negotiationAttempts: 3,
      maxNegotiationLoops: 5,
      commitmentSigned: true,
      agreedDown: customerTargetDown,
      agreedMonthly,
      netPrice,
      appraisal,
      fiMatrix,
      renegotiatedBuyRate,
      addedSpreadGross,
      finalPvr,
      interactionHistory,
    });
  } catch (err: any) {
    console.error('Workflow execution error:', err);
    res.status(500).json({ error: err?.message || 'Failed to execute dealership workflow.' });
  }
});

function getDealershipAgentConfig(mode: string, payload: string) {
  switch (mode) {
    case 'closer_negotiation':
      return {
        temperature: 0.55,
        systemInstruction: `You are operating inside the Nimbus iQ Automotive Dealership Multi-Agent Engine.
Coordinate two distinct dealership personas in a concise, realistic showroom desking response:
1. **Preston Beard (Desk Manager — House Game Protocol)**: Analyzes the numbers, protects front-end gross, utilizes itemized trade reconditioning deductions as leverage, and gives tactical desking instructions.
2. **Mark Gonzales (Senior Closer)**: Delivers an empathetic, high-conviction, transparent counter-presentation to the customer that isolates the objection and asks for an immediate written commitment ("If we get your payment to X with Y down today, will you initial the buyer's order right now so I can take it to the bank?").
Format cleanly in Markdown with two sections: **Desk Manager Directive (Preston Beard)** and **Floor Closer Script (Mark Gonzales)**, followed by **Updated Four-Square Pencil Recommendation**. Keep it sharp, realistic, and compliant.`,
        contents: `Respond to this live customer desking scenario and customer objection:\n\n${payload}`,
      };

    case 'ocr_5liner':
      return {
        temperature: 0.2,
        systemInstruction: `You are the Nimbus iQ Real-Time Multimodal Intake & 5-Liner Document Parser powered by Gemini.
Extract and structure raw customer BDC notes, driver's license data, paystub/POI figures, and insurance text into a clean Deal Jacket Intake Summary.
Format cleanly in Markdown with:
1. **Extracted Applicant & DMS Profile** (Name, Residence Stability, Verified Gross Monthly Income)
2. **DTI & PTI Pre-Qualification Ratios** (Calculate Payment-to-Income % against a $450-$550 target payment and flag green/amber stips)
3. **Stipulation Checklist for F&I Funding** (POI, POR, Insurance Binder, Payoff Authorization status)`,
        contents: `Parse and structure this raw dealership intake / stip document data:\n\n${payload}`,
      };

    case 'compliance_audit':
      return {
        temperature: 0.3,
        systemInstruction: `You are the Nimbus iQ Deep Analytical Reasoning & Compliance Auditor (handling contract auditing, Truth-in-Lending Reg Z checks, ECOA fair lending guardrails, and post-sale lender buy-rate re-negotiation strategy).
Analyze the submitted deal structure and output a crisp, executive Markdown report:
1. **Regulatory & Guardrail Audit** (Reg Z APR disclosure accuracy, backend product cap compliance, payment packing check — confirm clean itemization)
2. **Stipulation & Funding Risk Verification** (POI income variance check, lien payoff buffer, LTV ratio health)
3. **Post-Sale Bank Re-Negotiation Script** (Exact funding-desk pitch to the lender's senior buyer leveraging Tier-1 stips and low LTV to shave 50 bps off the buy rate and capture +$750 dealer reserve).`,
        contents: `Audit this Nimbus iQ F&I deal structure and generate the post-sale lender renegotiation memo:\n\n${payload}`,
      };

    case 'appraisal_justification':
      return {
        temperature: 0.4,
        systemInstruction: `You are the Nimbus iQ Trade-In Appraisal Agent.
Given a vehicle's year, make, model, mileage, baseline book value, and itemized reconditioning flaws, write a concise, credible **Appraiser Walkaround & ACV Defense Brief** that helps the salesperson explain the Actual Cash Value (ACV) to the customer without creating friction, while holding trade gross.
Include:
1. **Market Baseline & Auction Velocity**
2. **Transparent Reconditioning Breakdown** (Why service shop labor/parts cost what they do for safety certification)
3. **Tax Savings & Net Equity Bridge** (How trading in lowers taxable difference and unlocks immediate Four-Square equity).`,
        contents: `Generate an ACV walkaround defense brief for this trade-in evaluation:\n\n${payload}`,
      };

    case 'vc_memo':
      return {
        temperature: 0.5,
        systemInstruction: `You are the Principal Architect for Nimbus iQ Enterprise AI.
Produce a sharp, investor-grade VC & Enterprise Executive Brief explaining why embedding this Autonomous Dealership Multi-Agent Engine inside the **Nimbus iQ Ecosystem** (inheriting CRM/DMS connectors, centralized customer profiles, security guardrails, and multi-model Gemini + Claude orchestration) creates a defensible moat and measurable PVR lift per rooftop.
Include concrete unit economics (front/back PVR expansion, BDC speed-to-lead, desking cycle compression, zero standalone middleware bloat).`,
        contents: `Generate a Nimbus iQ VC & Executive Brief incorporating these live simulated deal results:\n\n${payload}`,
      };

    default:
      throw new Error(`Unsupported dealership agent mode: ${mode}`);
  }
}

// Streaming SSE Endpoint for Live Dealership Agents
app.post('/api/dealership/agent-stream', async (req, res) => {
  const { mode, payload } = req.body || {};

  if (!payload || typeof payload !== 'string' || !payload.trim()) {
    return res.status(400).json({ error: 'Payload text is required.' });
  }

  const allowedModes = [
    'closer_negotiation',
    'ocr_5liner',
    'compliance_audit',
    'appraisal_justification',
    'vc_memo',
  ];

  if (!allowedModes.includes(mode)) {
    return res.status(400).json({ error: `Invalid mode. Expected one of: ${allowedModes.join(', ')}` });
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const { systemInstruction, contents, temperature } = getDealershipAgentConfig(mode, payload.trim());

    let responseStream;
    try {
      responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature,
        },
      });
    } catch (firstErr: any) {
      if (firstErr?.message?.includes('503') || firstErr?.message?.includes('429')) {
        await new Promise((r) => setTimeout(r, 1000));
        responseStream = await ai.models.generateContentStream({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            temperature,
          },
        });
      } else {
        throw firstErr;
      }
    }

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Error during Nimbus iQ agent stream:', error);
    let errorMessage = error?.message || 'Agent stream failed.';
    if (errorMessage.includes('503')) {
      errorMessage = 'Model experiencing brief high demand. Retry in a few seconds.';
    }
    res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    res.end();
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Nimbus iQ Dealership Multi-Agent Engine',
    model: 'gemini-3.8-flash',
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Nimbus iQ Dealership Engine running on http://0.0.0.0:${port}`);
  });
}

startServer();
