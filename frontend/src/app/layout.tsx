import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "ScholarMatch ",
    description: "Enterprise NLP research discovery engine using 384-dimensional dense vectors and Neon pgvector.",
};

export const metadata: Metadata = {
    title: "ScholarMatch",
    description: "Discover Research Beyond Keywords",
    icons: {
        icon: "/icon.png", // Change to "/favicon.ico" if you used that file extension
    },
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