"""FastAPI路由 - 统计分析"""

from fastapi import APIRouter
from pathlib import Path
import sqlite3

router = APIRouter(prefix="/stats", tags=["stats"])

DB_PATH = Path(__file__).parent.parent.parent / "db" / "review.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


@router.get("/overview")
async def get_overview():
    """获取统计概览"""
    conn = get_db()

    total_tests = conn.execute("""
        SELECT COUNT(*) as count FROM test_sessions WHERE completed_at IS NOT NULL
    """).fetchone()["count"]

    avg_score = conn.execute("""
        SELECT AVG(total_score) as avg FROM test_sessions WHERE completed_at IS NOT NULL AND total_score IS NOT NULL
    """).fetchone()["avg"]

    total_documents = conn.execute("""
        SELECT COUNT(*) as count FROM documents
    """).fetchone()["count"]

    recent_tests = conn.execute("""
        SELECT total_score FROM test_sessions
        WHERE completed_at IS NOT NULL AND total_score IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 10
    """).fetchall()

    recent_trend = [float(row["total_score"]) for row in recent_tests if row["total_score"]]

    conn.close()

    return {
        "totalTests": total_tests,
        "avgScore": round(avg_score, 1) if avg_score else 0,
        "totalDocuments": total_documents,
        "recentTrend": recent_trend
    }


@router.get("/wrong-questions")
async def get_wrong_questions():
    """获取错题列表"""
    conn = get_db()

    # 查询所有已作答的题目，使用唯一标识组合
    rows = conn.execute("""
        SELECT
            question_id,
            question_type,
            question_text,
            correct_answer,
            user_answer,
            is_correct,
            score,
            max_score,
            session_id
        FROM test_answers
        WHERE user_answer IS NOT NULL AND user_answer != ''
        ORDER BY session_id DESC, question_id
    """).fetchall()

    conn.close()

    questions = []
    seen = set()  # 用于去重

    for row in rows:
        import json

        # 生成唯一标识：session_id + question_id
        unique_key = f"{row['session_id']}-{row['question_id']}"
        if unique_key in seen:
            continue

        # 解析正确答案
        correct_answer = row["correct_answer"]
        try:
            answer_data = json.loads(correct_answer) if correct_answer else ""
            if isinstance(answer_data, list):
                correct_answer = ", ".join(str(a) for a in answer_data)
            else:
                correct_answer = str(answer_data)
        except:
            correct_answer = str(correct_answer) if correct_answer else ""

        # 判断是否错误
        is_wrong = False
        user_answer = row["user_answer"]

        # 如果有评分，得分低于满分算错
        if row["score"] is not None and row["score"] < row["max_score"]:
            is_wrong = True
        # 如果明确标记错误
        elif row["is_correct"] == 0:
            is_wrong = True
        # 如果答案不匹配（未评分情况）
        elif user_answer and correct_answer and user_answer != correct_answer:
            is_wrong = True

        if is_wrong:
            seen.add(unique_key)
            questions.append({
                "question_id": unique_key,  # 使用唯一标识
                "question_type": row["question_type"],
                "question_text": row["question_text"],
                "correct_answer": correct_answer,
                "wrong_count": 1
            })

    return {"questions": questions}