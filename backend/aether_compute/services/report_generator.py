from aether_compute.ml.economics import format_value_human

USE_CASES = {
    "iron_pct":             "Structural material for orbital habitats",
    "nickel_pct":           "High-strength spacecraft manufacturing alloys",
    "platinum_group_pct":   "Electronics, catalysts, medical devices (Pt/Pd/Rh)",
    "water_ice_pct":        "In-situ rocket propellant via H2/O2 electrolysis",
    "carbon_compounds_pct": "Life support feedstock and organic chemistry",
    "cobalt_pct":           "Battery manufacturing and magnetic components",
    "silicates_pct":        "Radiation shielding and construction aggregate",
}

AETHER_DESC = {
    "Extreme": "Outstanding Aether-Compute candidate — extreme radiation hardness supports exascale AI compute.",
    "High":    "Strong Aether-Compute candidate — good shielding and thermal dissipation for LLM inference.",
    "Medium":  "Moderate Aether-Compute potential — supplementary cooling infrastructure needed.",
    "Low":     "Limited Aether-Compute suitability — insufficient thermal and radiation protection.",
}

def generate_intelligence_report(data: dict) -> dict:
    name       = data.get("name") or data.get("designation", "Unknown")
    spec       = data.get("spectral_type", "Unknown")
    diameter   = data.get("diameter_km", "Unknown")
    distance   = data.get("moid_au", "Unknown")
    delta_v    = data.get("delta_v_km_s", "Unknown")
    approach   = data.get("next_approach_date", "TBD")
    score      = data.get("feasibility_score", "N/A")
    method     = data.get("recommended_method", "Robotic extraction")
    val        = data.get("total_value_usd")
    val_str    = format_value_human(val) if val else "Indeterminate"
    age        = data.get("age_estimate", "~4.5 billion years")
    stability  = data.get("stability_label", "Medium")
    duration   = data.get("mission_duration", "5-10 years")
    dc_score   = data.get("dc_score", 0)
    radiation  = data.get("radiation_hardness_level", "Medium")
    thermal    = data.get("thermal_dissipation_capacity", 0)
    tflops     = data.get("compute_density_tflops", 0)
    launch     = data.get("best_launch_window", "TBD")
    comp       = data.get("composition", {})

    type_desc = {
        "M-type": "metallic (iron-nickel with platinum-group traces)",
        "C-type": "carbonaceous (water ice, organics, primitive compounds)",
        "S-type": "silicaceous (stony with iron-nickel and silicates)",
        "D-type": "dark-primitive (organic-rich, volatile dominant)",
        "V-type": "basaltic (volcanic, differentiated parent body origin)",
    }.get(spec, "composition unclassified")

    summary = (
        f"{name} is a {spec} asteroid ({type_desc}) with estimated diameter "
        f"{diameter} km. MOID: {distance} AU. Next approach: {approach}. "
        f"Delta-V required: {delta_v} km/s. Mission class: {data.get('mission_difficulty','?')}. "
        f"Mining score: {score}/10. Method: {method}. "
        f"Theoretical resource value: {val_str}. "
        f"Formation: {age}. Orbital stability: {stability}. "
        f"Mission duration: {duration}. Launch window: {launch}. "
        f"Aether DC Score: {dc_score}/10. {AETHER_DESC.get(radiation, '')} "
        f"Thermal dissipation: {thermal} W/m2K. "
        f"Compute density: {tflops} TFLOPS/kg."
    )

    use_cases = [desc for key, desc in USE_CASES.items() if comp.get(key, 0) > 1.5]
    if float(dc_score or 0) > 4:
        use_cases.append(
            f"Off-planet AI compute — {radiation} shielding at {tflops} TFLOPS/kg"
        )

    return {
        "asteroid_name":    name,
        "ai_summary":       summary,
        "use_cases":        use_cases[:6],
        "aether_dc_score":  dc_score,
        "radiation_level":  radiation,
        "compute_density":  tflops,
        "thermal_capacity": thermal,
        "key_metrics": {
            "classification":    spec,
            "diameter_km":       diameter,
            "delta_v_km_s":      delta_v,
            "feasibility_score": score,
            "total_value":       val_str,
            "stability":         stability,
            "formation_era":     age,
            "launch_window":     launch,
        },
    }
