import random
from typing import Optional

COMPOSITION_MAP = {
    "C-type": {
        "water_ice_pct":        (5,  20),
        "carbon_compounds_pct": (20, 40),
        "silicates_pct":        (30, 50),
        "iron_pct":             (5,  15),
        "nickel_pct":           (2,   8),
        "platinum_group_pct":   (0.01, 0.1),
        "cobalt_pct":           (0.1, 0.5),
    },
    "S-type": {
        "silicates_pct":        (40, 60),
        "iron_pct":             (20, 35),
        "nickel_pct":           (10, 20),
        "platinum_group_pct":   (0.05, 0.5),
        "water_ice_pct":        (0,   2),
        "carbon_compounds_pct": (1,   5),
        "cobalt_pct":           (0.5, 2),
    },
    "M-type": {
        "iron_pct":             (55, 75),
        "nickel_pct":           (15, 25),
        "platinum_group_pct":   (0.5, 5),
        "cobalt_pct":           (1,   5),
        "silicates_pct":        (2,  10),
        "water_ice_pct":        (0,   1),
        "carbon_compounds_pct": (0,   2),
    },
    "D-type": {
        "carbon_compounds_pct": (30, 50),
        "water_ice_pct":        (10, 25),
        "silicates_pct":        (20, 35),
        "iron_pct":             (3,  10),
        "nickel_pct":           (1,   5),
        "platinum_group_pct":   (0.01, 0.05),
        "cobalt_pct":           (0.1,  0.3),
    },
    "V-type": {
        "silicates_pct":        (50, 65),
        "iron_pct":             (15, 25),
        "nickel_pct":           (5,  15),
        "platinum_group_pct":   (0.1,  1),
        "water_ice_pct":        (0,    1),
        "carbon_compounds_pct": (0.5,  3),
        "cobalt_pct":           (0.3,  1.5),
    },
}

def predict_composition(
    asteroid_class: str,
    albedo: Optional[float] = None,
    density: Optional[float] = None
) -> dict:
    template = COMPOSITION_MAP.get(asteroid_class, COMPOSITION_MAP["C-type"])
    composition = {}
    total = 0.0
    for element, (low, high) in template.items():
        val = random.uniform(low, high)
        if density and element in ("iron_pct", "nickel_pct") and density > 4.0:
            val = min(val * 1.3, high * 1.5)
        composition[element] = round(val, 3)
        total += val
    for key in composition:
        composition[key] = round((composition[key] / total) * 100, 2)
    data_points = sum([albedo is not None, density is not None])
    composition["confidence_level"] = ["Low", "Medium", "High"][min(data_points, 2)]
    return composition

def compute_aether_dc_score(
    water_ice_pct: float,
    carbon_pct: float,
    delta_v: float,
    orbit_uncertainty: int
) -> float:
    if delta_v <= 0 or orbit_uncertainty <= 0:
        return 0.0
    raw = (water_ice_pct * carbon_pct) / (delta_v * max(orbit_uncertainty, 1))
    return round(min(raw * 10.0, 10.0), 2)
