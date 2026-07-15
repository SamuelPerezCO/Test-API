# Pokémon Stats Viewer

A small web app that fetches a Pokémon's base stats from the [PokeAPI](https://pokeapi.co/)
and displays them in 7 different chart types using [Chart.js](https://www.chartjs.org/).
You can also enter a second Pokémon to compare both side by side.

## Features

- 🔍 Search any Pokémon by name, with autocomplete suggestions as you type
- ⚔️ Optional second Pokémon for stat comparison
- 📊 7 chart types drawn at once: Bar, Horizontal Bar, Line, Radar, Pie, Doughnut, and Polar Area
- ❌ Friendly error message when a name is misspelled or not found

## How to run it

No build step or installation needed — it's plain HTML, CSS, and JavaScript.

1. Clone or download this repository
2. Open `index.html` in your browser
3. Type a Pokémon name (e.g. `pikachu`) and click **Show stats**

> An internet connection is required, since both the Pokémon data (PokeAPI)
> and the chart library (Chart.js via CDN) are loaded from the web.

## How it works

1. On page load, the app fetches the full list of Pokémon names and fills a
   `<datalist>` so the browser can suggest names while you type.
2. When you submit the form, it fetches the stats for one or two Pokémon
   (in parallel, using `Promise.all`).
3. The API data is reshaped into the `labels` + `data` format Chart.js expects.
4. One card per chart type is created and drawn. Old charts are destroyed
   before redrawing, since Chart.js won't reuse a canvas otherwise.

## Files

| File         | What it does                                          |
|--------------|-------------------------------------------------------|
| `index.html` | Page structure: search form, error area, chart grid   |
| `style.css`  | Layout and the color variables used by the charts     |
| `script.js`  | Fetching, data reshaping, and chart drawing logic     |

## Built with

- [PokeAPI](https://pokeapi.co/) — free Pokémon REST API
- [Chart.js 4](https://www.chartjs.org/) — chart rendering
- Vanilla JavaScript (no frameworks)