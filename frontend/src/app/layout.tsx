import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "ScholarMatch | Semantic Research Paper Recommendation Engine",
    description: "Enterprise NLP research discovery engine using 384-dimensional dense vectors and Neon pgvector.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="bg-[#030712] text-slate-100 min-h-screen selection:bg-indigo-500 selection:text-white">
                {children}
            </body>
        </html>
    );
}