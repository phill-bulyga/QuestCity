from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


def mount_frontend(app: FastAPI, directory: str) -> None:
    """Serve the built SPA from the API origin, keeping auth cookies same-site."""
    root = Path(directory).resolve()
    if not (root / "index.html").is_file():
        raise RuntimeError("The configured frontend build is missing index.html")
    app.mount("/assets", StaticFiles(directory=root / "assets"), name="frontend-assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def frontend(path: str) -> FileResponse:
        # Unknown API/media requests must never become a successful HTML response.
        if path.split("/", 1)[0] in {"api", "media", "docs", "redoc", "openapi.json"}:
            raise HTTPException(404, "Not found")
        candidate = (root / path).resolve()
        if candidate.is_relative_to(root) and candidate.is_file():
            return FileResponse(candidate)
        if Path(path).suffix:
            raise HTTPException(404, "Not found")
        return FileResponse(root / "index.html", headers={"Cache-Control": "no-cache"})
