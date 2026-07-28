from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"

MODEL_PATHS = {
    "fi": MODEL_DIR / "fi_model.keras",
    "u1": MODEL_DIR / "u1_model.keras",
    "u2": MODEL_DIR / "u2_model.keras",
    "lm": MODEL_DIR / "lm_model.keras",
    "hc": MODEL_DIR / "hc_model.keras",
    "d": MODEL_DIR / "d_model.keras",
    "imp": MODEL_DIR / "imp_model.keras",
}
