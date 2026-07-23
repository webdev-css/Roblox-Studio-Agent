import React from 'react'

export const metadata = {
  title: 'Roblox Studio AI Agent',
  description: 'AI assistant for Roblox developers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#09090b', color: '#fff' }}>
        {children}
      </body>
    </html>
  )
  }
