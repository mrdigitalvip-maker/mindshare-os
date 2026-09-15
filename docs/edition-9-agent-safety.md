# Edition 9 scheduled Agent safety

Edition 8 scheduling decides when an Agent runs; Edition 9 action authority decides what workspace actions it may propose. A schedule is never treated as approval to mutate workspace data. Mutation commands are emitted only after an exact-plan approval grant. This keeps background briefings useful now while preserving a safe path to richer background action workflows later.
