# milesueee ∙ nagomi

> A serene, procedurally animated Japanese koi pond crafted in WebGL and React.

https://github.com/user-attachments/assets/34549f7d-41cf-4cf6-af0a-95074bc631d2

**milesueee ∙ nagomi** is an interactive, procedurally animated koi pond that runs smoothly in your browser. The koi swim freely, change depth, school with nearby fish, and gather to feed when you drop food pellets. Water ripples, surface currents, submerged riverbed rocks, draggable lotus leaves, seasonal weather, and synthesized river acoustics come together to create a calm, living virtual water garden.

The fish do not follow recorded video or pre-rendered sprites. Every motion—from spine curvature and fin undulation to schooling decisions and feeding gulps—is computed in real time at 60 FPS using rule-based procedural mathematics.

📖 **Curious about the math and animation mechanics?** Read [How it works](docs/how-it-works.md).

---

## ✨ Features

- **🐟 Procedural Koi & Minnow Schools:** Real-time multi-segment spine bending, boid-inspired schooling dynamics, autonomous swimming states (*Glide, Coast, Hover, Burst, Pivot*), and individualized colors, sizes, and temperaments.
- **🥢 Interactive Koi Feeding:**
  - **Right-click** anywhere in the pond to drop floating food pellets into the water.
  - Pellets feature lively harmonic surface drift, soft dispersion, and physical displacement when hit by expanding water ripples.
  - Gradual sinking lifecycle: uneaten pellets slowly absorb water, lose surface shadows, darken into pond depths, and flutter down toward the riverbed before dissolving.
  - Koi detect nearby food, approach the cluster, and consume pellets with authentic mouth gulp animations, mouth ripples, and subtle water dip audio.
- **🌊 Gentle Water Ripple Dynamics:**
  - **Left-click or drag** across the surface to produce gentle concentric ripples and soothing water sounds without startling or summoning the fish.
- **🪨 Submerged Pond Bed Rocks:** Natural clustered riverbed boulders and pebbles rendered with procedural shading, caustic reflections, depth drop-shadows, and interactive water ripples on tap.
- **🪷 Draggable Lotus Leaves & Flower Varieties:** Interactive lotus pads that can be dragged across the pond with buoyant wake effects, alongside lotus blossoms with multiple color varieties (White, Pink, Blue, and Gold).
- **🌦️ Atmospheric Weather & Procedural Audio:**
  - Real-time weather toggle between clear sunny light and gentle rain with falling drops and water rings.
  - 100% procedural Web Audio synthesizer generating river ambience, water splashes, subtle dips, and koi gulps without external audio files.
- **🕰️ Screensaver Clock & Zen Mode:** Minimalist ambient screensaver with an optional floating digital clock and clean distraction-free UI toggle.
- **⚙️ Comprehensive Live Settings:** Instant in-app customization of pond bed textures, water currents, ripple distortion, koi appearance, lotus count, and butterflies, with LocalStorage persistence.
- **📱 PWA & Offline Support:** Installable Progressive Web App with offline service worker caching for mobile, tablet, and desktop.

---

## 🎮 Controls & Interactions

| Action | Control | Description |
| :--- | :--- | :--- |
| **Feed Koi** | `Right-Click` | Drops food pellets into the pond; koi swim over and eat them. |
| **Create Ripples** | `Left-Click` / `Tap` | Ripples the water surface with audio without summoning the koi. |
| **Water Drag** | `Left-Click + Drag` | Gently drags your cursor across the water to make wake ripples. |
| **Move Lotus** | `Click + Drag Leaf` | Grabs and moves a lotus pad across the pond surface. |
| **Scatter Fish** | `Space` | Briefly startles the school, causing koi to dart outward. |
| **Adjust Fish Count** | `[` / `]` or UI `−` / `+` | Decreases or increases the active number of koi in the pond. |
| **Spine Debug Mode** | `D` | Toggles visualization of the procedural spine segments and headings. |
| **Toggle UI** | `H` | Hides or shows the interface for a zen screensaver view. |
| **Reset Pond** | `R` | Resets the simulation to its initial state. |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` (or `pnpm` / `yarn`)

### Installation & Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/milesueee/milesueee-koi-pond.git
   cd milesueee-koi-pond
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 🛠️ Build & Verification

```bash
# Run unit and integration tests
npm test

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 🎨 Customization

You can tune the simulation in two ways:
1. **In the app:** Click the **Settings** button in the top right to adjust any parameter (lighting, water currents, koi colors, ripples, vegetation) with instant visual feedback.
2. **In code:** Edit [`src/config.ts`](src/config.ts) or [`src/settings/definition.ts`](src/settings/definition.ts) to adjust defaults, physics parameters, and asset distributions.

---

## 🧱 Tech Stack

- **Core:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Graphics & Shaders:** [Three.js](https://threejs.org/) (WebGL), custom GLSL shaders for water caustics, ripples, and lighting
- **Styling & UI:** [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), [Motion](https://motion.dev/)
- **Audio:** Web Audio API (synthesized procedural acoustics)
- **Bundler & Tooling:** [Vite](https://vitejs.dev/), [Vite PWA](https://vite-pwa-org.netlify.app/), [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/)

---

## 📄 License

MIT © [milesueee](https://github.com/milesueee)
