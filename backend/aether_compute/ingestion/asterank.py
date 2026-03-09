import requests
from typing import List

ASTERANK_API = "http://asterank.com/api/asterank"

def fetch_top_mining_candidates(limit: int = 100) -> List[dict]:
    url = (
        f"{ASTERANK_API}?query={{}}&limit={limit}"
        "&fields=spkid,full_name,a,e,i,dv,closeness,profit,moid,spec,diameter,price,per_y"
    )
    try:
        response = requests.get(url, timeout=20)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Asterank fetch failed: {e}. Using synthetic data.")
        return _generate_synthetic_asteroids(limit)

def _generate_synthetic_asteroids(count: int) -> list:
    import random, math
    types = ["M-type", "S-type", "C-type", "D-type", "V-type"]
    data  = []
    for i in range(count):
        a = 0.5 + random.random() * 4.5
        e = random.random() * 0.6
        data.append({
            "spkid":     f"SYNTH-{i+1000}",
            "full_name": f"Synthetic Asteroid {i+1000}",
            "a": a, "e": e,
            "i": random.random() * 30,
            "dv": 3 + random.random() * 10,
            "moid": random.random() * 0.5,
            "spec": random.choice(types),
            "diameter": random.random() * 30,
            "per_y": a ** 1.5,
        })
    return data
