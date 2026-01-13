export function getSiteUrl(): URL {
  const defaultUrl = 'https://findmyflick.space';
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (envUrl && envUrl.length > 0) {
    try {
      return new URL(envUrl);
    } catch {
      return new URL(defaultUrl);
    }
  }

  return new URL(defaultUrl);
}
