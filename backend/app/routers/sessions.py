"""FastAPI路由 - 测试会话管理"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from pathlib import Path
import sqlite3
import json
from datetime import datetime

router = APIRouter(prefix="/test-sessions", tags=["test-sessions"])

DB_PATH = Path(__file__).parent.parent.parent / "db" / "review.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """初始化数据库表"""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS test_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_ids TEXT NOT NULL,
            question_types TEXT NOT NULL,
            provider TEXT,
            total_questions INTEGER DEFAULT 0,
            total_score REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS test_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            question_id TEXT NOT NULL,
            question_type TEXT NOT NULL,
            question_text TEXT NOT NULL,
            question_options TEXT,
            correct_answer TEXT NOT NULL,
            user_answer TEXT,
            is_correct INTEGER,
            score REAL,
            max_score REAL DEFAULT 1.0,
            llm_feedback TEXT,
            source_reference TEXT,
            FOREIGN KEY (session_id) REFERENCES test_sessions(id)
        )
    """)
    conn.commit()
    conn.close()

init_db()


class SessionCreate(BaseModel):
    document_ids: List[int]
    question_types: dict
    provider: Optional[str] = None


class Session(BaseModel):
    id: int
    document_ids: str
    question_types: str
    provider: Optional[str]
    total_questions: int
    total_score: Optional[float]
    created_at: str
    completed_at: Optional[str]


class SessionWithQuestions(Session):
    questions: List[dict]


@router.get("/")
async def list_sessions():
    """获取测试历史"""
    conn = get_db()
    rows = conn.execute("""
        SELECT id, document_ids, question_types, provider, total_questions, total_score, created_at, completed_at
        FROM test_sessions
        ORDER BY created_at DESC
    """).fetchall()
    conn.close()

    sessions = []
    for row in rows:
        sessions.append({
            "id": row["id"],
            "document_ids": row["document_ids"],
            "question_types": row["question_types"],
            "provider": row["provider"],
            "total_questions": row["total_questions"],
            "total_score": row["total_score"],
            "created_at": row["created_at"],
            "completed_at": row["completed_at"]
        })

    return {"sessions": sessions}


@router.post("/")
async def create_session(data: SessionCreate):
    """创建测试会话"""
    conn = get_db()
    cursor = conn.execute("""
        INSERT INTO test_sessions (document_ids, question_types, provider, total_questions)
        VALUES (?, ?, ?, 0)
    """, (
        json.dumps(data.document_ids),
        json.dumps(data.question_types),
        data.provider
    ))
    session_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {"session_id": session_id}


