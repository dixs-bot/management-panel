import "@/app/globals.css";
import { Providers } from "@/app/providers";

export const metadata = {
  title: "BlurAdmin Modernized",
  description: "Next.js 15, React 19 administrative dashboard dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}