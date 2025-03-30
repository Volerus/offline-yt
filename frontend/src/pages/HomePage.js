import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'react-query';
import { 
  Typography, 
  Grid, 
  Box, 
  Alert, 
  AlertTitle,
  CircularProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Paper,
} from '@mui/material';
import { getVideos, fetchVideosByTimeframe, getChannels } from '../services/api';
import VideoCard from '../components/VideoCard';
import TimeframeSelector from '../components/TimeframeSelector';
import { subMonths, subDays, subWeeks, subYears } from 'date-fns';

const VIDEOS_PER_PAGE = 12;

// Predefined time filters for filtering existing videos
const timeFilters = [
  { label: 'All Time', value: 'all' },
  { label: 'Last 24 hours', value: 'day' },
  { label: 'Last 7 days', value: 'week' },
  { label: 'Last 2 weeks', value: 'twoWeeks' },
  { label: 'Last 30 days', value: 'month' },
  { label: 'Last 3 months', value: 'quarter' },
  { label: 'Last year', value: 'year' },
];

const HomePage = () => {
  const [timeframe, setTimeframe] = useState({
    start_date: subMonths(new Date(), 1).toISOString(),
    end_date: new Date().toISOString(),
  });
  const [page, setPage] = useState(1);
  const [channelFilter, setChannelFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [channels, setChannels] = useState([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  
  // Get start date based on selected time filter
  const getTimeFilterDate = () => {
    const today = new Date();
    
    switch (timeFilter) {
      case 'day':
        return subDays(today, 1);
      case 'week':
        return subWeeks(today, 1);
      case 'twoWeeks':
        return subWeeks(today, 2);
      case 'month':
        return subMonths(today, 1);
      case 'quarter':
        return subMonths(today, 3);
      case 'year':
        return subYears(today, 1);
      default:
        return null; // All time
    }
  };
  
  // Fetch channels when component mounts
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setIsLoadingChannels(true);
        const channelData = await getChannels();
        setChannels(channelData);
      } catch (error) {
        console.error('Error fetching channels:', error);
      } finally {
        setIsLoadingChannels(false);
      }
    };
    
    fetchChannels();
  }, []);
  
  // Query for getting videos with filters
  const {
    data,
    isLoading: isLoadingVideos,
    isError: isErrorVideos,
    error: errorVideos,
    refetch: refetchVideos,
  } = useQuery(
    ['videos', { page, channelFilter, timeFilter }],
    () => {
      const params = { 
        limit: VIDEOS_PER_PAGE,
        offset: (page - 1) * VIDEOS_PER_PAGE,
        channel_id: channelFilter || undefined,
      };
      
      // Add date filtering if a time filter is selected
      const startDate = getTimeFilterDate();
      if (startDate) {
        params.published_after = startDate.toISOString();
      }
      
      return getVideos(params);
    },
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );
  
  // Extract videos and total count from the response
  const videos = data?.videos || [];
  const totalCount = data?.total || 0;
  
  // Calculate total pages based on the actual count
  const totalPages = Math.max(1, Math.ceil(totalCount / VIDEOS_PER_PAGE));
  
  // Check if we need to adjust the current page (e.g., if filters changed and reduced available pages)
  useEffect(() => {
    if (!isLoadingVideos && page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [totalPages, page, isLoadingVideos]);
  
  // Mutation for fetching videos by timeframe
  const fetchMutation = useMutation(fetchVideosByTimeframe, {
    onSuccess: () => {
      refetchVideos();
    },
    onError: (error) => {
      console.error("Error fetching videos:", error);
    }
  });
  
  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
    setPage(1);
    // Call mutation if we have a valid timeframe with channel_id or fetch_all_channels is true
    if ((newTimeframe.channel_id || newTimeframe.fetch_all_channels)) {
      fetchMutation.mutate(newTimeframe);
    }
  };
  
  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo(0, 0);
  };
  
  const handleChannelFilterChange = (event) => {
    setChannelFilter(event.target.value);
    setPage(1);
  };
  
  const handleTimeFilterChange = (event) => {
    setTimeFilter(event.target.value);
    setPage(1);
  };
  
  const isLoading = isLoadingVideos || fetchMutation.isLoading;
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Videos from Your Subscriptions
      </Typography>
      
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Fetch New Videos
        </Typography>
        <TimeframeSelector 
          onTimeframeChange={handleTimeframeChange} 
          isLoading={isLoading}
        />
      </Paper>
      
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filter Videos
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Channel</InputLabel>
            <Select
              value={channelFilter}
              label="Filter by Channel"
              onChange={handleChannelFilterChange}
              disabled={isLoading || isLoadingChannels}
            >
              <MenuItem value="">
                <em>All Channels</em>
              </MenuItem>
              {channels.map((channel) => (
                <MenuItem key={channel.id} value={channel.id}>
                  {channel.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Time Period</InputLabel>
            <Select
              value={timeFilter}
              label="Time Period"
              onChange={handleTimeFilterChange}
              disabled={isLoading}
            >
              {timeFilters.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>
      
      {isErrorVideos && (
        <Alert severity="error" sx={{ mb: 4 }}>
          <AlertTitle>Error</AlertTitle>
          Failed to load videos - {errorVideos?.message || 'Unknown error'}
        </Alert>
      )}
      
      {fetchMutation.isError && (
        <Alert severity="error" sx={{ mb: 4 }}>
          <AlertTitle>Error</AlertTitle>
          Failed to fetch new videos - {fetchMutation.error?.message || 'Unknown error'}
          {fetchMutation.error?.data && (
            <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px', fontSize: '0.85em' }}>
              {JSON.stringify(fetchMutation.error.data, null, 2)}
            </pre>
          )}
        </Alert>
      )}
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : videos.length === 0 ? (
        <Alert severity="info" sx={{ mb: 4 }}>
          <AlertTitle>No Videos Found</AlertTitle>
          {page > 1 && totalCount > 0 ? (
            <>
              No videos found on page {page}. 
              <Box component="span" sx={{ cursor: 'pointer', textDecoration: 'underline', ml: 1 }} 
                   onClick={() => setPage(1)}>
                Go to first page
              </Box>
            </>
          ) : (
            <>No videos found for the selected filters. Try changing the channel or time filters, or fetch more videos using the timeframe selector above.</>
          )}
        </Alert>
      ) : (
        <>
          <Grid container spacing={3}>
            {videos.map((video) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={video.id}>
                <VideoCard video={video} />
              </Grid>
            ))}
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination 
              count={totalPages} 
              page={page} 
              onChange={handlePageChange} 
              color="primary" 
              disabled={isLoading}
            />
          </Box>
        </>
      )}
    </Box>
  );
};

export default HomePage; 