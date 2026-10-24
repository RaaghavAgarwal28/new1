# Product Requirements Document (PRD)
## Project: VARUNA TaxWatch — AI-Powered Tax Evasion & Non-Filer Intelligence Engine

---

### Executive Summary
**VARUNA TaxWatch** is an enterprise-grade intelligence and enforcement module built for financial crime investigators, the Central Board of Direct Taxes (CBDT), the Financial Intelligence Unit (FIU-IND), and collaborating commercial banks. 

While conventional anti-money-laundering (AML) platforms track illicit fund movements in isolation, **TaxWatch bridges banking transaction velocity with Income Tax Return (ITR) filings and statutory compliance records**. It detects syndicates and individuals moving hundreds of crores through mule and shell accounts while evading tax obligations, structuring deposits to evade reporting thresholds, or operating under dormant/benami PAN identities.

---

## 1. Problem Statement & Market Need

1. **Information Asymmetry Between Regulators & Financial Institutions**:
   - Banks monitor transaction alerts (SAR/STR) while tax authorities audit annual ITRs after a 12–18 month lag.
   - Money mule syndicates and hawala operators abuse this lag by washing crores through zero-balance or low-tier savings accounts and abandoning them before the assessment cycle begins.

2. **CBDT Section 206AB Non-Filer Exploitation**:
   - Accounts receiving substantial commercial inflows frequently belong to individuals who have not filed income tax returns for multiple consecutive assessment years.
   - Without unified velocity tracking, higher withholding tax (TDS) under Section 206AB cannot be automatically enforced.

3. **Rule 114E Specified Financial Transaction (SFT) Structuring (Smurfing)**:
   - Syndicates intentionally split large transfers into batches of ₹45,000–₹49,999 or ₹90,000–₹99,999 to circumvent mandatory PAN quote requirements (Rule 114B) and bank SFT reporting triggers (Rule 114E).

4. **Revenue Loss & Inability to Secure Escaped Tax**:
   - By the time tax evasion is identified through traditional audits, funds have already been dissipated. There is no rapid-response mechanism to provisionally attach balances under Section 281B of the Income Tax Act before accounts are drained.

---

## 2. Product Objectives & Key Results (OKRs)

- **Objective 1**: Automatically reconcile live banking turnover against declared tax filings to detect non-filers and gross under-reporters.
  - *KR 1.1*: Compute an automated **Disparity Ratio** (Annual Bank Inflow vs. Declared Income) in real-time across the transaction graph.
  - *KR 1.2*: Compute **Section 115BBE Tax Liability** (78% effective rate: 60% flat + 25% surcharge + 4% cess) on unexplained cash credits.

- **Objective 2**: Uncover transaction structuring / smurfing attempts designed to bypass reporting thresholds.
  - *KR 2.1*: Flag all recurring inflows clustered below the ₹50,000 and ₹1,00,000 thresholds within a sliding temporal window.

- **Objective 3**: Empower investigators with immediate statutory enforcement tools.
  - *KR 3.1*: Generate automated CBDT Document Identification Number (DIN)-compliant notices under **Section 133(6)**, **Section 148A**, and **FIU-IND STR**.
  - *KR 3.2*: Provide a 1-click **Section 281B Provisional Attachment Order** that freezes bank balances directly inside the platform.

---

## 3. Statutory & Regulatory Alignment (Indian Legal Framework)

| Statutory Provision | Legislation | Function in VARUNA TaxWatch |
| :--- | :--- | :--- |
| **Section 206AB** | Income Tax Act, 1961 | Flags high-velocity accounts with no ITR filed for 1+ years; recommends double TDS/TCS deduction. |
| **Section 68 / 69A** | Income Tax Act, 1961 | Treats unexplained banking inflows as undisclosed taxable income. |
| **Section 115BBE** | Income Tax Act, 1961 | Automatically calculates punitive 78% tax liability on unexplained credits. |
| **Rule 114E (SFT)** | Income Tax Rules, 1962 | Monitors aggregate annual deposits exceeding ₹10 Lakhs (savings) and ₹50 Lakhs (current). |
| **Rule 114B** | Income Tax Rules, 1962 | Detects transactions deliberately sized below ₹50,000 to avoid mandatory PAN verification. |
| **Section 133(6)** | Income Tax Act, 1961 | Generates official investigative notices calling for transaction explanations and source of funds. |
| **Section 148A** | Income Tax Act, 1961 | Issues Show Cause Notices before reopening escaped tax assessments. |
| **Section 281B** | Income Tax Act, 1961 | Orders provisional attachment of bank accounts to prevent fund dissipation during inquiry. |
| **Section 139AAA** | Income Tax Act, 1961 | Detects inoperative / unlinked PAN-Aadhaar accounts used as mule tax shields. |

---

## 4. Key Features & Functional Specifications

### 4.1. Tax Intelligence Overview Dashboard
- **Aggregate KPIs**:
  - Total Potential Tax Evasion Exposure (₹ Cr)
  - CBDT Section 206AB Non-Filers Count
  - SFT Structuring / Smurfing Anomaly Count
  - Active Section 281B Provisional Attachments
