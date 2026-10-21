import os
import time
from urllib.parse import urlparse
import arxiv
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

# Load environment variables from .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in backend/.env")

# 6 Core Research Categories (400 papers each = 2,400 total)
CATEGORIES = [
    {"code": "quant-ph", "name": "Quantum Computation"}
]

PAPERS_PER_CAT = 400
BATCH_SIZE = 50

# Initialize Sentence Transformer
print("Initializing Sentence Transformer model (all-MiniLM-L6-v2)...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("Model loaded successfully.\n")

# Connect to Database (Compatible with pg8000 or psycopg2/psycopg)
parsed = urlparse(DATABASE_URL)
use_pg8000 = False

try:
    import pg8000.native
    conn = pg8000.native.Connection(
        user=parsed.username,
        password=parsed.password,
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path.lstrip("/"),
        ssl_context=True
    )
    use_pg8000 = True
    print("Connected to Neon DB using pg8000.")
except ImportError:
    try:
        # pyrefly: ignore[missing-import]
        import psycopg
        conn = psycopg.connect(DATABASE_URL)
        cur = conn.cursor()
        print("Connected to Neon DB using psycopg v3.")
    except ImportError:
        import psycopg2
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        print("Connected to Neon DB using psycopg2.")

# Configure official arXiv client with rate-limit delays
client = arxiv.Client(
    page_size=100,
    delay_seconds=3.0,
    num_retries=5
)

def insert_batch(records):
    if not records:
        return 0

    # 1. Batch compute embeddings in one model call
    texts = [r["text_for_embedding"] for r in records]
    embeddings = model.encode(texts, batch_size=32, show_progress_bar=False)

    inserted_count = 0
    if use_pg8000:
        sql = """
            INSERT INTO documents (
                arxiv_id, title, authors, category_code, category_name, 
                abstract, pdf_url, published_date, embedding
            ) VALUES (
                :aid, :title, :authors, :cat_code, :cat_name, 
                :abstract, :pdf_url, :pub_date, :emb::vector
            )
            ON CONFLICT (arxiv_id) DO NOTHING;
        """
        for r, emb in zip(records, embeddings):
            emb_str = f"[{','.join(map(str, emb.tolist()))}]"
            conn.run(
                sql,
                aid=r["arxiv_id"],
                title=r["title"],
                authors=r["authors"],
                cat_code=r["category_code"],
                cat_name=r["category_name"],
                abstract=r["abstract"],
                pdf_url=r["pdf_url"],
                pub_date=r["published_date"],
                emb=emb_str
            )
            inserted_count += 1
    else:
        sql = """
            INSERT INTO documents (
                arxiv_id, title, authors, category_code, category_name, 
                abstract, pdf_url, published_date, embedding
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::vector)
            ON CONFLICT (arxiv_id) DO NOTHING;
        """
        insert_data = [
            (
                r["arxiv_id"],
                r["title"],
                r["authors"],
                r["category_code"],
                r["category_name"],
                r["abstract"],
                r["pdf_url"],
                r["published_date"],
                f"[{','.join(map(str, emb.tolist()))}]"
            )
            for r, emb in zip(records, embeddings)
        ]
        cur.executemany(sql, insert_data)
        conn.commit()
        inserted_count = len(insert_data)

    return inserted_count

total_all_indexed = 0

for cat in CATEGORIES:
    print(f"\n=======================================================")
    print(f"Fetching {PAPERS_PER_CAT} papers for: {cat['name']} ({cat['code']})")
    print(f"=======================================================")

    search = arxiv.Search(
        query=f"cat:{cat['code']}",
        max_results=PAPERS_PER_CAT,
        sort_by=arxiv.SortCriterion.SubmittedDate,
        sort_order=arxiv.SortOrder.Descending
    )

    batch = []
    cat_indexed = 0

    try:
        for paper in client.results(search):
            arxiv_id = paper.get_short_id()
            title = paper.title.replace("\n", " ").strip()
            abstract = paper.summary.replace("\n", " ").strip()
            authors = ", ".join([a.name for a in paper.authors[:4]])
            pdf_url = paper.pdf_url
            pub_date = paper.published.date()

            batch.append({
                "arxiv_id": arxiv_id,
                "title": title,
                "authors": authors,
                "category_code": cat["code"],
                "category_name": cat["name"],
                "abstract": abstract,
                "pdf_url": pdf_url,
                "published_date": pub_date,
                "text_for_embedding": f"{title}. {abstract}"
            })

            if len(batch) >= BATCH_SIZE:
                count = insert_batch(batch)
                cat_indexed += count
                total_all_indexed += count
                print(f"[{cat['code']}] Progress: {cat_indexed}/{PAPERS_PER_CAT} indexed.")
                batch = []

        # Flush remaining records
        if batch:
            count = insert_batch(batch)
            cat_indexed += count
            total_all_indexed += count
            print(f"[{cat['code']}] Final batch indexed: {cat_indexed}/{PAPERS_PER_CAT}.")

    except Exception as e:
        print(f"Error fetching from arXiv for {cat['code']}: {e}")

# Clean up connections
if use_pg8000:
    conn.close()
else:
    cur.close()
    conn.close()

print(f"\nSeeding complete! Successfully indexed {total_all_indexed} research papers in Neon Postgres.")