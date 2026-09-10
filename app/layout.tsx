import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant"
});

export const metadata: Metadata = {
  title: "myday — персональный планер",
  description: "Локальный pastel planner для личного использования"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var saved=localStorage.getItem("soft-planner-recovered-v2");if(saved){var parsed=JSON.parse(saved);if(parsed&&parsed.theme){document.documentElement.dataset.theme=parsed.theme;}}}catch(e){}`
          }}
        />
      </head>
      <body className={`${inter.variable} ${cormorant.variable}`}>{children}</body>
    </html>
  );
}
