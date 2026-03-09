MARKET_PRICES_USD_PER_TON = {
    "iron_pct":             120,
    "nickel_pct":           14_000,
    "platinum_group_pct":   30_000_000,
    "cobalt_pct":           33_000,
    "water_ice_pct":         1_000,
    "carbon_compounds_pct":    500,
    "silicates_pct":            50,
}

def estimate_economic_value(mass_kg: float, composition: dict) -> dict:
    if not mass_kg:
        return {"total_value_usd": 0.0}
    mass_tons = mass_kg / 1000.0
    values = {}
    for element, price in MARKET_PRICES_USD_PER_TON.items():
        pct = composition.get(element, 0.0)
        values[element.replace("_pct", "_value_usd")] = round(mass_tons * (pct / 100.0) * price, 0)
    values["total_value_usd"] = round(sum(values.values()), 0)
    return values

def format_value_human(value_usd: float) -> str:
    if not value_usd:
        return "Unknown"
    if value_usd >= 1e12: return f"${value_usd / 1e12:.2f} trillion"
    if value_usd >= 1e9:  return f"${value_usd / 1e9:.2f} billion"
    if value_usd >= 1e6:  return f"${value_usd / 1e6:.2f} million"
    return f"${value_usd:,.0f}"
