import type { Metadata } from "next";
import "./globals.css";
import { ClientLayout } from "@/shared/components/layout/ClientLayout";

export const metadata: Metadata = {
  title: "Life Trace",
  description: "App description",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="font-sans antialiased">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
