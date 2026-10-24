"""
VARUNA — Tax Intelligence API Routes
======================================
Endpoints for CBDT/FIU-IND Tax Evasion, Non-Filer Registry,
SFT Structuring Intelligence, and Statutory Enforcement.
"""
from __future__ import annotations

from typing import Literal
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from app.services.tax_intelligence import (
    get_tax_intelligence_overview,
    get_tax_registry,
    compute_account_tax_profile,
    issue_statutory_tax_notice,
    apply_provisional_tax_attachment,
    _ISSUED_NOTICES
)

tax_router = APIRouter(prefix="/tax", tags=["Tax Intelligence"])


class IssueNoticeRequest(BaseModel):
    account_id: str
    notice_type: Literal["sec_133_6", "sec_148a", "sec_142_1", "fiu_str"] = "sec_133_6"
    grounds: str | None = None


class AttachAccountRequest(BaseModel):
    account_id: str
    reason: str | None = None


@tax_router.get("/overview")
def get_overview():
    """National overview of tax non-filers, SFT structuring, and potential tax liabilities."""
    return get_tax_intelligence_overview()


@tax_router.get("/registry")
def get_registry(
    filter_type: str = Query("all", description="all | non_filer | under_reporter | structuring | benami_pan | attached"),
    search: str = Query("", description="Account ID, Name, PAN, or Bank search term"),
    min_score: float = Query(0.0, description="Minimum Tax Evasion Risk score (0-100)"),
    limit: int = Query(100, ge=1, le=500)
):
    """Filterable registry of accounts evaluated for tax evasion and non-filing."""
    return {
        "filter": filter_type,
        "count": 0,
        "accounts": get_tax_registry(
            filter_type=filter_type,
            search=search,
            min_ter_score=min_score,
            limit=limit
        )
    }


@tax_router.get("/dossier/{account_id}")
def get_dossier(account_id: str):
    """Detailed forensic tax dossier for a specific bank account / entity."""
    profile = compute_account_tax_profile(account_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Account not found in transaction graph")
    return profile


@tax_router.post("/issue-notice")
def issue_notice(payload: IssueNoticeRequest):
    """Issue a formal CBDT Section 133(6) inquiry or Section 148A show cause notice."""
    notice = issue_statutory_tax_notice(
        account_id=payload.account_id,
        notice_type=payload.notice_type,
        grounds=payload.grounds
    )
    return {
        "status": "success",
        "message": f"Statutory notice issued successfully under Document Identification Number {notice['din']}",
        "notice": notice
    }


@tax_router.post("/attach/{account_id}")
def attach_account(account_id: str, payload: AttachAccountRequest | None = None):
    """Issue Section 281B provisional attachment order (statutory tax lien and bank freeze)."""
    reason = payload.reason if payload else None
    attachment = apply_provisional_tax_attachment(account_id=account_id, reason=reason)
    return {
        "status": "attached",
        "message": f"Account {account_id} successfully attached under Section 281B of the Income Tax Act.",
        "attachment": attachment
    }


@tax_router.get("/notices")
def get_all_notices():
    """Retrieve history of all issued statutory notices."""
    return {
        "count": len(_ISSUED_NOTICES),
        "notices": _ISSUED_NOTICES
    }
