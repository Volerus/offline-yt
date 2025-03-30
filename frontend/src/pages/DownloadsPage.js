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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CloseIcon from '@mui/icons-material/Close';
import AddLinkIcon from '@mui/icons-material/AddLink';
import useDownloadedVideos from '../hooks/useDownloadedVideos';
import useDownload from '../hooks/useDownload';
import { formatDuration } from '../utils/formatters';
import { downloadVideoByUrl } from '../services/api';

const DownloadsPage = () => {
  const { videos, isLoading, error, deleteVideo, isDeletingVideo } = useDownloadedVideos();
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
            You haven't downloaded any videos yet. Download videos from the Home page or use the Download by URL button below.
          </Typography>
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
                    <Box sx={{ flexGrow: 1 }} />
                    <Tooltip title="Delete Video">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenDeleteDialog(video)}
                        disabled={isDeletingVideo}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </>
    );
  };

  return (
    <>
      {renderContent()}

      {/* Video Player Dialog */}
      <Dialog
        fullWidth
        maxWidth="md"
        open={!!playingVideo}
        onClose={handleClosePlayer}
      >
        <DialogTitle>
          {playingVideo?.title}
          <IconButton
            aria-label="close"
            onClick={handleClosePlayer}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {playingVideo && (
            <Box sx={{ mt: 2 }}>
              <video
                ref={videoRef}
                width="100%"
                controls
                autoPlay
                src={`/api/downloads/${playingVideo.id}`}
                controlsList="nodownload"
                onError={(e) => console.error("Video error:", e)}
              >
                Your browser does not support the video tag.
              </video>
              {/* Fallback if HTML5 video controls don't work well */}
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  href={`/api/downloads/${playingVideo.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in New Tab
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Video</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{selectedVideo?.title}"? This will remove the video file from your storage.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isDeletingVideo}
          >
            {isDeletingVideo ? (
              <>
                <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                Deleting...
              </>
            ) : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* URL Input Dialog */}
      <Dialog open={urlInputDialogOpen} onClose={handleCloseUrlDialog}>
        <DialogTitle>Download Video by URL</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter a YouTube video URL to download it.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="url"
            label="YouTube URL"
            type="url"
            fullWidth
            variant="outlined"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            error={!!downloadError}
            helperText={downloadError}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel id="resolution-select-label">Resolution</InputLabel>
            <Select
              labelId="resolution-select-label"
              id="resolution-select"
              value={selectedResolution}
              label="Resolution"
              onChange={(e) => setSelectedResolution(e.target.value)}
            >
              {resolutionOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUrlDialog}>Cancel</Button>
          <Button 
            onClick={handleDownloadByUrl} 
            color="primary" 
            variant="contained"
            disabled={!url || isDownloadingUrl}
          >
            {isDownloadingUrl ? (
              <>
                <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                Downloading...
              </>
            ) : 'Download'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DownloadsPage; 