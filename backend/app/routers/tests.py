"""FastAPI路由 - 评分"""

from fastapi import APIRouter, HTTPException
from typing import List

from ..models import GradeRequest, GradeResponse, GradeResult
from ..services.rag_service import RAGService
from ..config import get_settings

router = APIRouter(prefix="/tests", tags=["tests"])
settings = get_settings()


@router.post("/grade", response_model=GradeResponse)
async def grade_test(request: GradeRequest):
    """评分测试答案"""
    try:
        rag_service = RAGService()
        results = []
        total_score = 0.0
        total_max = 0.0

        # 构建题目映射
        question_map = {q.id: q for q in request.questions}

        for answer in request.answers:
            question = question_map.get(answer.question_id)
            if not question:
                continue

            # 评分
            grade_result = rag_service.grade_answer(
                question=question.model_dump(),
                user_answer=answer.user_answer,
                provider_name=request.provider
            )

            # 计算满分
            max_score = {
                "single_choice": 1.0,
                "true_false": 1.0,
                "multi_choice": 2.0,
                "short_answer": 10.0
            }.get(question.type.value, 1.0)

            score = grade_result.get("score", 0)
            if question.type.value == "short_answer":
                score = min(score, 10.0)  # 简答题最高10分

            total_score += score
            total_max += max_score

            results.append(GradeResult(
                question_id=answer.question_id,
                is_correct=grade_result.get("is_correct"),
                score=score,
                max_score=max_score,
                feedback=grade_result.get("feedback")
            ))

        percentage = (total_score / total_max * 100) if total_max > 0 else 0

        return GradeResponse(
            results=results,
            total_score=total_score,
            total_max_score=total_max,
            percentage=round(percentage, 1)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"评分失败: {str(e)}")


@router.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok"}