import math
from collections import Counter
from typing import Any, Dict, List

from aether_compute.ml.modeling import predict_with_trained_models

def build_full_intelligence_report(record: Dict[str, Any]) -> Dict[str, Any]:
    classification_models = _classification_models(record)
    rating_models = _rating_models(record)
    trained = predict_with_trained_models(record)

    if trained:
        classification_models.append(trained["classification"])
        rating_models.append(trained["feasibility"])
        rating_models.append(trained["dc"])

    final_class = _ensemble_classification(classification_models)
    final_score = _ensemble_score(rating_models)

    return {
        "asteroid": {
            "spk_id": record.get("spk_id"),
            "name": record.get("name"),
            "designation": record.get("designation"),
            "spectral_type_db": record.get("spectral_type"),
        },
        "parameters_used": _parameter_manifest(record),
        "classification": {
            "ensemble_prediction": final_class,
            "models": classification_models,
        },
        "rating": {
            "overall_score": final_score,
            "band": _band(final_score),
            "models": rating_models,
        },
        "mission_summary": {
            "delta_v_km_s": record.get("delta_v_km_s"),
            "moid_au": record.get("moid_au"),
            "feasibility_score": record.get("feasibility_score"),
            "dc_score": record.get("dc_score"),
            "total_value_usd": record.get("total_value_usd"),
            "mission_difficulty": record.get("mission_difficulty"),
            "recommended_method": record.get("recommended_method"),
        },
        "model_references": _references(with_trained=bool(trained)),
        "training_metadata": trained["metrics"] if trained else {"note": "No trained models found. Run /v1/models/train."},
    }


def _classification_models(record: Dict[str, Any]) -> List[Dict[str, Any]]:
    spectral = record.get("spectral_type") or "C-type"
    albedo = _num(record.get("albedo"), -1)
    density = _num(record.get("density_g_cm3"), -1)
    iron = _num(record.get("iron_pct"), 0.0)
    nickel = _num(record.get("nickel_pct"), 0.0)
    water = _num(record.get("water_ice_pct"), 0.0)
    carbon = _num(record.get("carbon_compounds_pct"), 0.0)
    ecc = _num(record.get("eccentricity"), 0.2)
    inc = _num(record.get("inclination_deg"), 10.0)
    dv = _num(record.get("delta_v_km_s"), 8.0)

    spectral_model = {
        "model": "spectral-prior-rules-v1",
        "prediction": spectral,
        "confidence": round(0.55 + 0.1 * int(albedo >= 0) + 0.1 * int(density >= 0), 2),
        "top_features": ["spectral_type", "albedo", "density_g_cm3"],
    }

    composition_score_m = iron + nickel * 0.8
    composition_score_c = water + carbon * 0.6
    if composition_score_m > 35:
        comp_pred = "M-type"
    elif composition_score_c > 20:
        comp_pred = "C-type"
    else:
        comp_pred = "S-type"
    composition_model = {
        "model": "composition-signature-rules-v1",
        "prediction": comp_pred,
        "confidence": round(min(0.92, 0.45 + (abs(composition_score_m - composition_score_c) / 100.0)), 2),
        "top_features": ["iron_pct", "nickel_pct", "water_ice_pct", "carbon_compounds_pct"],
    }

    if dv <= 5 and ecc < 0.25 and inc < 10:
        orbital_pred = "M-type"
    elif ecc > 0.35 or inc > 20:
        orbital_pred = "S-type"
    else:
        orbital_pred = "C-type"
    orbital_model = {
        "model": "orbital-dynamics-heuristic-v1",
        "prediction": orbital_pred,
        "confidence": round(0.58 + max(0.0, (10 - min(dv, 10))) * 0.03, 2),
        "top_features": ["delta_v_km_s", "eccentricity", "inclination_deg"],
    }

    return [spectral_model, composition_model, orbital_model]


def _rating_models(record: Dict[str, Any]) -> List[Dict[str, Any]]:
    mining_score = _num(record.get("feasibility_score"), 0.0)
    economic_total = _num(record.get("total_value_usd"), 0.0)
    dv = _num(record.get("delta_v_km_s"), 8.0)
    moid = _num(record.get("moid_au"), 0.3)
    dc = _num(record.get("dc_score"), 0.0)
    thermal = _num(record.get("thermal_dissipation_capacity"), 0.0)
    compute = _num(record.get("compute_density_tflops"), 0.0)
    radiation = (record.get("radiation_hardness_level") or "Medium").lower()

    economic_score = 0.0 if economic_total <= 0 else min(10.0, max(0.0, (math.log10(economic_total) - 6.0) * (10.0 / 9.0)))
    access_score = max(0.0, min(10.0, (10.0 - dv) * 0.75 + (0.5 - min(moid, 0.5)) * 10.0 * 0.25))

    rad_factor = {"extreme": 10.0, "high": 7.5, "medium": 5.0, "low": 2.5}.get(radiation, 5.0)
    compute_score = min(10.0, dc * 0.5 + thermal * 0.02 + compute * 1.2 + rad_factor * 0.2)

    return [
        {
            "model": "mining-feasibility-15p-v1",
            "score": round(mining_score, 2),
            "top_features": [
                "delta_v_km_s", "moid_au", "orbital_period_yr", "rotation_period_hr",
                "density_g_cm3", "diameter_km", "mass_kg", "platinum_group_pct",
                "nickel_pct", "iron_pct", "cobalt_pct", "water_ice_pct",
                "albedo", "total_value_usd", "carbon_compounds_pct",
            ],
        },
        {
            "model": "economic-yield-log-model-v1",
            "score": round(economic_score, 2),
            "top_features": ["total_value_usd", "platinum_group_pct", "nickel_pct", "iron_pct", "water_ice_pct"],
        },
        {
            "model": "accessibility-risk-model-v1",
            "score": round(access_score, 2),
            "top_features": ["delta_v_km_s", "moid_au", "orbit_condition_code", "relative_velocity_km_s"],
        },
        {
            "model": "aether-compute-capacity-model-v1",
            "score": round(compute_score, 2),
            "top_features": ["dc_score", "water_ice_pct", "thermal_dissipation_capacity", "compute_density_tflops", "radiation_hardness_level"],
        },
    ]


