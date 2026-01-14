# 🎨 AINT PRO | Neural Creative Suite | Power of 8+ AI

![Aint Pro Banner](https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&q=80&w=1200&h=300)

**Aint Pro** is a high-performance, professional-grade digital painting application seamlessly integrated with the latest **8+ AI** models. Designed for artists who want to blend traditional digital techniques with cutting-edge neural synthesis, Aint Pro offers a "Premium Creative Suite" experience directly in the browser.

---

## ✨ Key Features

### 🧠 Neural Intelligence (Powered by Gemini)
- **Neural Synthesis**: Generate high-fidelity images using `gemini-3-pro-image-preview` with support for 1K, 2K, and 4K resolutions.
- **Contextual Editing**: Use `gemini-2.5-flash-image` to modify existing canvas regions via natural language commands.
- **Veo Motion Synthesis**: Animate your artwork into 720p MP4 videos using the `veo-3.1-fast-generate-preview` engine.
- **Multimodal Analysis**: Real-time vision analysis. Ask Gemini to critique your composition, suggest color theory palettes, or identify artistic styles.
- **Neural Assistant**: A persistent sidebar for artistic guidance, powered by Gemini 3 Flash with Google Search grounding.

### 🖌️ Advanced Painting Engine
- **Pro Brush System**: 6 unique brush types including **Heavy Impasto (Oil)**, **Fluid Watercolor**, **Soft Graphite**, and **Graphic Marker**.
- **Physics-Based Settings**: Fine-tune stroke dynamics with adjustable **Hardness**, **Spacing**, and **Jitter** controls.
- **High-Performance Canvas**: 1200x800 base artboard with smooth 60fps rendering and hardware-accelerated flood fill.
- **Layer Management**: Multi-layer support with visibility toggling and non-destructive workflows.

### 🛠️ Professional Workflow
- **Multi-Format Export**: Save your masterpieces as **PNG (Lossless)**, **JPG (Compact)**, or **WebP (Web Optimized)**.
- **History Stack**: Comprehensive Undo/Redo system supporting up to 50 snapshots.
- **Global AI Hub**: Persistent, encrypted local storage for API keys (Gemini, OpenAI, Anthropic, etc.).
- **Keyboard Mastery**: Full support for standard creative hotkeys (Ctrl+Z, Ctrl+Y, Alt+Click for Eyedropper).

---

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome recommended for best performance).
- AI API Key (for AI features of 8+ AI Image engines).

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/ashishapps-in/aint-pro.git
   ```
2. Navigate to the project root and serve the files:
   ```bash
   # Using a simple python server
   python3 -m http.server 8000
   ```
3. Open `http://localhost:8000` in your browser.

### Configuring AI Access
Aint Pro stores your API keys **locally in your browser's encrypted storage**. Your keys are never sent to any server other than the official AI provider endpoints.
1. Click the **API Keys** button in the header.
2. Enter your credentials for Gemini or other providers.
3. Click **Commit to Storage**.

---

## 🎨 Tech Stack
- **Core**: React 19 (ESM)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Canvas**: HTML5 Canvas API with custom stroke-interpolation logic.

---

## ⌨️ Hotkeys
| Key | Action |
|-----|--------|
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Alt + Click` | Eyedropper (Color Pick) |
| `Ctrl + H` | Toggle AI Assistant |
| `Space + Drag` | Pan Canvas (Coming Soon) |
| `Scroll` | Precision Zoom |

---

## 🛡️ Privacy & Security
- **No Backend**: Aint Pro is a client-side only application.
- **Local Keys**: All API keys are saved in `localStorage`. We do not track, store, or see your API usage.
- **Telemetry**: Zero tracking. Your art belongs to you.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---

**Built with ❤️ for the creative community by Ashish Apps.**
