import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { downloadVideo, getDownloadProgress } from '../services/api';

const useDownload = () => {
  const [downloads, setDownloads] = useState({});
  const intervalRef = useRef(null);
  const queryClient = useQueryClient();

  // Download mutation
  const mutation = useMutation(downloadVideo, {
    onSuccess: (data, variables) => {
      // Add video to downloads with 100% progress
      setDownloads((prev) => ({
        ...prev,
        [variables.video_id]: {
          ...prev[variables.video_id],
          progress: 1,
          isComplete: true,
          isLoading: false,
        },
      }));
      
      // Invalidate videos query to reflect download status
      queryClient.invalidateQueries('videos');
    },
    onError: (error, variables) => {
      console.error(`Error downloading video ${variables.video_id}:`, error);
      
      // Update downloads with error
      setDownloads((prev) => ({
        ...prev,
        [variables.video_id]: {
          ...prev[variables.video_id],
          error: error.message || 'Failed to download',
          isLoading: false,
        },
      }));
    },
  });

  // Start download
  const startDownload = (videoId, resolution = '720p') => {
    // Add to downloads with initial state
    setDownloads((prev) => ({
      ...prev,
      [videoId]: {
        videoId,
        resolution,
        progress: 0,
        isComplete: false,
        isLoading: true,
        error: null,
      },
    }));

    // Start download
    mutation.mutate({ video_id: videoId, resolution });
  };

  // Poll for download progress
  useEffect(() => {
    const activeDownloads = Object.entries(downloads).filter(
      ([_, download]) => !download.isComplete && !download.error
    );

    if (activeDownloads.length > 0) {
      // Start polling
      intervalRef.current = setInterval(async () => {
        for (const [videoId, download] of activeDownloads) {
          try {
            const progressData = await getDownloadProgress(videoId);
            
            setDownloads((prev) => ({
              ...prev,
              [videoId]: {
                ...prev[videoId],
                progress: progressData.progress,
                isComplete: progressData.progress >= 1,
                isLoading: progressData.progress < 1,
              },
            }));
            
            // If download is complete, invalidate videos query
            if (progressData.progress >= 1) {
              queryClient.invalidateQueries('videos');
            }
          } catch (error) {
            console.error(`Error fetching progress for ${videoId}:`, error);
          }
        }
      }, 2000); // Poll every 2 seconds
    } else if (intervalRef.current) {
      // Stop polling if no active downloads
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [downloads, queryClient]);

  return {
    downloads,
    startDownload,
    isDownloading: Object.values(downloads).some((d) => d.isLoading),
  };
};

export default useDownload; 