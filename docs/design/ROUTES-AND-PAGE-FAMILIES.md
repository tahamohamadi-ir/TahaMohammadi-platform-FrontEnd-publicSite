# Routes and Page Families

Canonical route families and alternate/redirect rules are owned by `../../../Docs/02-architecture/ROUTE-REGISTRY.md`. PF-01 through PF-08 visual detail is owned by `../../../Docs/04-design/PAGE-FAMILY-UI-UX-CONTRACT.md`. This repository may implement neither a new slug nor a fallback detail route without accepted public API and owner-content evidence.

| Family | Required surfaces |
|---|---|
| Gateway | `/` language selection and accessible locale choice |
| Profile | `/{locale}/`, about, CV/resume, contact |
| Collections | research, projects, writing, publications, teaching, creative |
| Details | stable locale-aware slug routes for published entries |
| Utility | search, not-found, error, unavailable |

Exact slugs and redirect compatibility are accepted through the route ADR. Header and footer navigation must be derived from one route registry to prevent the divergent navigation shown in the rejected legacy implementation.
