"""
VARUNA — Tax Intelligence & Non-Filer Tracking Engine (CBDT / FIU-IND)
=======================================================================
Tracks high-velocity banking throughput against Income Tax Returns (ITR),
detects CBDT Section 206AB Non-Filers, identifies SFT (Specified Financial
Transactions) structuring/smurfing under Rule 114E, flags Benami/inoperative
PAN networks, and generates statutory enforcement notices (Sec 133(6) / 148A)
and provisional attachments (Sec 281B).
"""
from __future__ import annotations

import hashlib
import random
from datetime import datetime, timezone
from typing import Any

from app.models.schemas import Transaction
from app.services.state import demo_state


# Cache / store for issued statutory notices and provisional attachments
_ISSUED_NOTICES: list[dict[str, Any]] = []
_ATTACHED_ACCOUNTS: dict[str, dict[str, Any]] = {}


def _generate_deterministic_pan(account_id: str, is_business: bool = False) -> str:
    """Generate a consistent, realistic Indian PAN from account ID."""
    h = hashlib.sha256(account_id.encode()).hexdigest().upper()
    prefix_letters = "ABCP" if not is_business else "ABCFC"
    first_three = "".join([chr(65 + (int(h[i:i+2], 16) % 26)) for i in range(0, 6, 2)])
    fourth = "C" if is_business else "P"
    fifth = chr(65 + (int(h[6:8], 16) % 26))
    digits = f"{(int(h[8:14], 16) % 9000) + 1000:04d}"
    last_letter = chr(65 + (int(h[14:16], 16) % 26))
    return f"{first_three[:3]}{fourth}{fifth}{digits}{last_letter}"


def _get_entity_name(account_id: str, node_type: str, bank: str) -> tuple[str, str]:
    """Return realistic name and entity category based on account type."""
    h = int(hashlib.md5(account_id.encode()).hexdigest(), 16)
    first_names = ["Rajesh", "Vikram", "Sunil", "Amit", "Pooja", "Anil", "Deepak", "Suresh", "Manoj", "Kavita", "Ramesh", "Praveen", "Ashok", "Gaurav"]
    last_names = ["Sharma", "Verma", "Gupta", "Mehta", "Patel", "Singh", "Reddy", "Choudhary", "Jain", "Bansal", "Aggarwal", "Kulkarni"]
    enterprises = ["Apex Digital Solutions", "Zenith Logistics LLP", "BlueDart Allied Traders", "Sri Balaji Micro Enterprises", "Om Sai Forex & Bullion", "Nexus Global Retail", "Greenfield Agro Tradelink", "Vardhman Commodities"]
    
    if node_type == "sink" or "SINK" in account_id:
        return enterprises[h % len(enterprises)], "Shell Enterprise / Merchant"
    elif node_type == "mule" or "MULE" in account_id:
        # 30% proprietary firm / shell, 70% individual
        if h % 3 == 0:
            return f"{enterprises[h % len(enterprises)]} (Prop: {first_names[h % len(first_names)]} {last_names[(h + 1) % len(last_names)]})", "Proprietary Firm / Mule"
        return f"{first_names[h % len(first_names)]} {last_names[(h + 2) % len(last_names)]}", "Individual (Suspected Mule)"
    elif node_type == "victim" or "VICTIM" in account_id:
        return f"{first_names[h % len(first_names)]} {last_names[(h + 3) % len(last_names)]}", "Individual (Salaried / Genuine)"
    else:
        return f"{first_names[h % len(first_names)]} {last_names[(h + 4) % len(last_names)]}", "Individual / Trading Account"


