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

        {/*
          iOS PWA fix: when saved to home screen, tapping <a> links
          normally re-opens the full Safari browser. This intercepts
          same-origin anchor clicks and uses history.pushState instead,
          keeping navigation inside the standalone PWA.
        */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if (window.navigator.standalone) {
              document.addEventListener('click', function(e) {
                let el = e.target;
                while (el && el.tagName !== 'A') el = el.parentNode;
                if (!el || !el.href) return;
                try {
                  const url = new URL(el.href);
                  if (url.origin === window.location.origin) {
                    e.preventDefault();
                    history.pushState(null, '', url.pathname + url.search + url.hash);
                    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
                  }
                } catch (_) {}
              }, false);
            }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
