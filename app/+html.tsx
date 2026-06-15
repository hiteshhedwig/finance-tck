import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover makes content fill the notch/dynamic island area */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* PWA: standalone fullscreen on iOS home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Finance" />

        {/* Android/browser theme color */}
        <meta name="theme-color" content="#0F0F14" />

        {/* Home screen icon */}
        <link rel="apple-touch-icon" href="/assets/icon.png" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{
          __html: `
            html, body, #root {
              background-color: #0F0F14;
              height: 100%;
              margin: 0;
            }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
