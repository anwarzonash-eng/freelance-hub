# Deck guideline images

Drop your ~8 pictures **into this folder** (`upwork_tool/public/deck-guidelines/`),
then list their exact file names in `manifest.json`, e.g.:

```json
["01-cover.png", "02-layout.png", "03-scoring.png", "04-example.jpg"]
```

The "Download Pictures" button on the Deck Grading Tasks page reads `manifest.json`,
fetches each listed image, zips them, and downloads `deck-guidelines.zip`.

Notes:
- File names in `manifest.json` must match the files here exactly (case-sensitive).
- Anything in `public/` is served statically by Next.js at `/deck-guidelines/<name>`.
- No rebuild needed to change the images — just update the files + manifest.
