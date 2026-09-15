# Edition 9 CI

Edition 9 intentionally relies on the repository's existing Web Quality and Mobile Typecheck workflows rather than introducing a duplicate CI system. The new Vitest contracts live under `tests/` so the existing Web Quality test command can validate the Agentic Core authority layer together with current product contracts.
