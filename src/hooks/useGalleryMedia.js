import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useSession } from '../context/SessionContext';

export const GALLERY_MEDIA_QUERY_KEY = ['gallery'];

const GALLERY_COLUMNS =
  'id, file_url, capture_date, album_name, caption, created_by, cloudinary_public_id, media_type, thumbnail_url, space_id';

const GALLERY_LIMIT = 200;

export async function fetchGalleryMedia(spaceId) {
  if (!spaceId) return [];
  const { data, error } = await supabase
    .from('media_gallery')
    .select(GALLERY_COLUMNS)
    .eq('space_id', spaceId)
    .order('capture_date', { ascending: false })
    .limit(GALLERY_LIMIT);
  if (error) throw error;
  return data ?? [];
}

export function useGalleryMedia() {
  const { spaceId } = useSession();
  return useQuery({
    queryKey: [...GALLERY_MEDIA_QUERY_KEY, spaceId],
    queryFn: () => fetchGalleryMedia(spaceId),
    enabled: Boolean(spaceId),
  });
}
