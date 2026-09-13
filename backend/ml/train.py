"""
Skillence — Phase 4: model training.

Trains two independent multi-class classifiers (CatBoost, XGBoost) on the
engineered feature matrix, tunes each with GridSearchCV (5-fold), evaluates the
0.7·CatBoost + 0.3·XGBoost ensemble, and persists all artifacts to /models.

Artifacts written:
    models/catboost.cbm
    models/xgboost.json
    models/preprocessor.joblib
    models/label_encoder.joblib
    models/meta.json            (careers, weights, metrics, feature importances)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.ml.preprocessing import FeaturePreprocessor  # noqa: E402

DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

CATBOOST_WEIGHT = 0.7
XGBOOST_WEIGHT = 0.3


def top_k_accuracy(proba: np.ndarray, y_true: np.ndarray, k: int = 3) -> float:
    top_k = np.argsort(proba, axis=1)[:, -k:]
    return float(np.mean([yt in row for yt, row in zip(y_true, top_k)]))


def main() -> None:
    train_path = DATA_DIR / "train_500.csv"
    if not train_path.exists():
        raise SystemExit("Run generate_dataset.py first (data/train_500.csv missing).")

    df = pd.read_csv(train_path)
    pre = FeaturePreprocessor()
    X = pre.transform(df)

    le = LabelEncoder()
    y = le.fit_transform(df["target_career"].astype(str))
    n_classes = len(le.classes_)
    print(f"Training on {X.shape[0]} rows × {X.shape[1]} features, {n_classes} classes.")

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    # ---------------- CatBoost (GridSearchCV) -----------------------------
    print("\n→ Tuning CatBoost ...")
    cat = CatBoostClassifier(
        loss_function="MultiClass", random_seed=42, verbose=False, allow_writing_files=False
    )
    cat_grid = {
        "depth": [4, 6],
        "learning_rate": [0.05, 0.1],
        "iterations": [300, 500],
    }
    cat_search = GridSearchCV(cat, cat_grid, cv=cv, scoring="accuracy", n_jobs=-1)
    cat_search.fit(X, y)
    cat_model: CatBoostClassifier = cat_search.best_estimator_
    print(f"  best params: {cat_search.best_params_}")
    print(f"  CV accuracy: {cat_search.best_score_:.3f}")

    # ---------------- XGBoost (GridSearchCV) ------------------------------
    print("\n→ Tuning XGBoost ...")
    xgb = XGBClassifier(
        objective="multi:softprob",
        num_class=n_classes,
        eval_metric="mlogloss",
        tree_method="hist",
        random_state=42,
    )
    xgb_grid = {
        "max_depth": [4, 6],
        "learning_rate": [0.05, 0.1],
        "n_estimators": [300, 500],
        "subsample": [0.9],
    }
    xgb_search = GridSearchCV(xgb, xgb_grid, cv=cv, scoring="accuracy", n_jobs=-1)
    xgb_search.fit(X, y)
    xgb_model: XGBClassifier = xgb_search.best_estimator_
    print(f"  best params: {xgb_search.best_params_}")
    print(f"  CV accuracy: {xgb_search.best_score_:.3f}")

    # ---------------- Ensemble (training-set sanity) ----------------------
    cat_p = cat_model.predict_proba(X)
    xgb_p = xgb_model.predict_proba(X)
    ens_p = CATBOOST_WEIGHT * cat_p + XGBOOST_WEIGHT * xgb_p
    ens_pred = ens_p.argmax(axis=1)

    metrics = {
        "catboost_cv_accuracy": round(cat_search.best_score_, 4),
        "xgboost_cv_accuracy": round(xgb_search.best_score_, 4),
        "ensemble_train_accuracy": round(accuracy_score(y, ens_pred), 4),
        "ensemble_train_top3_accuracy": round(top_k_accuracy(ens_p, y, 3), 4),
        "ensemble_train_f1_macro": round(f1_score(y, ens_pred, average="macro"), 4),
        "ensemble_train_precision_macro": round(
            precision_score(y, ens_pred, average="macro", zero_division=0), 4
        ),
        "ensemble_train_recall_macro": round(
            recall_score(y, ens_pred, average="macro", zero_division=0), 4
        ),
    }
    print("\nTraining-set metrics:")
    for k, v in metrics.items():
        print(f"  {k}: {v}")

    # ---------------- Feature importance ----------------------------------
    importances = {}
    cat_imp = cat_model.get_feature_importance()
    for name, imp in zip(pre.feature_names, cat_imp):
        importances[name] = round(float(imp), 4)
    top_feats = sorted(importances.items(), key=lambda kv: kv[1], reverse=True)[:15]
    print("\nTop 15 features (CatBoost):")
    for name, imp in top_feats:
        print(f"  {name:30s} {imp}")

    # ---------------- Persist ---------------------------------------------
    cat_model.save_model(str(MODELS_DIR / "catboost.cbm"))
    xgb_model.save_model(str(MODELS_DIR / "xgboost.json"))
    pre.save(MODELS_DIR / "preprocessor.joblib")
    import joblib

    joblib.dump(le, MODELS_DIR / "label_encoder.joblib")

    meta = {
        "careers": le.classes_.tolist(),
        "weights": {"catboost": CATBOOST_WEIGHT, "xgboost": XGBOOST_WEIGHT},
        "feature_names": pre.feature_names,
        "feature_importance": importances,
        "metrics": metrics,
        "catboost_best_params": cat_search.best_params_,
        "xgboost_best_params": xgb_search.best_params_,
    }
    (MODELS_DIR / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"\n✓ artifacts saved to {MODELS_DIR}")


if __name__ == "__main__":
    main()
