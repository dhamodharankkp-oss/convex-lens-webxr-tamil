/**
 * main.js
 * Dual-Engine Web AR Application for Tamil Nadu 10th-Grade Physics
 * Modeled after D:\tecplore (Works 100% on any mobile phone & browser)
 * 
 * Engine 1: Universal Live Camera AR (Runs on 100% of devices via getUserMedia)
 * Engine 2: Native WebXR Immersive AR (Android Chrome + ARCore)
 * Engine 3: 3D Desktop Laboratory Mode with OrbitControls
 */

import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OpticalBenchSystem } from './opticalBench.js';
import { aiExplainer } from './aiExplainer.js';
import { calculateOptics, calculateScreenProjection, PRESETS } from './opticsMath.js';

class App {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.arOverlay = document.getElementById('ar-overlay');
    this.cameraVideo = document.getElementById('camera-video');

    // States
    this.isWebXR = false;
    this.isLiveCameraAR = false;
    this.cameraStream = null;
    this.currentFacingMode = 'environment'; // Back camera by default

    // WebXR Hit Testing
    this.hitTestSource = null;
    this.hitTestSourceRequested = false;
    this.hasPlaneHit = false;
    this.benchPlacedInXR = false;

    this.currentU = 20.0;
    this.currentScaleFactor = 0.50; // 50% scale (43 cm bench, optimal for tables & rooms)
    this.showEnglishSubtitles = false;
    this.isExplanationVisible = false;

    this.initThree();
    this.initReticle();
    this.initOpticalBench();
    this.initUI();
    this.initWebXR();

