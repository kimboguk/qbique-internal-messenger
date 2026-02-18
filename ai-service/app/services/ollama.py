import httpx
from ..config import OLLAMA_BASE_URL, OLLAMA_MODEL


async def generate(prompt: str, system: str = "") -> str:
    """Ollama API로 텍스트 생성"""
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.3,
            "num_predict": 2048,
        },
    }

    if system:
        payload["system"] = system

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("response", "").strip()
