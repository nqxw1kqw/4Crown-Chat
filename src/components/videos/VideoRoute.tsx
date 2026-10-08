'use client';

import { useParams } from 'next/navigation';
import VideoGallery from '@/components/videos/VideoGallery';

export default function VideoRoute() {
  const params = useParams<{ videoId: string }>();
  return <VideoGallery selectedVideoId={params.videoId} />;
}
