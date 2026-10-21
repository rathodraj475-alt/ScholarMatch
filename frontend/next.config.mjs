/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        // Replace the fallback string with your EXACT Render backend URL
        const rawUrl = process.env.NEXT_PUBLIC_API_URL || "https://scholarmatch-backend.onrender.com";

        // This strips any accidental trailing slashes to prevent 404s
        const cleanUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

        return [
            {
                source: "/api/:path*",
                destination: `${cleanUrl}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;