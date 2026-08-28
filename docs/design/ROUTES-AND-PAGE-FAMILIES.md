# Routes and Page Families

| Family | Required surfaces |
|---|---|
| Gateway | `/` language selection and accessible locale choice |
| Profile | `/{locale}/`, about, CV/resume, contact |
| Collections | research, projects, writing, publications, teaching, creative |
| Details | stable locale-aware slug routes for published entries |
| Utility | search, not-found, error, unavailable |

Exact slugs and redirect compatibility are accepted through the route ADR. Header and footer navigation must be derived from one route registry to prevent the divergent navigation shown in the rejected legacy implementation.
