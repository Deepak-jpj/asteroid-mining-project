import math
from typing import Optional
from datetime import datetime

MINING_METHODS = {
    "M-type": "Autonomous Robotic Drilling + Magnetic Metal Extraction",
    "S-type": "Mechanical Excavation + Electrostatic Dust Collection",
    "C-type": "Thermal Extraction + Solar Electrolysis (H2O recovery)",
    "D-type": "Optical Mining — Concentrated Sunlight Vaporization",
    "V-type": "Surface Sample Robotics + Pneumatic Conveyance",
}

RADIATION_LEVELS = {
    "M-type": "Extreme",
    "S-type": "High",
    "C-type": "Medium",
    "V-type": "High",
    "D-type": "Low",
}

DIFFICULTY_THRESHOLDS = [
    (7.5, 10.0, "Low"),
    (5.5,  7.5, "Medium"),
    (3.5,  5.5, "High"),
    (0.0,  3.5, "Extreme"),
]

def _score_delta_v(delta_v: float) -> float:
    if delta_v <= 0:
        return 5.0
    return round(max(0.0, min(10.0, 10.0 * math.exp(-0.18 * delta_v))), 3)

def _score_approach(moid_au, next_approach_yr, approach_duration_days, rel_velocity) -> float:
    if moid_au is None or moid_au <= 0:
        moid_score = 3.0
    elif moid_au <= 0.05:
        moid_score = 10.0
    elif moid_au <= 0.1:
        moid_score = 8.0
    elif moid_au <= 0.2:
        moid_score = 6.0
    elif moid_au <= 0.5:
        moid_score = 4.0
    else:
        moid_score = max(0.0, 10.0 - moid_au * 15)

    timing_score = 5.0
    if next_approach_yr is not None:
        yrs = max(0, next_approach_yr - datetime.now().year)
        timing_score = (10.0 if yrs <= 3 else 8.0 if yrs <= 7
                        else 6.0 if yrs <= 15 else 4.0 if yrs <= 30 else 2.0)

    duration_bonus  = min(1.5, (approach_duration_days or 0) * 0.05)
    velocity_penalty = min(3.0, (rel_velocity or 0) * 0.1)
    combined = (moid_score * 0.5 + timing_score * 0.5) + duration_bonus - velocity_penalty
    return round(max(0.0, min(10.0, combined)), 3)

def _score_rotation(rotation_period_hr, density_g_cm3, diameter_km) -> float:
    if rotation_period_hr is None:
        r = 5.0
    elif rotation_period_hr < 2.0:
        r = max(0.0, rotation_period_hr - 0.5)
    elif rotation_period_hr < 4.0:
        r = 3.0 + (rotation_period_hr - 2.0)
    elif rotation_period_hr < 10.0:
        r = 5.0 + (rotation_period_hr - 4.0) * 0.3
    else:
        r = min(10.0, 8.0 + (rotation_period_hr - 10.0) * 0.05)

    density_adj = (0.0 if density_g_cm3 is None
                   else +1.5 if density_g_cm3 > 5.0
                   else -2.0 if density_g_cm3 < 1.5 else 0.0)
    size_adj = (0.0 if diameter_km is None
                else -1.5 if diameter_km < 0.1
                else +1.0 if diameter_km > 1.0 else 0.0)
    return round(max(0.0, min(10.0, r + density_adj + size_adj)), 3)

def _score_size(diameter_km, mass_kg) -> float:
    if diameter_km is not None:
        if diameter_km < 0.05:  return 1.0
        if diameter_km < 0.2:   return 3.0
        if diameter_km < 1.0:   return 6.0
        if diameter_km < 10.0:  return 9.0
        if diameter_km < 100.0: return 8.0
        return 6.0
    if mass_kg and mass_kg > 0:
        return round(min(10.0, max(0.0, (math.log10(mass_kg) - 6) * 1.2)), 3)
    return 5.0

def _score_resource(platinum_pct, nickel_pct, iron_pct, cobalt_pct,
                    water_pct, albedo, spectral_type) -> float:
    base = (platinum_pct * 30.0 + nickel_pct * 0.4 +
            iron_pct * 0.07 + cobalt_pct * 0.5 + water_pct * 0.3)
    score = min(10.0, base)
    if albedo is not None and spectral_type == "M-type":
        score *= (1.1 if albedo > 0.1 else 0.85 if albedo < 0.05 else 1.0)
    elif albedo is not None and spectral_type == "C-type" and albedo < 0.1:
        score *= 1.05
    return round(max(0.0, min(10.0, score)), 3)

def _score_economic(total_value_usd) -> float:
    if not total_value_usd or total_value_usd <= 0:
        return 3.0
    return round(min(10.0, max(0.0, (math.log10(total_value_usd) - 6.0) * (10.0 / 9.0))), 3)

def _score_orbital_period(orbital_period_yr) -> float:
    if orbital_period_yr is None: return 5.0
    if orbital_period_yr < 1.0:  return 10.0
    if orbital_period_yr < 2.0:  return 8.5
    if orbital_period_yr < 5.0:  return 6.5
    if orbital_period_yr < 10.0: return 4.5
    if orbital_period_yr < 20.0: return 2.5
    return 1.0

