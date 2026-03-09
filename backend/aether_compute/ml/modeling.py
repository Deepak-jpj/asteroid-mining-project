import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sqlmodel import Session, select

from aether_compute.models import Asteroid, CompositionPrediction, EconomicValue, MiningFeasibility, OrbitalParameters


FEATURE_COLUMNS = [
    "diameter_km",
    "mass_kg",
    "albedo",
    "absolute_magnitude",
    "rotation_period_hr",
    "density_g_cm3",
    "orbit_condition_code",
    "semi_major_axis_au",
    "eccentricity",
    "inclination_deg",
    "perihelion_au",
    "aphelion_au",
    "orbital_period_yr",
    "moid_au",
    "delta_v_km_s",
    "iron_pct",
    "nickel_pct",
    "platinum_group_pct",
    "silicates_pct",
    "water_ice_pct",
    "carbon_compounds_pct",
    "cobalt_pct",
    "total_value_usd",
]

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
ARTIFACT_PATH = os.path.join(ARTIFACT_DIR, "intelligence_models.joblib")


def train_and_save_models(engine) -> Dict[str, Any]:
    df = _build_training_dataframe(engine)
    if len(df) < 20:
        raise ValueError(f"Need at least 20 rows for training, found {len(df)}")

    X = df[FEATURE_COLUMNS].astype(float)
    y_cls = df["spectral_type"].fillna("C-type").astype(str)
    y_feas = df["feasibility_score"].fillna(0.0).astype(float)
    y_dc = df["dc_score"].fillna(0.0).astype(float)

    imputer = SimpleImputer(strategy="constant", fill_value=0.0, keep_empty_features=True)
    X_imp = imputer.fit_transform(X)

    le = LabelEncoder()
    y_cls_enc = le.fit_transform(y_cls)

    X_train, X_test, y_train_cls, y_test_cls = train_test_split(
        X_imp, y_cls_enc, test_size=0.2, random_state=42, stratify=y_cls_enc
    )
    _, _, y_train_feas, y_test_feas = train_test_split(
        X_imp, y_feas, test_size=0.2, random_state=42
    )
    _, _, y_train_dc, y_test_dc = train_test_split(
        X_imp, y_dc, test_size=0.2, random_state=42
    )

    cls_model = RandomForestClassifier(n_estimators=250, random_state=42, class_weight="balanced")
    feas_model = GradientBoostingRegressor(random_state=42)
    dc_model = RandomForestRegressor(n_estimators=220, random_state=42)

    cls_model.fit(X_train, y_train_cls)
    feas_model.fit(X_train, y_train_feas)
    dc_model.fit(X_train, y_train_dc)

    pred_cls = cls_model.predict(X_test)
    pred_feas = feas_model.predict(X_test)
    pred_dc = dc_model.predict(X_test)

    metrics = {
        "classification_accuracy": round(float(accuracy_score(y_test_cls, pred_cls)), 4),
        "feasibility_mae": round(float(mean_absolute_error(y_test_feas, pred_feas)), 4),
        "dc_mae": round(float(mean_absolute_error(y_test_dc, pred_dc)), 4),
    }

    artifact = {
        "trained_at": datetime.utcnow().isoformat(),
        "feature_columns": FEATURE_COLUMNS,
        "imputer": imputer,
        "label_encoder": le,
        "classification_model": cls_model,
        "feasibility_model": feas_model,
        "dc_model": dc_model,
        "metrics": metrics,
    }

    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    joblib.dump(artifact, ARTIFACT_PATH)

    return {
        "rows": int(len(df)),
        "artifact_path": ARTIFACT_PATH,
        "metrics": metrics,
        "labels": list(le.classes_),
    }


def load_models() -> Optional[Dict[str, Any]]:
    if not os.path.exists(ARTIFACT_PATH):
        return None
    return joblib.load(ARTIFACT_PATH)


