/**
 * opticsMath.js
 * Physics calculations for Convex Lens Refraction (குவி லென்சு ஒளிவிலகல்)
 * Tamil Nadu 10th-Grade State Board (Samacheer Kalvi) Physics Syllabus
 */

export const FOCAL_LENGTH = 10.0; // cm (f = 10 cm)
export const OBJECT_HEIGHT = 6.0; // cm (standard candle height)

/**
 * Optical state identifiers
 */
export const OpticalStates = {
  BEYOND_2F: 'BEYOND_2F',             // u > 2F
  AT_2F: 'AT_2F',                     // u = 2F
  BETWEEN_F_AND_2F: 'BETWEEN_F_AND_2F', // F < u < 2F
  AT_F: 'AT_F',                       // u = F
  WITHIN_F: 'WITHIN_F'                // u < F
};

/**
 * Preset values for easy navigation
 */
export const PRESETS = [
  { id: OpticalStates.BEYOND_2F, u: 30.0, labelTa: '> 2F (30 cm)', labelEn: 'Beyond 2F' },
  { id: OpticalStates.AT_2F, u: 20.0, labelTa: '2F (20 cm)', labelEn: 'At 2F' },
  { id: OpticalStates.BETWEEN_F_AND_2F, u: 15.0, labelTa: 'F - 2F (15 cm)', labelEn: 'Between F & 2F' },
  { id: OpticalStates.AT_F, u: 10.0, labelTa: 'F (10 cm)', labelEn: 'At Focus F' },
  { id: OpticalStates.WITHIN_F, u: 6.0, labelTa: '< F (6 cm)', labelEn: 'Within F' },
];

/**
 * Calculate optical values for a given object distance u (in cm)
 * Cartesian convention:
 * - Lens at origin (0, 0)
 * - Object placed at -u
 * - Thin lens formula: 1/v - 1/(-u) = 1/f => 1/v + 1/u = 1/f => v = (u * f) / (u - f)
 * - Magnification m = v / (-u) = f / (f - u)
 */
