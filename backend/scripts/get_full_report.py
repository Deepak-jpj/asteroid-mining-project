import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, create_engine, select
from aether_compute.models import (
    Asteroid,
    OrbitalParameters,
    CompositionPrediction,
    EconomicValue,
    MiningFeasibility,
)
from aether_compute.services.intelligence_models import build_full_intelligence_report


def build_payload(asteroid, orbital, comp, econ, mining):
    return {
        "spk_id": asteroid.spk_id,
        "name": asteroid.name or asteroid.designation,
        "designation": asteroid.designation,
        "spectral_type": asteroid.spectral_type,
        "diameter_km": asteroid.diameter_km,
        "mass_kg": asteroid.mass_kg,
        "albedo": asteroid.albedo,
        "absolute_magnitude": asteroid.absolute_magnitude,
        "rotation_period_hr": asteroid.rotation_period_hr,
        "density_g_cm3": asteroid.density_g_cm3,
        "orbit_condition_code": asteroid.orbit_condition_code,
        "semi_major_axis_au": orbital.semi_major_axis_au if orbital else None,
        "eccentricity": orbital.eccentricity if orbital else None,
        "inclination_deg": orbital.inclination_deg if orbital else None,
        "perihelion_au": orbital.perihelion_au if orbital else None,
        "aphelion_au": orbital.aphelion_au if orbital else None,
        "orbital_period_yr": orbital.orbital_period_yr if orbital else None,
        "moid_au": orbital.moid_au if orbital else None,
        "delta_v_km_s": orbital.delta_v_km_s if orbital else None,
        "iron_pct": comp.iron_pct if comp else None,
        "nickel_pct": comp.nickel_pct if comp else None,
        "platinum_group_pct": comp.platinum_group_pct if comp else None,
        "silicates_pct": comp.silicates_pct if comp else None,
        "water_ice_pct": comp.water_ice_pct if comp else None,
        "carbon_compounds_pct": comp.carbon_compounds_pct if comp else None,
        "cobalt_pct": comp.cobalt_pct if comp else None,
        "total_value_usd": econ.total_value_usd if econ else None,
        "feasibility_score": mining.feasibility_score if mining else None,
        "mission_difficulty": mining.mission_difficulty if mining else None,
        "recommended_method": mining.recommended_method if mining else None,
        "dc_score": mining.dc_score if mining else None,
        "thermal_dissipation_capacity": mining.thermal_dissipation_capacity if mining else None,
        "compute_density_tflops": mining.compute_density_tflops if mining else None,
        "radiation_hardness_level": mining.radiation_hardness_level if mining else None,
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing spk_id"}))
        return

    spk_id = sys.argv[1]
    db_url = os.getenv("DATABASE_URL", "sqlite:///./aether.db")
    engine = create_engine(db_url, echo=False)

    with Session(engine) as session:
        asteroid = session.exec(select(Asteroid).where(Asteroid.spk_id == spk_id)).first()
        if not asteroid:
            print(json.dumps({"error": "Not found"}))
            return

        orbital = session.exec(select(OrbitalParameters).where(OrbitalParameters.asteroid_id == asteroid.id)).first()
        comp = session.exec(select(CompositionPrediction).where(CompositionPrediction.asteroid_id == asteroid.id)).first()
        econ = session.exec(select(EconomicValue).where(EconomicValue.asteroid_id == asteroid.id)).first()
        mining = session.exec(select(MiningFeasibility).where(MiningFeasibility.asteroid_id == asteroid.id)).first()

        payload = build_payload(asteroid, orbital, comp, econ, mining)
        report = build_full_intelligence_report(payload)
        print(json.dumps(report))


if __name__ == "__main__":
    main()
