# NEXORA persona artwork contract

The Command Center resolves the same two case-sensitive WebP exports for every persona:

```text
public/nexora/personas/nexora/presence-640.webp
public/nexora/personas/nexora/presence-960.webp
public/nexora/personas/atlas/presence-640.webp
public/nexora/personas/atlas/presence-960.webp
public/nexora/personas/lyra/presence-640.webp
public/nexora/personas/lyra/presence-960.webp
public/nexora/personas/orion/presence-640.webp
public/nexora/personas/orion/presence-960.webp
```

Both exports are 4:5 portraits (640×800 and 960×1200). The 640px export should stay below
120 KB and the 960px export below 220 KB when visually acceptable. The browser chooses the
right export through `srcset`; `presence-640.webp` is also the universal `<img>` source.

## Shared art direction

All four are original, non-identifiable adult premium humanoid robots from one coherent
visual universe. Use an expressive human face, visibly synthetic but elegant facial seams,
refined robotic neck and shoulder plates, intelligent eyes, black/graphite/silver materials,
and restrained persona-specific light. Frame head, shoulders, and upper torso against a dark
neutral background. Keep the face naturally proportioned and fully inside the middle 60%.

Avoid ordinary humans, industrial or heavy robots, mascots, cartoons, armor, videogame styling,
text, UI, logos, labels, watermarks, and celebrity or real-person likenesses.

## Final generation prompts

### NEXORA — female, Free, default

> Use case: stylized-concept. Asset type: Command Center persona portrait. Create an original
> adult female premium humanoid robot named NEXORA: warm, intelligent, elegant, proactive;
> expressive human face and intelligent welcoming eyes; clearly visible refined synthetic
> facial seams, graphite-and-silver neck and shoulder plates, subtle warm champagne light;
> sophisticated high-end cinematic 3D realism. Vertical 4:5, head + shoulders + upper torso,
> centered dark neutral background. No text, UI, logo, label, watermark, ordinary human,
> industrial robot, heavy machinery, mascot, cartoon, armor, or identifiable person.

### ATLAS — male, Free

> Use case: stylized-concept. Asset type: Command Center persona portrait. Create an original
> adult male premium humanoid robot named ATLAS: strategic, direct, analytical, calm; distinct
> angular human face, focused intelligent eyes, architectural graphite cranial seams, brushed
> silver jaw and shoulder structure, restrained cool steel-blue light; sophisticated high-end
> cinematic 3D realism. Vertical 4:5, head + shoulders + upper torso, centered dark neutral
> background. No text, UI, logo, label, watermark, ordinary human, industrial robot, heavy
> machinery, mascot, cartoon, armor, or identifiable person.

### LYRA — female, Premium

> Use case: stylized-concept. Asset type: Command Center persona portrait. Create an original
> adult female premium humanoid robot named LYRA: creative, expressive, intuitive, refined;
> distinct sculptural human face, luminous perceptive eyes, elegant asymmetric synthetic temple
> detailing, satin black and polished silver plates, restrained violet-pearl light; sophisticated
> high-end cinematic 3D realism. Vertical 4:5, head + shoulders + upper torso, centered dark
> neutral background. No text, UI, logo, label, watermark, ordinary human, industrial robot,
> heavy machinery, mascot, cartoon, armor, or identifiable person.

### ORION — male, Premium

> Use case: stylized-concept. Asset type: Command Center persona portrait. Create an original
> adult male premium humanoid robot named ORION: executive, precise, composed, sophisticated;
> distinct mature human face, steady intelligent eyes, immaculate obsidian facial inlays,
> titanium neck and tailored shoulder plates, restrained amber-white light; sophisticated
> high-end cinematic 3D realism. Vertical 4:5, head + shoulders + upper torso, centered dark
> neutral background. No text, UI, logo, label, watermark, ordinary human, industrial robot,
> heavy machinery, mascot, cartoon, armor, or identifiable person.

## Runtime behavior

`NexoraAvatar` owns the provider-neutral performance contract
`{ amplitude?: number; mouthOpen?: number; viseme?: string }`. Its seven states animate only
the surrounding aura, lighting, breathing/parallax motion, amplitude bars, and state indicator;
the portrait itself is never squashed to simulate expression. The monogram is mounted only after
the selected image emits a real `error` event.

Run `npm run check:persona-assets` before release. In development, append
`?nexoraState=speaking&nexoraAmplitude=.7` (using any state) to inspect runtime status.
