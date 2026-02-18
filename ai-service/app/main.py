"""QIM AI Service - FastAPI application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers.ai import router as ai_router
from .config import AI_SERVICE_PORT

app = FastAPI(title="QIM AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)


@app.get("/ai/health")
async def health():
    return {"status": "ok", "service": "qim-ai"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=AI_SERVICE_PORT)
