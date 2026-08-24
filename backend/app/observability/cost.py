from typing import Dict, Any

MODEL_PRICING: Dict[str, Dict[str, float]] = {
    "gpt-4o-mini": {
        "input_per_1k": 0.00015,
        "output_per_1k": 0.0006,
    },
    "gpt-4o": {
        "input_per_1k": 0.0025,
        "output_per_1k": 0.010,
    },
    "text-embedding-3-small": {
        "input_per_1k": 0.00002,
        "output_per_1k": 0.0,
    },
}

DEFAULT_MODEL_PRICING = {
    "input_per_1k": 0.00015,
    "output_per_1k": 0.0006,
}

def calculate_llm_cost(model_name: str, input_tokens: int, output_tokens: int) -> float:
    pricing = MODEL_PRICING.get(model_name.lower(), DEFAULT_MODEL_PRICING)
    input_cost = (input_tokens / 1000.0) * pricing["input_per_1k"]
    output_cost = (output_tokens / 1000.0) * pricing["output_per_1k"]
    return round(input_cost + output_cost, 6)
