"""FastAPI路由 - 文档管理"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from pathlib import Path
import sqlite3
import json

from ..models import DocumentUploadResponse
from ..services.document_processor import DocumentProcessor
from ..services.rag_service import RAGService
from ..config import get_settings

router = APIRouter(prefix="/documents", tags=["documents"])
settings = get_settings()

# SQLite数据库路径
DB_PATH = Path(__file__).parent.parent.parent / "db" / "review.db"

def get_db():
    """获取数据库连接"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """初始化数据库表"""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            file_type TEXT,
            file_hash TEXT UNIQUE,
            chunk_count INTEGER,
            python_doc_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

# 启动时初始化
init_db()


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """上传并处理文档"""
    # 检查文件类型
    suffix = Path(file.filename).suffix.lower().replace(".", "")
    if suffix not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型。支持的格式: {settings.ALLOWED_EXTENSIONS}"
        )

    # 检查文件大小
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"文件过大，最大支持 {settings.MAX_FILE_SIZE // 1024 // 1024}MB"
        )

    try:
        processor = DocumentProcessor()
        rag_service = RAGService()

        # 保存文件
        file_path = processor.save_upload(content, file.filename)

        # 计算hash
        file_hash = processor.get_file_hash(file_path)

        # 解析文件
        text, file_type = processor.parse_file(file_path)

        # 文本分段
        chunks = processor.split_text(text, file.filename)

        # 存入数据库获取真实ID
        conn = get_db()
        cursor = conn.execute(
            "INSERT INTO documents (filename, file_type, file_hash, chunk_count) VALUES (?, ?, ?, ?)",
            (file.filename, file_type, file_hash, len(chunks))
        )
        document_id = cursor.lastrowid
        conn.commit()
        conn.close()

        # 向量化存储
        rag_service.add_documents(chunks, document_id)

        # 生成预览
        preview = text[:200] + "..." if len(text) > 200 else text

        return DocumentUploadResponse(
            document_id=document_id,
            filename=file.filename,
            file_type=file_type,
            chunk_count=len(chunks),
            preview=preview
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")


@router.get("/")
async def list_documents():
    """文档列表"""
    conn = get_db()
    rows = conn.execute("SELECT * FROM documents ORDER BY created_at DESC").fetchall()
    conn.close()

    documents = []
    for row in rows:
        documents.append({
            "id": row["id"],
            "filename": row["filename"],
            "file_type": row["file_type"],
            "chunk_count": row["chunk_count"],
            "created_at": row["created_at"]
        })

    return {"documents": documents}


@router.get("/{document_id}/chunks")
async def get_document_chunks(document_id: int):
    """获取文档分段列表"""
    # TODO: 从FAISS查询
    return {"document_id": document_id, "chunks": []}


@router.delete("/{document_id}")
async def delete_document(document_id: int):
    """删除文档"""
    conn = get_db()
    conn.execute("DELETE FROM documents WHERE id = ?", (document_id,))
    conn.commit()
    conn.close()

    # 删除向量
    rag_service = RAGService()
    rag_service.delete_documents(document_id)

    return {"success": True}