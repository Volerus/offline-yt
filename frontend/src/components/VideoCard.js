import React, { useState } from 'react';
import { 
  Card, 
  CardMedia, 
  CardContent, 
  CardActions,
  Typography, 
  Button,
  Menu,
  MenuItem,
  LinearProgress,
  Box 
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import useDownload from '../hooks/useDownload';
import { useSettings } from '../context/SettingsContext';

const resolutionOptions = [
  { label: '360p', value: '360p' },
  { label: '480p', value: '480p' },
  { label: '720p', value: '720p' },
  { label: '1080p', value: '1080p' },
  { label: 'Best Quality', value: 'best' },
];

const VideoCard = ({ video }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const { downloads, startDownload } = useDownload();
  const { settings } = useSettings();
  
  const downloadInfo = downloads[video.id];
  const isDownloading = downloadInfo?.isLoading;
  const progress = downloadInfo?.progress || 0;
  
  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };
  
  const handleDownload = (resolution) => {
    startDownload(video.id, resolution);
    handleCloseMenu();
  };
  
  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return hours > 0 
      ? `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
      : `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatPublishDate = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return 'Unknown date';
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia
        component="img"
        height="140"
        image={video.thumbnail_url || 'https://via.placeholder.com/320x180?text=No+Thumbnail'}
        alt={video.title}
      />

      {isDownloading && (
        <LinearProgress 
          variant="determinate" 
          value={progress * 100} 
          sx={{ height: 5 }}
        />
      )}

      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h6" component="div" noWrap>
          {video.title}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {formatDuration(video.duration)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatPublishDate(video.published_at)}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {video.description || 'No description available'}
        </Typography>
      </CardContent>

      <CardActions>
        {video.is_downloaded ? (
          <Button 
            startIcon={<CheckCircleIcon />} 
            disabled 
            color="success"
            fullWidth
          >
            Downloaded ({video.downloaded_resolution})
          </Button>
        ) : isDownloading ? (
          <Button disabled fullWidth>
            Downloading... {Math.round(progress * 100)}%
          </Button>
        ) : (
          <>
            <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => window.open(`https://www.youtube.com/watch?v=${video.id}`, '_blank')}
              >
                Open Video
              </Button>
              <Button
                startIcon={<CloudDownloadIcon />}
                onClick={handleOpenMenu}
                color="primary"
                sx={{ flexGrow: 1 }}
              >
                Download
              </Button>
            </Box>
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleCloseMenu}
            >
              {resolutionOptions.map((option) => (
                <MenuItem 
                  key={option.value}
                  onClick={() => handleDownload(option.value)}
                  selected={option.value === settings.default_resolution}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
      </CardActions>
    </Card>
  );
};

export default VideoCard;
