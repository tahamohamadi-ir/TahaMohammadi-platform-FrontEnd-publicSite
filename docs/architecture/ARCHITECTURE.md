# Public Site Architecture

The public site is an independently deployable consumer of the backend's published API. Runtime implementation is intentionally undecided until an ADR selects the framework and rendering strategy.

## Required layers

1. Environment validation and deployment configuration.
2. Locale-aware routing and metadata.
3. Typed API transport with timeouts and normalized errors.
4. Domain adapters that isolate backend payloads from components.
5. Accessible design-system primitives.
6. Page-family compositions.
7. Analytics and observability with privacy controls.

Page components must not call raw endpoints directly. Domain adapters own response normalization. The UI owns display states, never publication truth.

## Rendering decision criteria

SEO, bilingual routing, content freshness, preview behavior, deployment target, cache invalidation, failure recovery, bundle size, and operational simplicity must be evaluated in the ADR.
