import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getVideos, deleteVideo } from '../services/api';

const useDownloadedVideos = () => {
  const queryClient = useQueryClient();

  // Fetch downloaded videos
  const { data, isLoading, error, refetch } = useQuery(
    'downloaded-videos',
    async () => {
      // Use true string value to ensure proper boolean handling in API
      const params = { 
        is_downloaded: 'true',
        limit: 100 
      };
      return await getVideos(params);
    },
    {
      staleTime: 60000, // 1 minute
      refetchOnWindowFocus: true,
    }
  );

  // Delete video mutation
  const deleteVideoMutation = useMutation(deleteVideo, {
    onSuccess: () => {
      // Refresh the downloaded videos list
      queryClient.invalidateQueries('downloaded-videos');
    },
  });

  const handleDeleteVideo = (videoId) => {
    return deleteVideoMutation.mutate(videoId);
  };

  // Extract videos from the response, handling both formats
  const videos = data?.videos || data || [];
  const totalCount = data?.total || videos.length;

  return {
    videos,
    totalCount,
    isLoading,
    error,
    refetch,
    deleteVideo: handleDeleteVideo,
    isDeletingVideo: deleteVideoMutation.isLoading,
    deleteError: deleteVideoMutation.error,
  };
};

export default useDownloadedVideos; 