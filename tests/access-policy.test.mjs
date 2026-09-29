import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyProfileResult, keepProfileForSession, resolveAccess, DENIED_MESSAGE, UNAVAILABLE_MESSAGE } from '../src/features/auth/access-policy.ts';

const admin = { id: 'u1', business_id: 'b1', display_name: 'admin', role: 'admin', active: true };

test('classify: only active staff/admin rows verify; no-row and inactive deny; transport is unavailable', () => {
  assert.equal(classifyProfileResult(admin, null).kind, 'verified');
  assert.equal(classifyProfileResult({ ...admin, active: false }, null).kind, 'denied');
  assert.equal(classifyProfileResult({ ...admin, role: 'owner' }, null).kind, 'denied');
  assert.equal(classifyProfileResult(null, null).kind, 'denied');
  assert.equal(classifyProfileResult(null, { code: 'PGRST116' }).kind, 'denied');
  assert.equal(classifyProfileResult(null, { code: 'FETCH_ERROR' }).kind, 'unavailable');
  assert.equal(classifyProfileResult(null, {}).kind, 'unavailable');
});

test('resolve: routine re-check keeps the same profile object; changes replace it', () => {
  const first = resolveAccess(null, { kind: 'verified', profile: admin });
  assert.deepEqual(first, { profile: admin, message: '' });
  const again = resolveAccess(first.profile, { kind: 'verified', profile: { ...admin } });
  assert.equal(again.profile, first.profile, 'identical data must keep identity so consumers do not reload');
  const renamed = resolveAccess(first.profile, { kind: 'verified', profile: { ...admin, display_name: 'Elijah' } });
  assert.notEqual(renamed.profile, first.profile);
  assert.equal(renamed.profile.display_name, 'Elijah');
});

test('resolve: a definitive denial always ejects, even a previously verified user', () => {
  assert.deepEqual(resolveAccess(admin, { kind: 'denied' }), { profile: null, message: DENIED_MESSAGE });
  assert.deepEqual(resolveAccess(null, { kind: 'denied' }), { profile: null, message: DENIED_MESSAGE });
});

test('resolve: transport failure keeps an already verified workspace but blocks a first check', () => {
  assert.deepEqual(resolveAccess(admin, { kind: 'unavailable' }), { profile: admin, message: '' });
  assert.deepEqual(resolveAccess(null, { kind: 'unavailable' }), { profile: null, message: UNAVAILABLE_MESSAGE });
});

test('session events: same user keeps the profile; sign-out or another user clears it', () => {
  assert.equal(keepProfileForSession(admin, 'u1'), true);
  assert.equal(keepProfileForSession(admin, 'u2'), false);
  assert.equal(keepProfileForSession(admin, null), false);
  assert.equal(keepProfileForSession(null, 'u1'), false);
});