export function calculateOptics(u, f = FOCAL_LENGTH, ho = OBJECT_HEIGHT) {
  const tolerance = 0.35; // Tolerance for at 2F or at F detection
  const diff2F = Math.abs(u - 2 * f);
  const diffF = Math.abs(u - f);

  let state = OpticalStates.BEYOND_2F;
  if (diff2F <= tolerance) {
    state = OpticalStates.AT_2F;
  } else if (diffF <= tolerance) {
    state = OpticalStates.AT_F;
  } else if (u > 2 * f) {
    state = OpticalStates.BEYOND_2F;
  } else if (u > f) {
    state = OpticalStates.BETWEEN_F_AND_2F;
  } else {
    state = OpticalStates.WITHIN_F;
  }

  // Calculate v and m
  let v = 0;
  let m = 0;
  let isInfinity = (state === OpticalStates.AT_F);

  if (isInfinity) {
    v = Infinity;
    m = -Infinity;
  } else {
    v = (u * f) / (u - f);
    m = f / (f - u);
  }

  const hi = isInfinity ? -999 : m * ho;
  const isReal = !isInfinity && (v > 0);
  const isVirtual = !isInfinity && (v < 0);

  // Samacheer Kalvi Textbook Details
  let stateTitleTa = '';
  let stateTitleEn = '';
  let imagePosTa = '';
  let imagePosEn = '';
  let natureTa = '';
  let natureEn = '';
  let sizeTa = '';
  let sizeEn = '';
  let applicationTa = '';
  let applicationEn = '';
  let spokenScriptTa = '';

  switch (state) {
    case OpticalStates.BEYOND_2F:
      stateTitleTa = 'பொருள் 2F-க்கு அப்பால் (u > 2F)';
      stateTitleEn = 'Object Beyond 2F';
      imagePosTa = 'F மற்றும் 2F இடையே';
      imagePosEn = 'Between F and 2F';
      natureTa = 'மெய் மற்றும் தலைகீழ்';
      natureEn = 'Real and Inverted';
      sizeTa = 'பொருளை விட சிறியது';
      sizeEn = 'Diminished';
      applicationTa = 'புகைப்படக் கருவி (Camera)';
      applicationEn = 'Camera lens system';
      spokenScriptTa = 'பொருள் 2F-க்கு அப்பால் உள்ளது. பிம்பம் F மற்றும் 2F இடையே, சிறியதாகவும் தலைகீழான மெய் பிம்பமாகவும் உருவாகிறது. இது புகைப்படக் கருவியில் (Camera) பயன்படுகிறது.';
      break;

    case OpticalStates.AT_2F:
      stateTitleTa = 'பொருள் 2F-ல் (u = 2F)';
      stateTitleEn = 'Object At 2F';
      imagePosTa = '2F-ல் உருவாகிறது';
      imagePosEn = 'At 2F';
      natureTa = 'மெய் மற்றும் தலைகீழ்';
      natureEn = 'Real and Inverted';
      sizeTa = 'பொருளின் அதே அளவு';
      sizeEn = 'Same size as object';
      applicationTa = 'நில அளவையாளர் தொலைநோக்கி (Terrestrial Telescope)';
      applicationEn = 'Terrestrial telescope (inverting system)';
      spokenScriptTa = 'பொருள் 2F-ல் உள்ளது. பிம்பமும் 2F-ல் அதே அளவில், தலைகீழான மெய் பிம்பமாக உருவாகிறது. இது நில அளவையாளர் கருவிகளில் பயன்படுகிறது.';
      break;

    case OpticalStates.BETWEEN_F_AND_2F:
      stateTitleTa = 'பொருள் F மற்றும் 2F இடையே (F < u < 2F)';
      stateTitleEn = 'Object Between F and 2F';
      imagePosTa = '2F-க்கு அப்பால் உருவாகிறது';
      imagePosEn = 'Beyond 2F';
      natureTa = 'மெய் மற்றும் தலைகீழ்';
      natureEn = 'Real and Inverted';
      sizeTa = 'பெரிதாக்கப்பட்ட பிம்பம்';
      sizeEn = 'Magnified';
      applicationTa = 'திரைப்பட வீழ்த்தி / புரொஜெக்டர் (Projector)';
      applicationEn = 'Cinema projector / Slide projector';
      spokenScriptTa = 'பொருள் F மற்றும் 2F இடையே உள்ளது. பிம்பம் 2F-க்கு அப்பால் பெரிதாக்கப்பட்ட தலைகீழ் மெய் பிம்பமாக உருவாகிறது. இது திரைப்பட வீழ்த்திகளில் (Projector) பயன்படுகிறது.';
      break;

    case OpticalStates.AT_F:
      stateTitleTa = 'பொருள் முதன்மைக் குவியம் F-ல் (u = F)';
      stateTitleEn = 'Object At Principal Focus F';
      imagePosTa = 'ஈறிலாத் தொலைவில் (முடிவிலியில்)';
      imagePosEn = 'At Infinity';
      natureTa = 'மெய் பிம்பம் (ஈறிலாத் தொலைவு)';
      natureEn = 'Real (At Infinity)';
      sizeTa = 'மிகப் பெரியது (High Magnification)';
      sizeEn = 'Extremely magnified';
      applicationTa = 'தேடுதல் விளக்கு / வாகன முகப்பு விளக்கு (Searchlight / Headlight)';
      applicationEn = 'Searchlight and automobile headlights';
      spokenScriptTa = 'பொருள் முதன்மைக் குவியம் F-ல் உள்ளது! ஒளிக்கதிர்கள் லென்சில் பட்டு இணையாகச் செல்கின்றன. எனவே பிம்பம் ஈறிலாத் தொலைவில் முடிவிலியில் மிகப் பெரியதாக உருவாகிறது.';
      break;

    case OpticalStates.WITHIN_F:
      stateTitleTa = 'பொருள் குவியத்திற்குள் (u < F)';
      stateTitleEn = 'Object Within Focus F';
      imagePosTa = 'லென்சின் அதே பக்கத்தில் (பொருளுக்குப் பின்னால்)';
      imagePosEn = 'On the same side as the object';
      natureTa = 'மாய மற்றும் நேரான';
      natureEn = 'Virtual and Erect';
      sizeTa = 'பெரிதாக்கப்பட்டது';
      sizeEn = 'Magnified';
      applicationTa = 'பூதக்கண்ணாடி / எளிய நுண்ணோக்கி (Magnifying Glass)';
      applicationEn = 'Magnifying glass / Simple microscope';
      spokenScriptTa = 'பொருள் குவியத்திற்குள் உள்ளது! ஒளிக்கதிர்கள் விரிந்து செல்கின்றன, எனவே இது பூதக்கண்ணாடி போல செயல்பட்டு லென்சின் அதே பக்கத்தில் நேரான மாய பிம்பத்தை உருவாக்குகிறது.';
      break;
  }

  return {
    u: Number(u.toFixed(1)),
    v: isInfinity ? '∞' : Number(v.toFixed(1)),
    vRaw: v,
    f: Number(f.toFixed(1)),
    m: isInfinity ? '∞' : Number(m.toFixed(2)),
    mRaw: m,
    ho: Number(ho.toFixed(1)),
    hi: isInfinity ? '∞' : Number(hi.toFixed(1)),
    hiRaw: hi,
    state,
    isReal,
    isVirtual,
    isInfinity,
    stateTitleTa,
    stateTitleEn,
    imagePosTa,
    imagePosEn,
    natureTa,
    natureEn,
    sizeTa,
    sizeEn,
    applicationTa,
    applicationEn,
    spokenScriptTa
  };
}

