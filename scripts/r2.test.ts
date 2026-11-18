import { describe, expect, it } from 'vitest';
import { sha256Hex, signRequest } from './r2.ts';

describe('R2 request signing', () => {
  const creds = { accountId: 'acct', accessKeyId: 'AKID', secretAccessKey: 'secret' };
  const base = {
    creds,
    method: 'HEAD',
    host: 'acct.r2.cloudflarestorage.com',
    path: '/bucket/sparkfree/spring/film.mp4',
    amzDate: '20261118T120000Z',
    payloadHash: sha256Hex(''),
  };

  it('scopes the credential to the date, region "auto" and service "s3", and signs host + amz headers', () => {
    const h = signRequest(base);
    expect(h.authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKID\/20261118\/auto\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/,
    );
    expect(h['x-amz-date']).toBe('20261118T120000Z');
    expect(h).not.toHaveProperty('host'); // fetch sets it
  });

  it('is deterministic and changes with any signed input', () => {
    const a = signRequest(base).authorization;
    expect(signRequest(base).authorization).toBe(a);
    expect(signRequest({ ...base, path: '/bucket/other.mp4' }).authorization).not.toBe(a);
    expect(signRequest({ ...base, creds: { ...creds, secretAccessKey: 'other' } }).authorization).not.toBe(a);
  });

  it('includes extra headers in the signed set, sorted', () => {
    const h = signRequest({ ...base, method: 'PUT', headers: { 'content-type': 'video/mp4' } });
    expect(h.authorization).toContain('SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date');
  });
});
