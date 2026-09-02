# Architecture Decision Records

Repository-local ADRs document implementation choices evidenced in this codebase. Platform-wide decisions remain in coordination `Docs/09-decisions/` (for example ADR-0002 static-first Astro).

| ADR                                           | Topic                                    | Status   |
| --------------------------------------------- | ---------------------------------------- | -------- |
| [ADR-PACKAGE-MANAGER](ADR-PACKAGE-MANAGER.md) | npm + `package-lock.json`                | Accepted |
| [ADR-ROUTING](ADR-ROUTING.md)                 | Astro static routes, `fa`/`en` locales   | Accepted |
| [ADR-DEPLOYMENT](ADR-DEPLOYMENT.md)           | Static `dist/` artifact                  | Accepted |
| [ADR-TESTING](ADR-TESTING.md)                 | Vitest + Playwright tag matrix           | Accepted |
| [ADR-BROWSER-SUPPORT](ADR-BROWSER-SUPPORT.md) | Chromium automation + WCAG 2.2 AA target | Accepted |
| [ADR-ANIMATION](ADR-ANIMATION.md)             | CSS-first motion; no GSAP/Three.js       | Accepted |

See also [ARCHITECTURE.md](ARCHITECTURE.md) for layer overview.
