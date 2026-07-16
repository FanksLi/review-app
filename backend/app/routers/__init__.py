"""Routers模块"""

from .documents import router as documents_router
from .questions import router as questions_router
from .tests import router as tests_router

__all__ = ["documents_router", "questions_router", "tests_router"]