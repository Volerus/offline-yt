import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getVideos, deleteVideo } from '../services/api';

const useDownloadedVideos = (page = 1, pageSize = 10, dateRange = null) => {
  const queryClient = useQueryClient();

  // Fetch downloaded videos
  const { data, isLoading, error, refetch } = useQuery(
    ['downloaded-videos', page, pageSize, dateRange],
    async () => {
      // Use true string value to ensure proper boolean handling in API
      const params = { 
        is_downloaded: 'true',
        limit: pageSize,
        offset: (page - 1) * pageSize
      };
      
      // Add date filters if provided
      if (dateRange && dateRange.startDate) {
        params.start_date = dateRange.startDate.toISOString();
      }
      
      if (dateRange && dateRange.endDate) {
        params.end_date = dateRange.endDate.toISOString();
      }
      
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
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    videos,
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
    isLoading,
    error,
    refetch,
    deleteVideo: handleDeleteVideo,
    isDeletingVideo: deleteVideoMutation.isLoading,
    deleteError: deleteVideoMutation.error,
  };
};

export default useDownloadedVideos; 