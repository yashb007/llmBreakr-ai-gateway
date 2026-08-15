# Contributing

Thanks for considering a contribution to llmBreakr AI Gateway.

## Development setup

Follow the [Getting started](README.md#getting-started) section in the README to run the server and admin dashboard locally.

## Making changes

1. Fork the repo and create a branch off `main`: `git checkout -b fix/short-description`
2. Make your change. Keep pull requests focused — one fix or feature per PR.
3. Run the app locally and verify the affected flow still works (there is no automated test suite yet, so manual verification matters).
4. Commit with a clear message describing the change and why.
5. Open a pull request against `main` describing what changed and how you tested it.

## Reporting bugs / requesting features

Open a GitHub issue with:
- What you expected to happen vs. what happened
- Steps to reproduce (for bugs)
- Relevant logs or screenshots

## Code style

- Match the existing patterns in the file/module you're editing (controller → service → validation layering in `server/admin` and `server/dataplane`).
- No linter/formatter is enforced yet in `server/`; `web/` uses ESLint (`npm run lint`).

## Security issues

Please do not open a public issue for security vulnerabilities. Instead, email the maintainer directly (see repo owner's GitHub profile) with details.
