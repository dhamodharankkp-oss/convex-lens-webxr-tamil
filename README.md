# 🔭 ஒளியியல் - குவி லென்சு (Convex Lens Optics WebXR & Live Camera AR)

**தமிழ்நாடு 10-ஆம் வகுப்பு இயற்பியல் (Tamil Nadu 10th-Grade Physics - Samacheer Kalvi)**

A photorealistic WebXR and Live Camera Augmented Reality (AR) optical bench simulation demonstrating refraction, real image formation, and shadow projection through a convex lens.

![Demo](https://img.shields.io/badge/WebXR-Immersive%20AR-0284c7)
![Three.js](https://img.shields.io/badge/Three.js-r170-10b981)
![Language](https://img.shields.io/badge/Language-Tamil%20%7C%20English-f59e0b)

---

## ✨ Features (சிறப்பம்சங்கள்)

1. **🕯️ Photorealistic Candle & Flame (நிஜ மெழுகுவர்த்தி & சுடர்)**:
   - Paraffin wax body with melted top rim, curved wick, and glowing red ember point.
   - Procedural multi-layer flame (blue combustion base, white incandescent core, warm amber aura) with turbulent flickering.
   - Dynamic shadow-casting point light with soft shadow mapping (`PCFSoftShadowMap`).

2. **🔬 Bi-Convex Lens & Upright (குவி லென்சு)**:
   - Bi-convex glass optic with refraction and chrome thumbscrew clamp rider.
   - Accurate optical center, focal points ($F_1, F_2$) and centers of curvature ($2F_1, 2F_2$).

3. **📽️ Movable White Screen & Real-Time Projection (வெள்ளை திரை & நிழல் பிம்பம்)**:
   - Sliding rider with vernier index on the 86 cm optical bench rail.
   - Real-time 512x512 dynamic canvas projection:
     - Inverted candle flame flickering in synchronization with the source flame.
     - Dark silhouette shadow of the candle body.
     - Dynamic Gaussian defocus blur based on $|z_{\text{screen}} - v|$.
     - For $u < F$ (Virtual Image), visually demonstrates that virtual images cannot be captured on a screen.

4. **🎛️ Clean Lookout Redesign & Dual Display Modes**:
   - **👁️ முழு காட்சி (Clean Lookout Mode)**: Hides all UI for 100% pure panoramic 3D view.
   - **🕯️ ஆய்வகக் காட்சி (Real Lab)**: Pure photorealistic laboratory apparatus without laser ray overlays.
   - **⚡ கதிர்ப்படம் (Ray Optics)**: Standard textbook ray diagrams with focal markers.
   - **🎯 Auto-Focus**: Instantly aligns the screen to the focal distance $v$.
   - **Interactive Sliders**: Move object ($u$) and screen ($z_{\text{screen}}$) with precision.

5. **📱 Universal Dual-Engine AR**:
   - **Engine 1: Universal Live Camera Room AR**: Works on 100% of mobile phones and browsers via WebRTC camera feed.
   - **Engine 2: Native WebXR Floor Tracking AR**: Full 6-DoF plane detection and surface placement for supported Android Chrome + ARCore devices.
   - **Mobile Landscape Optimization**: Auto-detects portrait mode and provides landscape guidance for wide optical bench viewing.

6. **🔊 Tamil Voice Explainer & AI Tutor**:
   - Natural Tamil speech synthesis (`ta-IN`) explaining optical principles.
   - Optional Gemini Flash AI integration for interactive question answering.

---

## 🚀 Quick Start (தொடங்குதல்)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)

### Installation
```bash
git clone https://github.com/dhamodharankkp-oss/convex-lens-webxr-tamil.git
cd convex-lens-webxr-tamil
npm install
```

### Development
```bash
npm run dev
```
Open `https://localhost:5173/` in your browser. (Accept self-signed certificate for local HTTPS).

### Production Build
```bash
npm run build
npm run preview
```

### Run Unit Tests
```bash
npm test
```

---

## 📐 Physics Principles (இயற்பியல் விதிகள்)

Thin lens formula:
$$\frac{1}{v} - \frac{1}{u} = \frac{1}{f}$$

Magnification:
$$m = \frac{v}{u} = \frac{h_i}{h_o}$$

| நிலை (Position) | பொருள் தொலைவு ($u$) | பிம்ப தொலைவு ($v$) | பிம்பத்தின் தன்மை (Nature) | பயன்பாடு (Application) |
|---|---|---|---|---|
| ஈறிலாத் தொலைவு | $u = \infty$ | $v = F$ | மெய் & தலைகீழ், மிகச் சிறியது | தொலைநோக்கி |
| $2F$-க்கு அப்பால் | $u > 2F$ | $F < v < 2F$ | மெய் & தலைகீழ், சிறியது | புகைப்படக் கருவி (Camera) |
| $2F$-ல் | $u = 2F$ | $v = 2F$ | மெய் & தலைகீழ், சம அளவு | நில அளவையாளர் கருவி |
| $F$ மற்றும் $2F$ இடையே | $F < u < 2F$ | $v > 2F$ | மெய் & தலைகீழ், பெரிதாக்கப்பட்டது | திரைப்பட வீழ்த்தி (Projector) |
| $F$-ல் | $u = F$ | $v = \infty$ | மெய், மிக மிகப் பெரியது | தேடல் விளக்கு (Search light) |
| குவியத்திற்குள் ($< F$) | $u < F$ | $v < 0$ | மாய & நேரான, பெரிதாக்கப்பட்டது | பூதக்கண்ணாடி (Magnifying glass) |

---

## 📄 License
MIT License
