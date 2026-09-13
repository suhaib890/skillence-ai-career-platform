"""
Skillence — Phase 6: evaluate the trained ensemble on the held-out 200-row set.

Reports accuracy, macro precision/recall/F1, top-3 accuracy, a per-class report
and the confusion matrix. Writes models/evaluation.json for the record.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from xgboost import XGBClassifier

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.ml.preprocessing import FeaturePreprocessor  # noqa: E402

DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "models"


def top_k_accuracy(proba, y_true, k=3):
    top_k = np.argsort(proba, axis=1)[:, -k:]
    return float(np.mean([yt in row for yt, row in zip(y_true, top_k)]))


def main() -> None:
    test_path = DATA_DIR / "test_200.csv"
    if not test_path.exists():
        raise SystemExit("Run generate_dataset.py first (data/test_200.csv missing).")
    if not (MODELS_DIR / "meta.json").exists():
        raise SystemExit("Run train.py first (models/ is empty).")

    meta = json.loads((MODELS_DIR / "meta.json").read_text())
    w = meta["weights"]

    pre = FeaturePreprocessor.load(MODELS_DIR / "preprocessor.joblib")
    le = joblib.load(MODELS_DIR / "label_encoder.joblib")
    cat = CatBoostClassifier()
    cat.load_model(str(MODELS_DIR / "catboost.cbm"))
    xgb = XGBClassifier()
    xgb.load_model(str(MODELS_DIR / "xgboost.json"))

    df = pd.read_csv(test_path)
    X = pre.transform(df)
    y = le.transform(df["target_career"].astype(str))

    ens_p = w["catboost"] * cat.predict_proba(X) + w["xgboost"] * xgb.predict_proba(X)
    pred = ens_p.argmax(axis=1)

    results = {
        "n_test": int(len(df)),
        "accuracy": round(accuracy_score(y, pred), 4),
        "precision_macro": round(precision_score(y, pred, average="macro", zero_division=0), 4),
        "recall_macro": round(recall_score(y, pred, average="macro", zero_division=0), 4),
        "f1_macro": round(f1_score(y, pred, average="macro"), 4),
        "top3_accuracy": round(top_k_accuracy(ens_p, y, 3), 4),
    }

    print("=" * 50)
    print("Skillence — Test set evaluation (200 rows)")
    print("=" * 50)
    for k, v in results.items():
        print(f"  {k:18s}: {v}")

    print("\nPer-class report:")
    print(classification_report(y, pred, target_names=le.classes_, zero_division=0))

    cm = confusion_matrix(y, pred)
    print("Confusion matrix (rows=true, cols=pred), labels in meta.json order.")
    print(cm)

    out = {
        **results,
        "labels": le.classes_.tolist(),
        "confusion_matrix": cm.tolist(),
    }
    (MODELS_DIR / "evaluation.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"\n✓ wrote {MODELS_DIR / 'evaluation.json'}")


if __name__ == "__main__":
    main()
