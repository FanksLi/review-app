"""FastAPI路由 - 统计分析"""

from fastapi import APIRouter
from pathlib import Path
import sqlite3

router = APIRouter(prefix="/stats", tags=["stats"])

DB_PATH = Path(__file__).parent.parent.parent / "db" / "review.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0)
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


@router.get("/error-trend")
async def get_error_trend(days: int = 7):
    """获取错误趋势"""
    conn = get_db()

    rows = conn.execute("""
        SELECT DATE(s.completed_at) as date,
               COUNT(*) as error_count
        FROM test_answers a
        JOIN test_sessions s ON a.session_id = s.id
        WHERE s.completed_at IS NOT NULL
          AND (a.is_correct = 0 OR a.score < a.max_score)
          AND DATE(s.completed_at) >= DATE('now', ?)
        GROUP BY DATE(s.completed_at)
        ORDER BY date DESC
    """, (f'-{days} days',)).fetchall()

    conn.close()

    trend = [{"date": row["date"], "error_count": row["error_count"]} for row in rows]
    return trend


@router.get("/error-types")
async def get_error_types():
    """获取错误类型分布"""
    conn = get_db()

    rows = conn.execute("""
        SELECT question_type, COUNT(*) as count
        FROM test_answers
        WHERE is_correct = 0 OR score < max_score
        GROUP BY question_type
    """).fetchall()

    conn.close()

    total = sum(row["count"] for row in rows)
    types = [
        {
            "type": row["question_type"],
            "count": row["count"],
            "percentage": round((row["count"] / total * 100), 1) if total > 0 else 0
        }
        for row in rows
    ]
    return types


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
            question_options,
            correct_answer,
            user_answer,
            is_correct,
            score,
            max_score,
            session_id,
            source_reference
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

        # 解析选项
        options = []
        if row["question_options"]:
            try:
                options = json.loads(row["question_options"])
            except:
                pass

        # 构建完整答案显示（选项+内容）
        if options and correct_answer:
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

        if is_wrong:
            seen.add(unique_key)
            questions.append({
                "question_id": unique_key,  # 使用唯一标识
                "question_type": row["question_type"],
                "question_text": row["question_text"],
                "options": options,
                "user_answer": user_answer,
                "correct_answer": correct_answer,
                "source_reference": row["source_reference"] or "",
                "wrong_count": 1
            })

    return {"questions": questions}


@router.delete("/wrong-questions/{session_id}/{question_id}")
async def delete_wrong_question(session_id: int, question_id: str):
    """从错题本移除题目"""
    conn = get_db()

    # 删除指定题目的作答记录
    conn.execute("""
        DELETE FROM test_answers
        WHERE session_id = ? AND question_id = ?
    """, (session_id, question_id))

    conn.commit()
    conn.close()

    return {"success": True}