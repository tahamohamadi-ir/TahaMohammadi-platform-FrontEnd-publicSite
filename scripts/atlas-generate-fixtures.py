#!/usr/bin/env python3
"""Task 4 — generate public-site Atlas fixtures from backend@bdb546f.

Exporter/adaptor only. All fixture construction, projection, locale and
validation semantics stay in the backend:

- ``atlas_active_version`` → the small bilingual editorial graph
  (identity + 3 areas) → ``tests/fixtures/atlas/en.json`` + ``fa.json``
- ``atlas_scale_fixture`` (72 nodes / 136 relations / 6 groups) with the real
  layout engine → ``tests/fixtures/atlas/benchmark.json`` (``en`` projection)
- ``build_locale_projection`` + ``canonical_json`` produce the wire bytes;
  nothing here reimplements projection, locale resolution or validation.

The backend checkout is READ-ONLY: this script only imports it. It refuses to
run unless the source tree's HEAD is the accepted ``bdb546f``.

Usage (from Front-End/public-site)::

    env -u PYTHONPATH BACKEND_SRC=D:/Project/.atlas-worktrees/backend-plan-b \\
      D:/Project/tahamohammadi-platform/Back-End/.venv/Scripts/python.exe \\
      scripts/atlas-generate-fixtures.py --out tests/fixtures/atlas
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

ACCEPTED_BACKEND_SHA = "bdb546f4a1c269b0d3b9784cc72dc225cb862e21"

DEFAULT_BACKEND_SRC = "D:/Project/.atlas-worktrees/backend-plan-b"


def backend_head(src: Path) -> str:
    out = subprocess.run(
        ["git", "-C", str(src), "rev-parse", "HEAD"],
        capture_output=True,
        text=True,
        check=True,
    )
    return out.stdout.strip()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend", default=os.environ.get("BACKEND_SRC", DEFAULT_BACKEND_SRC))
    parser.add_argument("--out", default="tests/fixtures/atlas")
    args = parser.parse_args()

    src = Path(args.backend)
    head = backend_head(src)
    if head != ACCEPTED_BACKEND_SHA:
        print(
            f"refusing: backend HEAD is {head}, expected {ACCEPTED_BACKEND_SHA}",
            file=sys.stderr,
        )
        return 2

    sys.path.insert(0, str(src))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")

    import django

    django.setup()

    from django.core.management import call_command

    # Ephemeral in-memory database (test settings use sqlite :memory:).
    call_command("migrate", run_syncdb=True, verbosity=0)

    from apps.atlas.layout import apply_layout
    from apps.atlas.projection import build_locale_projection, canonical_json
    from apps.atlas.tests import factories

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    # --- editorial graph (active version, bilingual) ---------------------
    active = factories.atlas_active_version.__wrapped__()
    apply_layout(active.version)
    projections = {
        "en": build_locale_projection(active.version.pk, "en"),
        "fa": build_locale_projection(active.version.pk, "fa"),
    }

    # --- scale graph (benchmark) ------------------------------------------
    scale = factories.atlas_scale_fixture.__wrapped__()
    scale.apply_layout()
    projections["benchmark"] = build_locale_projection(scale.version_obj.pk, "en")

    provenance_files = {}
    for name, payload in projections.items():
        text = canonical_json(payload)
        raw = text if isinstance(text, (bytes, bytearray)) else text.encode('utf-8')
        path = out_dir / f"{name}.json"
        path.write_bytes(bytes(raw).rstrip(b'\n') + b'\n')
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        provenance_files[name] = {
            "locale": payload["locale"],
            "contractVersion": payload["contractVersion"],
            "nodeCount": len(payload["nodes"]),
            "relationCount": len(payload["relations"]),
            "groupCount": len(payload["groups"]),
            "versionMeta": payload["version"],
            "sha256": digest,
        }
        print(
            f"{name}.json: nodes={len(payload['nodes'])} "
            f"relations={len(payload['relations'])} groups={len(payload['groups'])} "
            f"sha256={digest[:16]}…"
        )

    provenance = {
        "backendSha": head,
        "generator": "scripts/atlas-generate-fixtures.py",
        "sources": [
            "apps.atlas.tests.factories.atlas_active_version (en/fa)",
            "apps.atlas.tests.factories.atlas_scale_fixture (benchmark)",
            "apps.atlas.layout.apply_layout",
            "apps.atlas.projection.build_locale_projection",
            "apps.atlas.projection.canonical_json",
        ],
        "files": provenance_files,
    }
    (out_dir / "provenance.json").write_text(
        json.dumps(provenance, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(f"backend source: {head} (accepted)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