/**
 * Generate 3D ray segment coordinates for rendering in Three.js
 * In the 3D scene:
 * - Principal axis runs along the Z axis (or X axis depending on orientation).
 * - Let's use Z axis:
 *   Lens center O is at (0, 0, 0).
 *   Lens plane is at z = 0 (in XY plane).
 *   Object is at z = -u (negative Z).
 *   Focus F1 is at z = -f.
 *   Focus 2F1 is at z = -2f.
 *   Focus F2 is at z = +f.
 *   Focus 2F2 is at z = +2f.
 *   Image is at z = +v (if real) or z = v (negative, if virtual).
 *   Y axis is vertical: Candle height ho is at y = ho.
 *   Image height hi is at y = hi (negative if inverted, positive if erect).
 * 
 * Scale factor: in 3D scene, 1 cm = 0.01 units (1 unit = 1 meter).
 */
export function calculateRayPaths(u, f = FOCAL_LENGTH, ho = OBJECT_HEIGHT, scale = 0.01) {
  const optics = calculateOptics(u, f, ho);
  const uScene = u * scale;
  const fScene = f * scale;
  const hoScene = ho * scale;

  // Object tip coordinate
  const objectTip = { x: 0, y: hoScene, z: -uScene };
  // Lens hit point for Ray 1 (parallel to axis)
  const lensHitRay1 = { x: 0, y: hoScene, z: 0 };
  // Optical center O
  const centerO = { x: 0, y: 0, z: 0 };
  // Focus F2 on positive Z
  const focusF2 = { x: 0, y: 0, z: fScene };

  const rays = {
    // Ray 1: Parallel to principal axis -> Refracts through F2
    ray1: {
      segmentA: [objectTip, lensHitRay1], // Incoming to lens
      segmentB: [],                       // Outgoing refracted ray
      virtualExtension: []                // Dotted extension if virtual
    },
    // Ray 2: Passes straight through optical center O
    ray2: {
      segmentA: [],                       // Through center
      virtualExtension: []                // Dotted extension if virtual
    },
    // Image coordinate in 3D
    imageCoord: null
  };

  if (optics.isInfinity) {
    // Parallel emerging rays
    const endZ = 0.60; // 60 cm in front
    // Ray 1 passes through (0, 0, f) with slope dy/dz = (0 - ho) / (f - 0) = -ho/f
    // At z = endZ, y = 0 + (endZ - f) * (-ho/f) = -(endZ/f - 1)*ho
    const ray1EndY = -(endZ / fScene - 1) * hoScene;
    rays.ray1.segmentB = [lensHitRay1, focusF2, { x: 0, y: ray1EndY, z: endZ }];

    // Ray 2 passes through (0,0,0) with slope -ho / u = -ho / f
    const ray2EndY = -(endZ / fScene) * hoScene;
    rays.ray2.segmentA = [objectTip, centerO, { x: 0, y: ray2EndY, z: endZ }];

    rays.imageCoord = { x: 0, y: -999, z: endZ, isInfinity: true };
  } else if (optics.isReal) {
    const vScene = optics.vRaw * scale;
    const hiScene = optics.hiRaw * scale;
    const imageTip = { x: 0, y: hiScene, z: vScene };
    rays.imageCoord = { x: 0, y: hiScene, z: vScene, isReal: true, isVirtual: false };

    // Extend rays slightly past the image intersection for visual realism
    const extensionFactor = 1.15;
    const endZ = Math.min(vScene * extensionFactor, 0.50); // limit to bench length
    const tRay1 = (endZ - 0) / (vScene - 0);
    const ray1EndY = hoScene + tRay1 * (hiScene - hoScene);

    rays.ray1.segmentB = [lensHitRay1, focusF2, imageTip, { x: 0, y: ray1EndY, z: endZ }];

    const tRay2 = endZ / vScene;
    const ray2EndY = tRay2 * hiScene;
    rays.ray2.segmentA = [objectTip, centerO, imageTip, { x: 0, y: ray2EndY, z: endZ }];
  } else if (optics.isVirtual) {
    // Virtual image (u < f): v is negative, hi is positive
    const vScene = Math.abs(optics.vRaw) * scale;
    const hiScene = optics.hiRaw * scale;
    const virtualImageTip = { x: 0, y: hiScene, z: -vScene };
    rays.imageCoord = { x: 0, y: hiScene, z: -vScene, isReal: false, isVirtual: true };

    // Real outgoing rays diverge on positive Z
    const forwardZ = 0.35; // 35 cm ahead
    // Ray 1 passes through (0, ho, 0) and (0, 0, f)
    // slope dy/dz = -ho/f
    const ray1EndY = hoScene + (forwardZ / fScene) * (-hoScene);
    rays.ray1.segmentB = [lensHitRay1, focusF2, { x: 0, y: ray1EndY, z: forwardZ }];

    // Ray 2 passes from objectTip through O to forwardZ
    // slope dy/dz = ho / u
    const ray2EndY = -(forwardZ / uScene) * hoScene;
    rays.ray2.segmentA = [objectTip, centerO, { x: 0, y: ray2EndY, z: forwardZ }];

    // Virtual dashed extensions backward to virtualImageTip
    rays.ray1.virtualExtension = [lensHitRay1, virtualImageTip];
    rays.ray2.virtualExtension = [centerO, virtualImageTip];
  }

  return { optics, rays };
}

