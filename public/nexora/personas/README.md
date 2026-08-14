# NEXORA persona artwork

The presence component resolves artwork from one directory per persona:

```
nova/presence-640.avif   nova/presence-960.avif
nova/presence-640.webp   nova/presence-960.webp
atlas/...                lyra/...                orion/...
```

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

The rendering boundary is `NexoraAvatar`. Static `<picture>` media can later be replaced
inside that component by animated WebP, video, Rive, Live2D, WebGL, or a facial-animation
provider without changing the Command Center, onboarding, or persona selector.