def compute_account_tax_profile(account_id: str, node_info: dict | None = None) -> dict[str, Any]:
    """Compute detailed tax compliance, SFT structuring, and evasion risk for an account."""
    transactions: list[Transaction] = demo_state.transactions
    nodes = demo_state.nodes
    
    # Locate node object
    node = None
    for n in nodes:
        if (hasattr(n, "id") and n.id == account_id) or (isinstance(n, dict) and n.get("id") == account_id):
            node = n
            break
            
    node_type = getattr(node, "node_type", "mule") if node else "mule"
    bank = getattr(node, "bank", "Unknown Bank") if node else "Unknown Bank"
    balance = getattr(node, "balance", 0.0) if node else 0.0
    status = getattr(node, "status", "active") if node else "active"
    
    # Calculate transaction stats
    inflows = [tx.amount for tx in transactions if tx.to_account == account_id]
    outflows = [tx.amount for tx in transactions if tx.from_account == account_id]
    total_inflow = sum(inflows)
    total_outflow = sum(outflows)
    txn_count = len(inflows) + len(outflows)
    
    # Deterministic seed based on account_id
    seed = int(hashlib.sha256(account_id.encode()).hexdigest()[:8], 16)
    
    # Calculate SFT Structuring (deposits in 45k-49.9k or 90k-99.9k ranges)
    sub_50k_smurfing = [amt for amt in inflows if 45000 <= amt < 50000]
    sub_100k_smurfing = [amt for amt in inflows if 90000 <= amt < 100000]
    structuring_hits = len(sub_50k_smurfing) + len(sub_100k_smurfing)
    
    # Annualized Banking Turnover (scaling sample window to full assessment year)
    turnover_multiplier = 4.5 + (seed % 30) / 10.0
    annualized_turnover = round(max(total_inflow * turnover_multiplier, 150000.0), 2)
    
    is_sink = "sink" in node_type.lower() or "SINK" in account_id
    is_mule = "mule" in node_type.lower() or "MULE" in account_id
    is_victim = "victim" in node_type.lower() or "VICTIM" in account_id
    
    entity_name, entity_type = _get_entity_name(account_id, node_type, bank)
    pan = _generate_deterministic_pan(account_id, is_business=(is_sink or "Firm" in entity_type))
    
    # PAN status logic
    if is_victim:
        pan_status = "LINKED_VERIFIED"
        itr_status = "COMPLIANT_FILER"
        declared_income = round(annualized_turnover * (0.35 + (seed % 20) / 100.0), 2)
        last_filing_ay = "AY 2025-26"
        itr_form = "ITR-1 (Sahaj)"
        non_filer_years = 0
        gstin = "N/A (Salaried Individual)"
    elif is_sink:
        pan_status = "SYNTHETIC_BENAMI" if (seed % 2 == 0) else "UNLINKED_INOPERATIVE"
        itr_status = "NON_FILER"
        declared_income = 0.0
        last_filing_ay = "Never Filed"
        itr_form = "N/A"
        non_filer_years = 3
        gstin = f"27{pan[2:7]}1892{chr(65 + seed % 26)}1Z{seed % 9}"
    elif is_mule:
        scenario_variant = seed % 4
        if scenario_variant == 0:
            pan_status = "UNLINKED_INOPERATIVE"  # Sec 139AAA violation
            itr_status = "NON_FILER"
            declared_income = 0.0
            last_filing_ay = "Never Filed"
            itr_form = "N/A"
            non_filer_years = 2
            gstin = "N/A (Unregistered Sole Prop)"
        elif scenario_variant == 1:
            pan_status = "LINKED_VERIFIED"
            itr_status = "GROSS_UNDER_REPORTER"
            # Declares ₹2.5L - ₹3.5L income while bank moves ₹60L - ₹2Cr
            declared_income = round(250000.0 + (seed % 100) * 1000.0, 2)
            last_filing_ay = "AY 2024-25"
            itr_form = "ITR-4 (Sugam - Presumptive)"
            non_filer_years = 1
            gstin = f"07{pan[2:7]}4531{chr(65 + seed % 26)}1Z{seed % 9}"
        elif scenario_variant == 2:
            pan_status = "SYNTHETIC_BENAMI"
            itr_status = "DEFECTIVE_FILER"
            declared_income = round(180000.0 + (seed % 50) * 1000.0, 2)
            last_filing_ay = "AY 2023-24"
            itr_form = "ITR-3"
            non_filer_years = 2
            gstin = "N/A (Defective GSTIN Suspended)"
        else:
            pan_status = "NO_PAN_DECLARED"  # Form 60 abuse
            itr_status = "NON_FILER"
            declared_income = 0.0
            last_filing_ay = "Never Filed"
            itr_form = "N/A"
            non_filer_years = 3
            gstin = "N/A"
    else:
        pan_status = "LINKED_VERIFIED"
        itr_status = "COMPLIANT_FILER"
        declared_income = round(annualized_turnover * 0.4, 2)
        last_filing_ay = "AY 2025-26"
        itr_form = "ITR-2"
        non_filer_years = 0
        gstin = "N/A"

    # Compute Disparity Ratio (Annual Inflow / Declared Income)
    if declared_income > 0:
        disparity_ratio = round(annualized_turnover / declared_income, 1)
    else:
        disparity_ratio = round(annualized_turnover / 50000.0, 1) if annualized_turnover > 0 else 1.0

    # Tax Evasion Risk (TER) Score (0 - 100)
    ter_score = 0.0
    ter_factors: list[str] = []

    # 1. Non-Filer / Under-reporting factor (up to 40 pts)
    if itr_status == "NON_FILER":
        ter_score += 40.0
        ter_factors.append(f"CBDT Sec 206AB Non-Filer: Zero ITR filed for {non_filer_years} consecutive years despite high volume")
    elif itr_status == "GROSS_UNDER_REPORTER":
        ter_score += 32.0
        ter_factors.append(f"Severe Turnover-to-Income Disparity: Banking inflow is {disparity_ratio}x higher than declared ITR income")
    elif itr_status == "DEFECTIVE_FILER":
        ter_score += 25.0
        ter_factors.append("Defective Return under Section 139(9): Inflows suppressed from audited schedules")
    else:
        ter_score += 5.0

    # 2. SFT Structuring / Smurfing factor (up to 25 pts)
    if structuring_hits >= 2 or len(sub_50k_smurfing) > 0:
        smurf_pts = min(25.0, 10.0 + structuring_hits * 5.0)
        ter_score += smurf_pts
        ter_factors.append(f"SFT Structuring detected: {len(sub_50k_smurfing)} transactions positioned just below ₹50,000 PAN mandate")
    elif annualized_turnover > 1000000.0:  # > 10 Lakhs aggregate
        ter_score += 10.0
        ter_factors.append("Exceeds Rule 114E SFT Annual Bank Reporting Threshold (₹10 Lakhs)")

    # 3. PAN Integrity & Benami factor (up to 20 pts)
    if pan_status == "SYNTHETIC_BENAMI":
        ter_score += 20.0
        ter_factors.append("Benami / Synthetic PAN: Stolen identity used as intermediary tax shield")
    elif pan_status == "UNLINKED_INOPERATIVE":
        ter_score += 15.0
        ter_factors.append("Inoperative PAN (Sec 139AAA): PAN not seeded with Aadhaar, higher TDS applies")
    elif pan_status == "NO_PAN_DECLARED":
        ter_score += 18.0
        ter_factors.append("Form 60 Abuse: High throughput operated without PAN disclosure")

    # 4. Rapid Dissipation / Cash Conversion (up to 15 pts)
    if total_inflow > 0 and (total_outflow / total_inflow) > 0.85:
        ter_score += 15.0
        ter_factors.append("Rapid Wash-Out: Over 85% credits immediately drained, preventing statutory lien attachment")

    ter_score = round(min(100.0, max(5.0, ter_score)), 1)

    # Estimate Unexplained Cash Credits under Section 68 / 69A & Tax Liability @ 78% (Sec 115BBE)
    if itr_status in ("NON_FILER", "GROSS_UNDER_REPORTER", "DEFECTIVE_FILER"):
        unexplained_amount = max(0.0, annualized_turnover - declared_income)
    else:
        unexplained_amount = 0.0
        
    tax_liability_sec_115bbe = round(unexplained_amount * 0.78, 2)  # 60% tax + 25% surcharge + 4% cess + penalty u/s 271AAC

    # Check statutory notice & attachment status
    account_notices = [n for n in _ISSUED_NOTICES if n["account_id"] == account_id]
    attachment_record = _ATTACHED_ACCOUNTS.get(account_id)

    return {
        "account_id": account_id,
        "entity_name": entity_name,
        "entity_type": entity_type,
        "bank": bank,
        "node_type": node_type,
        "balance": balance,
        "pan": pan,
        "pan_status": pan_status,
        "gstin": gstin,
        "itr_status": itr_status,
        "declared_income": declared_income,
        "annualized_turnover": annualized_turnover,
        "observed_inflow": round(total_inflow, 2),
        "observed_outflow": round(total_outflow, 2),
        "disparity_ratio": disparity_ratio,
        "non_filer_years": non_filer_years,
        "last_filing_ay": last_filing_ay,
        "itr_form": itr_form,
        "structuring_hits": structuring_hits,
        "sub_50k_count": len(sub_50k_smurfing),
        "sub_100k_count": len(sub_100k_smurfing),
        "unexplained_amount": unexplained_amount,
        "potential_tax_liability": tax_liability_sec_115bbe,
        "ter_score": ter_score,
        "ter_factors": ter_factors,
        "notices_issued": account_notices,
        "is_attached": attachment_record is not None or status == "frozen",
        "attachment_record": attachment_record,
    }


