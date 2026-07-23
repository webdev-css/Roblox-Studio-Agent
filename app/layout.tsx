import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Roblox Studio AI Agent',
  description: 'AI assistant for Roblox developers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
