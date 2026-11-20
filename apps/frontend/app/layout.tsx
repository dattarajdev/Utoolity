import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DEFAULT_WALLPAPER_ID, WALLPAPER_STORAGE_KEY } from "@/lib/wallpapers";
import { GENERATED_WALLPAPERS } from "@/lib/wallpapers.generated";
import { Nunito } from "next/font/google";
import { TooltipProvider } from "@repo/ui/shadcn/tooltip";
import DeviceTheme from "@/components/shared/DeviceTheme";
import BrowserGuards from "@/components/shared/BrowserGuards";
import CustomCursor from "@/components/shared/CustomCursor";
import { InitialDesktopPreferencesProvider } from "@/components/shared/InitialDesktopPreferences";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Utoolity",
  description: "Your utility application",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialWallpaperId =
    cookieStore.get(WALLPAPER_STORAGE_KEY)?.value ?? DEFAULT_WALLPAPER_ID;
  const themeCookie = cookieStore.get("utoolity.theme")?.value;
  const initialTheme = themeCookie === "dark" ? "dark" : "light";

  return (
    <html
      lang="en"
      className={`${nunito.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background min-h-full font-sans overscroll-none">
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const saved = localStorage.getItem("utoolity.theme");
                const theme = saved === "dark" || saved === "light"
                  ? saved
                  : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
                const root = document.documentElement;
                root.classList.toggle("dark", theme === "dark");
                root.classList.toggle("light", theme === "light");
                root.style.colorScheme = theme;
                const wallpapers = ${JSON.stringify(GENERATED_WALLPAPERS.map(({ id, url, darkUrl, lightUrl, kind }) => ({ id, url, darkUrl, lightUrl, kind })))};
                const wallpaperCookie = document.cookie.split("; ").find((item) => item.startsWith("utoolity.wallpaper="))?.split("=").slice(1).join("=") || "";
                const storedWallpaper = localStorage.getItem("utoolity.wallpaper") || decodeURIComponent(wallpaperCookie);
                const wallpaper = wallpapers.find((item) => item.id === storedWallpaper) || wallpapers[0];
                if (wallpaper && wallpaper.kind === "image") {
                  const wallpaperUrl = (theme === "dark" ? wallpaper.darkUrl : wallpaper.lightUrl) || wallpaper.url;
                  root.style.setProperty("--utoolity-cached-wallpaper", 'url("' + wallpaperUrl + '")');
                  root.dataset.wallpaper = wallpaper.id;
                }
              } catch {}
            })();`,
          }}
        />
        <DeviceTheme />
        <CustomCursor />
        <BrowserGuards />
        <TooltipProvider delayDuration={200}>
          <InitialDesktopPreferencesProvider
            value={{ wallpaperId: initialWallpaperId, theme: initialTheme }}
          >
            <div className="flex min-h-screen">
              {/* <Sidebar /> */}

              <main className="min-w-0 flex-1">{children}</main>
            </div>
          </InitialDesktopPreferencesProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
