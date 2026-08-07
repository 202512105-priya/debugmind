from app.services.embeddings import EmbeddingService

def dot_product(v1, v2):
    return sum(x * y for x, y in zip(v1, v2))

def test_mock_embeddings_properties():
    texts = ["database connection refused", "database connection refused", "hello world"]
    
    # 1. Generate embeddings
    embs = EmbeddingService.get_embeddings(texts)
    assert len(embs) == 3
    assert len(embs[0]) == 384
    
    # 2. Test determinism (same text = same vector)
    assert embs[0] == embs[1]
    assert embs[0] != embs[2]
    
    # 3. Test unit normalization (norm should be ~1)
    norm = sum(x * x for x in embs[0]) ** 0.5
    assert abs(norm - 1.0) < 1e-5

def test_mock_semantic_overlap_similarity():
    # Texts with overlap (sharing "connection" and "failed/refused") should be closer
    t1 = "database connection failed"
    t2 = "postgres connection refused"
    t3 = "button color is blue"
    
    vectors = EmbeddingService.get_embeddings([t1, t2, t3])
    
    sim_1_2 = dot_product(vectors[0], vectors[1])
    sim_1_3 = dot_product(vectors[0], vectors[2])
    
    print(f"Similarity 1-2 (overlap): {sim_1_2}")
    print(f"Similarity 1-3 (no overlap): {sim_1_3}")
    
    # Cosine similarity between overlap texts should be higher
    assert sim_1_2 > sim_1_3