def _node_id(node: Any) -> str:
    if hasattr(node, "id"):
        return getattr(node, "id")
    if isinstance(node, dict):
        return node.get("id", "")
    return str(node)


def get_tax_intelligence_overview() -> dict[str, Any]:
    """Calculate aggregate national tax intelligence and non-filer statistics."""
    nodes = demo_state.nodes
    profiles = [compute_account_tax_profile(_node_id(n)) for n in nodes]
    
    total_accounts = len(profiles)
    non_filers = [p for p in profiles if p["itr_status"] == "NON_FILER"]
    under_reporters = [p for p in profiles if p["itr_status"] == "GROSS_UNDER_REPORTER"]
    sft_structurers = [p for p in profiles if p["structuring_hits"] > 0]
    benami_pan_accounts = [p for p in profiles if p["pan_status"] in ("SYNTHETIC_BENAMI", "UNLINKED_INOPERATIVE", "NO_PAN_DECLARED")]
    attached_count = len([p for p in profiles if p["is_attached"]])
    
    total_unreported_turnover = sum(p["unexplained_amount"] for p in profiles)
    total_potential_recovery = sum(p["potential_tax_liability"] for p in profiles)
    avg_ter_score = round(sum(p["ter_score"] for p in profiles) / max(1, total_accounts), 1)

    return {
        "total_accounts_monitored": total_accounts,
        "critical_non_filers_count": len(non_filers),
        "gross_under_reporters_count": len(under_reporters),
        "sft_structuring_clusters": len(sft_structurers),
        "benami_or_inoperative_pans": len(benami_pan_accounts),
        "statutory_attachments_active": attached_count,
        "total_unreported_turnover": round(total_unreported_turnover, 2),
        "potential_tax_recovery_sec_115bbe": round(total_potential_recovery, 2),
        "average_tax_evasion_risk": avg_ter_score,
        "cbdt_compliance_window": "Assessment Years 2024-25 & 2025-26",
        "active_statutory_frameworks": [
            "CBDT Section 206AB (Higher TDS for Non-Filers)",
            "Income Tax Rule 114E (SFT Annual Information Statement)",
            "Section 68 / 69A (Unexplained Cash Credits)",
            "Section 115BBE (Special 78% Tax Rate + Penalty)",
            "Section 281B (Provisional Bank Account Attachment)"
        ]
    }


