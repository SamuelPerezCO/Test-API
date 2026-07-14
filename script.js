// ============================================================
// Pokémon Stats Viewer
// Flow: user submits form -> fetch data from PokeAPI ->
//       reshape it into labels + numbers -> draw with Chart.js
// ============================================================

// Grab references to the HTML elements we need to read from / write to
const form = document.getElementById("search-form");
const input1 = document.getElementById("pokemon-1");
const input2 = document.getElementById("pokemon-2");
const errorMessage = document.getElementById("error-message");
const chartsContainer = document.getElementById("charts");

// Read the colors from the CSS, so JS and CSS always match
const css = getComputedStyle(document.documentElement);
const COLORS = [css.getPropertyValue("--series-1"), css.getPropertyValue("--series-2")];

// One color per stat, used by the circular charts (pie, doughnut, polar area)
const SLICE_COLORS = [1, 2, 3, 4, 5, 6].map(n => css.getPropertyValue(`--slice-${n}`));

// The chart types where each SLICE gets a color (instead of each Pokémon)
const CIRCULAR_TYPES = ["pie", "doughnut", "polarArea"];

// Every chart we will draw: an internal id + the title shown above each card
const CHART_TYPES = [
  { id: "bar", title: "Bar" },
  { id: "horizontal-bar", title: "Horizontal Bar" },
  { id: "line", title: "Line" },
  { id: "radar", title: "Radar" },
  { id: "pie", title: "Pie" },
  { id: "doughnut", title: "Doughnut" },
  { id: "polarArea", title: "Polar Area" },
];

// We keep all current charts here so we can destroy them before redrawing.
// (Chart.js refuses to draw twice on the same canvas otherwise.)
let charts = [];

// ------------------------------------------------------------
// STEP 0: Load ALL Pokémon names into the suggestion list.
// This runs once, as soon as the page opens.
// ------------------------------------------------------------
async function loadAllNames() {
  // By default the API only returns 20 names per page.
  // limit=100000 says "give me everything in one page".
  const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=100000");
  const data = await response.json();

  // data.results is a list like [{ name: "bulbasaur", url: "..." }, ...]
  const datalist = document.getElementById("pokemon-list");

  for (const pokemon of data.results) {
    // Create one <option> per Pokémon and put it inside the <datalist>
    const option = document.createElement("option");
    option.value = pokemon.name;
    datalist.appendChild(option);
  }
}

loadAllNames(); // call it right away

// ------------------------------------------------------------
// STEP 1: Fetch one Pokémon from the API
// ------------------------------------------------------------
async function getPokemon(name) {
  // Build the URL. trim() removes spaces, toLowerCase() because the API
  // only knows lowercase names ("Pikachu" would fail, "pikachu" works).
  const url = `https://pokeapi.co/api/v2/pokemon/${name.trim().toLowerCase()}`;

  const response = await fetch(url);

  // If the Pokémon doesn't exist the API answers with status 404
  if (!response.ok) {
    throw new Error(`"${name}" was not found. Check the spelling!`);
  }

  // Turn the raw response into a JavaScript object we can work with
  return response.json();
}

// ------------------------------------------------------------
// STEP 2: Reshape the API data into what Chart.js understands.
// The API gives us: [{ base_stat: 35, stat: { name: "hp" } }, ...]
// Chart.js wants:   labels: ["hp", ...]  and  data: [35, ...]
// ------------------------------------------------------------
function toDataset(pokemon, color, isCircular) {
  return {
    label: capitalize(pokemon.name),          // shown in the legend
    data: pokemon.stats.map(s => s.base_stat), // the 6 numbers
    // Circular charts color each SLICE (6 colors, one per stat).
    // The other charts color the whole SERIES (one color per Pokémon).
    backgroundColor: isCircular ? SLICE_COLORS : color,
    borderColor: color,
    borderRadius: 4,   // rounded bar ends (bar chart only)
    fill: false,       // radar/line: draw the outline, don't flood-fill it
  };
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// ------------------------------------------------------------
// STEP 3: Draw (or redraw) the chart
// ------------------------------------------------------------
// Draws ONE chart of the given kind onto the given canvas, and returns it
function drawChart(canvas, selected, pokemonList) {
  const isCircular = CIRCULAR_TYPES.includes(selected);

  // "horizontal-bar" is our own invention: Chart.js calls it a "bar"
  // chart with the index axis flipped to "y" (categories on the left side)
  const type = selected === "horizontal-bar" ? "bar" : selected;

  // The stat names are the same for every Pokémon, so take them from the first one
  const labels = pokemonList[0].stats.map(s => s.stat.name);

  // One dataset per Pokémon: first gets blue, second gets red
  const datasets = pokemonList.map((p, i) => toDataset(p, COLORS[i], isCircular));

  // Each chart family uses a different axis system:
  // - pie/doughnut have NO axes at all
  // - radar/polar use an "r" (radius) axis
  // - bar/line use x/y axes (beginAtZero keeps bars honest)
  let scales = {};
  if (selected === "radar" || selected === "polarArea") {
    scales = { r: { beginAtZero: true } };
  } else if (!isCircular) {
    scales = { y: { beginAtZero: true } };
  }

  return new Chart(canvas, {
    type,
    data: { labels, datasets },
    options: {
      indexAxis: selected === "horizontal-bar" ? "y" : "x",
      scales,
      plugins: {
        // Circular charts: always show the legend (it names the slices).
        // Other charts: only when comparing (it names the Pokémon).
        legend: { display: isCircular || pokemonList.length > 1 },
      },
    },
  });
}

// Builds one card (title + canvas) per chart type and draws them all
function drawAllCharts(pokemonList) {
  // Clean up: destroy the old charts and empty the grid
  charts.forEach(c => c.destroy());
  charts = [];
  chartsContainer.innerHTML = "";

  for (const chartType of CHART_TYPES) {
    // Build the card in memory: <div class="chart-card"><h2>…</h2><canvas></canvas></div>
    const card = document.createElement("div");
    card.className = "chart-card";

    const title = document.createElement("h2");
    title.textContent = chartType.title;

    const canvas = document.createElement("canvas");

    card.appendChild(title);
    card.appendChild(canvas);
    chartsContainer.appendChild(card); // ...and add it to the page

    charts.push(drawChart(canvas, chartType.id, pokemonList));
  }
}

// ------------------------------------------------------------
// STEP 4: React to the form being submitted
// ------------------------------------------------------------
form.addEventListener("submit", async (event) => {
  event.preventDefault(); // stop the browser from reloading the page
  errorMessage.hidden = true;

  try {
    // Always fetch the first Pokémon
    const requests = [getPokemon(input1.value)];

    // Only fetch the second one if the user typed something
    if (input2.value.trim() !== "") {
      requests.push(getPokemon(input2.value));
    }

    // Promise.all waits for both downloads to finish (they run in parallel)
    const pokemonList = await Promise.all(requests);

    drawAllCharts(pokemonList);
  } catch (error) {
    // Any problem (typo, no internet) lands here and is shown to the user
    errorMessage.textContent = error.message;
    errorMessage.hidden = false;
  }
});
