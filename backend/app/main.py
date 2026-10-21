import os
import re
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
from app.database import get_db

app = FastAPI(title="ScholarMatch Backend")

# Allow all origins so frontend on port 3000 / 3001 never gets blocked
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

print("Loading NLP Model (all-MiniLM-L6-v2)...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("Model ready.")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ScholarMatch Backend"}

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
    limit: int = Query(15, ge=1, le=100),
    db=Depends(get_db)
):
    # Smart routing: If a user pastes an arXiv ID into the Abstract search box, detect and fix it.
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

        # 1. Resolve query vector safely
        if arxiv_id:
            # Use LIKE to match IDs even if user forgets the version tag
            res = db.run(
                "SELECT title, abstract, arxiv_id FROM documents WHERE arxiv_id LIKE :aid LIMIT 1",
                aid=f"%{arxiv_id.strip()}%"
            )
            if not res:
                raise HTTPException(status_code=404, detail=f"arXiv ID '{arxiv_id}' not found in database.")
            
            # Re-encode the exact text to maintain flawless 384-D precision
            target_title = res[0][0]
            target_abstract = res[0][1]

            emb = model.encode(f"{target_title}. {target_abstract}").tolist()
            query_vector = f"[{','.join(map(str, emb))}]"
            
        else:
            emb = model.encode(query_text).tolist()
            query_vector = f"[{','.join(map(str, emb))}]"

        # 2. Add optional category filter
        if category_filter and category_filter != "ALL":
            where_conditions.append("category_code = :cat")
            sql_params["cat"] = category_filter

        where_stmt = ("WHERE " + " AND ".join(where_conditions)) if where_conditions else ""

        # 3. Execute HNSW Vector Search
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