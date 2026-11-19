# Tang's Homepage

This is a static GitHub Pages website: HTML, CSS, JavaScript, JSON, and images. There is no application server, Python build script, package installation, or compilation step.

## Editing

- `index.html`: profile, contacts, interests, education, and page structure.
- `resources/data/publications.json`, `projects.json`, and `honors.json`: list content. The browser loads these once and renders the page before initializing interactions.
- `resources/data/photography.json`: the photography room's images and captions.
- `resources/js/homepage/homepage-data.js`: data loading and list rendering.
- `resources/js/homepage/tennis-home-overlay.js`: the ball, right-up opening serve through Q, physics, and trail.
- `resources/js/homepage/interactions.js`: typing, filters, scrolling, and hanging paper pages.
- `resources/js/homepage/personal-viewer.js`: paper, photography, and music dialogs.
- `resources/css/homepage/interactions.css`: homepage styling and responsive layout.

An optional `preview` field belongs to its publication, so inserting or reordering papers does not assign an existing cover to a different title:

```json
"preview": {
  "thumbnail": "resources/images/paper-previews/example-first-page-thumb.jpg",
  "full": "resources/images/paper-previews/example-first-page.png"
}
```

Use an actual first page for that paper. Omit `preview` when no verified image is available. Image provenance is recorded in `resources/images/paper-previews/sources.json`.

## Preview and publish

Open the repository with any static web server, such as VS Code Live Server. HTTP preview lets the browser read the JSON files; opening `index.html` with `file://` does not provide that environment.

For GitHub Pages, publish the repository root containing `index.html` and `resources/`. If Pages is configured to publish from `master` and `/ (root)`, merging the changes into that branch is sufficient. The `.nojekyll` file keeps the site as plain static files. The existing `CNAME` continues to specify `vipixel.net`.

All homepage scripts, styles, fonts, profile/footer images, and paper previews are served from this repository using relative URLs. The photography images and music room continue to use their original HTTPS media sources. The local music bridge is `resources/pages/music-room.html`; its remote `<base>` intentionally resolves the existing music site's artwork and player assets.

The legacy `index_v1.html` and its original scripts remain available, but the current homepage loads only the four scripts listed above.
