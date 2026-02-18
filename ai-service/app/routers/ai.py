from __future__ import annotations
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..database import fetch_messages, fetch_rooms, save_report, fetch_reports, fetch_report_by_id
from ..services.ollama import generate
from ..prompts.templates import SYSTEM_PROMPT, SUMMARIZE_PROMPT, SEARCH_PROMPT, REPORT_PROMPT

router = APIRouter(prefix="/ai", tags=["AI"])


class SummarizeRequest(BaseModel):
    room_id: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    save: bool = False


class SearchRequest(BaseModel):
    query: str
    room_id: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    save: bool = False


class ReportRequest(BaseModel):
    room_id: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None


def format_conversations(messages) -> str:
    """메시지 목록을 대화 텍스트로 변환"""
    if not messages:
        return "(대화 내용 없음)"

    lines = []
    for msg in messages:
        if msg["message_type"] == "system":
            continue
        timestamp = msg["created_at"].strftime("%Y-%m-%d %H:%M")
        sender = msg["sender_name"]
        content = msg["content"]
        if msg["message_type"] == "file":
            content = f"[파일: {content}]"
        lines.append(f"[{timestamp}] {sender}: {content}")

    return "\n".join(lines) if lines else "(대화 내용 없음)"


@router.post("/summarize")
async def summarize(req: SummarizeRequest):
    messages = fetch_messages(req.room_id, req.date_from, req.date_to)
    if not messages:
        raise HTTPException(status_code=404, detail="해당 조건의 대화 내용이 없습니다.")

    conversations = format_conversations(messages)
    prompt = SUMMARIZE_PROMPT.format(conversations=conversations)

    result = await generate(prompt, system=SYSTEM_PROMPT)

    if req.save:
        report = save_report(
            room_id=req.room_id,
            report_type="summary",
            query=f"요약 ({req.date_from or '전체'} ~ {req.date_to or '현재'})",
            result=result,
            date_from=req.date_from,
            date_to=req.date_to,
        )
        return {"result": result, "report_id": report["id"]}

    return {"result": result, "message_count": len(messages)}


@router.post("/search")
async def search(req: SearchRequest):
    if not req.query:
        raise HTTPException(status_code=400, detail="검색어를 입력해주세요.")

    messages = fetch_messages(req.room_id, req.date_from, req.date_to)
    if not messages:
        raise HTTPException(status_code=404, detail="해당 조건의 대화 내용이 없습니다.")

    conversations = format_conversations(messages)
    prompt = SEARCH_PROMPT.format(query=req.query, conversations=conversations)

    result = await generate(prompt, system=SYSTEM_PROMPT)

    if req.save:
        report = save_report(
            room_id=req.room_id,
            report_type="search",
            query=req.query,
            result=result,
            date_from=req.date_from,
            date_to=req.date_to,
        )
        return {"result": result, "report_id": report["id"]}

    return {"result": result, "message_count": len(messages)}


@router.post("/report")
async def create_report(req: ReportRequest):
    messages = fetch_messages(req.room_id, req.date_from, req.date_to)
    if not messages:
        raise HTTPException(status_code=404, detail="해당 조건의 대화 내용이 없습니다.")

    conversations = format_conversations(messages)
    prompt = REPORT_PROMPT.format(conversations=conversations)

    result = await generate(prompt, system=SYSTEM_PROMPT)

    # 리포트는 항상 저장
    report = save_report(
        room_id=req.room_id,
        report_type="summary",
        query=f"종합 리포트 ({req.date_from or '전체'} ~ {req.date_to or '현재'})",
        result=result,
        date_from=req.date_from,
        date_to=req.date_to,
    )

    return {"result": result, "report_id": report["id"]}


@router.get("/reports")
async def list_reports():
    reports = fetch_reports()
    return [
        {
            "id": r["id"],
            "report_type": r["report_type"],
            "query": r["query"],
            "member_name": r.get("member_name"),
            "topic": r.get("topic"),
            "date_from": str(r["date_from"]) if r["date_from"] else None,
            "date_to": str(r["date_to"]) if r["date_to"] else None,
            "created_at": r["created_at"].isoformat(),
        }
        for r in reports
    ]


@router.get("/reports/{report_id}")
async def get_report(report_id: str):
    report = fetch_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="리포트를 찾을 수 없습니다.")

    return {
        "id": report["id"],
        "report_type": report["report_type"],
        "query": report["query"],
        "result": report["result"],
        "member_name": report.get("member_name"),
        "topic": report.get("topic"),
        "date_from": str(report["date_from"]) if report["date_from"] else None,
        "date_to": str(report["date_to"]) if report["date_to"] else None,
        "created_at": report["created_at"].isoformat(),
    }


@router.get("/rooms")
async def list_rooms():
    """AI 서비스용 채팅방 목록"""
    rooms = fetch_rooms()
    return [
        {
            "id": r["id"],
            "topic": r["topic"],
            "ceo_name": r["ceo_name"],
            "member_name": r["member_name"],
        }
        for r in rooms
    ]