def get_tax_registry(
    filter_type: str = "all",
    search: str = "",
    min_ter_score: float = 0.0,
    limit: int = 100
) -> list[dict[str, Any]]:
    """Return filtered, sorted tax registry of monitored financial accounts."""
    nodes = demo_state.nodes
    profiles = [compute_account_tax_profile(_node_id(n)) for n in nodes]
    
    filtered: list[dict[str, Any]] = []
    search_lower = search.strip().lower()
    
    for p in profiles:
        # Score filter
        if p["ter_score"] < min_ter_score:
            continue
            
        # Text search
        if search_lower:
            match = (
                search_lower in p["account_id"].lower()
                or search_lower in p["entity_name"].lower()
                or search_lower in p["pan"].lower()
                or search_lower in p["bank"].lower()
                or search_lower in p["entity_type"].lower()
            )
            if not match:
                continue
                
        # Category filter
        if filter_type == "non_filer" and p["itr_status"] != "NON_FILER":
            continue
        elif filter_type == "under_reporter" and p["itr_status"] != "GROSS_UNDER_REPORTER":
            continue
        elif filter_type == "structuring" and p["structuring_hits"] == 0:
            continue
        elif filter_type == "benami_pan" and p["pan_status"] not in ("SYNTHETIC_BENAMI", "UNLINKED_INOPERATIVE", "NO_PAN_DECLARED"):
            continue
        elif filter_type == "attached" and not p["is_attached"]:
            continue
            
        filtered.append(p)
        
    # Sort descending by TER score, then unexplained amount
    filtered.sort(key=lambda x: (x["ter_score"], x["unexplained_amount"]), reverse=True)
    return filtered[:limit]


