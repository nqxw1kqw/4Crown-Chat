import { Suspense } from 'react';
import VideoRoute from '@/components/videos/VideoRoute';

export default function VideoDetailPage() {
  return (
    <Suspense fallback={null}>
      <VideoRoute />
    </Suspense>
  );
}
