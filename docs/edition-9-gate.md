# Edition 9 merge gate

Required before merge:

1. Web Quality workflow green.
2. Mobile Typecheck workflow green.
3. Edition 9 contract tests included in Web Quality test command are green.
4. PR remains based on Edition 8 main lineage and is mergeable.
5. No direct database mutation path is introduced by new Agentic Core orchestration modules.

After merge, production delivery is non-blocking when the only failure is Vercel account build-rate limiting; automatic delivery monitoring owns that external gate.
