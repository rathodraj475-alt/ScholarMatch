"use client";
import React, { useState } from "react";
import {
  Search,
  Sparkles,
  ExternalLink,
  Database,
  Compass,
  Hash,
  ArrowUpRight,
  Filter,
  FileText,
  Users,
  Cpu,
  X,
  BookOpen
} from "lucide-react";

interface PaperResult {
  id: number;
  arxiv_id: string;
  title: string;
  authors: string;
  category_code: string;
  category_name: string;
  abstract: string;
  pdf_url: string;
  published_date: string;
  similarity_score: number;
}

const CATEGORIES = [
  { code: "ALL", label: "All Corpora" },
  { code: "cs.CL", label: "NLP & Language" },
  { code: "cs.CV", label: "Computer Vision" },
  { code: "cs.AI", label: "Artificial Intelligence" },
  { code: "stat.ML", label: "Machine Learning" },
  { code: "cs.IR", label: "Information Retrieval" },
  { code: "quant-ph", label: "Quantum Computation" },
];

const PRESETS = [
  "Zero-shot reasoning in large language models using chain-of-thought prompting",
  "Diffusion models for high-resolution conditional image synthesis",
  "Variational quantum eigensolver error mitigation for noisy intermediate-scale quantum devices",
  "Dense passage retrieval and vector embeddings for open-domain question answering",
];

