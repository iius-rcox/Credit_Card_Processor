import hashlib
import logging
from typing import Any, Dict

from fastapi import HTTPException, UploadFile

logger = logging.getLogger(__name__)


class PDFValidator:
    def __init__(self):
        self.max_file_size = 300 * 1024 * 1024
        self.allowed_mime_types = {"application/pdf"}
        self.pdf_magic_bytes = b"%PDF-"

    async def validate_pdf(self, file: UploadFile) -> Dict[str, Any]:
        results: Dict[str, Any] = {
            "valid": False,
            "errors": [],
            "warnings": [],
            "metadata": {},
        }

        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Invalid file type")

        content = await file.read()
        size = len(content)
        if size == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        if size > self.max_file_size:
            raise HTTPException(status_code=413, detail="File too large")

        results["metadata"]["size"] = size

        if not content.startswith(self.pdf_magic_bytes):
            raise HTTPException(status_code=400, detail="Not a valid PDF file")

        if b"%%EOF" not in content[-1024:]:
            raise HTTPException(status_code=400, detail="Invalid PDF structure")

        # Basic dangerous patterns check
        for pattern in [b"/JS", b"/JavaScript", b"javascript:"]:
            if pattern.lower() in content.lower():
                results["warnings"].append("PDF contains potentially unsafe content")

        file_hash = hashlib.sha256(content).hexdigest()
        results["metadata"]["sha256"] = file_hash

        await file.seek(0)

        results["valid"] = True
        return results


