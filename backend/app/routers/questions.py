"""FastAPI路由 - 题目生成"""

from fastapi import APIRouter, HTTPException
from typing import List

from ..models import QuestionGenerateRequest, Question, QuestionSet
from ..services.rag_service import RAGService
from ..config import get_settings

router = APIRouter(prefix="/questions", tags=["questions"])
settings = get_settings()


@router.post("/generate", response_model=QuestionSet)
async def generate_questions(request: QuestionGenerateRequest):
    """生成测试题目"""
    try:
        rag_service = RAGService()

        # 转换题型
        type_list = [qt.value for qt in request.question_types]

        # 生成题目
        questions_data = rag_service.generate_questions(
            document_ids=request.document_ids,
            question_types=type_list,
            counts=request.counts,
            provider_name=request.provider
        )

        # 转换为Question模型
        questions = []
        for q in questions_data:
            # 修正题型映射
            if q.get("type") == "multiple_choice":
                q["type"] = "multi_choice"
            questions.append(Question(**q))

        return QuestionSet(
            questions=questions,
            provider=request.provider or settings.LLM_PROVIDER,
            document_ids=request.document_ids
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")


@router.get("/types")
async def get_question_types():
    """获取支持的题型"""
    return {
        "types": [
            {"value": "single_choice", "label": "单选题"},
            {"value": "multi_choice", "label": "多选题"},
            {"value": "true_false", "label": "判断题"},
            {"value": "short_answer", "label": "简答题"}
        ]
    }