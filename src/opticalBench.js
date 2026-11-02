/**
 * opticalBench.js
 * Realistic Procedural 3D Laboratory Optical Bench for Convex Lens Simulation
 * Pure Three.js geometry & PBR materials (Zero external .gltf assets)
 */

import * as THREE from 'three';
import { FOCAL_LENGTH, OBJECT_HEIGHT, calculateRayPaths, calculateScreenProjection } from './opticsMath.js';

export class OpticalBenchSystem {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = 'OpticalBenchSystem';
    this.scene.add(this.root);

    // Physics constants
    this.scale = 0.01; // 1 cm = 0.01 meters (1:1 scale for WebXR)
    this.f = FOCAL_LENGTH; // 10 cm
    this.ho = OBJECT_HEIGHT; // 6 cm
    this.currentU = 20.0; // Initial distance u = 20 cm (at 2F)
    this.opticalHeight = 0.14; // Optical axis is 14 cm above table surface

    // Screen distance and auto-align state
    this.screenZ = 20.0; // Initial screen position v = 20 cm
    this.autoAlignScreen = true; // Auto-align screen to focal point by default
    this.displayMode = 'realLab'; // 'realLab' (Photorealistic Candle & Screen) | 'rayOptics' (Rays Overlay)
    this.lastOptics = null;
    this.lastRays = null;
    this.lastTime = 0;

    // Sub-groups
    this.benchGroup = new THREE.Group();
    this.lensGroup = new THREE.Group();
    this.markersGroup = new THREE.Group();
    this.candleGroup = new THREE.Group();
    this.screenGroup = new THREE.Group();
    this.imageGroup = new THREE.Group();
    this.raysGroup = new THREE.Group();

    this.root.add(this.benchGroup);
    this.root.add(this.lensGroup);
    this.root.add(this.markersGroup);
    this.root.add(this.candleGroup);
    this.root.add(this.screenGroup);
    this.root.add(this.imageGroup);
    this.root.add(this.raysGroup);

    // Dedicated self-contained laboratory lighting attached to root
    this.setupLocalLighting();

    // Flame light reference for animation
    this.flameLight = null;
    this.candleFlameMesh = null;
    this.candleFlameAura = null;
    this.flameBlueMesh = null;

    // Materials dictionary for clean reuse
    this.initMaterials();

    // Build the procedural 3D laboratory apparatus
    this.buildBench();
    this.buildShadowPlane();
    this.buildLens();
    this.buildPrincipalAxisAndMarkers();
    this.buildCandle();
    this.buildScreen();
    this.buildImageModel();

    // Set initial display mode (realLab: clean real candle, lens & screen)
    this.setDisplayMode(this.displayMode);

    // Disable frustum culling on all child meshes so they never disappear in AR
    this.root.traverse(child => {
      if (child.isMesh || child.isSprite) {
        child.frustumCulled = false;
      }
    });

