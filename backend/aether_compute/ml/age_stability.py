ORBIT_CLASS_AGE = {
    "NEA":          "Variable — recently perturbed into near-Earth orbit",
    "MBA":          "~4.5 billion years (primordial main belt)",
    "Hungaria":     "1-2 billion years",
    "Vesta family": "~1 billion years (Vesta impact fragment)",
    "Themis family":"2-3 billion years",
    "Trojan":       "~4 billion years (Jupiter Trojan)",
    "TNO":          "~4.5 billion years (outer solar system)",
}

SPECTRAL_SUFFIX = {
    "C-type": "primitive, unaltered carbonaceous composition",
    "D-type": "organic-rich outer solar system origin",
    "M-type": "metallic fragment from differentiated parent body",
    "V-type": "basaltic crust fragment likely Vesta-origin",
    "S-type": "stony with partial thermal alteration",
}

def estimate_age(orbit_class: str, spectral_type: str) -> str:
    base   = ORBIT_CLASS_AGE.get(orbit_class, "~4.5 billion years")
    suffix = SPECTRAL_SUFFIX.get(spectral_type, "")
    return f"{base} — {suffix}".strip(" —")

def estimate_orbital_stability(eccentricity: float, inclination_deg: float,
                                orbit_condition_code: int) -> dict:
    stability = max(0.0, 1.0 - (
        eccentricity * 0.5 +
        inclination_deg / 180.0 +
        orbit_condition_code / 50.0
    ))
    stability = round(min(stability, 1.0), 2)
    return {
        "stability_score": stability,
        "stability_label": "High" if stability > 0.7 else "Medium" if stability > 0.4 else "Low",
        "notes": f"e={eccentricity:.3f}, i={inclination_deg:.1f}deg, OCC={orbit_condition_code}",
    }
