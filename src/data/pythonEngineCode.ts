import { DealScenarioPreset } from '../types/dealership';

export const DEAL_SCENARIO_PRESETS: DealScenarioPreset[] = [
  {
    id: 'john-doe-camry',
    label: 'John Doe · 2018 Camry SE Trade',
    sessionId: 'NIMBUS-SESSION-99482',
    customerName: 'John Doe',
    phone: '(214) 555-0199',
    creditTier: 'Tier 1 Super Prime',
    targetVehicleName: '2025 Ariya Platinum+ e-4ORCE',
    targetVehicleStock: 'STK-88410',
    targetVehiclePrice: 28755.0,
    customerTargetDown: 500.0,
    customerTargetMonthly: 400.0,
    tradeDetails: {
      vin: 'VIN_TRADE_2018_CAMRY',
      year: 2018,
      make: 'Toyota',
      model: 'Camry SE',
      mileage: 72000,
      flaws: ['Front dent', 'Worn rear tires', 'Interior detail needed'],
      payoff: 8500.0,
    },
    rawFiveLinerDoc: `APPLICANT: John M. Doe | DOB: 04/18/1984 | DL: TX-38291044 (Verified Active)
ADDRESS: 4120 Oak Lawn Ave, Dallas, TX 75219 (Time at Residence: 4 yrs 2 mos - Own/Mortgage $2,150/mo)
EMPLOYER: Lone Star Logistics Corp - Operations Supervisor (Tenure: 6 yrs 8 mos | W2 Paystub YTD Verified: $7,850/mo gross)
INSURANCE: State Farm Binder #SF-994821-TX | Comp/Coll $500 Deductible Verified
TRADE LIEN: Toyota Financial Services Acct #88412 | 10-Day Good-Through Payoff: $8,500.00`,
  },
  {
    id: 'elena-rodriguez-accord',
    label: 'Elena Rodriguez · 2019 Accord Sport Trade',
    sessionId: 'NIMBUS-SESSION-99514',
    customerName: 'Elena Rodriguez',
    phone: '(512) 555-0147',
    creditTier: 'Tier 2 Prime',
    targetVehicleName: '2025 Grand Highlander Hybrid Limited',
    targetVehicleStock: 'STK-88902',
    targetVehiclePrice: 36400.0,
    customerTargetDown: 1000.0,
    customerTargetMonthly: 510.0,
    tradeDetails: {
      vin: '1HGCV1F3XKA048219',
      year: 2019,
      make: 'Honda',
      model: 'Accord Sport',
      mileage: 81500,
      flaws: ['Rear bumper scratch', 'Brake rotor pulsation'],
      payoff: 9200.0,
    },
    rawFiveLinerDoc: `APPLICANT: Elena V. Rodriguez | DOB: 09/11/1989 | DL: TX-55910288 (Verified Active)
ADDRESS: 1904 Barton Springs Rd, Austin, TX 78704 (Time at Residence: 2 yrs 11 mos - Lease $1,875/mo)
EMPLOYER: Dell Medical Systems - Clinical Analyst (Tenure: 3 yrs 4 mos | Direct Deposit POI: $6,920/mo gross)
INSURANCE: Progressive Policy #PRG-441098-TX | Full Coverage Verified
TRADE LIEN: UFCU Auto Loan #44019 | 10-Day Payoff: $9,200.00`,
  },
  {
    id: 'marcus-vance-f150',
    label: 'Marcus Vance · 2017 Sedan High-Recon Trade',
    sessionId: 'NIMBUS-SESSION-99603',
    customerName: 'Marcus Vance',
    phone: '(817) 555-0182',
    creditTier: 'Tier 3 Near-Prime',
    targetVehicleName: '2024 Rogue SL AWD Certified',
    targetVehicleStock: 'STK-87119',
    targetVehiclePrice: 25900.0,
    customerTargetDown: 750.0,
    customerTargetMonthly: 425.0,
    tradeDetails: {
      vin: '4T1BF1FK5HU391044',
      year: 2017,
      make: 'Toyota',
      model: 'Camry LE',
      mileage: 94000,
      flaws: ['Worn front & rear tires', 'Passenger door dent', 'Brake pads worn', 'Interior detail needed'],
      payoff: 4100.0,
    },
    rawFiveLinerDoc: `APPLICANT: Marcus T. Vance | DOB: 12/03/1981 | DL: TX-11940322 (Verified Active)
ADDRESS: 618 Magnolia Ave, Fort Worth, TX 76104 (Time at Residence: 1 yr 9 mos - Rent $1,550/mo)
EMPLOYER: Trinity Rail Fabrication - Lead Machinist (Tenure: 2 yrs 1 mo | 2 Recent Paystubs: $5,480/mo gross, $320 OT variance)
INSURANCE: GEICO Policy #GC-778201-TX | Binder Pending VIN Swap
TRADE LIEN: Santander Consumer #90112 | 10-Day Payoff: $4,100.00`,
  },
];

