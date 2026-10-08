import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Noto_Sans_JP } from 'next/font/google';
import './globals.css';

// Be Vietnam Pro thiết kế riêng cho dấu thanh tiếng Việt (Inter hay bị lệch/dồn dấu).
const sansVi = Be_Vietnam_Pro({
  variable: '--font-sans-vi',
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const notoSansJP = Noto_Sans_JP({
  variable: '--font-noto-sans-jp',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Game Team Hub - MVP v0.1',
  description: 'Hệ thống quản lý task, video gameplay và lưu trữ file build cho Game Studio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${sansVi.variable} ${notoSansJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
        {children}
      </body>
    </html>
  );
}