    // Initial update of rays, screen & image position
    this.setObjectDistance(this.currentU);
  }

  setupLocalLighting() {
    const keyLight = new THREE.DirectionalLight(0xfff8ee, 2.2);
    keyLight.position.set(0.6, 1.6, 0.7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 3.5;
    keyLight.shadow.camera.left = -0.6;
    keyLight.shadow.camera.right = 0.6;
    keyLight.shadow.camera.top = 0.6;
    keyLight.shadow.camera.bottom = -0.6;
    keyLight.shadow.bias = -0.001;
    this.root.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xa5d8ff, 1.2);
    fillLight.position.set(-0.6, 1.0, -0.5);
    this.root.add(fillLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.root.add(ambientLight);
  }

  initMaterials() {
    this.materials = {
      benchRail: new THREE.MeshStandardMaterial({
        color: 0x94a3b8, // Crisp anodized aluminum
        metalness: 0.8,
        roughness: 0.25,
      }),
      castIron: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.6,
        roughness: 0.4,
      }),
      brass: new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        metalness: 0.9,
        roughness: 0.2,
      }),
      chrome: new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        metalness: 0.95,
        roughness: 0.1,
      }),
      opticalGlass: new THREE.MeshStandardMaterial({
        color: 0xbae6fd,
        roughness: 0.05,
        metalness: 0.1,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      }),
      lensBezel: new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0284c7,
        emissiveIntensity: 0.7,
        metalness: 0.8,
        roughness: 0.2,
      }),
      wax: new THREE.MeshStandardMaterial({
        color: 0xffedd5, // Translucent warm paraffin ivory wax
        roughness: 0.25,
        metalness: 0.02,
      }),
      wick: new THREE.MeshStandardMaterial({
        color: 0x171717,
        roughness: 0.9,
      }),
      screenMatte: new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.9,
        metalness: 0.02,
      }),
      principalAxis: new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.75,
      }),
      realImage: new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 1.0,
        roughness: 0.2,
        metalness: 0.2,
        transparent: true,
        opacity: 0.9,
      }),
      virtualImage: new THREE.MeshStandardMaterial({
        color: 0xe879f9,
        emissive: 0xc026d3,
        emissiveIntensity: 1.0,
        roughness: 0.2,
        metalness: 0.2,
        transparent: true,
        opacity: 0.9,
      }),
      ray1: new THREE.MeshBasicMaterial({
        color: 0xfbbf24, // Bright amber ray
      }),
      ray2: new THREE.MeshBasicMaterial({
        color: 0x06b6d4, // Bright cyan ray
      }),
      rayVirtual: new THREE.MeshBasicMaterial({
        color: 0xf43f5e, // Glowing crimson virtual ray
        transparent: true,
        opacity: 0.9,
      })
    };
  }

  buildBench() {
    const benchLength = 0.86;
    const benchWidth = 0.09;
    const benchHeight = 0.022;

    const railGeo = new THREE.BoxGeometry(benchWidth, benchHeight, benchLength);
    const railMesh = new THREE.Mesh(railGeo, this.materials.benchRail);
    railMesh.position.set(0, benchHeight / 2 + 0.02, 0);
    railMesh.castShadow = true;
    railMesh.receiveShadow = true;
    this.benchGroup.add(railMesh);

    const grooveGeo = new THREE.BoxGeometry(0.012, 0.005, benchLength);
    const grooveMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const grooveMesh = new THREE.Mesh(grooveGeo, grooveMat);
    grooveMesh.position.set(0, benchHeight + 0.02 - 0.001, 0);
    this.benchGroup.add(grooveMesh);

    // Ruler along the bench rail (1600px width maps to benchLength)
    const rulerTexture = this.createRulerCanvasTexture(benchLength);
    const rulerGeo = new THREE.PlaneGeometry(benchLength, 0.03);
    const rulerMat = new THREE.MeshStandardMaterial({
      map: rulerTexture,
      roughness: 0.35,
      metalness: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const rulerMesh = new THREE.Mesh(rulerGeo, rulerMat);
    rulerMesh.rotation.x = -Math.PI / 2;
    rulerMesh.rotation.z = -Math.PI / 2;
    rulerMesh.position.set(benchWidth / 2 - 0.022, benchHeight + 0.0205, 0);
    rulerMesh.receiveShadow = true;
    this.benchGroup.add(rulerMesh);

    this.buildSupportFoot(-benchLength / 2 + 0.04);
    this.buildSupportFoot(benchLength / 2 - 0.04);
  }

  buildShadowPlane() {
    const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.40 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.001;
    shadowMesh.receiveShadow = true;
    this.benchGroup.add(shadowMesh);
  }

  buildSupportFoot(zPos) {
    const footGroup = new THREE.Group();
    footGroup.position.set(0, 0, zPos);

    const beamGeo = new THREE.BoxGeometry(0.13, 0.02, 0.04);
    const beam = new THREE.Mesh(beamGeo, this.materials.castIron);
    beam.position.y = 0.01;
    beam.castShadow = true;
    beam.receiveShadow = true;
    footGroup.add(beam);

    const screwGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.014, 16);
    const screw1 = new THREE.Mesh(screwGeo, this.materials.brass);
    screw1.position.set(-0.055, 0.007, 0);
    screw1.castShadow = true;
    const screw2 = new THREE.Mesh(screwGeo, this.materials.brass);
    screw2.position.set(0.055, 0.007, 0);
    screw2.castShadow = true;

    footGroup.add(screw1);
    footGroup.add(screw2);

    this.benchGroup.add(footGroup);
  }

  createRulerCanvasTexture(lengthInMeters) {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const totalCm = Math.round(lengthInMeters * 100);
    const halfCm = Math.floor(totalCm / 2);
    const pxPerCm = canvas.width / totalCm;

    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';

    for (let cm = -halfCm; cm <= halfCm; cm++) {
      const x = (cm + halfCm) * pxPerCm;

      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x, 100);
      ctx.lineTo(x, 42);
      ctx.stroke();

      if (cm % 5 === 0) {
        ctx.fillText(`${cm}`, x, 32);
      }

      if (cm < halfCm) {
        ctx.lineWidth = 1.5;
        for (let mm = 1; mm < 10; mm++) {
          const subX = x + (mm / 10) * pxPerCm;
          const tickHeight = (mm === 5) ? 62 : 76;
          ctx.beginPath();
          ctx.moveTo(subX, 100);
          ctx.lineTo(subX, tickHeight);
          ctx.stroke();
        }
      }
    }

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, 97);
    ctx.lineTo(canvas.width, 97);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  buildLens() {
    this.lensGroup.position.set(0, 0, 0);

    const baseGeo = new THREE.BoxGeometry(0.08, 0.02, 0.06);
    const baseMesh = new THREE.Mesh(baseGeo, this.materials.castIron);
    baseMesh.position.y = 0.035;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.lensGroup.add(baseMesh);

    const pointerGeo = new THREE.ConeGeometry(0.005, 0.015, 4);
    const pointer = new THREE.Mesh(pointerGeo, this.materials.brass);
    pointer.rotation.z = Math.PI / 2;
    pointer.position.set(0.042, 0.04, 0);
    pointer.castShadow = true;
    this.lensGroup.add(pointer);

    const pillarGeo = new THREE.CylinderGeometry(0.007, 0.007, this.opticalHeight - 0.03, 16);
    const pillar = new THREE.Mesh(pillarGeo, this.materials.chrome);
    pillar.position.y = (this.opticalHeight + 0.035) / 2;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    this.lensGroup.add(pillar);

    // Knurled thumbscrew clamp on pillar
    const screwGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.008, 16);
    const screw = new THREE.Mesh(screwGeo, this.materials.brass);
    screw.rotation.z = Math.PI / 2;
    screw.position.set(-0.012, 0.07, 0);
    screw.castShadow = true;
    this.lensGroup.add(screw);

    const lensRadius = 0.045;
    const bezelRingGeo = new THREE.TorusGeometry(lensRadius + 0.003, 0.004, 16, 48);
    const bezelRing = new THREE.Mesh(bezelRingGeo, this.materials.lensBezel);
    bezelRing.position.y = this.opticalHeight;
    bezelRing.castShadow = true;
    bezelRing.receiveShadow = true;
    this.lensGroup.add(bezelRing);

    const lensProfilePoints = [];
    const segments = 32;
    const maxR = lensRadius;
    const centerThickness = 0.018;
    const edgeThickness = 0.003;

    for (let i = 0; i <= segments; i++) {
      const r = (i / segments) * maxR;
      const t = edgeThickness + (centerThickness - edgeThickness) * Math.sqrt(Math.max(0, 1 - Math.pow(r / maxR, 2)));
      lensProfilePoints.push(new THREE.Vector2(r, t / 2));
    }
    for (let i = segments; i >= 0; i--) {
      const r = (i / segments) * maxR;
      const t = edgeThickness + (centerThickness - edgeThickness) * Math.sqrt(Math.max(0, 1 - Math.pow(r / maxR, 2)));
      lensProfilePoints.push(new THREE.Vector2(r, -t / 2));
    }

    const lensGeo = new THREE.LatheGeometry(lensProfilePoints, 48);
    lensGeo.rotateX(Math.PI / 2);

    const lensMesh = new THREE.Mesh(lensGeo, this.materials.opticalGlass);
    lensMesh.position.y = this.opticalHeight;
    lensMesh.castShadow = true;
    this.lensGroup.add(lensMesh);
  }

  buildPrincipalAxisAndMarkers() {
    const fScene = this.f * this.scale;

    const axisGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.84, 12);
    const axisMesh = new THREE.Mesh(axisGeo, this.materials.principalAxis);
    axisMesh.rotation.x = Math.PI / 2;
    axisMesh.position.set(0, this.opticalHeight, 0);
    this.markersGroup.add(axisMesh);

    const markersData = [
      { z: -2 * fScene, titleTa: '2F₁', subTa: '20 cm', color: '#ef4444' },
      { z: -1 * fScene, titleTa: 'F₁', subTa: 'குவியம் (10 cm)', color: '#f59e0b' },
      { z: 0,           titleTa: 'O',  subTa: 'மையம்', color: '#10b981' },
      { z: 1 * fScene,  titleTa: 'F₂', subTa: 'குவியம் (10 cm)', color: '#06b6d4' },
      { z: 2 * fScene,  titleTa: '2F₂', subTa: '20 cm', color: '#8b5cf6' }
    ];

    markersData.forEach(item => {
      const pinGeo = new THREE.CylinderGeometry(0.0018, 0.0018, 0.08, 8);
      const pinMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(0, 0.04 + 0.04, item.z);
      this.markersGroup.add(pin);

      const dotGeo = new THREE.SphereGeometry(0.005, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.set(0, this.opticalHeight, item.z);
      this.markersGroup.add(dot);

      const sprite = this.createMarkerSprite(item.titleTa, item.subTa, item.color);
      sprite.position.set(0, this.opticalHeight + 0.05, item.z);
      this.markersGroup.add(sprite);
    });
  }

  createMarkerSprite(title, subtitle, accentColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 5;
    this.roundRect(ctx, 6, 6, 288, 108, 18, true, true);

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(36, 44, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, 60, 54);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 20px "Segoe UI", "Nirmala UI", sans-serif';
    ctx.fillText(subtitle, 24, 94);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.075, 0.03, 1);
    return sprite;
  }

  roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  buildCandle() {
    this.candleObjectGroup = new THREE.Group();
    this.candleGroup.add(this.candleObjectGroup);

    // 1. Sliding base rider on optical bench
    const baseGeo = new THREE.BoxGeometry(0.075, 0.018, 0.05);
    const baseMesh = new THREE.Mesh(baseGeo, this.materials.brass);
    baseMesh.position.y = 0.035;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.candleObjectGroup.add(baseMesh);

    const pointerGeo = new THREE.ConeGeometry(0.004, 0.012, 4);
    const pointer = new THREE.Mesh(pointerGeo, this.materials.brass);
    pointer.rotation.z = Math.PI / 2;
    pointer.position.set(0.038, 0.038, 0);
    pointer.castShadow = true;
    this.candleObjectGroup.add(pointer);

    // 2. Realistic Candle Body (Paraffin Wax)
    const candleHeight = this.ho * this.scale;
    const waxRadius = 0.013;
    const candleBodyHeight = (this.opticalHeight - 0.04) + 0.015;

    const waxGeo = new THREE.CylinderGeometry(waxRadius * 0.96, waxRadius, candleBodyHeight, 32);
    const wax = new THREE.Mesh(waxGeo, this.materials.wax);
    wax.position.y = 0.04 + candleBodyHeight / 2;
    wax.castShadow = true;
    wax.receiveShadow = true;
    this.candleObjectGroup.add(wax);

    // Melted concave wax pool rim on top
    const meltRimGeo = new THREE.TorusGeometry(waxRadius * 0.94, 0.002, 16, 32);
    const meltRim = new THREE.Mesh(meltRimGeo, this.materials.wax);
    meltRim.rotation.x = Math.PI / 2;
    meltRim.position.y = 0.04 + candleBodyHeight;
    meltRim.castShadow = true;
    this.candleObjectGroup.add(meltRim);

    // 3. Curved Cotton Wick with glowing ember tip
    const flameBaseY = 0.04 + candleBodyHeight + 0.002;
    const wickGeo = new THREE.CylinderGeometry(0.001, 0.0013, 0.010, 8);
    const wick = new THREE.Mesh(wickGeo, this.materials.wick);
    wick.rotation.z = -0.15; // Natural curved wick
    wick.position.set(0.001, flameBaseY + 0.004, 0);
    wick.castShadow = true;
    this.candleObjectGroup.add(wick);

    const emberGeo = new THREE.SphereGeometry(0.0015, 8, 8);
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const ember = new THREE.Mesh(emberGeo, emberMat);
    ember.position.set(0.0015, flameBaseY + 0.008, 0);
    this.candleObjectGroup.add(ember);

    // 4. Procedural Multi-Layer Animated Flame
    // A. Blue combustion base zone
    const flameBlueGeo = new THREE.ConeGeometry(0.005, 0.010, 16);
    flameBlueGeo.translate(0, 0.005, 0);
    const flameBlueMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.85
    });
    this.flameBlueMesh = new THREE.Mesh(flameBlueGeo, flameBlueMat);
    this.flameBlueMesh.position.y = flameBaseY + 0.003;
    this.candleObjectGroup.add(this.flameBlueMesh);

    // B. Inner brilliant white/yellow incandescent core
    const flameGeo = new THREE.ConeGeometry(0.008, 0.024, 16);
    flameGeo.translate(0, 0.012, 0);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    this.candleFlameMesh = new THREE.Mesh(flameGeo, flameMat);
    this.candleFlameMesh.position.y = flameBaseY + 0.004;
    this.candleObjectGroup.add(this.candleFlameMesh);

    // C. Outer warm golden-orange envelope
    const auraGeo = new THREE.ConeGeometry(0.012, 0.030, 16);
    auraGeo.translate(0, 0.015, 0);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.65
    });
    this.candleFlameAura = new THREE.Mesh(auraGeo, auraMat);
    this.candleFlameAura.position.y = flameBaseY + 0.003;
    this.candleObjectGroup.add(this.candleFlameAura);

    // 5. Dynamic Shadow-Casting Flame Light
    this.flameLight = new THREE.PointLight(0xffa526, 3.2, 1.5, 1.5);
    this.flameLight.castShadow = true;
    this.flameLight.shadow.bias = -0.0015;
    this.flameLight.shadow.mapSize.width = 1024;
    this.flameLight.shadow.mapSize.height = 1024;
    this.flameLight.position.set(0, flameBaseY + 0.016, 0);
    this.candleObjectGroup.add(this.flameLight);

    // 6. Object Ray Marker Arrow (shown in rayOptics mode)
    this.candleArrowGroup = new THREE.Group();
    const arrowShaftGeo = new THREE.CylinderGeometry(0.0025, 0.0025, candleHeight, 12);
    const arrowShaftMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const arrowShaft = new THREE.Mesh(arrowShaftGeo, arrowShaftMat);
    arrowShaft.position.set(-0.025, this.opticalHeight + candleHeight / 2, 0);
    this.candleArrowGroup.add(arrowShaft);

    const arrowHeadGeo = new THREE.ConeGeometry(0.007, 0.016, 12);
    const arrowHead = new THREE.Mesh(arrowHeadGeo, arrowShaftMat);
    arrowHead.position.set(-0.025, this.opticalHeight + candleHeight, 0);
    this.candleArrowGroup.add(arrowHead);

    const objBadge = this.createMarkerSprite('பொருள் (Candle)', `h = ${this.ho} cm`, '#f59e0b');
    objBadge.position.set(-0.025, this.opticalHeight + candleHeight + 0.035, 0);
    this.candleArrowGroup.add(objBadge);

    this.candleObjectGroup.add(this.candleArrowGroup);
  }

  buildScreen() {
    this.screenCarriageGroup = new THREE.Group();
    this.screenGroup.add(this.screenCarriageGroup);

    // 1. Sliding base rider on optical bench
    const baseGeo = new THREE.BoxGeometry(0.075, 0.018, 0.05);
    const baseMesh = new THREE.Mesh(baseGeo, this.materials.brass);
    baseMesh.position.y = 0.035;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.screenCarriageGroup.add(baseMesh);

    // Pointer on ruler
    const pointerGeo = new THREE.ConeGeometry(0.004, 0.012, 4);
    const pointer = new THREE.Mesh(pointerGeo, this.materials.brass);
    pointer.rotation.z = Math.PI / 2;
    pointer.position.set(0.038, 0.038, 0);
    pointer.castShadow = true;
    this.screenCarriageGroup.add(pointer);

    // 2. Vertical chrome mounting rod
    const pillarGeo = new THREE.CylinderGeometry(0.005, 0.005, this.opticalHeight - 0.02, 16);
    const pillar = new THREE.Mesh(pillarGeo, this.materials.chrome);
    pillar.position.y = (this.opticalHeight + 0.035) / 2;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    this.screenCarriageGroup.add(pillar);

    // Thumbscrew clamp
    const screwGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.008, 16);
    const screw = new THREE.Mesh(screwGeo, this.materials.brass);
    screw.rotation.z = Math.PI / 2;
    screw.position.set(-0.01, 0.06, 0);
    screw.castShadow = true;
    this.screenCarriageGroup.add(screw);

    // 3. Screen Frame (Matte dark casing)
    const frameGeo = new THREE.BoxGeometry(0.128, 0.128, 0.004);
    const frame = new THREE.Mesh(frameGeo, this.materials.castIron);
    frame.position.set(0, this.opticalHeight, 0);
    frame.castShadow = true;
    frame.receiveShadow = true;
    this.screenCarriageGroup.add(frame);

    // 4. White Projection Screen Canvas
    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = 512;
    this.screenCanvas.height = 512;

    this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTexture.minFilter = THREE.LinearFilter;
    this.screenTexture.magFilter = THREE.LinearFilter;

    const screenPlateGeo = new THREE.PlaneGeometry(0.122, 0.122);
    this.screenMat = new THREE.MeshStandardMaterial({
      map: this.screenTexture,
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.FrontSide,
      emissive: 0xffffff,
      emissiveMap: this.screenTexture,
      emissiveIntensity: 0.35,
    });

    const screenMesh = new THREE.Mesh(screenPlateGeo, this.screenMat);
    // Face towards negative Z (directly facing the lens and candle)
    screenMesh.rotation.y = Math.PI;
    screenMesh.position.set(0, this.opticalHeight, -0.0025);
    screenMesh.castShadow = true;
    screenMesh.receiveShadow = true;
    this.screenCarriageGroup.add(screenMesh);

    // 5. Floating Screen Badge
    this.screenBadge = this.createMarkerSprite('வெள்ளை திரை', 'பிம்பம் & நிழல்', '#38bdf8');
    this.screenBadge.position.set(0, this.opticalHeight + 0.09, 0);
    this.screenCarriageGroup.add(this.screenBadge);
  }

  drawScreenProjection(optics, rays, time = 0) {
    if (!this.screenCanvas) return;
    const ctx = this.screenCanvas.getContext('2d');
    const W = this.screenCanvas.width;
    const H = this.screenCanvas.height;

    ctx.clearRect(0, 0, W, H);

    // 1. Realistic white laboratory projection cardboard background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, H);

    // Grid lines (faint 1 cm grid lines, authentic physics lab screen)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const gridStep = W / 10;
    for (let x = 0; x <= W; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Optical Center crosshair at (cx, cy)
    const cx = W / 2;
    const cy = H / 2;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy); ctx.lineTo(cx + 18, cy);
    ctx.moveTo(cx, cy - 18); ctx.lineTo(cx, cy + 18);
    ctx.stroke();

    // Screen projection calculation
    const proj = calculateScreenProjection(this.currentU, this.screenZ, this.f, this.ho);

    if (!proj.canFormRealImage) {
      // Virtual Image or At Infinity: Real image cannot be caught on a screen!
      const diffGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, W * 0.45);
      diffGrad.addColorStop(0, 'rgba(254, 240, 138, 0.25)');
      diffGrad.addColorStop(1, 'rgba(248, 250, 252, 0)');
      ctx.fillStyle = diffGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, W * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Explanatory note on screen
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 24px "Segoe UI", "Nirmala UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🚫 திரையில் பிம்பம் தோன்றாது', cx, cy - 14);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 15px "Segoe UI", "Nirmala UI", sans-serif';
      ctx.fillText(proj.statusTa, cx, cy + 18);
      ctx.font = '13px "Segoe UI", sans-serif';
      ctx.fillText('Virtual images cannot be captured on a screen', cx, cy + 42);

      this.screenTexture.needsUpdate = true;
      return;
    }

    // Real Image is possible!
    const v = proj.v;
    const delta = proj.focusDelta; // cm away from sharp focus
    const m = Math.abs(v / this.currentU); // magnification

    // 2. Aperture Cone of Transmitted Light on Screen
    const spotRadius = Math.max(70, Math.min(220, 120 + delta * 6));
    const spotGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, spotRadius);
    spotGrad.addColorStop(0, 'rgba(254, 249, 195, 0.92)');
    spotGrad.addColorStop(0.65, 'rgba(253, 230, 138, 0.45)');
    spotGrad.addColorStop(1, 'rgba(248, 250, 252, 0)');

    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, spotRadius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Dynamic Optical Blur Filter
    const blurAmount = Math.max(0, Math.min(22, proj.blurRadius));
    ctx.save();
    if (blurAmount > 0.4) {
      ctx.filter = `blur(${blurAmount.toFixed(1)}px)`;
    }

    // Flame flicker pulsation synchronized with 3D flame
    const flickerY = Math.sin(time * 18.0) * 2.5;
    const flickerX = Math.cos(time * 26.0) * 1.8;

    // Projected Inverted Candle Geometry on Screen:
    // The flame is at the tip, pointing DOWNWARDS below cy!
    // The candle body extends UPWARDS above cy!
    const baseFlameH = 50 * m; // flame height scales with m
    const flameH = Math.max(18, Math.min(180, baseFlameH));
    const flameW = flameH * 0.42;

    const candleBodyW = Math.max(12, Math.min(80, 26 * m));
    const candleBodyH = Math.max(30, Math.min(160, 60 * m));

    // A. Draw Inverted Candle Body Shadow/Silhouette (Extending UPWARDS from cy)
    const candleTopY = cy; // Wick/flame base at optical axis
    const candleBaseY = cy - candleBodyH; // Base of candle points upwards

    const shadowGrad = ctx.createLinearGradient(cx - candleBodyW / 2, cy, cx + candleBodyW / 2, cy);
    shadowGrad.addColorStop(0, 'rgba(30, 41, 59, 0.85)');
    shadowGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.95)');
    shadowGrad.addColorStop(1, 'rgba(30, 41, 59, 0.85)');

    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    // Inverted candle cylinder
    this.roundRect(ctx, cx - candleBodyW / 2, candleBaseY, candleBodyW, candleBodyH, 6, true, false);

    // Inverted wick extending downwards from candleTopY
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = Math.max(2, 3.5 * m);
    ctx.beginPath();
    ctx.moveTo(cx, candleTopY);
    ctx.lineTo(cx + flickerX * 0.3, candleTopY + 10 * m);
    ctx.stroke();

    // B. Draw Inverted Flame (Pointing DOWNWARDS below candleTopY)
    const flameTipY = candleTopY + flameH + flickerY;
    const flameRootY = candleTopY + 4;
    const flameMidY = candleTopY + flameH * 0.45;
    const curFlameW = flameW + Math.sin(time * 24.0) * 1.5;

    // Outer flame envelope (Golden Amber)
    const flameOuterGrad = ctx.createRadialGradient(
      cx + flickerX, flameMidY, 4,
      cx, flameMidY, flameH * 0.65
    );
    flameOuterGrad.addColorStop(0, '#ffffff');
    flameOuterGrad.addColorStop(0.25, '#fef08a');
    flameOuterGrad.addColorStop(0.6, '#f59e0b');
    flameOuterGrad.addColorStop(0.85, '#ea580c');
    flameOuterGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');

    ctx.fillStyle = flameOuterGrad;
    ctx.beginPath();
    ctx.moveTo(cx, flameTipY); // Point of inverted flame (pointing down)
    ctx.bezierCurveTo(
      cx + curFlameW, flameTipY - flameH * 0.3,
      cx + curFlameW * 0.8, flameRootY + flameH * 0.2,
      cx, flameRootY
    );
    ctx.bezierCurveTo(
      cx - curFlameW * 0.8, flameRootY + flameH * 0.2,
      cx - curFlameW, flameTipY - flameH * 0.3,
      cx, flameTipY
    );
    ctx.closePath();
    ctx.fill();

    // Inner bright incandescent core
    const coreH = flameH * 0.55;
    const coreW = curFlameW * 0.45;
    const coreTipY = candleTopY + coreH + flickerY * 0.7;

    const flameCoreGrad = ctx.createLinearGradient(cx, flameRootY, cx, coreTipY);
    flameCoreGrad.addColorStop(0, '#38bdf8'); // Subtle blue base
    flameCoreGrad.addColorStop(0.2, '#ffffff'); // Pure white hot core
    flameCoreGrad.addColorStop(0.8, '#fef9c3');
    flameCoreGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

    ctx.fillStyle = flameCoreGrad;
    ctx.beginPath();
    ctx.moveTo(cx + flickerX * 0.5, coreTipY);
    ctx.bezierCurveTo(
      cx + coreW, coreTipY - coreH * 0.3,
      cx + coreW * 0.7, flameRootY + coreH * 0.2,
      cx, flameRootY
    );
    ctx.bezierCurveTo(
      cx - coreW * 0.7, flameRootY + coreH * 0.2,
      cx - coreW, coreTipY - coreH * 0.3,
      cx + flickerX * 0.5, coreTipY
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore(); // Restore filter

    // 4. Metric & Focus Stamp on screen
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(8, H - 42, W - 16, 34);

    ctx.fillStyle = proj.isFocused ? '#10b981' : (proj.isNearFocus ? '#f59e0b' : '#ef4444');
    ctx.font = 'bold 15px "Segoe UI", "Nirmala UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(proj.statusTa, 16, H - 20);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`v=${v.toFixed(1)}cm | m=${optics.m > 0 ? '+' : ''}${optics.m.toFixed(2)}x`, W - 16, H - 20);

    this.screenTexture.needsUpdate = true;
  }

  setDisplayMode(mode) {
    this.displayMode = mode;
    const isRealLab = (mode === 'realLab');

    // In realLab mode: rays and marker pins are hidden, pure realistic apparatus
    this.raysGroup.visible = !isRealLab;
    this.markersGroup.visible = !isRealLab;
    this.candleArrowGroup.visible = !isRealLab;
    this.imageMeshGroup.visible = !isRealLab;

    // Screen is always visible in both modes
    this.screenGroup.visible = true;
  }

  buildImageModel() {
    this.imageMeshGroup = new THREE.Group();
    this.imageGroup.add(this.imageMeshGroup);

    this.imageWaxGeo = new THREE.CylinderGeometry(0.011, 0.011, 1, 16);
    this.imageWaxMesh = new THREE.Mesh(this.imageWaxGeo, this.materials.realImage);
    this.imageMeshGroup.add(this.imageWaxMesh);

    this.imageArrowShaftGeo = new THREE.CylinderGeometry(0.003, 0.003, 1, 12);
    this.imageArrowShaft = new THREE.Mesh(this.imageArrowShaftGeo, this.materials.realImage);
    this.imageMeshGroup.add(this.imageArrowShaft);

    this.imageArrowHeadGeo = new THREE.ConeGeometry(0.008, 0.018, 12);
    this.imageArrowHead = new THREE.Mesh(this.imageArrowHeadGeo, this.materials.realImage);
    this.imageMeshGroup.add(this.imageArrowHead);

    this.imageBadge = this.createMarkerSprite('பிம்பம்', 'மெய் & தலைகீழ்', '#10b981');
    this.imageMeshGroup.add(this.imageBadge);

    this.infinityBadge = this.createMarkerSprite('∞ முடிவிலி', 'இணைக்கதிர்கள்', '#06b6d4');
    this.infinityBadge.position.set(0, this.opticalHeight + 0.05, 0.42);
    this.infinityBadge.visible = false;
    this.imageGroup.add(this.infinityBadge);
  }

  setObjectDistance(u) {
    this.currentU = Math.max(2.5, Math.min(42.0, u));
    const uScene = this.currentU * this.scale;

    this.candleObjectGroup.position.z = -uScene;

    const { optics, rays } = calculateRayPaths(this.currentU, this.f, this.ho, this.scale);
    this.lastOptics = optics;
    this.lastRays = rays;

    // If auto-align is active, position screen at focal point v
    if (this.autoAlignScreen && optics.isReal) {
      this.screenZ = optics.vRaw;
    } else if (this.autoAlignScreen && !optics.isReal) {
      this.screenZ = 20.0;
    }

    if (this.screenCarriageGroup) {
      this.screenCarriageGroup.position.z = this.screenZ * this.scale;
    }

    this.updateImageModel(optics, rays);
    this.updateRayLines(rays, optics);
    this.drawScreenProjection(optics, rays, this.lastTime);

    // Ensure all new children also have frustum culling disabled
    this.root.traverse(child => {
      if (child.isMesh || child.isSprite) {
        child.frustumCulled = false;
      }
    });

    return optics;
  }

  setScreenDistance(screenZ) {
    this.screenZ = Math.max(5.0, Math.min(45.0, screenZ));
    if (this.screenCarriageGroup) {
      this.screenCarriageGroup.position.z = this.screenZ * this.scale;
    }
    if (this.lastOptics) {
      this.drawScreenProjection(this.lastOptics, this.lastRays, this.lastTime);
    }
    return calculateScreenProjection(this.currentU, this.screenZ, this.f, this.ho);
  }

  snapScreenToFocus() {
    if (this.lastOptics && this.lastOptics.isReal) {
      return this.setScreenDistance(this.lastOptics.vRaw);
    }
    return this.setScreenDistance(20.0);
  }

  updateImageModel(optics, rays) {
    if (optics.isInfinity) {
      this.imageMeshGroup.visible = false;
      this.infinityBadge.visible = (this.displayMode === 'rayOptics');
      return;
    }

    this.infinityBadge.visible = false;
    this.imageMeshGroup.visible = (this.displayMode === 'rayOptics');

    const imgCoord = rays.imageCoord;
    const vScene = imgCoord.z;
    const hiScene = optics.hiRaw * this.scale;
    const absHi = Math.abs(hiScene);

    const activeMat = optics.isReal ? this.materials.realImage : this.materials.virtualImage;
    this.imageWaxMesh.material = activeMat;
    this.imageArrowShaft.material = activeMat;
    this.imageArrowHead.material = activeMat;

    this.imageMeshGroup.position.z = vScene;

    const clampedHeight = Math.max(0.015, Math.min(0.24, absHi));
    this.imageWaxMesh.scale.set(1, clampedHeight, 1);
    this.imageArrowShaft.scale.set(1, clampedHeight, 1);

    if (optics.isReal) {
      this.imageWaxMesh.position.set(0.02, this.opticalHeight - clampedHeight / 2, 0);
      this.imageArrowShaft.position.set(-0.025, this.opticalHeight - clampedHeight / 2, 0);

      this.imageArrowHead.rotation.x = Math.PI;
      this.imageArrowHead.position.set(-0.025, this.opticalHeight - clampedHeight, 0);

      this.imageBadge.position.set(0, this.opticalHeight + 0.04, 0);
    } else {
      this.imageWaxMesh.position.set(0.02, this.opticalHeight + clampedHeight / 2, 0);
      this.imageArrowShaft.position.set(-0.025, this.opticalHeight + clampedHeight / 2, 0);

      this.imageArrowHead.rotation.x = 0;
      this.imageArrowHead.position.set(-0.025, this.opticalHeight + clampedHeight, 0);

      this.imageBadge.position.set(0, this.opticalHeight + clampedHeight + 0.035, 0);
    }
  }

  updateRayLines(rays, optics) {
    while (this.raysGroup.children.length > 0) {
      const child = this.raysGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      this.raysGroup.remove(child);
    }

    if (this.displayMode !== 'rayOptics') return;

    const Y = this.opticalHeight;

    const drawRaySegment = (points, material, isDashed = false) => {
      if (!points || points.length < 2) return;

      const pathPoints = points.map(p => new THREE.Vector3(p.x, p.y + Y, p.z));
      const tubeRadius = isDashed ? 0.0022 : 0.0032;

      for (let i = 0; i < pathPoints.length - 1; i++) {
        const start = pathPoints[i];
        const end = pathPoints[i + 1];
        const distance = start.distanceTo(end);
        if (distance < 0.001) continue;

        const cylinderGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, distance, 8);
        cylinderGeo.translate(0, distance / 2, 0);
        cylinderGeo.rotateX(Math.PI / 2);

        const cylinder = new THREE.Mesh(cylinderGeo, material);
        cylinder.position.copy(start);
        cylinder.lookAt(end);
        cylinder.frustumCulled = false;
        this.raysGroup.add(cylinder);

        if (!isDashed && distance > 0.04) {
          const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
          const arrowHeadGeo = new THREE.ConeGeometry(0.007, 0.018, 8);
          arrowHeadGeo.rotateX(Math.PI / 2);
          const arrowHead = new THREE.Mesh(arrowHeadGeo, material);
          arrowHead.position.copy(midPoint);
          arrowHead.lookAt(end);
          arrowHead.frustumCulled = false;
          this.raysGroup.add(arrowHead);
        }
      }
    };

    drawRaySegment(rays.ray1.segmentA, this.materials.ray1);
    drawRaySegment(rays.ray1.segmentB, this.materials.ray1);
    drawRaySegment(rays.ray2.segmentA, this.materials.ray2);

    if (optics.isVirtual) {
      drawRaySegment(rays.ray1.virtualExtension, this.materials.rayVirtual, true);
      drawRaySegment(rays.ray2.virtualExtension, this.materials.rayVirtual, true);
    }
  }

  update(time) {
    this.lastTime = time;

    // 1. Natural organic candle flame flicker & light intensity pulse
    if (this.flameLight && this.candleFlameMesh) {
      const flicker = Math.sin(time * 18.0) * 0.12 + Math.cos(time * 26.0) * 0.08 + Math.sin(time * 42.0) * 0.04;
      this.flameLight.intensity = 3.2 + flicker * 1.5;

      const scaleY = 1.0 + flicker * 0.8;
      const scaleXZ = 1.0 - flicker * 0.4;
      this.candleFlameMesh.scale.set(scaleXZ, scaleY, scaleXZ);
      if (this.candleFlameAura) {
        this.candleFlameAura.scale.set(scaleXZ * 1.06, scaleY * 1.06, scaleXZ * 1.06);
      }
      if (this.flameBlueMesh) {
        this.flameBlueMesh.scale.set(scaleXZ * 0.95, scaleY * 0.9, scaleXZ * 0.95);
      }
    }

    // 2. Real-time screen projection update (flickering inverted flame on screen)
    if (this.lastOptics) {
      this.drawScreenProjection(this.lastOptics, this.lastRays, time);
    }
  }
}
