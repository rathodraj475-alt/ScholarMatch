import os
import re
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastembed import TextEmbedding
from app.database import get_db

model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    print("Binding port complete. Loading lightweight FastEmbed model...")
    # FastEmbed uses ONNX, bypassing the massive PyTorch memory footprint
    model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
    print("FastEmbed model loaded and ready.")
    yield

app = FastAPI(title="ScholarMatch Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

def get_model():
    global model
    if model is None:
        model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
    return model

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ScholarMatch Backend",
        "model_loaded": model is not None
    }

@app.get("/api/categories")
def get_categories(db=Depends(get_db)):
    try:
        query = """
            SELECT category_code, category_name, COUNT(*) as paper_count 
            FROM documents 
            GROUP BY category_code, category_name 
            ORDER BY paper_count DESC;
        """
        rows = db.run(query)
        return [
            {"category_code": r[0], "category_name": r[1], "paper_count": r[2]}
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recommend")
def recommend_papers(
    query_text: Optional[str] = Query(None),
    arxiv_id: Optional[str] = Query(None),
    category_filter: Optional[str] = Query(None),
    limit: int = Query(42, ge=1, le=100),
    db=Depends(get_db)
):
    embedder = get_model()

    if query_text and not arxiv_id:
        if re.search(r'\b\d{4}\.\d{4,5}(v\d+)?\b', query_text):
            match = re.search(r'\b\d{4}\.\d{4,5}(v\d+)?\b', query_text)
            arxiv_id = match.group(0)
            query_text = None

    if not query_text and not arxiv_id:
        raise HTTPException(status_code=400, detail="Must provide either query_text or arxiv_id.")

    try:
        sql_params = {}
        where_conditions = []

        if arxiv_id:
            res = db.run(
                "SELECT title, abstract, arxiv_id FROM documents WHERE arxiv_id LIKE :aid LIMIT 1",
                aid=f"%{arxiv_id.strip()}%"
            )
            if not res:
                raise HTTPException(status_code=404, detail=f"arXiv ID '{arxiv_id}' not found in database.")
            
            target_title = res[0][0]
            target_abstract = res[0][1]
            text_to_embed = f"{target_title}. {target_abstract}"
            
            # FastEmbed requires a list of strings and returns a generator
            emb = list(embedder.embed([text_to_embed]))[0].tolist()
            query_vector = f"[{','.join(map(str, emb))}]"
        else:
            emb = list(embedder.embed([query_text]))[0].tolist()
            query_vector = f"[{','.join(map(str, emb))}]"

        if category_filter and category_filter != "ALL":
            where_conditions.append("category_code = :cat")
            sql_params["cat"] = category_filter

        where_stmt = ("WHERE " + " AND ".join(where_conditions)) if where_conditions else ""

        sql_params["q_vec"] = query_vector
        sql_params["lim"] = limit

        sql = f"""
            SELECT 
                id, arxiv_id, title, authors, category_code, category_name, 
                abstract, pdf_url, published_date,
                ROUND((1 - (embedding <=> :q_vec::vector))::numeric, 4) * 100 AS similarity_score
            FROM documents
            {where_stmt}
            ORDER BY embedding <=> :q_vec::vector ASC
            LIMIT :lim;
        """

        rows = db.run(sql, **sql_params)
        
        results = [
            {
                "id": r[0],
                "arxiv_id": r[1],
                "title": r[2],
                "authors": r[3],
                "category_code": r[4],
                "category_name": r[5],
                "abstract": r[6],
                "pdf_url": r[7],
                "published_date": str(r[8]),
                "similarity_score": float(r[9])
            }
            for r in rows
        ]

        return {
            "query_type": "arxiv_id" if arxiv_id else "semantic_abstract",
            "total_matches": len(results),
            "recommendations": results
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] /api/recommend: {e}")
        raise HTTPException(status_code=500, detail=f"Vector search failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)