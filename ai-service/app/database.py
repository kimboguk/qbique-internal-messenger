from __future__ import annotations
import psycopg2
import psycopg2.extras
from .config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD


def get_connection():
    conn_params = {"dbname": DB_NAME, "user": DB_USER}
    if DB_PASSWORD:
        conn_params["password"] = DB_PASSWORD
        conn_params["host"] = DB_HOST
        conn_params["port"] = DB_PORT
    else:
        # peer auth via Unix socket
        conn_params["host"] = DB_HOST
    return psycopg2.connect(**conn_params)


def fetch_messages(room_id: str | None, date_from: str | None, date_to: str | None):
    """채팅방 메시지를 조회하여 대화 텍스트로 반환"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            conditions = []
            params: list = []

            if room_id:
                conditions.append("m.room_id = %s")
                params.append(room_id)

            if date_from:
                conditions.append("m.created_at >= %s")
                params.append(date_from)

            if date_to:
                conditions.append("m.created_at < %s::date + interval '1 day'")
                params.append(date_to)

            where = "WHERE " + " AND ".join(conditions) if conditions else ""

            cur.execute(f"""
                SELECT m.content, m.message_type, m.created_at,
                       u.name as sender_name,
                       cr.topic
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                JOIN chat_rooms cr ON m.room_id = cr.id
                {where}
                ORDER BY m.created_at ASC
            """, params)

            rows = cur.fetchall()
            return rows
    finally:
        conn.close()


def fetch_rooms():
    """모든 채팅방 목록 조회"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT cr.id, cr.topic,
                       ceo.name as ceo_name,
                       mem.name as member_name
                FROM chat_rooms cr
                JOIN users ceo ON cr.ceo_id = ceo.id
                JOIN users mem ON cr.member_id = mem.id
                ORDER BY mem.name, cr.topic
            """)
            return cur.fetchall()
    finally:
        conn.close()


def save_report(room_id: str | None, report_type: str, query: str,
                result: str, date_from: str | None, date_to: str | None):
    """AI 리포트 저장"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO ai_reports (room_id, report_type, query, result, date_from, date_to)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (room_id, report_type, query, result, date_from, date_to))
            conn.commit()
            return cur.fetchone()
    finally:
        conn.close()


def fetch_reports():
    """저장된 리포트 목록"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT r.*, cr.topic,
                       mem.name as member_name
                FROM ai_reports r
                LEFT JOIN chat_rooms cr ON r.room_id = cr.id
                LEFT JOIN users mem ON cr.member_id = mem.id
                ORDER BY r.created_at DESC
                LIMIT 50
            """)
            return cur.fetchall()
    finally:
        conn.close()


def fetch_report_by_id(report_id: str):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT r.*, cr.topic,
                       mem.name as member_name
                FROM ai_reports r
                LEFT JOIN chat_rooms cr ON r.room_id = cr.id
                LEFT JOIN users mem ON cr.member_id = mem.id
                WHERE r.id = %s
            """, (report_id,))
            return cur.fetchone()
    finally:
        conn.close()


def delete_report(report_id: str) -> bool:
    """AI 리포트 삭제. 삭제 성공 시 True, 존재하지 않으면 False"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM ai_reports WHERE id = %s", (report_id,))
            conn.commit()
            return cur.rowcount > 0
    finally:
        conn.close()
