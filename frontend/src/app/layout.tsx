import "./globals.css";
import { Orbitron, Sora } from "next/font/google";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-main",
  weight: ["400", "500", "600", "700", "800"],
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

export const metadata = {
  title: "AstroMine Intelligence",
  description: "Asteroid mining and Aether-Compute dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${orbitron.variable}`}>{children}</body>
    </html>
  );
}
