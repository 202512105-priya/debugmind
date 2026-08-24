import re

# Sensitive credential regex patterns
SECRET_PATTERNS = [
    # Database URLs with passwords
    (r"(postgres(?:ql)?://[^:]+:)([^@]+)(@[^\s\"'\n]+)", r"\1[REDACTED]\3"),
    (r"(mysql://[^:]+:)([^@]+)(@[^\s\"'\n]+)", r"\1[REDACTED]\3"),
    # OpenAI / Anthropic / AI API Keys
    (r"sk-[a-zA-Z0-9\-_]{16,}", "sk-[REDACTED]"),
    (r"bearer\s+[a-zA-Z0-9\-_=\.]{16,}", "Bearer [REDACTED]", re.IGNORECASE),
    # AWS Access Keys
    (r"AKIA[0-9A-Z]{16}", "AKIA[REDACTED]"),
    # JWT Secrets / Passwords in key-value format
    (r"(?i)(password|secret|api[_-]?key|jwt[_-]?secret)\s*[:=]\s*[\"']?([^\s\"'\n;,]+)[\"']?", r"\1=[REDACTED]"),
]

def redact_secrets(text: str) -> str:
    if not text:
        return text

    sanitized = text
    for pattern_tuple in SECRET_PATTERNS:
        pattern = pattern_tuple[0]
        replacement = pattern_tuple[1]
        flags = pattern_tuple[2] if len(pattern_tuple) > 2 else 0
        sanitized = re.sub(pattern, replacement, sanitized, flags=flags)

    return sanitized
