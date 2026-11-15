export type DealWorkflowStage =
  | 'INITIAL_DESKING'
  | 'APPRAISAL'
  | 'DESKING_LOOP_1'
  | 'DESKING_LOOP_2'
  | 'COMMITMENT'
  | 'F_AND_I'
  | 'BUSINESS_OFFICE';

export type WorkspaceTab =
  | 'command_desk'
  | 'trade_appraisal'
  | 'fi_matrix'
  | 'rooftop_map'
  | 'engine_code';

export interface TradeDetails {
  vin: string;
  year: number;
  make: string;
  model: string;
  mileage: number;
  flaws: string[];
  payoff: number;
}

export interface TradeAppraisalResult {
  vin: string;
  tradeVehicle: string;
  mileage: number;
  baseMarketValue: number;
  excessMileage: number;
  mileageDeduction: number;
  itemizedDeductions: Record<string, number>;
  totalRecondCost: number;
  acv: number;
  payoffAmount: number;
  netTradeEquity: number;
}

export interface BankOffer {
  id: string;
  bankName: string;
  approvalStatus: string;
  buyRate: number;
  sellRate: number;
  frontEndCutRequired: number;
  maxBackendProductAllowance: number;
  allowedProducts: string[];
}

export interface EvaluatedBankOption {
  bank: BankOffer;
  spreadProfit: number;
  backendProductProfit: number;
  frontDiscountCost: number;
  netPvrGross: number;
  targetMonthlyPmt: number;
}

export interface InteractionEntry {
  id: string;
  timestamp: string;
  stage: DealWorkflowStage;
  engineTag: string;
  agentRole: string;
  message: string;
}

export interface DealScenarioPreset {
  id: string;
  label: string;
  sessionId: string;
  customerName: string;
  phone: string;
  creditTier: 'Tier 1 Super Prime' | 'Tier 2 Prime' | 'Tier 3 Near-Prime';
  targetVehicleName: string;
  targetVehicleStock: string;
  targetVehiclePrice: number;
  customerTargetDown: number;
  customerTargetMonthly: number;
  tradeDetails: TradeDetails;
  rawFiveLinerDoc: string;
}
