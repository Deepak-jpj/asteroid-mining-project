import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, create_engine, SQLModel
from aether_compute.models import (
    Asteroid, OrbitalParameters, CompositionPrediction,
    EconomicValue, MiningFeasibility
)
from aether_compute.services.report_generator import generate_intelligence_report
from aether_compute.ml.economics import format_value_human
from aether_compute.services.intelligence_models import build_full_intelligence_report
from aether_compute.ml.modeling import model_status, train_and_save_models

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aether.db")
engine = create_engine(DATABASE_URL, echo=False)

app = FastAPI(title="AstroMine Intelligence API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)

@app.get("/v1/health")
def health():
    return {"status": "ok", "service": "aether-compute"}

@app.get("/v1/asteroids/3d-data")
def get_3d_data(limit: int = 300):
    """Flat data for the Three.js solar system viewer."""
    with Session(engine) as session:
        rows = session.exec(
            select(Asteroid, OrbitalParameters, MiningFeasibility, EconomicValue)
            .join(OrbitalParameters, OrbitalParameters.asteroid_id == Asteroid.id, isouter=True)
            .join(MiningFeasibility, MiningFeasibility.asteroid_id == Asteroid.id, isouter=True)
            .join(EconomicValue, EconomicValue.asteroid_id == Asteroid.id, isouter=True)
            .limit(limit)
        ).all()
        return [
            {
                "spk_id":             a.spk_id,
                "name":               a.name or a.designation,
                "designation":        a.designation,
                "spectral_type":      a.spectral_type or "C-type",
                "diameter_km":        a.diameter_km or 1.0,
                "semi_major_axis_au": o.semi_major_axis_au if o else 2.5,
                "eccentricity":       o.eccentricity if o else 0.1,
                "inclination_deg":    o.inclination_deg if o else 5.0,
                "delta_v_km_s":       o.delta_v_km_s if o else 8.0,
                "moid_au":            o.moid_au if o else 0.3,
                "feasibility_score":  m.feasibility_score if m else 0.0,
                "recommended_method": m.recommended_method if m else "Unknown",
                "mission_difficulty": m.mission_difficulty if m else "Unknown",
                "dc_score":           m.dc_score if m else 0.0,
                "total_value_usd":    e.total_value_usd if e else 0,
            }
            for a, o, m, e in rows
        ]

@app.get("/v1/asteroids/top-mining")
def top_mining(limit: int = 20):
    with Session(engine) as session:
        rows = session.exec(
            select(Asteroid, MiningFeasibility, EconomicValue)
            .join(MiningFeasibility, MiningFeasibility.asteroid_id == Asteroid.id)
            .join(EconomicValue, EconomicValue.asteroid_id == Asteroid.id, isouter=True)
            .order_by(MiningFeasibility.feasibility_score.desc())
            .limit(limit)
        ).all()
        return [
            {
                "spk_id": a.spk_id, "name": a.name or a.designation,
                "spectral_type": a.spectral_type,
                "feasibility_score": m.feasibility_score,
                "dc_score": m.dc_score,
                "mission_difficulty": m.mission_difficulty,
                "recommended_method": m.recommended_method,
                "total_value_usd": e.total_value_usd if e else 0,
            }
            for a, m, e in rows
        ]

@app.get("/v1/asteroids/top-compute")
def top_compute(limit: int = 20):
    with Session(engine) as session:
        rows = session.exec(
            select(Asteroid, MiningFeasibility)
            .join(MiningFeasibility, MiningFeasibility.asteroid_id == Asteroid.id)
            .order_by(MiningFeasibility.dc_score.desc())
            .limit(limit)
        ).all()
        return [
            {
                "spk_id": a.spk_id, "name": a.name or a.designation,
                "spectral_type": a.spectral_type,
                "dc_score": m.dc_score,
                "compute_density_tflops": m.compute_density_tflops,
                "thermal_dissipation_capacity": m.thermal_dissipation_capacity,
                "radiation_hardness_level": m.radiation_hardness_level,
            }
            for a, m in rows
        ]

@app.get("/v1/asteroids/search")
def search_asteroids(q: str):
    with Session(engine) as session:
        rows = session.exec(
            select(Asteroid).where(
                Asteroid.name.contains(q) | Asteroid.designation.contains(q)
            ).limit(20)
        ).all()
        return [{"spk_id": a.spk_id, "name": a.name or a.designation} for a in rows]

@app.get("/v1/asteroid/{spk_id}/report")
def get_report(spk_id: str):
    with Session(engine) as session:
        asteroid = session.exec(select(Asteroid).where(Asteroid.spk_id == spk_id)).first()
        if not asteroid:
            return {"error": "Not found"}
        orbital  = session.exec(select(OrbitalParameters).where(OrbitalParameters.asteroid_id == asteroid.id)).first()
        comp     = session.exec(select(CompositionPrediction).where(CompositionPrediction.asteroid_id == asteroid.id)).first()
        econ     = session.exec(select(EconomicValue).where(EconomicValue.asteroid_id == asteroid.id)).first()
        mining   = session.exec(select(MiningFeasibility).where(MiningFeasibility.asteroid_id == asteroid.id)).first()

        data = {
            "name": asteroid.name or asteroid.designation,
            "spectral_type": asteroid.spectral_type,
            "diameter_km": asteroid.diameter_km,
            "moid_au": orbital.moid_au if orbital else None,
            "delta_v_km_s": orbital.delta_v_km_s if orbital else None,
            "feasibility_score": mining.feasibility_score if mining else None,
            "recommended_method": mining.recommended_method if mining else None,
            "mission_difficulty": mining.mission_difficulty if mining else None,
            "mission_duration": mining.estimated_mission_duration_yr if mining else None,
            "best_launch_window": mining.best_launch_window if mining else None,
            "dc_score": mining.dc_score if mining else None,
            "radiation_hardness_level": mining.radiation_hardness_level if mining else None,
            "thermal_dissipation_capacity": mining.thermal_dissipation_capacity if mining else None,
            "compute_density_tflops": mining.compute_density_tflops if mining else None,
            "total_value_usd": econ.total_value_usd if econ else None,
            "composition": {
                "iron_pct": comp.iron_pct if comp else 0,
                "nickel_pct": comp.nickel_pct if comp else 0,
                "platinum_group_pct": comp.platinum_group_pct if comp else 0,
                "water_ice_pct": comp.water_ice_pct if comp else 0,
                "carbon_compounds_pct": comp.carbon_compounds_pct if comp else 0,
                "cobalt_pct": comp.cobalt_pct if comp else 0,
            },
        }
        return generate_intelligence_report(data)

@app.get("/v1/stats")
def get_stats():
    with Session(engine) as session:
        total = session.exec(select(Asteroid)).all()
        mining_rows = session.exec(select(MiningFeasibility)).all()
        econ_rows   = session.exec(select(EconomicValue)).all()
        top_val = max((e.total_value_usd or 0 for e in econ_rows), default=0)
        top_score = max((m.feasibility_score or 0 for m in mining_rows), default=0)
        top_dc    = max((m.dc_score or 0 for m in mining_rows), default=0)
        return {
            "total_asteroids": len(total),
            "highest_value":   format_value_human(top_val),
            "top_score":       f"{top_score:.1f}/10",
            "top_dc_score":    f"{top_dc:.1f}/10",
        }


@app.post("/v1/models/train")
def train_models():
    try:
        return {
            "ok": True,
            "result": train_and_save_models(engine),
        }
    except Exception as ex:
        return {"ok": False, "error": str(ex)}


@app.get("/v1/models/status")
def get_model_status():
    return model_status()


@app.get("/v1/asteroid/{spk_id}/full-report")
def get_full_report(spk_id: str):
    with Session(engine) as session:
        asteroid = session.exec(select(Asteroid).where(Asteroid.spk_id == spk_id)).first()
        if not asteroid:
            return {"error": "Not found"}
        orbital = session.exec(select(OrbitalParameters).where(OrbitalParameters.asteroid_id == asteroid.id)).first()
        comp = session.exec(select(CompositionPrediction).where(CompositionPrediction.asteroid_id == asteroid.id)).first()
        econ = session.exec(select(EconomicValue).where(EconomicValue.asteroid_id == asteroid.id)).first()
        mining = session.exec(select(MiningFeasibility).where(MiningFeasibility.asteroid_id == asteroid.id)).first()

        payload = _build_report_payload(asteroid, orbital, comp, econ, mining)
        return build_full_intelligence_report(payload)


@app.get("/v1/asteroids/full-reports")
def get_all_full_reports(limit: int = 100):
    with Session(engine) as session:
        rows = session.exec(
            select(Asteroid, OrbitalParameters, CompositionPrediction, EconomicValue, MiningFeasibility)
            .join(OrbitalParameters, OrbitalParameters.asteroid_id == Asteroid.id, isouter=True)
            .join(CompositionPrediction, CompositionPrediction.asteroid_id == Asteroid.id, isouter=True)
            .join(EconomicValue, EconomicValue.asteroid_id == Asteroid.id, isouter=True)
            .join(MiningFeasibility, MiningFeasibility.asteroid_id == Asteroid.id, isouter=True)
            .limit(limit)
        ).all()

        return [
            build_full_intelligence_report(_build_report_payload(a, o, c, e, m))
            for a, o, c, e, m in rows
        ]


def _build_report_payload(asteroid, orbital, comp, econ, mining):
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