- **National Overview Feed**: Summarizes high-level risk distribution across all tracked banking nodes.

### 4.2. Tax Evasion Risk (TER) Scoring Model (0–100)
A multi-factor heuristic model that calculates risk based on four weighted dimensions:
1. **ITR Compliance & Disparity Factor (Max 40 pts)**:
   - `NON_FILER`: +40 pts (Zero ITR filed despite high banking turnover)
   - `GROSS_UNDER_REPORTER`: +32 pts (Turnover-to-Income Disparity > 10x)
   - `DEFECTIVE_FILER`: +25 pts (Inflows omitted from audited schedules under Sec 139(9))
2. **SFT Structuring / Smurfing Factor (Max 25 pts)**:
   - Recurring deposits in ₹45,000–₹49,999 range: +5 pts per hit (capped at 25)
   - Aggregate turnover exceeding Rule 114E threshold (₹10L/₹50L): +10 pts
3. **PAN Integrity & Benami Factor (Max 20 pts)**:
   - `SYNTHETIC_BENAMI`: +20 pts (Stolen identity used as tax intermediary)
   - `NO_PAN_DECLARED` (Form 60 Abuse): +18 pts
   - `UNLINKED_INOPERATIVE` (Sec 139AAA): +15 pts
4. **Velocity & Dissipation Factor (Max 15 pts)**:
   - Outflow / Inflow ratio > 85% within rapid window: +15 pts (prevents statutory recovery)

### 4.3. Interactive Entity Registry & Filter System
- Filter tabs:
  - **All Evaluated Accounts**
  - **CBDT Non-Filers** (`NON_FILER`)
  - **Gross Under-Reporters** (`GROSS_UNDER_REPORTER`)
  - **SFT Structuring** (`structuring_hits > 0`)
  - **Benami / Defective PAN** (`SYNTHETIC_BENAMI` / `UNLINKED_INOPERATIVE`)
  - **Provisionally Attached** (`attached`)
- Live search by Account ID, Holder Name, PAN, or Bank.

### 4.4. Deep Forensic Tax Dossier
Clicking any account opens a comprehensive investigative dossier:
- **Tax Profile Summary**: Entity Category, Declared Annual Income vs. Annualized Inflows, Disparity Multiplier.
- **Statutory Tax Exposure**: Computation of Section 115BBE liability with surcharge and cess breakdown.
- **Risk Breakdown Checklist**: Every triggered statutory violation highlighted with exact legal citations.
- **Transaction Radar Chart**: Visualizes velocity, structuring density, and turnover disparity.

### 4.5. Statutory Enforcement Engine
- **Notice Issuance**:
  - Supports **Section 133(6)** (Inquiry Summons), **Section 148A** (Escaped Assessment), **Section 142(1)** (Accounts Calling), and **FIU-IND STR**.
  - Generates a valid 16-character CBDT Document Identification Number (DIN) (e.g. `DIN-2026-ITD-XXXXXXXXX`) with timestamp and compliance deadlines.
- **Section 281B Provisional Attachment**:
  - One-click freeze action that marks the account as attached and synchronizes with VARUNA’s core network freeze engine.

---

## 5. Technical Architecture & Endpoints

### 5.1. Backend Service (`backend/app/services/tax_intelligence.py`)
- In-memory intelligence engine operating on the unified live graph state (`demo_state.transactions`, `demo_state.nodes`).
- Deterministic PAN generation and tax profiling algorithms ensure idempotent testing.

### 5.2. API Endpoints (`backend/app/api/tax_routes.py`)
- `GET /tax/overview`: Aggregate evasion metrics and statutory statistics.
- `GET /tax/registry`: Filterable and searchable registry of accounts with TER scores.
- `GET /tax/dossier/{account_id}`: Granular tax compliance profile and 115BBE calculations.
- `POST /tax/issue-notice`: Generates and logs statutory notice under CBDT DIN.
- `POST /tax/attach/{account_id}`: Issues Section 281B provisional attachment order.
- `GET /tax/notices`: Audit log of all issued statutory notices.

### 5.3. Frontend Implementation (`frontend/src/components/panels/TaxIntelligencePanel.jsx`)
- Built with React, Tailwind CSS, Lucide icons, and Recharts.
- Seamlessly integrated into `App.jsx` as the **Tax Intelligence** top-level navigation module.

---

## 6. Success Metrics & Future Roadmap

| Metric | Target |
| :--- | :--- |
| False Positive Rate on Non-Filer Alerts | < 5% |
| Structuring Detection Recall (Rule 114E) | > 92% |
| Time from Detection to Section 281B Attachment | < 60 seconds |
| API Response Latency (Registry Query) | < 80ms |

### Future Phases:
- **Phase 2**: Real-time integration with CBDT Insight Portal and GSTN E-Way Bill APIs.
- **Phase 3**: Automated graph-based Benami property and shell-company beneficial ownership unmasking using Graph Attention Networks (GAT).
