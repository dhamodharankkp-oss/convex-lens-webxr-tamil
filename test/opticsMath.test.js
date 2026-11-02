import assert from 'node:assert';
import { calculateOptics, OpticalStates, calculateRayPaths, FOCAL_LENGTH } from '../src/opticsMath.js';

console.log('--- Testing opticsMath.js ---');

// Case 1: u > 2F (u = 30 cm)
{
  const res = calculateOptics(30.0);
  console.log('Case 1 (u=30): state =', res.state, 'v =', res.v, 'm =', res.m);
  assert.strictEqual(res.state, OpticalStates.BEYOND_2F);
  assert.strictEqual(res.v, 15.0);
  assert.strictEqual(res.m, -0.5);
  assert.strictEqual(res.isReal, true);
  assert.strictEqual(res.isVirtual, false);
}

// Case 2: u = 2F (u = 20 cm)
{
  const res = calculateOptics(20.0);
  console.log('Case 2 (u=20): state =', res.state, 'v =', res.v, 'm =', res.m);
  assert.strictEqual(res.state, OpticalStates.AT_2F);
  assert.strictEqual(res.v, 20.0);
  assert.strictEqual(res.m, -1.0);
  assert.strictEqual(res.isReal, true);
}

// Case 3: F < u < 2F (u = 15 cm)
{
  const res = calculateOptics(15.0);
  console.log('Case 3 (u=15): state =', res.state, 'v =', res.v, 'm =', res.m);
  assert.strictEqual(res.state, OpticalStates.BETWEEN_F_AND_2F);
  assert.strictEqual(res.v, 30.0);
  assert.strictEqual(res.m, -2.0);
  assert.strictEqual(res.isReal, true);
}

// Case 4: u = F (u = 10 cm)
{
  const res = calculateOptics(10.0);
  console.log('Case 4 (u=10): state =', res.state, 'v =', res.v, 'isInfinity =', res.isInfinity);
  assert.strictEqual(res.state, OpticalStates.AT_F);
  assert.strictEqual(res.isInfinity, true);
}

// Case 5: u < F (u = 6 cm)
{
  const res = calculateOptics(6.0);
  console.log('Case 5 (u=6): state =', res.state, 'v =', res.v, 'm =', res.m);
  assert.strictEqual(res.state, OpticalStates.WITHIN_F);
  assert.strictEqual(res.v, -15.0);
  assert.strictEqual(res.m, 2.5);
  assert.strictEqual(res.isVirtual, true);
  assert.strictEqual(res.isReal, false);
}

// Test Ray Paths
{
  const pathsReal = calculateRayPaths(20.0);
  assert(pathsReal.rays.ray1.segmentA.length === 2);
  assert(pathsReal.rays.ray1.segmentB.length >= 2);
  assert.strictEqual(pathsReal.rays.ray1.virtualExtension.length, 0);

  const pathsVirtual = calculateRayPaths(6.0);
  assert(pathsVirtual.rays.ray1.virtualExtension.length === 2);
  assert(pathsVirtual.rays.ray2.virtualExtension.length === 2);
  console.log('Virtual extensions generated successfully for u < F');
}

// Test Screen Projection & Focus Dynamics
{
  import('../src/opticsMath.js').then(({ calculateScreenProjection }) => {
    // When screen is exactly at v (e.g. u = 20, v = 20, screen = 20)
    const inFocus = calculateScreenProjection(20.0, 20.0);
    assert.strictEqual(inFocus.canFormRealImage, true);
    assert.strictEqual(inFocus.isFocused, true);
    assert.strictEqual(inFocus.blurRadius, 0);

    // When screen is offset (e.g. u = 20, v = 20, screen = 25)
    const outOfFocus = calculateScreenProjection(20.0, 25.0);
    assert.strictEqual(outOfFocus.canFormRealImage, true);
    assert.strictEqual(outOfFocus.isFocused, false);
    assert(outOfFocus.blurRadius > 0);

    // When u < F (virtual image)
    const virtualScreen = calculateScreenProjection(6.0, 20.0);
    assert.strictEqual(virtualScreen.canFormRealImage, false);
    assert.strictEqual(virtualScreen.isFocused, false);

    console.log('✓ Screen Projection & Focus calculations passed successfully!');
  });
}

console.log('✓ All Optics Math tests passed successfully!');
