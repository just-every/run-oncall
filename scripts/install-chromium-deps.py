"""Bound the exceptional Playwright apt fallback after a real launch fails."""

import os
from pathlib import Path
import subprocess
import tempfile


def main():
    archives = Path(os.environ["APT_ARCHIVES"])
    archives.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="oncall-chromium-apt-") as directory:
        config = Path(directory) / "apt.conf"
        config.write_text(
            'Acquire::Retries "1";\n'
            'Acquire::http::Timeout "30";\n'
            'Acquire::https::Timeout "30";\n'
            f'Dir::Cache::archives "{archives}";\n'
        )
        # GNU timeout bounds the whole process group, including apt children.
        subprocess.run(
            ["timeout", "--kill-after=10s", "180s", "pnpm", "exec", "playwright", "install-deps", "chromium"],
            env={**os.environ, "APT_CONFIG": str(config), "DEBIAN_FRONTEND": "noninteractive"},
            check=True,
        )


if __name__ == "__main__":
    main()
