// Root layout — sets HTML metadata, loads global fonts, wraps children with providers
// TODO: add Tailwind globals, fonts, and metadata when UI layer is built

export const metadata = {
  title: "郭陳維",
  description: "LINE AI 問責管家",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
