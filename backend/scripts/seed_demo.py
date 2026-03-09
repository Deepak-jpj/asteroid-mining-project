import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, create_engine, SQLModel, select
from aether_compute.models import (
    Asteroid, OrbitalParameters, CompositionPrediction,
    EconomicValue, MiningFeasibility
)
from aether_compute.ingestion.asterank import fetch_top_mining_candidates
from aether_compute.ml.composition   import predict_composition, compute_aether_dc_score
from aether_compute.ml.mining        import calculate_feasibility_score
from aether_compute.ml.economics     import estimate_economic_value
from aether_compute.ml.age_stability import estimate_age, estimate_orbital_stability

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aether.db")
engine = create_engine(DATABASE_URL, echo=False)
SQLModel.metadata.create_all(engine)

def est_mass(diameter_km: float, density: float = 2.5) -> float:
    r = (diameter_km * 1000) / 2.0
    return (4/3) * math.pi * r**3 * density * 1000

def clean_spectral(raw: str) -> str:
    if not raw:
        return "C-type"
    raw = raw.strip().upper()
    for t in ["M", "S", "C", "D", "V"]:
        if raw.startswith(t):
            return f"{t}-type"
    return "C-type"

def seed():
    print("Fetching asteroid data from Asterank...")
    raw_data = fetch_top_mining_candidates(limit=100)
    print(f"Processing {len(raw_data)} asteroids...")

    with Session(engine) as session:
        for i, item in enumerate(raw_data):
            try:
                spk_id   = str(item.get("spkid") or f"AST-{i+1000}")
                name     = item.get("full_name", spk_id)
                diameter = float(item.get("diameter") or 1.0)
                spectral = clean_spectral(str(item.get("spec") or "C"))
                delta_v  = float(item.get("dv") or 6.0)
                moid     = float(item.get("moid") or 0.2)
                semi_a   = float(item.get("a") or 2.0)
                ecc      = float(item.get("e") or 0.2)
                inc      = float(item.get("i") or 10.0)
                period   = float(item.get("per_y") or semi_a**1.5)
                mass     = est_mass(diameter)

                # Skip duplicates
                existing = session.exec(
                    select(Asteroid).where(Asteroid.spk_id == spk_id)
                ).first()
                if existing:
                    continue

                # 1. Asteroid
                asteroid = Asteroid(
                    spk_id=spk_id, designation=spk_id,
                    name=name, diameter_km=diameter,
                    mass_kg=mass, spectral_type=spectral,
                    source="asterank",
                )
                session.add(asteroid)
                session.flush()

                # 2. Orbital params
                session.add(OrbitalParameters(
                    asteroid_id=asteroid.id,
                    semi_major_axis_au=semi_a,
                    eccentricity=ecc,
                    inclination_deg=inc,
                    orbital_period_yr=period,
                    moid_au=moid,
                    delta_v_km_s=delta_v,
                    perihelion_au=semi_a * (1 - ecc),
                    aphelion_au=semi_a * (1 + ecc),
                ))

                # 3. Composition
                comp = predict_composition(spectral)
                session.add(CompositionPrediction(
                    asteroid_id=asteroid.id,
                    iron_pct=comp.get("iron_pct"),
                    nickel_pct=comp.get("nickel_pct"),
                    platinum_group_pct=comp.get("platinum_group_pct"),
                    silicates_pct=comp.get("silicates_pct"),
                    water_ice_pct=comp.get("water_ice_pct"),
                    carbon_compounds_pct=comp.get("carbon_compounds_pct"),
                    cobalt_pct=comp.get("cobalt_pct"),
                    confidence_level=comp.get("confidence_level"),
                ))

                # 4. Economic value (must come before mining to feed back in)
                econ = estimate_economic_value(mass, comp)
                session.add(EconomicValue(
                    asteroid_id=asteroid.id,
                    iron_value_usd=econ.get("iron_value_usd"),
                    nickel_value_usd=econ.get("nickel_value_usd"),
                    platinum_value_usd=econ.get("platinum_group_value_usd"),
                    cobalt_value_usd=econ.get("cobalt_value_usd"),
                    water_value_usd=econ.get("water_ice_value_usd"),
                    total_value_usd=econ.get("total_value_usd"),
                ))

                # 5. Mining feasibility — includes economic value fed back in
                feas_input = {
                    **comp,
                    "delta_v_km_s":             delta_v,
                    "moid_au":                  moid,
                    "orbital_period_yr":        period,
                    "next_approach_yr":         None,
                    "approach_duration_days":   14,
                    "relative_velocity_km_s":   12.0,
                    "rotation_period_hr":       6.0,
                    "diameter_km":              diameter,
                    "mass_kg":                  mass,
                    "density_g_cm3":            2.5,
                    "albedo":                   None,
                    "orbit_condition_code":     3,
                    "spectral_type":            spectral,
                    "total_value_usd":          econ.get("total_value_usd", 0),
                }
                mining = calculate_feasibility_score(feas_input)
                session.add(MiningFeasibility(
                    asteroid_id=asteroid.id,
                    feasibility_score=mining["feasibility_score"],
                    score_delta_v=mining["score_delta_v"],
                    score_approach_opportunity=mining["score_approach_opportunity"],
                    score_resource_composition=mining["score_resource_composition"],
                    score_economic_value=mining["score_economic_value"],
                    score_rotation_stability=mining["score_rotation_stability"],
                    score_size_mass=mining["score_size_mass"],
                    score_orbital_frequency=mining["score_orbital_frequency"],
                    score_aether_compute=mining["score_aether_compute"],
                    dc_score=mining["dc_score"],
                    thermal_dissipation_capacity=mining["thermal_dissipation_capacity"],
                    compute_density_tflops=mining["compute_density_tflops"],
                    radiation_hardness_level=mining["radiation_hardness_level"],
                    recommended_method=mining["recommended_method"],
                    estimated_mission_duration_yr=mining["estimated_mission_duration_yr"],
                    mission_difficulty=mining["mission_difficulty"],
                    best_launch_window=mining["best_launch_window"],
                    spin_barrier_warning=mining["spin_barrier_warning"],
                    rubble_pile_warning=mining["rubble_pile_warning"],
                ))

                session.commit()
                print(f"  OK  {name[:40]:40s} score={mining['feasibility_score']} dc={mining['dc_score']}")

            except Exception as ex:
                session.rollback()
                print(f"  ERR {item.get('full_name','?')}: {ex}")
                continue

    print("Seeding complete.")

if __name__ == "__main__":
    seed()