def calculate_feasibility_score(asteroid_data: dict) -> dict:
    """
    Master feasibility scorer using all 15 parameters.

    Weights:
      25% delta_v_km_s
      15% moid_au + next_approach_yr + approach_duration_days + relative_velocity_km_s
      15% platinum_group_pct + nickel_pct + iron_pct + cobalt_pct + water_ice_pct + albedo
      15% total_value_usd (economic output fed back in)
      10% rotation_period_hr + density_g_cm3 + diameter_km (surface stability)
      10% diameter_km + mass_kg (size suitability)
       5% orbital_period_yr (launch window frequency)
       5% Aether compute (water + thermal + radiation + tflops)
    """
    dv          = asteroid_data.get("delta_v_km_s") or 8.0
    moid        = asteroid_data.get("moid_au")
    appr_yr     = asteroid_data.get("next_approach_yr")
    appr_days   = asteroid_data.get("approach_duration_days")
    rel_vel     = asteroid_data.get("relative_velocity_km_s")
    orb_period  = asteroid_data.get("orbital_period_yr")
    rot_period  = asteroid_data.get("rotation_period_hr")
    diameter    = asteroid_data.get("diameter_km")
    mass        = asteroid_data.get("mass_kg")
    density     = asteroid_data.get("density_g_cm3")
    albedo      = asteroid_data.get("albedo")
    spec        = asteroid_data.get("spectral_type", "C-type")
    orbit_code  = asteroid_data.get("orbit_condition_code", 5)
    pt_pct      = asteroid_data.get("platinum_group_pct", 0.0)
    ni_pct      = asteroid_data.get("nickel_pct", 0.0)
    fe_pct      = asteroid_data.get("iron_pct", 0.0)
    co_pct      = asteroid_data.get("cobalt_pct", 0.0)
    h2o_pct     = asteroid_data.get("water_ice_pct", 0.0)
    carbon_pct  = asteroid_data.get("carbon_compounds_pct", 0.0)
    total_val   = asteroid_data.get("total_value_usd")

    s1 = _score_delta_v(dv)
    s2 = _score_approach(moid or 0.3, appr_yr, appr_days, rel_vel)
    s3 = _score_resource(pt_pct, ni_pct, fe_pct, co_pct, h2o_pct, albedo, spec)
    s4 = _score_economic(total_val)
    s5 = _score_rotation(rot_period, density, diameter)
    s6 = _score_size(diameter, mass)
    s7 = _score_orbital_period(orb_period)

    rad_level    = RADIATION_LEVELS.get(spec, "Medium")
    rad_bonus    = {"Extreme": 1.8, "High": 1.5, "Medium": 1.0, "Low": 0.5}[rad_level]
    thermal_diss = round((h2o_pct * 12.5) + ((density or 2.0) * 8.0), 2)
    comp_dens    = round(
        ((h2o_pct * 0.4) + (((diameter or 0.5) ** 0.5) * 0.3)) * rad_bonus * 0.15, 3
    )
    water_c  = min(10.0, h2o_pct * 0.45)
    therm_c  = min(10.0, thermal_diss * 0.08)
    rad_c    = {"Extreme": 10, "High": 7.5, "Medium": 5.0, "Low": 2.5}[rad_level]
    tflops_c = min(10.0, comp_dens * 15.0)
    s8 = round(water_c * 0.3 + therm_c * 0.2 + rad_c * 0.3 + tflops_c * 0.2, 3)

    total = round(max(0.0, min(10.0,
        s1 * 0.25 + s2 * 0.15 + s3 * 0.15 + s4 * 0.15 +
        s5 * 0.10 + s6 * 0.10 + s7 * 0.05 + s8 * 0.05
    )), 2)

    difficulty = "Extreme"
    for low, high, label in DIFFICULTY_THRESHOLDS:
        if low <= total < high:
            difficulty = label
            break

    duration = ("2-5 years" if dv < 4 else "4-8 years" if dv < 6
                else "8-12 years" if dv < 9 else "12-18 years")
    launch = (f"{appr_yr - 1}-{appr_yr + 1}" if appr_yr else "TBD")

    spin_warn = (
        f"SPIN BARRIER: {rot_period}hr rotation. Equipment cannot anchor safely."
        if rot_period is not None and rot_period < 2.2 else None
    )
    rubble_warn = (
        f"RUBBLE PILE RISK: density {density} g/cm3. Use non-contact methods only."
        if density is not None and density < 1.5 else None
    )

    dc_score = 0.0
    if h2o_pct > 0 and carbon_pct > 0 and dv > 0:
        dc_score = round(min(10.0, (h2o_pct * carbon_pct) / (dv * max(orbit_code, 1)) * 10.0), 2)

    return {
        "feasibility_score":             total,
        "score_delta_v":                 s1,
        "score_approach_opportunity":    s2,
        "score_resource_composition":    s3,
        "score_economic_value":          s4,
        "score_rotation_stability":      s5,
        "score_size_mass":               s6,
        "score_orbital_frequency":       s7,
        "score_aether_compute":          s8,
        "mission_difficulty":            difficulty,
        "recommended_method":            MINING_METHODS.get(spec, "Robotic extraction"),
        "estimated_mission_duration_yr": duration,
        "best_launch_window":            launch,
        "spin_barrier_warning":          spin_warn,
        "rubble_pile_warning":           rubble_warn,
        "dc_score":                      dc_score,
        "thermal_dissipation_capacity":  thermal_diss,
        "compute_density_tflops":        comp_dens,
        "radiation_hardness_level":      rad_level,
    }
