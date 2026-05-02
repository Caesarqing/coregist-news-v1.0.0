from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.shared.python.rss import run_rss_ingestion

def main():
    return run_rss_ingestion(publisher_ids=['abc'])

if __name__ == '__main__':
    print(main())
