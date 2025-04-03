import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  CircularProgress,
  Tooltip,
  Chip,
  Stack,
  Divider,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloseIcon from '@mui/icons-material/Close';
import AddLinkIcon from '@mui/icons-material/AddLink';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ClearIcon from '@mui/icons-material/Clear';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, subDays } from 'date-fns';
import useDownloadedVideos from '../hooks/useDownloadedVideos';
import useDownload from '../hooks/useDownload';
import { formatDuration } from '../utils/formatters';
import { downloadVideoByUrl, API_BASE_URL } from '../services/api'; // Import API_BASE_URL

const DownloadsPage = () => {
  const [page, setPage] = useState(1);
  const pageSize = 10; // Fixed page size of 10
  
  // Date filter state
  const [dateRange, setDateRange] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  
  const { videos, totalCount, totalPages, isLoading, error, deleteVideo, isDeletingVideo } = useDownloadedVideos(page, pageSize, dateRange);
  const { downloads, isDownloading } = useDownload();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [urlInputDialogOpen, setUrlInputDialogOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [selectedResolution, setSelectedResolution] = useState('720p');
  const [isDownloadingUrl, setIsDownloadingUrl] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const videoRef = useRef(null);

  // Available resolution options
  const resolutionOptions = [
    { value: '360p', label: '360p' },
    { value: '480p', label: '480p' },
    { value: '720p', label: '720p (Recommended)' },
    { value: '1080p', label: '1080p (HD)' },
    { value: '1440p', label: '1440p (2K)' },
    { value: '2160p', label: '2160p (4K)' },
    { value: 'best', label: 'Best Quality' },
  ];

  // Available date filter presets
  const dateFilterPresets = [
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Custom range', days: null },
  ];

  // Handle page change
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    window.scrollTo(0, 0);
  };

  // Apply date filter
  const applyDateFilter = () => {
    if (startDate || endDate) {
      setDateRange({
        startDate: startDate,
        endDate: endDate,
      });
      setPage(1); // Reset to first page
    }
  };

  // Clear date filter
  const clearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setDateRange(null);
    setPage(1); // Reset to first page
  };

  // Apply preset date filter
  const applyPresetDateFilter = (days) => {
    if (days) {
      const end = new Date();
      const start = subDays(end, days);
      setStartDate(start);
      setEndDate(end);
      setDateRange({
        startDate: start,
        endDate: end,
      });
    } else {
      // Custom range option selected, don't set anything yet
      setStartDate(null);
      setEndDate(null);
    }
    setPage(1); // Reset to first page
  };

  // Function to handle video playback
  const handlePlayVideo = (video) => {
    setPlayingVideo(video);
  };

  // Function to handle closing video player
  const handleClosePlayer = () => {
    setPlayingVideo(null);
  };

  // Function to handle open delete confirmation dialog
  const handleOpenDeleteDialog = (video) => {
    setSelectedVideo(video);
    setDeleteDialogOpen(true);
  };

  // Function to handle delete confirmation
  const handleDeleteConfirm = () => {
    if (selectedVideo) {
      deleteVideo(selectedVideo.id);
      setDeleteDialogOpen(false);
      
      // If deleting the currently playing video, close the player
      if (playingVideo && playingVideo.id === selectedVideo.id) {
        setPlayingVideo(null);
      }
    }
  };

  // Function to handle URL input dialog
  const handleOpenUrlDialog = () => {
    setUrlInputDialogOpen(true);
    setUrl('');
    setSelectedResolution('720p');
    setDownloadError(null);
  };

  // Function to handle URL dialog close
  const handleCloseUrlDialog = () => {
    setUrlInputDialogOpen(false);
  };

  // Function to handle URL download
  const handleDownloadByUrl = async () => {
    if (!url) return;
    
    setIsDownloadingUrl(true);
    setDownloadError(null);
    
    try {
      const response = await downloadVideoByUrl(url, selectedResolution);
      setUrlInputDialogOpen(false);
      setUrl('');
    } catch (error) {
      console.error('Error downloading by URL:', error);
      setDownloadError(error.response?.data?.detail || 'Failed to download video');
    } finally {
      setIsDownloadingUrl(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading downloaded videos: {error.message}
        </Alert>
      </Box>
    );
  }

  const renderContent = () => {
    if (videos.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            No Downloaded Videos
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {dateRange ? 
              "No videos found for the selected date range. Try a different date range or clear the filter." : 
              "You haven't downloaded any videos yet. Download videos from the Home page or use the Download by URL button below."}
          </Typography>
          {dateRange && (
            <Button 
              variant="outlined" 
              startIcon={<ClearIcon />} 
              onClick={clearDateFilter}
              sx={{ mr: 2, mb: 2 }}
            >
              Clear Date Filter
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddLinkIcon />}
            onClick={handleOpenUrlDialog}
            sx={{ mt: 2 }}
          >
            Download by URL
          </Button>
        </Box>
      );
    }

    return (
      <>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4">
              Downloaded Videos
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddLinkIcon />}
              onClick={handleOpenUrlDialog}
            >
              Download by URL
            </Button>
          </Box>
          
          {/* Date Filter Controls */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Filter by Download Date</Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Quick Filters:</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {dateFilterPresets.map((preset) => (
                  <Chip
                    key={preset.label}
                    label={preset.label}
                    onClick={() => applyPresetDateFilter(preset.days)}
                    color={preset.days === null ? "primary" : "default"}
                    variant="outlined"
                  />
                ))}
                {dateRange && (
                  <Chip
                    label="Clear Filter"
                    onClick={clearDateFilter}
                    color="error"
                    icon={<ClearIcon />}
                  />
                )}
              </Stack>
            </Box>
            
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={5}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                    maxDate={endDate || undefined}
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                    minDate={startDate || undefined}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    variant="contained"
                    onClick={applyDateFilter}
                    fullWidth
                    startIcon={<FilterAltIcon />}
                    disabled={!startDate && !endDate}
                  >
                    Apply
                  </Button>
                </Grid>
              </Grid>
            </LocalizationProvider>
            
            {dateRange && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="info" icon={<FilterAltIcon />}>
                  <Typography variant="body2">
                    Showing videos downloaded between{' '}
                    <strong>{startDate ? format(startDate, 'MMM d, yyyy') : 'any date'}</strong>
                    {' '}and{' '}
                    <strong>{endDate ? format(endDate, 'MMM d, yyyy') : 'any date'}</strong>
                  </Typography>
                </Alert>
              </Box>
            )}
          </Paper>

          <Grid container spacing={3}>
            {videos.map((video) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={video.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      height="160"
                      image={video.thumbnail_url || '/placeholder-thumbnail.jpg'}
                      alt={video.title}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder-thumbnail.jpg';
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        bgcolor: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        p: 0.5,
                        px: 1,
                        borderTopLeftRadius: 4,
                      }}
                    >
                      {formatDuration(video.duration)}
                    </Box>
                    <IconButton
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        bgcolor: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        '&:hover': {
                          bgcolor: 'primary.main',
                        },
                      }}
                      onClick={() => handlePlayVideo(video)}
                    >
                      <PlayArrowIcon fontSize="large" />
                    </IconButton>
                  </Box>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Tooltip title={video.title}>
                      <Typography gutterBottom variant="h6" component="div" noWrap>
                        {video.title}
                      </Typography>
                    </Tooltip>
                    <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                      <Chip
                        size="small"
                        label={video.downloaded_resolution || 'Unknown'}
                        color="primary"
                        variant="outlined"
                      />
                      {video.downloaded_at && (
                        <Chip
                          size="small"
                          label={`Downloaded on ${new Date(video.downloaded_at).toLocaleDateString()}`}
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </CardContent>
                  <Divider />
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => handlePlayVideo(video)}
                    >
                      Play
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleOpenDeleteDialog(video)}
                      disabled={isDeletingVideo}
                    >
                      Delete
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {/* Pagination control */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handlePageChange} 
                color="primary" 
                showFirstButton 
                showLastButton
              />
            </Box>
          )}
          
          {/* Display pagination info */}
          {totalCount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {Math.min((page - 1) * pageSize + 1, totalCount)} - {Math.min(page * pageSize, totalCount)} of {totalCount} videos
              </Typography>
            </Box>
          )}
        </Box>
      </>
    );
  };

  return (
    <Box>
      {renderContent()}
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{selectedVideo?.title}"? This will remove the video file from your storage.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            disabled={isDeletingVideo}
            startIcon={isDeletingVideo ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {isDeletingVideo ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Video Player Dialog */}
      <Dialog
        open={playingVideo !== null}
        onClose={handleClosePlayer}
        maxWidth="lg"
        fullWidth
      >
        {playingVideo && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="div" noWrap sx={{ flexGrow: 1, mr: 2 }}>
                  {playingVideo.title}
                </Typography>
                <IconButton edge="end" color="inherit" onClick={handleClosePlayer} aria-label="close">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ position: 'relative', width: '100%', pt: '56.25%' /* 16:9 aspect ratio */ }}>
                <video
                  ref={videoRef}
                  controls
                  autoPlay
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                  }}
                  src={`${API_BASE_URL.replace('/api', '')}/downloads/${playingVideo.id}.mp4`}
                  onError={(e) => {
                    console.error('Video playback error:', e);
                    // Try to use fallback video source if available
                    const video = e.target;
                    if (video.src.endsWith('.mp4')) {
                      video.src = video.src.replace('.mp4', '.webm');
                    }
                  }}
                />
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
      
      {/* Download from URL Dialog */}
      <Dialog open={urlInputDialogOpen} onClose={handleCloseUrlDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Download Video by URL</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="url"
            label="YouTube Video URL"
            type="url"
            fullWidth
            variant="outlined"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            sx={{ mb: 2, mt: 1 }}
          />
          
          <FormControl fullWidth variant="outlined">
            <InputLabel id="resolution-select-label">Resolution</InputLabel>
            <Select
              labelId="resolution-select-label"
              id="resolution-select"
              value={selectedResolution}
              onChange={(e) => setSelectedResolution(e.target.value)}
              label="Resolution"
            >
              {resolutionOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {downloadError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {downloadError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUrlDialog} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleDownloadByUrl} 
            color="primary" 
            variant="contained"
            disabled={isDownloadingUrl || !url}
            startIcon={isDownloadingUrl ? <CircularProgress size={20} /> : null}
          >
            {isDownloadingUrl ? 'Downloading...' : 'Download'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DownloadsPage; 