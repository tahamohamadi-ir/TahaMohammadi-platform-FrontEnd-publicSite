# Security

Report security issues privately to the repository owner. Do not open public issues containing credentials, private content, personal data, or exploit details.

The public frontend must contain no privileged token, backend secret, unpublished content, source map with secrets, or admin-only endpoint. Browser-visible configuration is public by definition. Sanitize or safely render backend-provided rich content, constrain external navigation, and maintain a restrictive Content Security Policy at deployment.
