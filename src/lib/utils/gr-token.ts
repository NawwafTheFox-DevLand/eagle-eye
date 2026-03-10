import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.GR_TOKEN_SECRET || 'gr-default-secret-change-in-prod';

export function signGRToken(payload: Record<string, string | number>): string {
  const data = JSON.stringify(payload);
  const b64 = Buffer.from(data).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

export function verifyGRToken(token: string): Record<string, string | number> | null {
  try {
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return null;
    const expectedSig = createHmac('sha256', SECRET).update(b64).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf-8'));
    // Check expiry
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createLicenseToken(licenseId: string, entityId: string): string {
  return signGRToken({
    licenseId,
    entityId,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7-day expiry
  });
}
