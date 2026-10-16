# SkillBridge warm editorial tokens

## Primitive palette

- Coffee `#6B4F3F`; hover `#533B2E`; espresso `#38271F`
- Medium brown `#8A6B58`; taupe `#A88D7A`; terracotta `#B8795B`
- Ivory `#F8F4EE`; beige `#F2E9DF`; card `#FFFDFC`
- Soft nude `#EBDDD0`; sand `#D5BEAA`; border `#E5D9CC`
- Text `#2F241F`; secondary `#73665E`; muted `#82766E`
- Success `#2F6B54`; warning `#956018`; danger `#B3423D`; information `#536C79`

## Semantic contract

Components consume `--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--accent`, `--muted`, `--border`, `--input`, `--ring`, and functional state variables. The three-level surface stack is named `--surface-canvas`, `--surface-raised`, and `--surface-overlay`. Compatibility aliases map existing selectors to this semantic layer. Dark mode remaps these roles to espresso and chocolate surfaces without adding a second cool accent.

Product headings and body text use Instrument Sans. Fraunces is reserved for the landing hero, with optical sizing enabled. Motion is limited to short interaction transitions, score changes, and loading feedback; reduced-motion disables it.
