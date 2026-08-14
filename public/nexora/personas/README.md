# NEXORA persona artwork

The presence component resolves artwork from one directory per persona:

```
nova/nova-640.avif   nova/nova-960.avif
nova/nova-640.webp   nova/nova-960.webp
nova/nova.png        (universal image fallback)
```

**Current status: `NOVA_ASSET_MISSING` / HUMAN ARTWORK REQUIRED.** None of the five
files above is committed. The browser therefore correctly reaches the technical
fallback. Add approved artwork at these exact, case-sensitive paths; no UI rebuild is
needed. Do not replace these files with generated or unapproved human likenesses.

## Art direction and export contract

- Original, non-identifiable adult humanoid AI; head, shoulders, and upper torso.
- Human facial proportions and expressive eyes; dark tailored technology clothing.
- Dark neutral background with restrained, persona-specific rim light. No robot parts,
  neon HUD, text, watermark, real person, celebrity likeness, or videogame styling.
- Portrait aspect ratio **4:5**, with the complete eyes, face, and chin inside the middle
  60% of the frame. Export at the exact intrinsic dimensions named above.
- AVIF is preferred and WebP is the compatibility fallback. Keep 640px exports below
  120 KB and 960px exports below 220 KB when visually acceptable.

NOVA should feel warm and confident; ATLAS calm and architectural; LYRA refined and
expressive; ORION contemplative and executive. Until approved final renders are added,
the UI intentionally shows its polished monogram presence rather than a fabricated human.

Optional expression frames should use `nova-idle`, `nova-blink`, `nova-listening`, and
`nova-speaking` names beside the base exports. They are deliberately not requested until
provided: a full portrait is never squashed to fake a blink.

The rendering boundary is `NexoraAvatar`. Its provider-neutral performance contract is
`{ amplitude?: number; mouthOpen?: number; viseme?: string }`. Static `<picture>` media can later be replaced
inside that component by animated WebP, video, Rive, Live2D, WebGL, or a facial-animation
provider without changing the Command Center, onboarding, or persona selector.

In development, append `?nexoraState=speaking&nexoraAmplitude=.7` (using any of the
seven states) to inspect the state, asset status, and audio response overlay.
