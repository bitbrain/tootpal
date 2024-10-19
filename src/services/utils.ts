export function generateRandomString(length: number): string {
  const array = new Uint8Array(length)
  window.crypto.getRandomValues(array)
  return btoa(String.fromCharCode.apply(null, array as any))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .substring(0, length)
}

export async function generateCodeChallenge(
  codeVerifier: string,
): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode.apply(null, new Uint8Array(digest) as any))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
