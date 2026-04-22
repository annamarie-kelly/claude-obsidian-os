import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Loops",
  description: "Triage, plan, and focus on every open `- [ ]` in your Obsidian vault.",
  icons: {
    icon: "/icon_v5_cream_on_mauve.png",
    shortcut: "/icon_v5_cream_on_mauve.png",
    apple: "/icon_v5_cream_on_mauve.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Prevent FOUC when a user has picked Light/Dark explicitly. Runs
            before first paint so the correct data-theme attribute is set. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('loops-ui:theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