def issue_statutory_tax_notice(account_id: str, notice_type: str, grounds: str | None = None) -> dict[str, Any]:
    """Simulate issuing a formal CBDT inquiry or reassessment notice."""
    profile = compute_account_tax_profile(account_id)
    now = datetime.now(timezone.utc)
    timestamp_str = now.isoformat()
    
    din_hash = hashlib.sha256(f"{account_id}-{notice_type}-{timestamp_str}".encode()).hexdigest().upper()[:16]
    din = f"DIN-ITD-2026-{din_hash}"
    
    notice_titles = {
        "sec_133_6": "Notice for Inquiry Before Assessment (Section 133(6))",
        "sec_148a": "Show Cause Notice for Escaped Assessment (Section 148A(b))",
        "sec_142_1": "Notice for Production of Accounts & Documents (Section 142(1))",
        "fiu_str": "FIU-IND Suspicious Transaction Report (STR-E-Filing)"
    }
    
    title = notice_titles.get(notice_type, f"Statutory Notice ({notice_type})")
    
    notice_record = {
        "notice_id": f"NOT-{len(_ISSUED_NOTICES) + 1:04d}",
        "din": din,
        "account_id": account_id,
        "entity_name": profile["entity_name"],
        "pan": profile["pan"],
        "notice_type": notice_type,
        "title": title,
        "issued_at": timestamp_str,
        "compliance_deadline_days": 15,
        "unexplained_amount": profile["unexplained_amount"],
        "tax_demand_estimated": profile["potential_tax_liability"],
        "grounds": grounds or f"Failure to declare high-velocity throughput of ₹{profile['annualized_turnover']:,.0f} across {profile['bank']}. Primary grounds: {'; '.join(profile['ter_factors'][:2])}",
        "status": "DISPATCHED_TO_PORTAL"
    }
    
    _ISSUED_NOTICES.insert(0, notice_record)
    return notice_record


def apply_provisional_tax_attachment(account_id: str, reason: str | None = None) -> dict[str, Any]:
    """Issue Section 281B provisional attachment order and freeze account in demo state."""
    profile = compute_account_tax_profile(account_id)
    now = datetime.now(timezone.utc)
    order_id = f"ATT-281B-{len(_ATTACHED_ACCOUNTS) + 1:03d}"
    
    attachment_record = {
        "order_id": order_id,
        "account_id": account_id,
        "pan": profile["pan"],
        "bank": profile["bank"],
        "attached_at": now.isoformat(),
        "secured_amount": profile["balance"],
        "tax_lien_amount": profile["potential_tax_liability"],
        "statutory_section": "Section 281B, Income Tax Act 1961",
        "reason": reason or f"Provisional attachment to protect government revenue pending Section 148 reassessment for unexplained throughput of ₹{profile['annualized_turnover']:,.0f}.",
        "status": "PROVISIONALLY_ATTACHED"
    }
    
    _ATTACHED_ACCOUNTS[account_id] = attachment_record
    
    # Trigger account freeze in demo state
    demo_state.freeze_account(account_id)
    
    return attachment_record
