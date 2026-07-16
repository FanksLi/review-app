"""文档处理服务"""

import os
import hashlib
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import pypdf
import docx
from langchain.text_splitter import RecursiveCharacterTextSplitter

from ..config import get_settings


class DocumentProcessor:
    """文档解析处理器"""

    def __init__(self):
        self.settings = get_settings()
        self.upload_dir = Path(self.settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def parse_file(self, file_path: Path) -> Tuple[str, str]:
        """解析文件内容

        Args:
            file_path: 文件路径

        Returns:
            (文本内容, 文件类型)
        """
        suffix = file_path.suffix.lower()

        if suffix == ".pdf":
            return self._parse_pdf(file_path), "pdf"
        elif suffix in [".docx", ".doc"]:
            return self._parse_word(file_path), "word"
        elif suffix == ".txt":
            return self._parse_text(file_path), "text"
        else:
            raise ValueError(f"不支持的文件类型: {suffix}")

    def _parse_pdf(self, file_path: Path) -> str:
        """解析PDF文件"""
        text_parts = []

        try:
            with open(file_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                for page_num, page in enumerate(reader.pages, start=1):
                    page_text = page.extract_text()
                    if page_text.strip():
                        # 标注页码
                        text_parts.append(f"[第{page_num}页]\n{page_text}")
        except Exception as e:
            raise ValueError(f"PDF解析失败: {str(e)}")

        return "\n\n".join(text_parts)

    def _parse_word(self, file_path: Path) -> str:
        """解析Word文档"""
        try:
            doc = docx.Document(str(file_path))
            text_parts = []

            for para in doc.paragraphs:
                if para.text.strip():
                    text_parts.append(para.text)

            return "\n\n".join(text_parts)
        except Exception as e:
            raise ValueError(f"Word文档解析失败: {str(e)}")

    def _parse_text(self, file_path: Path) -> str:
        """解析纯文本文件"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except UnicodeDecodeError:
            # 尝试其他编码
            with open(file_path, "r", encoding="gbk") as f:
                return f.read()

    def split_text(
        self,
        text: str,
        source: str,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """文本分段

        Args:
            text: 原始文本
            source: 来源文件名
            chunk_size: 分段大小
            chunk_overlap: 重叠大小

        Returns:
            分段列表，每个分段包含文本和元数据
        """
        chunk_size = chunk_size or self.settings.CHUNK_SIZE
        chunk_overlap = chunk_overlap or self.settings.CHUNK_OVERLAP

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", "。", "！", "？", "；", ".", "!", "?", ";", " ", ""],
            length_function=len
        )

        # 提取页码信息
        chunks = []
        current_page = None

        lines = text.split("\n")
        current_chunk_text = []

        for line in lines:
            # 检测页码标记
            if line.startswith("[第") and "页]" in line:
                # 保存当前块
                if current_chunk_text:
                    chunk_text = "\n".join(current_chunk_text)
                    if chunk_text.strip():
                        page_marker = f"[第{current_page}页]" if current_page else ""
                        chunks.append({
                            "text": chunk_text,
                            "metadata": {
                                "source": source,
                                "page": current_page,
                                "page_marker": page_marker
                            }
                        })
                    current_chunk_text = []

                # 提取页码
                page_info = line.replace("[第", "").replace("页]", "")
                try:
                    current_page = int(page_info)
                except ValueError:
                    pass
            else:
                current_chunk_text.append(line)

        # 处理最后一块
        if current_chunk_text:
            chunk_text = "\n".join(current_chunk_text)
            if chunk_text.strip():
                page_marker = f"[第{current_page}页]" if current_page else ""
                chunks.append({
                    "text": chunk_text,
                    "metadata": {
                        "source": source,
                        "page": current_page,
                        "page_marker": page_marker
                    }
                })

        # 如果没有页码信息，使用标准分割
        if not chunks:
            documents = splitter.create_documents([text])
            for i, doc in enumerate(documents):
                chunks.append({
                    "text": doc.page_content,
                    "metadata": {
                        "source": source,
                        "chunk_index": i
                    }
                })

        return chunks

    def get_file_hash(self, file_path: Path) -> str:
        """计算文件hash"""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

    def save_upload(self, file_content: bytes, filename: str) -> Path:
        """保存上传文件"""
        file_path = self.upload_dir / filename
        with open(file_path, "wb") as f:
            f.write(file_content)
        return file_path