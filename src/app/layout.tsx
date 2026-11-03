import type { Metadata } from "next";
import { Open_Sans, VT323 } from "next/font/google";
import { IconSprite } from "@/components/site/IconSprite";
import "./globals.css";

const openSans = Open_Sans({ variable: "--font-open-sans", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700", "800"] });
const vt323 = VT323({ variable: "--font-vt323", subsets: ["latin", "latin-ext"], weight: "400" });

export const metadata: Metadata = {
  title: { default: "DTHU – Dice Throne Hungary", template: "%s · DTHU" },
  description: "A magyar Dice Throne közösség oldala: online bajnokság, időpontfoglaló, közelgő meccsek.",
};

// Every page depends on the signed-in visitor and live data.
export const dynamic = "force-dynamic";

// Applies the saved light/dark choice before the first paint (see components/site/ThemeToggle).
const themeScript = `try{var t=localStorage.getItem("dthu:theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${openSans.variable} ${vt323.variable} antialiased`}>
        <IconSprite />
        {children}
      </body>
    </html>
  );
}
