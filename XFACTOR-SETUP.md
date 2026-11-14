# X-Factor icon setup

## Spreadsheet
Use the existing `XFactor` column. Examples:

| Name | Position | OVR | XFactor |
|---|---|---:|---|
| Example Player | RW | 92 | :e_qr: :as_1t: |

The `XFactor` column may contain multiple `:code:` entries separated by spaces, commas or semicolons. The importer stores the text unchanged.

## Where images go
`public/xfactors/` contains starter **placeholder** SVG icons for `e_qr` and `as_1t` (NOT official game artwork). You can replace them with your own SVGs using the same filenames. For PNGs, add e.g. `public/xfactors/e_qr.png` and change the matching `image` path in `public/app.js` to `/xfactors/e_qr.png`.

## Adding more codes
At the top of `public/app.js`, find `const XFACTOR_ICONS`. Add an entry for each code, for example:

```js
as_ee: {name: 'Elite Edges', tier: 'All-Star', image: '/xfactors/as_ee.png'},
```

Put the corresponding image in `public/xfactors/`. In Excel, write `:as_ee:`. Restart the server or hard-refresh the browser after changing JavaScript.

Unknown codes display as readable text, and missing images display the ability name. Hover over icons to read the full ability name.

## Upgrade an existing installation without losing your draft
Stop the server. Back up `data/state.json` and your existing app folder. Copy **only** these items from this package into the existing app, overwriting matching files:

- `public/app.js`
- `public/style.css`
- `public/xfactors/` (entire folder)
- `server.js` (adds image content types)

Do not overwrite your existing `data/` directory. Restart with `npm start`. No player re-import is necessary if the `XFactor` values are already saved as codes.
