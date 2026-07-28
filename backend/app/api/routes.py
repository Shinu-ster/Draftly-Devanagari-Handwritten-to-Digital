from fastapi import APIRouter, UploadFile, File, HTTPException
import numpy as np
import cv2
from app.inference.pipeline import run_pipeline

router = APIRouter()

@router.post("/recognize")
async def recognize(file: UploadFile = File(...)):
    contents = await file.read()
    npimg = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_GRAYSCALE)

    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image")

    _, binary = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    text = run_pipeline(binary)

    return {"unicode_text": text}

@router.get("/health")
async def health():
    return {"status": "ok"}
