from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.agent_config.service import app
from services.shared.python.settings import settings


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=settings.agent_config_port)
