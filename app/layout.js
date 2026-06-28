import Providers from "@/components/Providers";
import "./globals.css";

export const metadata = {
  title: "SQL Studio Pro",
  description: "A Vercel-ready offline SQL editor powered by PGlite and Monaco.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
