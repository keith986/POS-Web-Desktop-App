import type { Metadata } from "next";
import IdleTimeoutWarning from "./components/IdleTimeoutWarning";
import { AnalyticsTracker } from "./components/AnalyticsTracker";
//import "./globals.css";
//import { Geist, Geist_Mono } from "next/font/google";

/*
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
*/

export const metadata: Metadata = {
  title: "POStore",
  description: "Get started with our POS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <meta name="google-site-verification" content="MucOc8Ep8Isg02mvPQfM2s4LcpDiS374o2ljAFpNy_4" />
      <body
        className={`antialiased`}
      >
        <IdleTimeoutWarning />
        <AnalyticsTracker domain={process.env.NEXT_PUBLIC_DOMAIN ?? ""} />
        {children}
      </body>
    </html>
  );
}


