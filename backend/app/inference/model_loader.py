import tensorflow as tf
from app.config import MODEL_PATHS

_models = {}

def load_all_models():
    for name, path in MODEL_PATHS.items():
        if not path.exists():
            raise FileNotFoundError(f"Missing model: {path}")
        _models[name] = tf.keras.models.load_model(path)
    return _models

def get_model(name: str):
    if name not in _models:
        raise RuntimeError(f"Model '{name}' not loaded yet")
    return _models[name]
