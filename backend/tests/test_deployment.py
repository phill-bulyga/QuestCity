from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.frontend import mount_frontend


def test_render_database_url_uses_async_driver():
    config = Settings(_env_file=None, database_url="postgresql://user:pass@db/questcity")
    assert config.database_url == "postgresql+asyncpg://user:pass@db/questcity"


def test_spa_routes_keep_api_and_assets_separate(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app.js").write_text("console.log('app')")
    (tmp_path / "index.html").write_text("<html>QuestCity</html>")
    (tmp_path / "sw.js").write_text("// worker")
    app = FastAPI()

    @app.get("/api/v1/health/live")
    def health():
        return {"status": "ok"}

    mount_frontend(app, str(tmp_path))
    client = TestClient(app)
    assert "QuestCity" in client.get("/quests/example/edit").text
    assert client.get("/api/v1/health/live").json() == {"status": "ok"}
    assert client.get("/api/v1/missing").status_code == 404
    assert client.get("/assets/missing.js").status_code == 404
    assert client.get("/missing.js").status_code == 404
    assert client.get("/assets/app.js").text == "console.log('app')"
    assert client.get("/sw.js").text == "// worker"
    assert client.get("/quests").headers["cache-control"] == "no-cache"
    assert client.get("/../outside.txt").status_code == 404