export default function ScholarMatchApp() {
  const [mode, setMode] = useState<"text" | "id">("text");
  const [queryText, setQueryText] = useState("");
  const [arxivId, setArxivId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [results, setResults] = useState<PaperResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeModalPaper, setActiveModalPaper] = useState<PaperResult | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const handleRecommend = async (e?: React.FormEvent, directQuery?: string) => {
    if (e) e.preventDefault();
    const effectiveQuery = directQuery !== undefined ? directQuery : queryText;

    setErrorMsg("");
    if (mode === "text" && !effectiveQuery.trim()) return;
    if (mode === "id" && !arxivId.trim()) return;

    setLoading(true);

    try {
      const url = new URL(`${backendUrl}/api/recommend`);
      if (mode === "text") {
        url.searchParams.append("query_text", effectiveQuery.trim());
      } else {
        url.searchParams.append("arxiv_id", arxivId.trim());
      }

      if (selectedCategory !== "ALL") {
        url.searchParams.append("category_filter", selectedCategory);
      }

      // Request 42 results (6 Top + 36 Extended)
      url.searchParams.append("limit", "42");

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server returned status ${res.status}`);
      }

      const data = await res.json();

      if (data && Array.isArray(data.recommendations)) {
        setResults(data.recommendations);
      } else {
        setResults([]);
      }
    } catch (err: any) {
      console.error("Fetch failure error:", err);
      setErrorMsg(err.message || "Failed to connect to backend inference engine.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 75) {
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    }
    if (score >= 50) {
      return "text-indigo-400 bg-indigo-500/10 border-indigo-500/30";
    }
    return "text-amber-400 bg-amber-500/10 border-amber-500/30";
  };

  const topResults = results.slice(0, 6);
  const extendedResults = results.slice(6);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-indigo-600/10 blur-[140px] pointer-events-none -z-10" />

      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-base">ScholarMatch</span>
                <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-semibold">
                  v2.0 NLP
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs font-mono text-slate-400">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Neon pgvector</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>2,400 arXiv Papers</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 flex-1 w-full space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5" /> Dense Vector Embeddings (384-D) & HNSW Indexing
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Discover Research Beyond Keywords
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            Formulate complex research methodologies, questions, or arXiv IDs to retrieve contextually aligned preprints using high-dimensional cosine distance.
          </p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/90 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
              <button
                type="button"
                onClick={() => { setMode("text"); setErrorMsg(""); }}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${mode === "text"
                    ? "bg-indigo-600 text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                <FileText className="w-3.5 h-3.5" /> Abstract / Concept Query
              </button>
              <button
                type="button"
                onClick={() => { setMode("id"); setErrorMsg(""); }}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${mode === "id"
                    ? "bg-indigo-600 text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                <Hash className="w-3.5 h-3.5" /> Direct arXiv ID
              </button>
            </div>
            <span className="text-xs font-mono text-slate-500 hidden sm:inline">Model: all-MiniLM-L6-v2</span>
          </div>

          <form onSubmit={(e) => handleRecommend(e)} className="space-y-5">
            {mode === "text" ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Research Abstract or Methodology Statement
                </label>
                <textarea
                  rows={4}
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="Paste research problem statement, excerpt, or abstract..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed font-sans transition-all"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Target Paper Identifier
                </label>
                <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                  <span className="text-slate-500 font-mono text-sm mr-2 select-none">arXiv:</span>
                  <input
                    type="text"
                    value={arxivId}
                    onChange={(e) => setArxivId(e.target.value)}
                    placeholder="1706.03762 or 2005.14165"
                    className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none font-mono"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3 h-3 text-slate-500" /> Corpus Domain Restriction
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.code}
                    type="button"
                    onClick={() => setSelectedCategory(cat.code)}
                    className={`text-xs px-3.5 py-1.5 rounded-lg border transition-all whitespace-nowrap ${selectedCategory === cat.code
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                        : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                      }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                Calculates angular vector distance on 2,400 indexed research documents
              </span>

              <button
                type="submit"
                disabled={loading || (mode === "text" ? !queryText.trim() : !arxivId.trim())}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/30"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Inference Processing...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Run Semantic Recommendation</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {mode === "text" && (
            <div className="pt-4 border-t border-slate-800/80 space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Quick Test Queries:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQueryText(p);
                      handleRecommend(undefined, p);
                    }}
                    className="text-left text-xs text-slate-400 bg-slate-950/60 hover:bg-slate-800/80 hover:text-indigo-300 border border-slate-800/80 px-3 py-2 rounded-lg transition-colors truncate"
                  >
                    "{p}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Top 6 Results Matrix */}
        {topResults.length > 0 && (
          <div className="space-y-5 pt-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">Top Recommended Papers</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ranked by highest Cosine Similarity via HNSW vector index
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
                Top 6 of {results.length} matches
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {topResults.map((paper) => {
                const badgeStyle = getScoreBadge(paper.similarity_score);
                return (
                  <div
                    key={paper.id}
                    className="group bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {paper.category_code}
                        </span>
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${badgeStyle}`}>
                          {paper.similarity_score}% match
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors leading-snug line-clamp-2">
                        {paper.title}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-1 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{paper.authors}</span>
                      </p>

                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {paper.abstract}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveModalPaper(paper)}
                        className="text-slate-400 hover:text-white underline underline-offset-4 transition-colors text-[11px]"
                      >
                        Inspect Abstract
                      </button>

                      <a
                        href={paper.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-medium transition-all"
                      >
                        <span>arXiv PDF</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Extended Results Matrix (The next 36 papers) */}
        {extendedResults.length > 0 && (
          <div className="space-y-5 pt-8 mt-8 border-t border-slate-800/40">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-slate-300">Extended Matches</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Additional highly correlated research papers
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-90 hover:opacity-100 transition-opacity">
              {extendedResults.map((paper) => {
                const badgeStyle = getScoreBadge(paper.similarity_score);
                return (
                  <div
                    key={paper.id}
                    className="bg-slate-900/20 hover:bg-slate-900/60 border border-slate-800/60 hover:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between transition-all duration-200"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/50 text-slate-400 border border-slate-700/50">
                          {paper.category_code}
                        </span>
                        <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${badgeStyle}`}>
                          {paper.similarity_score}% match
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-slate-200 leading-snug line-clamp-2">
                        {paper.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {paper.authors}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-800/40 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setActiveModalPaper(paper)}
                        className="text-[10px] text-slate-400 hover:text-slate-200 underline underline-offset-2"
                      >
                        Abstract
                      </button>
                      <a
                        href={paper.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium transition-all"
                      >
                        <span>PDF</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Abstract Full-View Modal */}
      {activeModalPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 max-w-2xl w-full rounded-2xl p-6 sm:p-7 space-y-4 shadow-2xl relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20">
                  {activeModalPaper.category_name} ({activeModalPaper.category_code})
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-2 leading-snug">
                  {activeModalPaper.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Authors: {activeModalPaper.authors}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalPaper(null)}
                className="text-slate-400 hover:text-white text-sm bg-slate-800/80 hover:bg-slate-800 p-2 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Full Abstract
              </span>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-72 overflow-y-auto text-xs text-slate-300 leading-relaxed font-sans">
                {activeModalPaper.abstract}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono text-slate-500">
                arXiv:{activeModalPaper.arxiv_id}
              </span>
              <a
                href={activeModalPaper.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-all shadow-md"
              >
                <span>Read Full Preprint</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}