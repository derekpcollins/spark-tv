/** Minimal R2 (S3 API) client: SigV4-signed HEAD/PUT, no dependencies. Never prints credentials. */
import { createHash, createHmac } from 'node:crypto';

export interface R2Credentials {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
}

const hmac = (key: string | Buffer, data: string): Buffer => createHmac('sha256', key).update(data).digest();
export const sha256Hex = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex');

/** SigV4 Authorization header for an S3 request (region "auto", service "s3"). Pure, so it can be tested. */
export function signRequest(opts: {
  creds: R2Credentials;
  method: string;
  host: string;
  path: string; // already URI-encoded
  amzDate: string; // YYYYMMDDTHHMMSSZ
  payloadHash: string; // hex sha256, or 'UNSIGNED-PAYLOAD'
  headers?: Record<string, string>; // extra headers to sign (lower-case names)
}): Record<string, string> {
  const { creds, method, host, path, amzDate, payloadHash } = opts;
  const date = amzDate.slice(0, 8);
  const headers: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...opts.headers,
  };
  const names = Object.keys(headers).sort();
  const canonical = [
    method,
    path,
    '',
    ...names.map((n) => `${n}:${headers[n]!.trim()}`),
    '',
    names.join(';'),
    payloadHash,
  ].join('\n');
  const scope = `${date}/auto/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonical)].join('\n');
  let key = hmac(`AWS4${creds.secretAccessKey}`, date);
  for (const part of ['auto', 's3', 'aws4_request']) key = hmac(key, part);
  const signature = createHmac('sha256', key).update(toSign).digest('hex');
  const { host: _host, ...rest } = headers;
  void _host;
  return {
    ...rest,
    authorization: `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`,
  };
}

export function r2Client(creds: R2Credentials, bucket: string) {
  const host = `${creds.accountId}.r2.cloudflarestorage.com`;
  const encodeKey = (key: string) => key.split('/').map(encodeURIComponent).join('/');
  const now = () => new Date().toISOString().replace(/[-:]|\.\d{3}/g, '');

  return {
    /** Size of an object, or null if it doesn't exist. */
    async head(key: string): Promise<number | null> {
      const path = `/${bucket}/${encodeKey(key)}`;
      const headers = signRequest({
        creds,
        method: 'HEAD',
        host,
        path,
        amzDate: now(),
        payloadHash: sha256Hex(''),
      });
      const res = await fetch(`https://${host}${path}`, { method: 'HEAD', headers });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`R2 HEAD ${res.status} for ${key}`);
      return Number(res.headers.get('content-length'));
    },
    /** Streams a body up (unsigned payload, which R2 accepts over TLS). */
    async put(
      key: string,
      body: ReadableStream<Uint8Array>,
      size: number,
      contentType: string,
      cacheControl: string,
    ): Promise<void> {
      const path = `/${bucket}/${encodeKey(key)}`;
      const headers = signRequest({
        creds,
        method: 'PUT',
        host,
        path,
        amzDate: now(),
        payloadHash: 'UNSIGNED-PAYLOAD',
        headers: { 'content-type': contentType, 'cache-control': cacheControl },
      });
      const res = await fetch(`https://${host}${path}`, {
        method: 'PUT',
        headers: { ...headers, 'content-length': String(size) },
        body,
        duplex: 'half',
      } as RequestInit);
      if (!res.ok) throw new Error(`R2 PUT ${res.status} for ${key}: ${(await res.text()).slice(0, 200)}`);
    },
  };
}