/**
 * Calculate image formation & blur dynamics on the physical white screen
 * @param {number} u Object distance in cm
 * @param {number} screenZ Screen position in cm (measured from lens at 0)
 * @param {number} f Focal length in cm
 * @param {number} ho Candle height in cm
 * @param {number} lensDiameter Lens aperture diameter in cm (default 8 cm)
 */
export function calculateScreenProjection(u, screenZ, f = FOCAL_LENGTH, ho = OBJECT_HEIGHT, lensDiameter = 8.0) {
  const optics = calculateOptics(u, f, ho);

  if (!optics.isReal) {
    // Virtual image (u < f) or Parallel rays at infinity (u = f)
    const reasonTa = optics.isInfinity
      ? 'ஈறிலாத் தொலைவு: கதிர்கள் இணையாகச் செல்வதால் திரையில் குவிவதில்லை.'
      : 'மெய்நிகர் பிம்பம் (Virtual Image): கதிர்கள் விரிந்து செல்வதால் திரையில் பிடிக்க முடியாது.';
    const reasonEn = optics.isInfinity
      ? 'At Infinity: Parallel rays do not converge on screen.'
      : 'Virtual Image: Diverging rays cannot be captured on a screen.';

    return {
      canFormRealImage: false,
      isFocused: false,
      isNearFocus: false,
      focusDelta: 999,
      blurRadius: 35.0,
      imageHeight: 0,
      v: optics.isInfinity ? Infinity : optics.v,
      screenZ,
      statusTa: '🚫 திரையில் பிம்பம் தோன்றாது',
      statusEn: 'No Image On Screen',
      reasonTa,
      reasonEn,
    };
  }

  const v = optics.vRaw;
  const delta = Math.abs(screenZ - v); // cm away from exact focus
  const m = v / u;
  const imageHeight = m * ho; // cm

  // Circle of confusion diameter in pixels/radius
  // c = LensAperture * |screenZ - v| / screenZ
  const coc = (lensDiameter * delta) / Math.max(screenZ, 5.0);
  const blurRadius = Math.min(32.0, coc * 4.5); // pixel blur scale

  const isFocused = delta <= 0.8;
  const isNearFocus = delta > 0.8 && delta <= 3.0;

  let statusTa = '🎯 துல்லியமான குவியம் (Sharp Focus)';
  let statusEn = 'Tack Sharp (In Focus)';

  if (isNearFocus) {
    statusTa = '🔍 சிறிது மங்கலானது (Slightly Blurry)';
    statusEn = 'Slightly Out of Focus';
  } else if (!isFocused) {
    statusTa = '⚠️ மங்கலானது (Out of Focus)';
    statusEn = 'Blurry (Out of Focus)';
  }

  return {
    canFormRealImage: true,
    isFocused,
    isNearFocus,
    focusDelta: delta,
    blurRadius,
    imageHeight,
    v,
    screenZ,
    statusTa,
    statusEn,
    reasonTa: `திரை ${screenZ.toFixed(1)} cm-ல் உள்ளது. பிம்பத் தொலைவு v = ${v.toFixed(1)} cm.`,
    reasonEn: `Screen at ${screenZ.toFixed(1)} cm. Focus at v = ${v.toFixed(1)} cm.`,
  };
}
