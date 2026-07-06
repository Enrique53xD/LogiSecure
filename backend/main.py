"""FastAPI entry point for the LogiSecure backend. Scaffolding only — no routes yet."""

from fastapi import FastAPI

app = FastAPI(title="LogiSecure API")


@app.get("/health")
def health():
    return {"status": "ok"}