@router.post("/{session_id}/questions")
async def save_session_questions(session_id: int, data: dict):
    """保存测试题目"""
    questions = data.get("questions", [])

    conn = get_db()

    for q in questions:
        # 序列化options和answer
        options = q.get("options", [])
        answer = q.get("answer", "")

        # 统一判断题答案格式
        if q.get("type") == "true_false":
            answer_str = str(answer).strip().lower()
            if answer_str in ["true", "正确", "对", "yes", "1"]:
                answer = "true"
            elif answer_str in ["false", "错误", "错", "no", "0"]:
                answer = "false"
            else:
                answer = "false"  # 默认false

        conn.execute("""
            INSERT INTO test_answers
            (session_id, question_id, question_type, question_text, question_options, correct_answer, source_reference, max_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session_id,
            q.get("id"),
            q.get("type"),
            q.get("question"),
            json.dumps(options, ensure_ascii=False) if options else None,
            json.dumps(answer, ensure_ascii=False) if answer else "",
            q.get("source_reference", ""),
            2.0 if q.get("type") == "multi_choice" else 1.0
        ))

    # 更新题目数量
    conn.execute("""
        UPDATE test_sessions SET total_questions = ? WHERE id = ?
    """, (len(questions), session_id))

    conn.commit()
    conn.close()

    return {"success": True, "count": len(questions)}


@router.delete("/{session_id}")
async def delete_session(session_id: int):
    """删除测试会话"""
    conn = get_db()

    # 删除关联的答案
    conn.execute("DELETE FROM test_answers WHERE session_id = ?", (session_id,))

    # 删除会话
    conn.execute("DELETE FROM test_sessions WHERE id = ?", (session_id,))

    conn.commit()
    conn.close()

    return {"success": True}


@router.get("/{session_id}/questions")
async def get_session_questions(session_id: int):
    """获取测试题目"""
    try:
        conn = get_db()
        rows = conn.execute("""
            SELECT question_id, question_type, question_text, question_options, correct_answer, source_reference
            FROM test_answers
            WHERE session_id = ?
        """, (session_id,)).fetchall()
        conn.close()

        questions = []
        for row in rows:
            # 解析选项
            options_data = []
            if row["question_options"]:
                try:
                    options_data = json.loads(row["question_options"])
                except:
                    options_data = []

            questions.append({
                "id": row["question_id"],
                "type": row["question_type"],
                "question": row["question_text"],
                "options": options_data if options_data else ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
                "source_reference": row["source_reference"] or ""
            })

        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"加载题目失败: {str(e)}")


@router.put("/{session_id}/submit")
async def submit_session(session_id: int, data: dict):
    """提交测试答案并评分"""
    answers = data.get("answers", [])

    conn = get_db()

    # 更新用户答案并评分
    for answer in answers:
        user_answer = answer.get("user_answer")
        question_id = answer.get("question_id")

        # 获取题目信息
        q_row = conn.execute("""
            SELECT question_type, correct_answer, max_score
            FROM test_answers
            WHERE session_id = ? AND question_id = ?
        """, (session_id, question_id)).fetchone()

        if not q_row:
            continue

        # 解析正确答案
        correct_answer = q_row["correct_answer"]
        try:
            correct_data = json.loads(correct_answer) if correct_answer else ""
        except:
            correct_data = correct_answer

        # 评分逻辑
        is_correct = None
        score = 0.0
        feedback = None

        q_type = q_row["question_type"]
        max_score = float(q_row["max_score"])

        # 单选题和判断题
        if q_type in ["single_choice", "true_false"]:
            user_str = str(user_answer).strip()
            correct_str = str(correct_data).strip()
            is_correct = user_str == correct_str
            score = max_score if is_correct else 0.0

        # 多选题
        elif q_type == "multi_choice":
            if isinstance(user_answer, list):
                user_set = set(str(a).strip() for a in user_answer)
            else:
                user_set = set()

            if isinstance(correct_data, list):
                correct_set = set(str(a).strip() for a in correct_data)
            else:
                correct_set = set()

            if user_set == correct_set:
                is_correct = True
                score = max_score
            elif user_set & correct_set:
                is_correct = False
                score = max_score * 0.5
                feedback = "部分正确"
            else:
                is_correct = False
                score = 0.0

        # 简答题 - 标记为需要人工评分
        elif q_type == "short_answer":
            is_correct = None
            score = 0.0
            feedback = "需要人工评分"

        # 存储用户答案
        if isinstance(user_answer, (list, dict)):
            user_answer_str = json.dumps(user_answer, ensure_ascii=False)
        else:
            user_answer_str = str(user_answer) if user_answer else ""

        conn.execute("""
            UPDATE test_answers
            SET user_answer = ?, is_correct = ?, score = ?, llm_feedback = ?
            WHERE session_id = ? AND question_id = ?
        """, (
            user_answer_str,
            1 if is_correct else (0 if is_correct is False else None),
            score,
            feedback,
            session_id,
            question_id
        ))

    # 更新会话状态和总分
    total_score = conn.execute("""
        SELECT COALESCE(SUM(score), 0) as total
        FROM test_answers
        WHERE session_id = ?
    """, (session_id,)).fetchone()["total"]

    conn.execute("""
        UPDATE test_sessions SET completed_at = ?, total_score = ? WHERE id = ?
    """, (datetime.now().isoformat(), total_score, session_id))

    conn.commit()
    conn.close()

    return {"success": True, "total_score": total_score}


@router.get("/{session_id}/result")
async def get_session_result(session_id: int):
    """获取测试结果"""
    conn = get_db()

    session = conn.execute("""
        SELECT total_score FROM test_sessions WHERE id = ?
    """, (session_id,)).fetchone()

    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="会话不存在")

    rows = conn.execute("""
        SELECT
            question_id,
            question_type,
            question_text,
            question_options,
            user_answer,
            correct_answer,
            is_correct,
            score,
            max_score,
            llm_feedback,
            source_reference
        FROM test_answers
        WHERE session_id = ?
    """, (session_id,)).fetchall()
    conn.close()

    questions = []
    total_score = 0.0
    total_max = 0.0

    for row in rows:
        is_correct = row["is_correct"] == 1 if row["is_correct"] is not None else None
        score = float(row["score"]) if row["score"] else 0.0
        max_score = float(row["max_score"]) if row["max_score"] else 1.0

        total_score += score
        total_max += max_score

        # 解析正确答案，处理Unicode转义
        correct_answer = row["correct_answer"]
        try:
            correct_data = json.loads(correct_answer) if correct_answer else ""
            if isinstance(correct_data, list):
                correct_answer = ", ".join(str(a) for a in correct_data)
            else:
                correct_answer = str(correct_data)
        except:
            correct_answer = str(correct_answer) if correct_answer else ""

        # 解析选项
        options = []
        if row["question_options"]:
            try:
                options = json.loads(row["question_options"])
            except:
                pass

        # 构建完整答案显示（选项+内容）
        if options and correct_answer:
            # 找到正确选项的完整内容
            for opt in options:
                if opt.startswith(correct_answer + ".") or opt.startswith(correct_answer + " "):
                    correct_answer = opt
                    break
                # 多选题情况
                if ", " in correct_answer:
                    answer_parts = correct_answer.split(", ")
                    full_parts = []
                    for part in answer_parts:
                        for opt in options:
                            if opt.startswith(part + ".") or opt.startswith(part + " "):
                                full_parts.append(opt)
                                break
                    if full_parts:
                        correct_answer = "; ".join(full_parts)
                        break

        questions.append({
            "question_id": row["question_id"],
            "question_type": row["question_type"],
            "question_text": row["question_text"],
            "options": options,
            "user_answer": row["user_answer"],
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "score": score,
            "max_score": max_score,
            "llm_feedback": row["llm_feedback"],
            "source_reference": row["source_reference"]
        })

    return {
        "total_score": total_score,
        "total_max_score": total_max,
        "questions": questions
    }
