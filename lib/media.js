/** Build a public Storage URL for a stored object path. */
export function mediaUrl(path, bucket = 'photos') {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !path) return null;
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}
