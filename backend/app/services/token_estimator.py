import re

def estimate_token_count(text: str) -> int:
    """Estimates the token count of a given text.
    
    Uses a fast regex splitting words and individual symbols to mimic BPE tokenization.
    """
    if not text:
        return 0
    # Match words, numbers, or individual punctuation marks (anything non-whitespace)
    tokens = re.findall(r"\w+|[^\w\s]", text)
    return len(tokens)
