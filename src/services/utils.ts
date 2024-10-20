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

export function parseLinkHeader(header: string) {
  const links: any = {}
  const parts = header.split(',')

  parts.forEach(part => {
    const section = part.split(';')
    if (section.length !== 2) {
      return
    }

    const url = section[0].replace(/<(.*)>/, '$1').trim()
    const name = section[1].replace(/rel="(.*)"/, '$1').trim()
    links[name] = url
  })

  return links
}

export function removeProtocol(url: string): string {
  return url.replace(/^https?:\/\//, '')
}

export function formatNumber(n: number) {
  if (n < 999) {
    return n
  }
  const units = ['k', 'm', 'b', 't']
  const exponent = Math.floor(Math.log10(n) / 3)

  if (exponent === 0) return n.toString()

  const unit = units[exponent - 1]
  const scaledNumber = n / Math.pow(1000, exponent)

  return scaledNumber.toFixed(1).replace(/\.0$/, '') + unit
}
