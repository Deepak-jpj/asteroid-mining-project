import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import create_engine
from aether_compute.ml.modeling import train_and_save_models
from generate_full_reports import generate

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aether.db")
engine = create_engine(DATABASE_URL, echo=False)


if __name__ == "__main__":
    out = train_and_save_models(engine)
    reports = generate(engine)
    print({"training": out, "reports": reports})
