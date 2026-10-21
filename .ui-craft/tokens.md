# SkillBridge technology editorial tokens

## Primitive palette

- Primary blue `#075CC5`; hover `#06499E`; deep navy `#071A3B`
- Cyan `#08AEE8`; supporting violet `#7047E8`
- Cool canvas `#F5F8FC`; secondary `#EDF3FA`; card `#FFFFFF`
- Soft cyan `#E3F5FC`; input `#AFC2D9`; border `#D8E2EF`
- Text `#0B1D3A`; secondary `#52647D`; muted `#687991`
- Success `#2F6B54`; warning `#956018`; danger `#B3423D`; information `#536C79`

## Semantic contract

Components consume `--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--accent`, `--muted`, `--border`, `--input`, `--ring`, and functional state variables. The three-level surface stack is named `--surface-canvas`, `--surface-raised`, and `--surface-overlay`. Compatibility aliases map existing selectors to this semantic layer. Dark mode remaps these roles to navy surfaces. Cyan carries active emphasis; violet is reserved for small brand details rather than competing actions.

Product headings and body text use Instrument Sans. Fraunces is reserved for the landing hero, with optical sizing enabled. Motion is limited to short interaction transitions, score changes, and loading feedback; reduced-motion disables it.