def _ensemble_classification(models: List[Dict[str, Any]]) -> Dict[str, Any]:
    preds = [m["prediction"] for m in models]
    c = Counter(preds)
    winner, votes = c.most_common(1)[0]
    avg_conf = sum(float(m["confidence"]) for m in models if m["prediction"] == winner) / max(votes, 1)
    return {
        "predicted_class": winner,
        "votes": votes,
        "confidence": round(min(0.99, avg_conf), 2),
    }


def _ensemble_score(models: List[Dict[str, Any]]) -> float:
    weights = {
        "mining-feasibility-15p-v1": 0.45,
        "economic-yield-log-model-v1": 0.20,
        "accessibility-risk-model-v1": 0.20,
        "aether-compute-capacity-model-v1": 0.15,
        "gradient_boosting_regressor_v1": 0.20,
        "random_forest_regressor_v1": 0.10,
    }
    default_weight = 1.0 / max(len(models), 1)
    total = 0.0
    for m in models:
        total += float(m["score"]) * weights.get(m["model"], default_weight)
    return round(max(0.0, min(10.0, total)), 2)


def _band(score: float) -> str:
    if score >= 7.5:
        return "High"
    if score >= 5.0:
        return "Moderate"
    return "Low"


def _parameter_manifest(record: Dict[str, Any]) -> Dict[str, List[str]]:
    orbital = ["semi_major_axis_au", "eccentricity", "inclination_deg", "perihelion_au", "aphelion_au", "moid_au", "delta_v_km_s", "orbital_period_yr", "orbit_condition_code"]
    physical = ["diameter_km", "mass_kg", "albedo", "rotation_period_hr", "density_g_cm3", "absolute_magnitude"]
    composition = ["spectral_type", "iron_pct", "nickel_pct", "platinum_group_pct", "silicates_pct", "water_ice_pct", "carbon_compounds_pct", "cobalt_pct"]
    compute = ["dc_score", "thermal_dissipation_capacity", "compute_density_tflops", "radiation_hardness_level"]
    all_keys = orbital + physical + composition + compute + ["total_value_usd"]
    available = [k for k in all_keys if record.get(k) is not None]
    missing = [k for k in all_keys if record.get(k) is None]
    return {
        "categories": {
            "orbital": orbital,
            "physical": physical,
            "composition": composition,
            "aether_compute": compute,
            "economic": ["total_value_usd"],
        },
        "available": available,
        "missing": missing,
    }


def _references(with_trained: bool = False) -> List[Dict[str, str]]:
    refs = [
        {
            "model": "spectral-prior-rules-v1",
            "type": "classification",
            "reference": "Bus-DeMeo spectral taxonomy prior using spectral_type, albedo, density.",
        },
        {
            "model": "composition-signature-rules-v1",
            "type": "classification",
            "reference": "Composition-rule classifier from metal vs volatile signature (Fe/Ni/PGM vs H2O/Carbon).",
        },
        {
            "model": "orbital-dynamics-heuristic-v1",
            "type": "classification",
            "reference": "Orbit-access proxy based on delta-v, eccentricity, inclination.",
        },
        {
            "model": "mining-feasibility-15p-v1",
            "type": "rating",
            "reference": "Weighted 15-parameter feasibility model in backend/aether_compute/ml/mining.py.",
        },
        {
            "model": "economic-yield-log-model-v1",
            "type": "rating",
            "reference": "Log-scaled economic normalization from total estimated USD value.",
        },
        {
            "model": "aether-compute-capacity-model-v1",
            "type": "rating",
            "reference": "Aether DC formula (water*carbon)/(delta_v*orbit_uncertainty) and compute/radiation factors in backend/aether_compute/ml/composition.py.",
        },
    ]
    if with_trained:
        refs.extend([
            {
                "model": "random_forest_classifier_v1",
                "type": "classification",
                "reference": "Scikit-learn RandomForestClassifier trained on DB orbital+physical+composition features.",
            },
            {
                "model": "gradient_boosting_regressor_v1",
                "type": "rating",
                "reference": "Scikit-learn GradientBoostingRegressor trained for feasibility score prediction.",
            },
            {
                "model": "random_forest_regressor_v1",
                "type": "rating",
                "reference": "Scikit-learn RandomForestRegressor trained for Aether DC score prediction.",
            },
        ])
    return refs


def _num(value: Any, fallback: float) -> float:
    try:
        if value is None:
            return fallback
        return float(value)
    except Exception:
        return fallback