def predict_with_trained_models(record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    artifact = load_models()
    if not artifact:
        return None

    features = artifact["feature_columns"]
    raw = []
    for col in features:
        value = record.get(col)
        raw.append(float(value) if value is not None else np.nan)

    x_df = pd.DataFrame([raw], columns=features)
    x_imp = artifact["imputer"].transform(x_df)

    cls_idx = int(artifact["classification_model"].predict(x_imp)[0])
    cls_label = str(artifact["label_encoder"].inverse_transform([cls_idx])[0])
    cls_prob = float(np.max(artifact["classification_model"].predict_proba(x_imp)[0]))

    feas = float(artifact["feasibility_model"].predict(x_imp)[0])
    dc = float(artifact["dc_model"].predict(x_imp)[0])

    return {
        "classification": {
            "model": "random_forest_classifier_v1",
            "prediction": cls_label,
            "confidence": round(max(0.0, min(1.0, cls_prob)), 2),
            "top_features": _top_features(artifact["classification_model"], features, top_n=5),
        },
        "feasibility": {
            "model": "gradient_boosting_regressor_v1",
            "score": round(max(0.0, min(10.0, feas)), 2),
            "top_features": _top_features(artifact["feasibility_model"], features, top_n=5),
        },
        "dc": {
            "model": "random_forest_regressor_v1",
            "score": round(max(0.0, min(10.0, dc)), 2),
            "top_features": _top_features(artifact["dc_model"], features, top_n=5),
        },
        "metrics": artifact.get("metrics", {}),
        "trained_at": artifact.get("trained_at"),
    }


def model_status() -> Dict[str, Any]:
    artifact = load_models()
    if not artifact:
        return {"available": False}
    return {
        "available": True,
        "trained_at": artifact.get("trained_at"),
        "metrics": artifact.get("metrics", {}),
        "labels": list(artifact["label_encoder"].classes_),
        "feature_count": len(artifact["feature_columns"]),
    }


def _build_training_dataframe(engine) -> pd.DataFrame:
    rows: List[Dict[str, Any]] = []
    with Session(engine) as session:
        joined = session.exec(
            select(Asteroid, OrbitalParameters, CompositionPrediction, EconomicValue, MiningFeasibility)
            .join(OrbitalParameters, OrbitalParameters.asteroid_id == Asteroid.id, isouter=True)
            .join(CompositionPrediction, CompositionPrediction.asteroid_id == Asteroid.id, isouter=True)
            .join(EconomicValue, EconomicValue.asteroid_id == Asteroid.id, isouter=True)
            .join(MiningFeasibility, MiningFeasibility.asteroid_id == Asteroid.id, isouter=True)
        ).all()

        for a, o, c, e, m in joined:
            rows.append({
                "spectral_type": (a.spectral_type or "C-type"),
                "feasibility_score": (m.feasibility_score if m else 0.0),
                "dc_score": (m.dc_score if m else 0.0),
                "diameter_km": a.diameter_km,
                "mass_kg": a.mass_kg,
                "albedo": a.albedo,
                "absolute_magnitude": a.absolute_magnitude,
                "rotation_period_hr": a.rotation_period_hr,
                "density_g_cm3": a.density_g_cm3,
                "orbit_condition_code": a.orbit_condition_code,
                "semi_major_axis_au": o.semi_major_axis_au if o else None,
                "eccentricity": o.eccentricity if o else None,
                "inclination_deg": o.inclination_deg if o else None,
                "perihelion_au": o.perihelion_au if o else None,
                "aphelion_au": o.aphelion_au if o else None,
                "orbital_period_yr": o.orbital_period_yr if o else None,
                "moid_au": o.moid_au if o else None,
                "delta_v_km_s": o.delta_v_km_s if o else None,
                "iron_pct": c.iron_pct if c else None,
                "nickel_pct": c.nickel_pct if c else None,
                "platinum_group_pct": c.platinum_group_pct if c else None,
                "silicates_pct": c.silicates_pct if c else None,
                "water_ice_pct": c.water_ice_pct if c else None,
                "carbon_compounds_pct": c.carbon_compounds_pct if c else None,
                "cobalt_pct": c.cobalt_pct if c else None,
                "total_value_usd": e.total_value_usd if e else None,
            })
    return pd.DataFrame(rows)


def _top_features(model, names: List[str], top_n: int = 5) -> List[str]:
    importances = getattr(model, "feature_importances_", None)
    if importances is None:
        return names[:top_n]
    idx = np.argsort(importances)[::-1][:top_n]
    return [names[i] for i in idx]
