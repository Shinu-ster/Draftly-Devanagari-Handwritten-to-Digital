from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import numpy as np
import cv2
from app.inference.pipeline import process_image
from app.inference.reclassify import predict_zone_char

router = APIRouter()

@router.post("/recognize")
async def recognize(file: UploadFile = File(...)):
    contents = await file.read()
    npimg = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image")
    text = process_image(img)
    return {"unicode_text": text}

@router.post("/reclassify")
async def reclassify(file: UploadFile = File(...), zone: str = Form(...)):
    contents = await file.read()
    npimg = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image")

    try:
        character, confidence = predict_zone_char(zone, img)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"character": character, "confidence": confidence}

@router.get("/health")
async def health():
    return {"status": "ok"}
