# Architecture Decision Records

<!-- PRODUCT-V2.1 -->

Current product decision: [ADR-PRODUCT-V2-EXECUTION](ADR-PRODUCT-V2-EXECUTION.md). Earlier decisions remain history where superseded by coordinating ADR-0010.
<!-- /PRODUCT-V2.1 -->

Repository-local ADRs document implementation choices evidenced in this codebase. Platform-wide decisions remain in coordination `Docs/09-decisions/` (for example ADR-0002 static-first Astro).

| ADR                                                     | Topic                                                             | Status                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------- |
| [ADR-PACKAGE-MANAGER](ADR-PACKAGE-MANAGER.md)           | npm + `package-lock.json`                                         | Accepted                                |
| [ADR-ROUTING](ADR-ROUTING.md)                           | Astro static routes, `fa`/`en` locales                            | Accepted                                |
| [ADR-DEPLOYMENT](ADR-DEPLOYMENT.md)                     | Static `dist/` artifact                                           | Accepted                                |
| [ADR-TESTING](ADR-TESTING.md)                           | Vitest + Playwright tag matrix                                    | Accepted                                |
| [ADR-BROWSER-SUPPORT](ADR-BROWSER-SUPPORT.md)           | Chromium automation + WCAG 2.2 AA target                          | Accepted                                |
| [ADR-ANIMATION](ADR-ANIMATION.md)                       | Historical CSS-only recovery                                      | Superseded for V2 packets               |
| [ADR-CONCEPT-ALIGNMENT-V2](ADR-CONCEPT-ALIGNMENT-V2.md) | Integrated Home graph hero; gateway portal; bounded GSAP/Three.js | Accepted direction; implementation open |

See also [ARCHITECTURE.md](ARCHITECTURE.md) for layer overview.