    window.addEventListener('resize', () => this.onWindowResize());
    this.renderer.setAnimationLoop((timestamp, frame) => this.render(timestamp, frame));
  }

  initThree() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.01,
      20
    );

    // Responsive initial camera position (Framing entire 86cm apparatus comfortably in view)
    const isPortrait = window.innerWidth < window.innerHeight;
    this.camera.position.set(
      isPortrait ? 0.85 : 0.65,
      isPortrait ? 0.35 : 0.25,
      isPortrait ? 0.25 : 0.15
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true // Allows snapping AR photos
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0.08, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.15;
    this.controls.minDistance = 0.15;
    this.controls.maxDistance = 3.0;

    // Laboratory Floor Grid (visible in desktop preview mode)
    this.gridHelper = new THREE.GridHelper(1.8, 18, 0x38bdf8, 0x1e293b);
    this.gridHelper.position.y = 0;
    this.scene.add(this.gridHelper);

    this.setupLighting();
    this.setCameraView('iso');
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.8);
    keyLight.position.set(0.6, 1.8, 0.7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 4.0;
    keyLight.shadow.camera.left = -0.8;
    keyLight.shadow.camera.right = 0.8;
    keyLight.shadow.camera.top = 0.8;
    keyLight.shadow.camera.bottom = -0.8;
    keyLight.shadow.bias = -0.001;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xa5f3fc, 1.2);
    fillLight.position.set(-1.0, 1.2, -0.6);
    this.scene.add(fillLight);
  }

  initReticle() {
    this.reticle = new THREE.Group();
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;

    const ringGeo = new THREE.RingGeometry(0.08, 0.098, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    this.reticle.add(ring);

    const dotGeo = new THREE.CircleGeometry(0.016, 16);
    dotGeo.rotateX(-Math.PI / 2);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    this.reticle.add(dot);

    this.scene.add(this.reticle);
  }

  initOpticalBench() {
    this.bench = new OpticalBenchSystem(this.scene);
    this.bench.root.position.set(0, 0, 0);
    const s = this.currentScaleFactor;
    this.bench.root.scale.set(s, s, s);
  }

  initWebXR() {
    this.arButton = ARButton.createButton(this.renderer, {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: this.arOverlay }
    });

    this.arButton.id = 'ARButton';
    document.body.appendChild(this.arButton);

    this.renderer.xr.addEventListener('sessionstart', () => this.onWebXRSessionStart());
    this.renderer.xr.addEventListener('sessionend', () => this.onWebXRSessionEnd());

    this.controller = this.renderer.xr.getController(0);
    this.controller.addEventListener('select', () => this.onWebXRTap());
    this.scene.add(this.controller);
  }

  /* ==========================================================================
     ENGINE 1: Universal Live Camera Room AR (Like D:\tecplore)
     Works on 100% of mobile phones, tablets, and webcams immediately!
     ========================================================================== */
  async openLiveCameraAR() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Camera access is not supported by this browser.');
      return;
    }

    try {
      this.isLiveCameraAR = true;
      document.body.classList.add('live-camera-active');
      this.gridHelper.visible = false;

      // Start device video stream
      await this.startVideoStream();

      // Show video element
      this.cameraVideo.classList.add('active');

      // Update UI Mode Badge
      document.getElementById('mode-badge').textContent = '📷 நேரடி AR (Active)';

      // Auto-collapse telemetry on mobile
      if (window.innerWidth < 640) {
        document.getElementById('telemetry-panel')?.classList.add('collapsed');
      }

      // Frame the apparatus cleanly over the live camera room view
      this.resetCameraToBench();

      aiExplainer.speakTamil('நேரடி கேமரா AR தொடங்கப்பட்டது. உங்கள் அறையில் மாதிரி உள்ளது.');
      console.log('✓ Universal Live Camera AR Started successfully!');
    } catch (err) {
      console.error('Camera AR access failed:', err);
      this.closeLiveCameraAR();
      alert('Camera permission denied or camera unavailable: ' + (err.message || err));
    }
  }

  async startVideoStream() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
    }

    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: this.currentFacingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    };

    this.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    this.cameraVideo.srcObject = this.cameraStream;
    await this.cameraVideo.play();
  }

  closeLiveCameraAR() {
    this.isLiveCameraAR = false;
    document.body.classList.remove('live-camera-active');
    this.cameraVideo.classList.remove('active');

    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
    }
    this.cameraVideo.srcObject = null;

    this.gridHelper.visible = true;
    document.getElementById('mode-badge').textContent = '🌐 3D பார்வை';
    document.getElementById('telemetry-panel')?.classList.remove('collapsed');

    this.resetCameraToBench();
    console.log('Live Camera AR Closed');
  }

  async flipCamera() {
    this.currentFacingMode = (this.currentFacingMode === 'environment') ? 'user' : 'environment';
    this.cameraVideo.classList.toggle('flipped', this.currentFacingMode === 'user');
    await this.startVideoStream();
  }

  resetCameraToBench() {
    const isPortrait = window.innerWidth < window.innerHeight;
    this.camera.position.set(
      isPortrait ? 0.85 : 0.65,
      isPortrait ? 0.35 : 0.25,
      isPortrait ? 0.25 : 0.15
    );
    this.controls.target.set(0, 0.08, 0);
    this.controls.update();

    const s = this.currentScaleFactor;
    this.bench.root.scale.set(s, s, s);
    this.bench.root.position.set(0, 0, 0);
    this.bench.root.rotation.set(0, 0, 0);
    this.bench.root.visible = true;
  }

  async snapArPhoto() {
    try {
      const vw = this.cameraVideo.videoWidth || window.innerWidth;
      const vh = this.cameraVideo.videoHeight || window.innerHeight;
      const canvas = document.createElement('canvas');
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext('2d');

      // 1. Draw live room camera frame
      if (this.isLiveCameraAR) {
        ctx.drawImage(this.cameraVideo, 0, 0, vw, vh);
      }

      // 2. Draw 3D WebGL Canvas on top
      ctx.drawImage(this.renderer.domElement, 0, 0, vw, vh);

      // 3. Download snapshot
      const link = document.createElement('a');
      link.download = `convex-lens-optics-ar-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.warn('Photo snapshot error:', err);
    }
  }

  /* ==========================================================================
     ENGINE 2: Native WebXR Immersive AR (Android Chrome + ARCore)
     ========================================================================== */
  launchWebXR() {
    if (this.isLiveCameraAR) {
      this.closeLiveCameraAR();
    }
    if (this.arButton) {
      this.arButton.click();
    }
  }

  onWebXRSessionStart() {
    this.isWebXR = true;
    this.controls.enabled = false;
    this.gridHelper.visible = false;
    this.benchPlacedInXR = false;
    document.body.classList.add('is-ar');

    const s = this.currentScaleFactor;
    this.bench.root.scale.set(s, s, s);
    this.bench.root.position.set(0, -0.15, -0.45);
    this.bench.root.rotation.set(0, Math.PI / 2, 0);
    this.bench.root.visible = true;

    document.getElementById('mode-badge').textContent = '📱 WebXR AR';

    if (window.innerWidth < 640) {
      document.getElementById('telemetry-panel')?.classList.add('collapsed');
    }

    aiExplainer.speakTamil('WebXR AR தொடங்கப்பட்டது. மாதிரி உங்கள் முன் உள்ளது.');
    console.log('✓ WebXR Session Active');
  }

  onWebXRSessionEnd() {
    this.isWebXR = false;
    this.controls.enabled = true;
    this.gridHelper.visible = true;
    document.body.classList.remove('is-ar');

    this.resetCameraToBench();
    this.reticle.visible = false;
    this.hasPlaneHit = false;

    this.hitTestSource = null;
    this.hitTestSourceRequested = false;

    document.getElementById('mode-badge').textContent = '🌐 3D பார்வை';
    document.getElementById('telemetry-panel')?.classList.remove('collapsed');

    console.log('WebXR Session Ended');
  }

  centerBenchInFrontOfUser() {
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();

    if (this.isWebXR && this.lastViewerPose && this.lastViewerPose.transform) {
      const t = this.lastViewerPose.transform;
      pos.set(t.position.x, t.position.y, t.position.z);
      quat.set(t.orientation.x, t.orientation.y, t.orientation.z, t.orientation.w);
    } else {
      const xrCam = this.renderer.xr.getCamera();
      xrCam.getWorldPosition(pos);
      xrCam.getWorldQuaternion(quat);
    }

    // Direct line-of-sight gaze vector
    const gazeDir = new THREE.Vector3(0, 0, -1).applyQuaternion(quat).normalize();

    // Place bench 60 cm directly in front along gaze vector
    const placeDist = 0.60;
    const placePos = new THREE.Vector3().copy(pos).addScaledVector(gazeDir, placeDist);
    this.bench.root.position.copy(placePos);

    // Orient bench horizontally across user's field of view
    // (Candle on left, lens in center, screen on right)
    const forwardHoriz = new THREE.Vector3(gazeDir.x, 0, gazeDir.z).normalize();
    const angle = Math.atan2(forwardHoriz.x, forwardHoriz.z);
    this.bench.root.rotation.set(0, angle + Math.PI / 2, 0);

    const s = this.currentScaleFactor;
    this.bench.root.scale.set(s, s, s);
    this.bench.root.visible = true;

    // Guarantee no parts get frustum culled
    this.bench.root.traverse(child => {
      if (child.isMesh || child.isSprite || child.isLine) {
        child.frustumCulled = false;
      }
    });

    aiExplainer.speakTamil('மாதிரி உங்கள் பார்வை முன் வைக்கப்பட்டது.');
  }

  onWebXRTap() {
    if (this.reticle && this.reticle.visible && this.hasPlaneHit) {
      const reticlePos = new THREE.Vector3();
      reticlePos.setFromMatrixPosition(this.reticle.matrix);
      this.bench.root.position.copy(reticlePos);

      let camPos = new THREE.Vector3();
      if (this.lastViewerPose && this.lastViewerPose.transform) {
        const p = this.lastViewerPose.transform.position;
        camPos.set(p.x, p.y, p.z);
      } else {
        this.renderer.xr.getCamera().getWorldPosition(camPos);
      }

      const toCam = new THREE.Vector3().subVectors(camPos, reticlePos);
      const angle = Math.atan2(toCam.x, toCam.z);
      this.bench.root.rotation.set(0, angle + Math.PI / 2, 0);

      const s = this.currentScaleFactor;
      this.bench.root.scale.set(s, s, s);
      this.bench.root.visible = true;

      this.bench.root.traverse(child => {
        if (child.isMesh || child.isSprite || child.isLine) {
          child.frustumCulled = false;
        }
      });

      aiExplainer.speakTamil('மேற்பரப்பில் பொருத்தப்பட்டது.');
    } else {
      this.centerBenchInFrontOfUser();
    }
  }

  cycleScale() {
    if (this.currentScaleFactor >= 0.95) {
      this.currentScaleFactor = 0.35; // Compact
    } else if (this.currentScaleFactor >= 0.70) {
      this.currentScaleFactor = 1.0;  // 1:1 Life-Size
    } else if (this.currentScaleFactor >= 0.45) {
      this.currentScaleFactor = 0.75; // 75% Scale
    } else {
      this.currentScaleFactor = 0.50; // 50% Default
    }

    const s = this.currentScaleFactor;
    this.bench.root.scale.set(s, s, s);
    const pct = Math.round(s * 100);
    const btnScale = document.getElementById('btn-scale');
    if (btnScale) btnScale.textContent = `${pct}%`;
    console.log(`Scale set to ${pct}%`);
  }

  setCameraView(viewMode) {
    if (this.isWebXR) return;

    const camBtns = document.querySelectorAll('.cam-btn');
    camBtns.forEach(btn => btn.classList.remove('active'));

    const targetPos = new THREE.Vector3(0, 0.08, 0);
    this.controls.target.copy(targetPos);

    const isPortrait = window.innerWidth < window.innerHeight;
    const dist = isPortrait ? 0.85 : 0.65;

    if (viewMode === 'side') {
      this.camera.position.set(dist, 0.22, 0.0);
      document.getElementById('cam-side')?.classList.add('active');
    } else if (viewMode === 'iso') {
      this.camera.position.set(dist * 0.9, 0.35, dist * 0.35);
      document.getElementById('cam-iso')?.classList.add('active');
    } else if (viewMode === 'top') {
      this.camera.position.set(0.01, dist * 1.1, 0.0);
      document.getElementById('cam-top')?.classList.add('active');
    }

    this.controls.update();
  }

  initUI() {
    const slider = document.getElementById('u-slider');
    const sliderVal = document.getElementById('slider-val');
    const btnExplain = document.getElementById('btn-explain');
    const btnToggleLang = document.getElementById('btn-toggle-lang');
    const btnToggleExplain = document.getElementById('btn-toggle-explain');
    const explainBody = document.getElementById('explanation-body');
    const telemetryToggle = document.getElementById('telemetry-toggle');
    const telemetryPanel = document.getElementById('telemetry-panel');
    const btnScale = document.getElementById('btn-scale');
    const btnSettings = document.getElementById('btn-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const btnClearKey = document.getElementById('btn-clear-key');
    const settingsModal = document.getElementById('settings-modal');
    const geminiInput = document.getElementById('gemini-key-input');
    const presetPills = document.querySelectorAll('.preset-pill');

    // AR Launch Buttons
    document.getElementById('btn-launch-cam-ar')?.addEventListener('click', () => this.openLiveCameraAR());
    document.getElementById('btn-launch-webxr')?.addEventListener('click', () => this.launchWebXR());

    // AR Active Dock Controls (Works in both Live Camera AR and WebXR)
    document.getElementById('btn-exit-cam-ar')?.addEventListener('click', () => {
      if (this.isWebXR) {
        this.renderer.xr.getSession()?.end();
      } else {
        this.closeLiveCameraAR();
      }
    });
    document.getElementById('btn-flip-cam')?.addEventListener('click', () => this.flipCamera());
    document.getElementById('btn-center-model')?.addEventListener('click', () => {
      if (this.isWebXR) {
        this.centerBenchInFrontOfUser();
      } else {
        this.resetCameraToBench();
        aiExplainer.speakTamil('மாதிரி மையப்படுத்தப்பட்டது.');
      }
    });
    document.getElementById('btn-lock-surface')?.addEventListener('click', () => {
      if (this.isWebXR) {
        this.onWebXRTap();
      } else {
        aiExplainer.speakTamil('மேற்பரப்பில் பொருத்தப்பட்டது.');
      }
    });
    document.getElementById('btn-snap-photo')?.addEventListener('click', () => this.snapArPhoto());

    // Camera preset switches
    document.getElementById('cam-side')?.addEventListener('click', () => this.setCameraView('side'));
    document.getElementById('cam-iso')?.addEventListener('click', () => this.setCameraView('iso'));
    document.getElementById('cam-top')?.addEventListener('click', () => this.setCameraView('top'));

    telemetryToggle?.addEventListener('click', () => {
      telemetryPanel?.classList.toggle('collapsed');
    });

    if (window.innerWidth < 1024 || window.innerHeight < 600) {
      telemetryPanel?.classList.add('collapsed');
    }

    btnScale?.addEventListener('click', () => this.cycleScale());

    geminiInput.value = aiExplainer.getGeminiApiKey();

    slider.addEventListener('input', (e) => {
      const u = parseFloat(e.target.value);
      this.currentU = u;
      sliderVal.textContent = u.toFixed(1);
      this.updateSimulation(u);
      this.updatePillActiveState(u);
    });

    // Preset buttons
    presetPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const u = parseFloat(pill.dataset.u);
        slider.value = u;
        sliderVal.textContent = u.toFixed(1);
        this.currentU = u;
        this.updateSimulation(u);
        this.updatePillActiveState(u);
      });
    });

    // Display Mode Toggle (🕯️ ஆய்வகம் / ⚡ கதிர்ப்படம்)
    const btnToggleMode = document.getElementById('btn-toggle-mode');
    btnToggleMode?.addEventListener('click', () => {
      const isCurrentlyRealLab = (this.bench.displayMode === 'realLab');
      const nextMode = isCurrentlyRealLab ? 'rayOptics' : 'realLab';
      this.bench.setDisplayMode(nextMode);

      if (nextMode === 'realLab') {
        btnToggleMode.textContent = '🕯️ ஆய்வகம்';
        btnToggleMode.classList.remove('ray-mode');
        aiExplainer.speakTamil('ஆய்வக நிஜக் காட்சி முறை.');
      } else {
        btnToggleMode.textContent = '⚡ கதிர்ப்படம்';
        btnToggleMode.classList.add('ray-mode');
        aiExplainer.speakTamil('கதிர் வரைபடக் காட்சி முறை.');
      }
    });

    // Screen Slider & Auto-focus
    const screenSlider = document.getElementById('screen-slider');
    const btnAutofocus = document.getElementById('btn-autofocus');

    screenSlider?.addEventListener('input', (e) => {
      this.bench.autoAlignScreen = false;
      const sz = parseFloat(e.target.value);
      this.bench.setScreenDistance(sz);
      this.updateScreenUI();
    });

    btnAutofocus?.addEventListener('click', () => {
      this.bench.autoAlignScreen = true;
      this.bench.snapScreenToFocus();
      this.updateScreenUI();
      aiExplainer.speakTamil('திரை தானாகக் குவியத்தில் வைக்கப்பட்டது.');
    });

    // Fullscreen & Landscape Orientation Lock for Mobile & Tablet
    const btnFullscreen = document.getElementById('btn-fullscreen');
    const orientationPrompt = document.getElementById('orientation-prompt');
    const btnForceLandscape = document.getElementById('btn-force-landscape');
    const btnDismissOrientation = document.getElementById('btn-dismiss-orientation');

    const requestLandscapeMode = async () => {
      try {
        if (!document.fullscreenElement) {
          if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          } else if (document.documentElement.webkitRequestFullscreen) {
            await document.documentElement.webkitRequestFullscreen();
          }
        }
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('landscape').catch(() => {});
        }
      } catch (err) {
        console.warn('Orientation lock request:', err);
      }
      if (orientationPrompt) {
        orientationPrompt.classList.add('dismissed');
      }
    };

    btnFullscreen?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        requestLandscapeMode();
      } else {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      }
    });

    btnForceLandscape?.addEventListener('click', () => {
      requestLandscapeMode();
    });

    btnDismissOrientation?.addEventListener('click', () => {
      if (orientationPrompt) {
        orientationPrompt.classList.add('dismissed');
      }
    });

    // Detect orientation change to auto-dismiss prompt and re-frame bench
    const onOrientationChange = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      if (isLandscape && orientationPrompt) {
        orientationPrompt.classList.add('dismissed');
      }
      this.onWindowResize();
    };

    window.addEventListener('orientationchange', onOrientationChange);
    if (screen.orientation) {
      screen.orientation.addEventListener('change', onOrientationChange);
    }

    // Clean Lookout Mode (Maximal 3D view toggle)
    const btnCleanLookout = document.getElementById('btn-clean-lookout');
    const btnRestoreUI = document.getElementById('btn-restore-ui');

    btnCleanLookout?.addEventListener('click', () => {
      document.body.classList.toggle('clean-lookout-mode');
      const isClean = document.body.classList.contains('clean-lookout-mode');
      btnCleanLookout.classList.toggle('active', isClean);
      if (isClean) {
        aiExplainer.speakTamil('முழுமையான ஆய்வகக் காட்சி.');
      }
    });

    btnRestoreUI?.addEventListener('click', () => {
      document.body.classList.remove('clean-lookout-mode');
      btnCleanLookout?.classList.remove('active');
    });

    // Console Collapse Toggle
    const labConsole = document.getElementById('lab-console');
    const btnCollapseBottom = document.getElementById('btn-collapse-bottom');

    btnCollapseBottom?.addEventListener('click', () => {
      labConsole?.classList.toggle('console-collapsed');
    });

    if (window.innerWidth < 640 || window.innerHeight < 460) {
      labConsole?.classList.add('console-collapsed');
    }

    btnExplain?.addEventListener('click', () => {
      if (explainBody) explainBody.style.display = 'flex';
      this.isExplanationVisible = true;
      btnToggleExplain?.classList.add('active');
      aiExplainer.explainConcept(this.currentU);
    });

    btnToggleExplain?.addEventListener('click', () => {
      this.isExplanationVisible = false;
      if (explainBody) {
        explainBody.style.display = 'none';
      }
      btnToggleExplain?.classList.remove('active');
    });

    btnToggleLang.addEventListener('click', () => {
      this.showEnglishSubtitles = !this.showEnglishSubtitles;
      document.getElementById('subtitle-en').style.display = this.showEnglishSubtitles ? 'block' : 'none';
      btnToggleLang.classList.toggle('active', this.showEnglishSubtitles);
    });

    btnSettings.addEventListener('click', () => {
      geminiInput.value = aiExplainer.getGeminiApiKey();
      settingsModal.classList.add('open');
    });

    btnCloseSettings.addEventListener('click', () => {
      settingsModal.classList.remove('open');
    });

    btnSaveSettings.addEventListener('click', () => {
      aiExplainer.setGeminiApiKey(geminiInput.value);
      settingsModal.classList.remove('open');
      aiExplainer.speakTamil('அமைப்புகள் சேமிக்கப்பட்டன.');
    });

    btnClearKey.addEventListener('click', () => {
      geminiInput.value = '';
      aiExplainer.setGeminiApiKey('');
    });

    aiExplainer.subscribe(event => this.handleAIExplainerEvent(event));

    this.updateSimulation(this.currentU);
  }

  updatePillActiveState(u) {
    const pills = document.querySelectorAll('.preset-pill');
    pills.forEach(p => {
      const pillU = parseFloat(p.dataset.u);
      if (Math.abs(pillU - u) < 0.6) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  }

  updateSimulation(u) {
    const optics = this.bench.setObjectDistance(u);

    document.getElementById('stat-state-title').textContent = optics.stateTitleTa;
    
    const natureTag = document.getElementById('stat-nature');
    natureTag.textContent = optics.natureTa;
    if (optics.isReal) {
      natureTag.className = 'nature-tag nature-real';
    } else {
      natureTag.className = 'nature-tag nature-virtual';
    }

    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setText('stat-u', optics.u.toFixed(1));
    setText('stat-v', optics.isInfinity ? '∞' : optics.v);
    setText('stat-f', optics.f.toFixed(1));
    setText('stat-m', optics.isInfinity ? '∞' : (optics.m > 0 ? `+${optics.m}` : optics.m));

    setText('stat-application', optics.applicationTa);
    setText('stat-size', optics.sizeTa);

    setText('subtitle-ta', optics.spokenScriptTa);
    setText('subtitle-en', `${optics.stateTitleEn}: Image is formed ${optics.imagePosEn}, ${optics.natureEn}, ${optics.sizeEn}.`);

    this.updateScreenUI();
  }

  updateScreenUI() {
    const screenVal = this.bench.screenZ;
    const statScreen = document.getElementById('stat-screen');
    const screenSlider = document.getElementById('screen-slider');
    const screenSliderVal = document.getElementById('screen-slider-val');
    const statFocus = document.getElementById('stat-focus');
    const badgeFocus = document.getElementById('badge-screen-focus');
    const btnAutofocus = document.getElementById('btn-autofocus');

    if (statScreen) statScreen.textContent = screenVal.toFixed(1);
    if (screenSlider && document.activeElement !== screenSlider) {
      screenSlider.value = screenVal.toFixed(1);
    }
    if (screenSliderVal) screenSliderVal.textContent = screenVal.toFixed(1);

    const proj = calculateScreenProjection(this.bench.currentU, screenVal, this.bench.f, this.bench.ho);

    if (statFocus) {
      statFocus.textContent = proj.statusTa;
      statFocus.className = proj.isFocused ? 'focus-highlight focus-sharp' : (proj.isNearFocus ? 'focus-highlight focus-near' : 'focus-highlight focus-blur');
    }

    if (badgeFocus) {
      badgeFocus.textContent = proj.statusTa;
      if (proj.isVirtual) {
        badgeFocus.className = 'screen-focus-tag tag-virtual';
      } else if (proj.isFocused) {
        badgeFocus.className = 'screen-focus-tag tag-focused';
      } else if (proj.isNearFocus) {
        badgeFocus.className = 'screen-focus-tag tag-near-focus';
      } else {
        badgeFocus.className = 'screen-focus-tag tag-blurry';
      }
    }

    if (btnAutofocus) {
      btnAutofocus.classList.toggle('active', this.bench.autoAlignScreen);
    }
  }

  handleAIExplainerEvent(event) {
    const btnExplain = document.getElementById('btn-explain');
    const btnText = document.getElementById('explain-btn-text');

    switch (event.type) {
      case 'speech_started':
        btnExplain.classList.add('speaking');
        btnText.textContent = '⏹ நிறுத்து';
        break;

      case 'speech_ended':
      case 'speech_error':
        btnExplain.classList.remove('speaking');
        btnText.textContent = '🔊 விளக்கம் கூறு';
        break;

      case 'explanation_ready':
        document.getElementById('subtitle-ta').textContent = event.textTa;
        document.getElementById('subtitle-en').textContent = event.textEn;
        break;

      case 'ai_loading':
        if (event.status) {
          btnText.textContent = '⏳ சிந்திப்பது...';
        }
        break;
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // If in 3D desktop/mobile mode, re-balance camera distance for portrait vs landscape
    if (!this.isWebXR && !this.isLiveCameraAR && this.controls) {
      const isPortrait = window.innerWidth < window.innerHeight;
      const targetDist = isPortrait ? 0.85 : 0.65;
      const curDist = this.camera.position.length();
      if (Math.abs(curDist - targetDist) > 0.15) {
        this.camera.position.setLength(targetDist);
        this.controls.update();
      }
    }
  }

  render(timestamp, frame) {
    try {
      const time = timestamp * 0.001;

      if (this.isWebXR && frame) {
        const refSpace = this.renderer.xr.getReferenceSpace();
        if (refSpace) {
          const viewerPose = frame.getViewerPose(refSpace);
          if (viewerPose) {
            this.lastViewerPose = viewerPose;
            if (!this.benchPlacedInXR) {
              this.centerBenchInFrontOfUser();
              this.benchPlacedInXR = true;
            }
          }
        }

        const session = this.renderer.xr.getSession();

        if (!this.hitTestSourceRequested) {
          session.requestReferenceSpace('viewer').then(referenceSpace => {
            session.requestHitTestSource({ space: referenceSpace }).then(source => {
              this.hitTestSource = source;
            }).catch(e => console.warn('Hit test source error:', e));
          }).catch(e => console.warn('Viewer ref space error:', e));

          session.addEventListener('end', () => {
            this.hitTestSourceRequested = false;
            this.hitTestSource = null;
          });

          this.hitTestSourceRequested = true;
        }

        if (this.hitTestSource) {
          const referenceSpace = this.renderer.xr.getReferenceSpace();
          const hitTestResults = frame.getHitTestResults(this.hitTestSource);

          if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(referenceSpace);

            if (pose && pose.transform) {
              this.reticle.visible = true;
              this.reticle.matrix.fromArray(pose.transform.matrix);
              this.hasPlaneHit = true;
            } else {
              this.reticle.visible = false;
              this.hasPlaneHit = false;
            }
          } else {
            this.reticle.visible = false;
            this.hasPlaneHit = false;
          }
        }
      }

      if (this.bench) {
        this.bench.update(time);
      }

      if (!this.isWebXR && this.controls) {
        this.controls.update();
      }

      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      console.error('Render loop exception:', err);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
