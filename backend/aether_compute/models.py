from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, date

class Asteroid(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    spk_id: str = Field(unique=True, index=True)
    designation: str
    name: Optional[str] = None
    diameter_km: Optional[float] = None
    mass_kg: Optional[float] = None
    albedo: Optional[float] = None
    spectral_type: Optional[str] = None
    absolute_magnitude: Optional[float] = None
    rotation_period_hr: Optional[float] = None
    density_g_cm3: Optional[float] = None
    orbit_condition_code: Optional[int] = None
    orbit_class: Optional[str] = None
    water_ice_pct: Optional[float] = None
    carbon_compounds_pct: Optional[float] = None
    source: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OrbitalParameters(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    asteroid_id: int = Field(foreign_key="asteroid.id")
    semi_major_axis_au: Optional[float] = None
    eccentricity: Optional[float] = None
    inclination_deg: Optional[float] = None
    perihelion_au: Optional[float] = None
    aphelion_au: Optional[float] = None
    orbital_period_yr: Optional[float] = None
    moid_au: Optional[float] = None
    delta_v_km_s: Optional[float] = None

class CloseApproach(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    asteroid_id: int = Field(foreign_key="asteroid.id")
    approach_date: Optional[date] = None
    distance_au: Optional[float] = None
    relative_velocity_km_s: Optional[float] = None
    approach_duration_days: Optional[int] = None

class ClassificationResult(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    asteroid_id: int = Field(foreign_key="asteroid.id")
    predicted_class: Optional[str] = None
    confidence_score: Optional[float] = None
    shap_explanation: Optional[str] = None
    model_version: str = "xgb-v1"
    predicted_at: datetime = Field(default_factory=datetime.utcnow)

class CompositionPrediction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    asteroid_id: int = Field(foreign_key="asteroid.id")
    iron_pct: Optional[float] = None
    nickel_pct: Optional[float] = None
    platinum_group_pct: Optional[float] = None
    silicates_pct: Optional[float] = None
    water_ice_pct: Optional[float] = None
    carbon_compounds_pct: Optional[float] = None
    cobalt_pct: Optional[float] = None
    other_pct: Optional[float] = None
    confidence_level: Optional[str] = None

class EconomicValue(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    asteroid_id: int = Field(foreign_key="asteroid.id")
    iron_value_usd: Optional[float] = None
    nickel_value_usd: Optional[float] = None
    platinum_value_usd: Optional[float] = None
    cobalt_value_usd: Optional[float] = None
    water_value_usd: Optional[float] = None
    total_value_usd: Optional[float] = None
    calculation_date: date = Field(default_factory=date.today)

class MiningFeasibility(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    asteroid_id: int = Field(foreign_key="asteroid.id")
    feasibility_score: Optional[float] = None
    score_delta_v: Optional[float] = None
    score_approach_opportunity: Optional[float] = None
    score_resource_composition: Optional[float] = None
    score_economic_value: Optional[float] = None
    score_rotation_stability: Optional[float] = None
    score_size_mass: Optional[float] = None
    score_orbital_frequency: Optional[float] = None
    score_aether_compute: Optional[float] = None
    dc_score: Optional[float] = None
    thermal_dissipation_capacity: Optional[float] = None
    compute_density_tflops: Optional[float] = None
    radiation_hardness_level: Optional[str] = None
    recommended_method: Optional[str] = None
    estimated_mission_duration_yr: Optional[str] = None
    mission_difficulty: Optional[str] = None
    best_launch_window: Optional[str] = None
    spin_barrier_warning: Optional[str] = None
    rubble_pile_warning: Optional[str] = None
