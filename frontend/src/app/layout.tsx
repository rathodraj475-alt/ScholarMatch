import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "ScholarMatch | Semantic Research Paper Recommendation Engine",
    description: "Discover Research Beyond Keywords using dense vector embeddings.",
    icons: {
        icon: [
            {
                url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='25' fill='%235856D6'/><circle cx='50' cy='50' r='28' fill='none' stroke='white' stroke-width='8'/><polygon points='50,28 62,62 50,54 38,62' fill='white'/></svg>",
                type: "image/svg+xml",
            },
        ],
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}