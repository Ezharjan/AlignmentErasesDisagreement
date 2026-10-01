# When Alignment Erases Disagreement: Preference Collapse and a Four-Valued Alternative for LLMs

Project page for the paper by **Aizierjiang Aiersilan** (The George Washington University)
for the **AAAI 2026 Fall Symposium Series**.

The paper shows that scalar-reward alignment cannot represent irreducible value
disagreement. When preference labels are collected without annotator provenance, a
deeply divided population and a uniformly ambivalent one produce identically
distributed labels under the Bradley–Terry model; informally, any scalar summary of
the space that separates support, opposition, ignorance, and conflict discards at least
two of its three degrees of freedom. The paper proposes a four-valued architecture
with a classical safety floor, admissible-set decisions, and a technical interface
for institutional governance.

## Links

| Resource | Location |
|---|---|
| Paper | [AAAI 2026 Fall Symposium Series](https://aaai.org/conference/fall-symposia/2026-fall-symposium-series-2/) (until the paper is published) |
| Slides (PDF) | [`When_Alignment_Erases_Disagreement_AizierjiangAiersilan_slides4AAAI2026FSS.pdf`](When_Alignment_Erases_Disagreement_AizierjiangAiersilan_slides4AAAI2026FSS.pdf), also viewable on the page |
| arXiv | not yet available (disabled in `config.json`) |
| Poster | not yet available (disabled in `config.json`) |
| Book a chat | [cal.com/ezhar/30min](https://cal.com/ezhar/30min) |

## How the page works

All page content (title, author, links, abstract, sections, tables, figures, slides,
and BibTeX) lives in **`config.json`**. `index.html` is a generic shell, and
`static/js/render.js` renders the configuration at runtime. To change the page,
edit `config.json`; `config.schema.json` provides validation and autocomplete in
editors such as VS Code.

The slides appear above the BibTeX as a scrollable viewer (a `pdf` block in
`config.json`). Pages are rendered with the bundled
[PDF.js](https://mozilla.github.io/pdf.js/) 3.11.174 (Apache-2.0, in
`static/js/pdfjs/`), which loads only when the viewer comes into view; if it cannot
load, the browser's built-in PDF viewer is used instead.

```
index.html              Generic shell (loads render.js)
config.json             All page content
config.schema.json      Schema for config.json
When_Alignment_Erases_Disagreement_AizierjiangAiersilan_slides4AAAI2026FSS.pdf
                        Presentation slides
favicon.ico             Tab icon
static/css/             Bulma, Font Awesome, and the page theme (index.css)
static/js/render.js     Renderer
static/js/pdfjs/        PDF.js 3.11.174 (pdf.min.js, pdf.worker.min.js, LICENSE)
static/images/          Figures (simplex.png, four_states.png)
static/webfonts/        Font Awesome fonts
```

## Preview locally

The page loads `config.json` with `fetch()`, which browsers block for `file://`
URLs. Serve the folder instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy

The site is fully static. For GitHub Pages, push this folder to a repository and
set **Settings → Pages → Source** to *Deploy from a branch* (`main`, `/ (root)`).
The page is then served at `https://<user>.github.io/<repo>/`.

## Pending updates

- **Paper:** once the paper is published, replace the Paper link in `config.json`
  (currently the AAAI 2026 Fall Symposium Series website) with the paper's URL.
- **arXiv:** replace `REPLACE_ME` in the arXiv link of `config.json` and set its
  `"enabled"` to `true` (`grep -n REPLACE_ME config.json` finds it).
- **Poster:** add the final, unencrypted poster as `paper_poster.pdf` in the root,
  then set `"poster": { "enabled": true }` and enable the Poster link.
- **BibTeX:** update the entry with the proceedings details once they are published.