export const AVAILABLE_RECON_FLAWS = [
  { label: 'Front dent', cost: 450 },
  { label: 'Worn rear tires', cost: 650 },
  { label: 'Interior detail needed', cost: 300 },
  { label: 'Brake rotor pulsation', cost: 500 },
  { label: 'Rear bumper scratch', cost: 450 },
  { label: 'Windshield star chip', cost: 400 },
];

export const NIMBUS_IQ_PYTHON_ENGINE_CODE = `import asyncio
import json
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Tuple

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("NimbusIQ_Engine")


# ==============================================================================
# 1. RECURSIVE MEMORY & STATE PERSISTENCE ENGINE
# ==============================================================================
@dataclass
class AgentMemoryState:
    """
    Maintains recursive short-term and long-term memory state across 
    multi-agent interaction loops within the Nimbus iQ framework.
    """
    session_id: str
    customer_name: str
    phone_number: str
    interaction_history: List[Dict] = field(default_factory=list)
    negotiation_attempts: int = 0
    max_negotiation_loops: int = 5
    current_stage: str = "INITIAL_DESKING"  # PHASES: DESKING, APPRAISAL, COMMITMENT, F_AND_I, BUSINESS_OFFICE
    customer_target_down: float = 0.0
    customer_target_monthly: float = 0.0
    commitment_signed: bool = False

    def log_interaction(self, agent_role: str, message: str, metadata: Optional[Dict] = None):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "agent_role": agent_role,
            "message": message,
            "metadata": metadata or {}
        }
        self.interaction_history.append(entry)
        logger.info(f"[{agent_role}] {message}")

    def increment_loop(self) -> bool:
        self.negotiation_attempts += 1
        return self.negotiation_attempts <= self.max_negotiation_loops


# ==============================================================================
# 2. TRADE-IN APPRAISAL ENGINE (DEVALUATION & EQUITY INJECTION)
# ==============================================================================
class TradeAppraisalEngine:
    """
    Simulates the dealership trade appraisal process:
    Evaluates vehicle condition, applies reconditioning deductions, calculates
    Actual Cash Value (ACV), and determines net trade equity.
    """
    @staticmethod
    def appraise_trade(vin: str, year: int, make: str, model: str, mileage: int, reported_flaws: List[str], payoff_amount: float) -> Dict:
        logger.info(f"[Appraiser Agent] Running physical & market evaluation on Trade VIN {vin} ({year} {make} {model})...")
        
        # Base Market Value (KBB / Black Book Baseline)
        base_market_val = 16000.0 if year >= 2018 else 10000.0
        
        # Mileage Penalty ($0.10 per mile over 60,000)
        excess_mileage = max(0, mileage - 60000)
        mileage_deduction = excess_mileage * 0.10
        
        # Itemized Reconditioning Deductions (Negotiating Leverage)
        recond_deductions = 0.0
        deduction_breakdown = {}
        for flaw in reported_flaws:
            flaw_lower = flaw.lower()
            if "tire" in flaw_lower or "tread" in flaw_lower:
                cost = 650.0
            elif "dent" in flaw_lower or "scratch" in flaw_lower:
                cost = 450.0
            elif "brake" in flaw_lower:
                cost = 500.0
            elif "detail" in flaw_lower or "interior" in flaw_lower:
                cost = 300.0
            else:
                cost = 400.0
            recond_deductions += cost
            deduction_breakdown[flaw] = cost

        acv = base_market_val - mileage_deduction - recond_deductions
        net_equity = acv - payoff_amount

        logger.info(f"[Appraiser Agent] Base: \${base_market_val:,.2f} | Recond Deductions: -\${recond_deductions:,.2f} | Final ACV: \${acv:,.2f} | Net Equity: \${net_equity:,.2f}")
        return {
            "vin": vin,
            "trade_vehicle": f"{year} {make} {model}",
            "mileage": mileage,
            "base_market_value": base_market_val,
            "itemized_deductions": deduction_breakdown,
            "total_recond_cost": recond_deductions,
            "acv": round(acv, 2),
            "payoff_amount": payoff_amount,
            "net_trade_equity": round(net_equity, 2)
        }


# ==============================================================================
# 3. THREE-BANK F&I OPTIMIZATION MATRIX
# ==============================================================================
class ThreeBankFIMatrix:
    """
    Evaluates three competing lender approval offers to select the structure
    that yields maximum backend profit (PVR) while respecting commitment limits.
    """
    @staticmethod
    def evaluate_bank_matrix(customer_credit_tier: str, total_otd_amount: float, target_monthly_pmt: float) -> Dict:
        logger.info(f"[F&I Manager Agent] Submitting deal jacket to 3 competing lender APIs...")
        
        # Bank A: Conservative Rate Spread, Zero Backend Product Cap
        bank_a = {
            "bank_name": "Bank A (Conservative Capital)",
            "approval_status": "APPROVED",
            "buy_rate": 5.00,
            "sell_rate": 7.00,
            "front_end_cut_required": 0.0,
            "max_backend_product_allowance": 0.0,
            "allowed_products": []
        }
        
        # Bank B: Moderate Rate Spread, Moderate Backend Product Cap
        bank_b = {
            "bank_name": "Bank B (Regional Prime)",
            "approval_status": "APPROVED",
            "buy_rate": 4.50,
            "sell_rate": 6.50,
            "front_end_cut_required": 0.0,
            "max_backend_product_allowance": 3000.0,
            "allowed_products": ["VSC", "GAP"]
        }

        # Bank C: High Backend Cap ($5,000), Requires $1,000 Front-End Discount
        bank_c = {
            "bank_name": "Bank C (High-Gross National)",
            "approval_status": "APPROVED",
            "buy_rate": 4.00,
            "sell_rate": 6.00,
            "front_end_cut_required": 1000.0,
            "max_backend_product_allowance": 5000.0,
            "allowed_products": ["VSC", "GAP", "Tire_and_Wheel", "Prepaid_Maintenance"]
        }

        lender_matrix = [bank_a, bank_b, bank_c]
        
        # Evaluate Profit Yield for Each Lender
        evaluated_results = []
        for bank in lender_matrix:
            spread_profit = (bank["sell_rate"] - bank["buy_rate"]) * (total_otd_amount / 100) * 1.5
            backend_product_profit = bank["max_backend_product_allowance"]
            front_discount_cost = bank["front_end_cut_required"]
            
            total_net_pvr = (spread_profit + backend_product_profit) - front_discount_cost
            
            evaluated_results.append({
                "bank": bank,
                "spread_profit": round(spread_profit, 2),
                "backend_product_profit": round(backend_product_profit, 2),
                "net_pvr_gross": round(total_net_pvr, 2)
            })

        # Select Maximum Profit Lender
        winning_option = max(evaluated_results, key=lambda x: x["net_pvr_gross"])
        logger.info(f"[F&I Manager Agent] WINNING LENDER: {winning_option['bank']['bank_name']} | Projected Net PVR: \${winning_option['net_pvr_gross']:,.2f}")
        return winning_option


# ==============================================================================
# 4. NIMBUS iQ MULTI-AGENT ORCHESTRATOR & RECURSIVE LOOP
# ==============================================================================
class NimbusIQDealOrchestrator:
    def __init__(self, session_id: str, customer_name: str, phone: str):
        self.memory = AgentMemoryState(session_id=session_id, customer_name=customer_name, phone_number=phone)

    async def execute_deal_workflow(self, target_vehicle_price: float, trade_details: Dict):
        print("\\n" + "=" * 90)
        print("NIMBUS iQ ENTERPRISE AI: AUTONOMOUS DEALERSHIP OPERATIONAL SIMULATOR")
        print("=" * 90 + "\\n")

        # Step 1: Receptionist / Lead Assignment (House Game Protocol)
        self.memory.log_interaction("Desk Manager (Preston Beard)", "Received inbound lead. Executing 'House Game' lead routing...")
        assigned_salesperson = "Mark Gonzales"  # Assigned top closer
        self.memory.log_interaction("Desk Manager (Preston Beard)", f"Assigned high-intent lead to senior closer: {assigned_salesperson}")

        # Step 2: Trade Appraisal Execution
        appraisal = TradeAppraisalEngine.appraise_trade(
            vin=trade_details["vin"],
            year=trade_details["year"],
            make=trade_details["make"],
            model=trade_details["model"],
            mileage=trade_details["mileage"],
            reported_flaws=trade_details["flaws"],
            payoff_amount=trade_details["payoff"]
        )
        self.memory.log_interaction("Appraiser Agent", f"Trade Appraisal Complete. Net Equity: \${appraisal['net_trade_equity']:,.2f}")

        # Step 3: Four-Square Desking & Recursive Negotiation Loop
        net_price = target_vehicle_price - appraisal["net_trade_equity"]
        self.memory.customer_target_down = 500.0
        self.memory.customer_target_monthly = 400.0

        print("\\n--- INITIATING RECURSIVE DESK NEGOTIATION LOOP ---")
        while self.memory.increment_loop():
            loop_num = self.memory.negotiation_attempts
            logger.info(f"\\n--- [RECURSIVE LOOP TURN #{loop_num}] ---")
            
            # First pencil presentation
            if loop_num == 1:
                quoted_down = 3000.0
                quoted_monthly = 650.0
                self.memory.log_interaction(assigned_salesperson, f"Pencil #1 Presented: \${quoted_down:,.0f} Down | \${quoted_monthly:,.0f}/mo")
                self.memory.log_interaction("Customer Agent", "Payment Shock! 'Way too high. I said $500 down and $400/mo max!'")
            
            # Manager re-desk & pressure
            elif loop_num == 2:
                self.memory.log_interaction("Desk Manager (Preston Beard)", "Re-desking... 'Mark, go get a hard commitment. Close them or you don't feed your kids!'")
                quoted_down = 1500.0
                quoted_monthly = 520.0
                self.memory.log_interaction(assigned_salesperson, f"Pencil #2 Presented: \${quoted_down:,.0f} Down | \${quoted_monthly:,.0f}/mo")
                self.memory.log_interaction("Customer Agent", "Still resisting: 'I'll buy right now if you can do $500 down and $450/month!'")
            
            # Commitment Sign Line Execution
            else:
                self.memory.log_interaction(assigned_salesperson, "Executing Hard Commitment Close: 'Sign right here: I WILL BUY NOW if we do $500 down and $450/mo!'")
                self.memory.commitment_signed = True
                self.memory.log_interaction("Customer Agent", "SIGNED COMMITMENT SHEET.")
                break

        # Step 4: F&I Office 3-Bank Matrix Decision
        print("\\n--- TRANSITIONING TO F&I OFFICE (3-BANK MATRIX OPTIMIZATION) ---")
        f_and_i_winner = ThreeBankFIMatrix.evaluate_bank_matrix(
            customer_credit_tier="Tier 1 Super Prime",
            total_otd_amount=net_price,
            target_monthly_pmt=450.0
        )

        # Step 5: Business Office Post-Sale Bank Re-Negotiation
        print("\\n--- BUSINESS OFFICE POST-SALE RE-NEGOTIATION ---")
        logger.info("[Business Office Agent] Auditing POI and stability stips...")
        logger.info(f"[Business Office Agent] Re-negotiating buy rate with {f_and_i_winner['bank']['bank_name']} from {f_and_i_winner['bank']['buy_rate']}% to 3.50% APR...")
        
        added_spread_gross = 750.0
        final_pvr = f_and_i_winner['net_pvr_gross'] + added_spread_gross

        print("\\n" + "=" * 90)
        print("FINAL DEAL EXECUTION SUMMARY (NIMBUS iQ ECOSYSTEM)")
        print("=" * 90)
        print(f"Customer: {self.memory.customer_name} | Assigned Rep: {assigned_salesperson}")
        print(f"Trade Vehicle: {appraisal['trade_vehicle']} | ACV: \${appraisal['acv']:,.2f} | Net Equity: \${appraisal['net_trade_equity']:,.2f}")
        print(f"Commitment Status: SIGNED (\${self.memory.customer_target_down:,.0f} Down | $450/mo)")
        print(f"Selected Lender: {f_and_i_winner['bank']['bank_name']}")
        print(f"Final Backend PVR Gross: \${final_pvr:,.2f}")
        print("=" * 90 + "\\n")


if __name__ == "__main__":
    orchestrator = NimbusIQDealOrchestrator(
        session_id="NIMBUS-SESSION-99482",
        customer_name="John Doe",
        phone="(214) 555-0199"
    )
    
    trade_data = {
        "vin": "VIN_TRADE_2018_CAMRY",
        "year": 2018,
        "make": "Toyota",
        "model": "Camry SE",
        "mileage": 72000,
        "flaws": ["Front dent", "Worn rear tires", "Interior detail needed"],
        "payoff": 8500.0
    }
    
    asyncio.run(orchestrator.execute_deal_workflow(target_vehicle_price=28755.0, trade_details=trade_data))
`;
