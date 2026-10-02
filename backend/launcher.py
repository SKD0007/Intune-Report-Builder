# Copyright 2026 Orynr LLC. Developed by SKDOSS.
# Licensed under the Apache License, Version 2.0 (see LICENSE and NOTICE).
# SPDX-License-Identifier: Apache-2.0
"""Entry point of IntuneReportBuilder.exe.

Kept deliberately light: Windows gives a service only 30 seconds to connect to
the Service Control Manager, and a cold first start (antivirus scanning the
freshly installed files) can take longer than that just to import the web app.
So in service mode we connect to Windows first and import the app afterwards,
while reporting "start pending" progress.
"""
import os
import sys


def _make_server():
    import app  # heavy: FastAPI, pydantic, cryptography, httpx ...
    return app.make_server()


def main() -> int:
    if "--service" in sys.argv:
        import winservice
        from paths import DATA_DIR
        winservice.redirect_output(os.path.join(DATA_DIR, "logs"))
        return winservice.run_as_service(_make_server)

    import app
    app.run_foreground()
    return 0


if __name__ == "__main__":
    sys.exit(main())
