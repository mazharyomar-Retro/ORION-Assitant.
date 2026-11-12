import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Orion — Personal AI Assistant",
  description: "A private, voice-first AI assistant for your day.",
  applicationName: "Orion",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Orion", statusBarStyle: "black-translucent" },
}

export const viewport: Viewport = { themeColor: "#080c14", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
