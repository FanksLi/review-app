"""Pydantic模型定义"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum


class QuestionType(str, Enum):
    """题目类型"""
    SINGLE_CHOICE = "single_choice"
    MULTI_CHOICE = "multi_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"


class DocumentUploadResponse(BaseModel):
    """文档上传响应"""
    document_id: int
    filename: str
    file_type: str
    chunk_count: int
    preview: str


class QuestionGenerateRequest(BaseModel):
    """题目生成请求"""
    document_ids: List[int]
    question_types: List[QuestionType]
    counts: Dict[str, int] = Field(..., description="各题型数量")
    provider: Optional[str] = None


class Question(BaseModel):
    """题目数据"""
    id: str
    type: QuestionType
    question: str
    options: Optional[List[str]] = None
    answer: Union[str, List[str], bool]
    explanation: Optional[str] = ""
    source_reference: Optional[str] = ""
    knowledge_point: Optional[str] = None


class QuestionSet(BaseModel):
    """题目集合"""
    questions: List[Question]
    provider: str
    document_ids: List[int]
    created_at: datetime = Field(default_factory=datetime.now)


class AnswerSubmission(BaseModel):
    """答案提交"""
    question_id: str
    user_answer: Union[str, List[str], bool]


class GradeRequest(BaseModel):
    """评分请求"""
    answers: List[AnswerSubmission]
    questions: List[Question]
    provider: Optional[str] = None


class GradeResult(BaseModel):
    """单题评分结果"""
    question_id: str
    is_correct: Optional[bool]
    score: float
    max_score: float
    feedback: Optional[str] = None


class GradeResponse(BaseModel):
    """评分响应"""
    results: List[GradeResult]
    total_score: float
    total_max_score: float
    percentage: float


class TestSessionCreate(BaseModel):
    """创建测试会话"""
    document_ids: List[int]
    question_types: Dict[str, int]
    provider: Optional[str] = None


class TestSession(BaseModel):
    """测试会话"""
    id: int
    document_ids: List[int]
    question_types: Dict[str, int]
    provider: str
    total_questions: int
    total_score: Optional[float] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class TestSessionWithQuestions(TestSession):
    """测试会话(含题目)"""
    questions: List[Question]


class StatsOverview(BaseModel):
    """统计概览"""
    total_tests: int
    avg_score: float
    recent_trend: List[float]
    total_documents: int


class DocumentStats(BaseModel):
    """文档统计"""
    document_id: int
    test_count: int
    avg_score: float
    weak_points: List[str]
    mastery_level: float


class WrongQuestion(BaseModel):
    """错题"""
    question_id: str
    question_type: QuestionType
    question_text: str
    correct_answer: str
    wrong_count: int
    source_reference: str