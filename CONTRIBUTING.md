# Contributing to BountyScope Ultimate

Thank you for helping improve BountyScope.

## Before contributing

- Use the application only for authorized security work.
- Search existing issues before opening a duplicate.
- Keep pull requests focused on one clear improvement.
- Never include real targets, credentials, cookies, tokens, client data, private reports, or evidence.
- Use safe example domains such as `example.com`.

## Development setup

```bash
git clone https://github.com/sachineo/bountyscope-ultimate.git
cd bountyscope-ultimate
npm install
npm start
```

Create a production renderer before submitting:

```bash
npm run build:vite
```

## Pull requests

1. Create a descriptive branch.
2. Make the smallest complete change.
3. Preserve the local-first security model.
4. Test affected pages and interactions.
5. Update documentation when behavior changes.
6. Explain the user impact and validation in the pull request.

## Design principles

- Keep the interface fast, dense, and readable.
- Motion should communicate state and respect reduced-motion settings.
- Maintain keyboard accessibility and visible focus states.
- Prefer existing design tokens and components.
- Do not introduce cloud dependencies for core features.

## Reporting vulnerabilities

Do not disclose a vulnerability in a public issue. Follow [SECURITY.md](SECURITY.md).
