import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Alert,
  Checkbox,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  CircularProgress,
  CardActionArea,
  Box,
  Snackbar,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useMutation, useQueryClient } from 'react-query';
import { addChannel, getYouTubeSubscriptions } from '../services/api';

const extractChannelId = (input) => {
  // Try to extract channel ID from different YouTube URL formats
  const patterns = [
    /youtube\.com\/channel\/([^\/\?]+)/,  // Regular channel URL
    /youtube\.com\/c\/([^\/\?]+)/,        // Custom URL
    /youtube\.com\/user\/([^\/\?]+)/,     // Legacy username URL
    /youtube\.com\/@([^\/\?]+)/,          // Handle URL
  ];
  
  // Check if input is a plain channel ID (no URL)
  if (/^[a-zA-Z0-9_-]{24}$/.test(input)) {
    return input;
  }
  
  // Try each pattern
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // If no match found, return as is
  return input;
};

// Function to fix YouTube thumbnail URLs
const fixThumbnailUrl = (url) => {
  if (!url) return '';
  
  // Fix /ytc/ format to use /channel/ format
  if (url.includes('/ytc/')) {
    const channelId = url.split('/ytc/')[1];
    if (channelId) {
      return `https://yt3.googleusercontent.com/channel/${channelId}`;
    }
  }
  
  return url;
};

const AddChannelDialog = ({ open, onClose }) => {
  const [channelInput, setChannelInput] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('url');
  const queryClient = useQueryClient();
  
  const mutation = useMutation(addChannel, {
    onSuccess: () => {
      // Invalidate and refetch channels data
      queryClient.invalidateQueries('channels');
      setChannelInput('');
      setError('');
      onClose();
    },
    onError: (error) => {
      setError(error.response?.data?.detail || 'Failed to add channel. Please check the channel ID.');
    },
  });
  
  const handleSubmit = () => {
    if (!channelInput.trim()) {
      setError('Please enter a channel ID or URL');
      return;
    }
    
    // Extract channel ID from input
    const channelId = extractChannelId(channelInput.trim());
    
    // Create channel object
    const channel = {
      id: channelId,
      title: 'Loading...', // This will be updated from API
    };
    
    // Add channel
    mutation.mutate(channel);
  };
  
  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Add YouTube Channel</DialogTitle>
      <DialogContent>
        <div style={{ display: 'flex', marginBottom: '16px' }}>
          <Button 
            variant={activeTab === 'url' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('url')}
            sx={{ mr: 1, flex: 1 }}
          >
            Add by URL
          </Button>
          <Button 
            variant={activeTab === 'subscriptions' ? 'contained' : 'outlined'}
            onClick={() => setActiveTab('subscriptions')}
            sx={{ flex: 1 }}
          >
            From Subscriptions
          </Button>
        </div>
        
        {activeTab === 'url' ? (
          <>
            <DialogContentText>
              Enter a YouTube channel ID or URL to add it to your subscriptions.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              id="channel"
              label="Channel ID or URL"
              type="text"
              fullWidth
              variant="outlined"
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              error={!!error}
              helperText={error}
              sx={{ mt: 2 }}
            />
            <Alert severity="info" sx={{ mt: 2 }}>
              You can use a channel URL like https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw
            </Alert>
          </>
        ) : (
          <SubscriptionPicker 
            onSelect={(channel) => {
              if (channel) {
                // Create channel object
                const channelObj = {
                  id: channel.id,
                  title: channel.title,
                  thumbnail_url: fixThumbnailUrl(channel.thumbnail_url), // Fix thumbnail URL format
                  description: channel.description || '',
                };
                
                // Add channel
                mutation.mutate(channelObj);
              }
            }}
            onClose={onClose}
          />
        )}
      </DialogContent>
      {activeTab === 'url' && (
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={mutation.isLoading}
          >
            {mutation.isLoading ? 'Adding...' : 'Add Channel'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

// Component to display and select from user's YouTube subscriptions
const SubscriptionPicker = ({ onSelect, onClose }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const queryClient = useQueryClient();
  
  // Fetch subscriptions on component mount
  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Set loading message to inform user we're fetching subscriptions
        setSubscriptions([]);
        
        // Use optimized extraction
        const response = await getYouTubeSubscriptions({
          skip_auth_check: true,
          fast: true
        });
        
        if (response.success && response.subscriptions) {
          // Fix thumbnail URLs in all subscriptions
          const fixedSubscriptions = response.subscriptions.map(sub => ({
            ...sub,
            thumbnail_url: fixThumbnailUrl(sub.thumbnail_url)
          }));
          
          setSubscriptions(fixedSubscriptions);
          console.log(`Loaded ${fixedSubscriptions.length} subscriptions`);
        } else {
          setError(response.message || 'Failed to fetch subscriptions');
        }
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        setError(error.response?.data?.detail?.message || error.message || 'Failed to fetch subscriptions');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubscriptions();
  }, []);
  
  const handleToggleChannel = (channel) => {
    const isSelected = selectedChannels.some(c => c.id === channel.id);
    
    if (isSelected) {
      setSelectedChannels(selectedChannels.filter(c => c.id !== channel.id));
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };
  
  const handleAddSelected = async () => {
    try {
      // Add each selected channel
      const addPromises = selectedChannels.map(async (channel) => {
        try {
          // Fix thumbnail URL before adding
          const fixedChannel = {
            ...channel,
            thumbnail_url: fixThumbnailUrl(channel.thumbnail_url)
          };
          return await addChannel(fixedChannel);
        } catch (error) {
          console.error(`Error adding channel ${channel.id}:`, error);
          return null;
        }
      });
      
      // Wait for all channels to be added
      await Promise.all(addPromises);
      
      // Invalidate channels query to refresh the UI
      queryClient.invalidateQueries('channels');
      
      // Close dialog after successful addition
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error adding selected channels:', error);
    }
  };
  
  const handleAddSingle = (channel) => {
    if (onSelect && channel) {
      // Fix thumbnail URL before passing to parent
      const fixedChannel = {
        ...channel,
        thumbnail_url: fixThumbnailUrl(channel.thumbnail_url)
      };
      onSelect(fixedChannel);
    }
  };
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 3 }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Loading your YouTube subscriptions using optimized extraction...
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          This will take less time than before but might still take a moment
        </Typography>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Error fetching subscriptions:</Typography>
        {error}
        <Typography variant="body2" sx={{ mt: 2 }}>
          Please make sure you have uploaded a valid YouTube cookies.txt file in the Settings page with your YouTube account logged in.
        </Typography>
      </Alert>
    );
  }
  
  if (subscriptions.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>No YouTube subscriptions found</Typography>
        <Typography variant="body2">
          Try these troubleshooting steps:
        </Typography>
        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
          <li><strong>Upload a fresh cookies file</strong> - Go to the Settings page and upload a new cookies.txt file after logging into YouTube</li>
          <li><strong>Try browser extraction</strong> - In Settings, use the "Extract from Browser" option to directly get cookies from your browser</li>
          <li><strong>Verify YouTube login</strong> - Make sure you're logged into YouTube with an account that has channel subscriptions</li> 
          <li><strong>Check YouTube access</strong> - Visit YouTube in your browser to confirm you can see your subscriptions</li>
        </ul>
        
        <Box sx={{ mt: 2, mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="primary">New: Direct Browser Extraction</Typography>
          <Typography variant="body2">
            The easiest solution is to use the Browser Extraction feature in Settings to directly extract your YouTube cookies.
          </Typography>
        </Box>
        
        <Button 
          onClick={() => window.location.href = '/settings'} 
          variant="outlined" 
          size="small" 
          sx={{ mt: 1 }}
        >
          Go to Settings
        </Button>
      </Alert>
    );
  }
  
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select channels from your YouTube subscriptions to add to offline.yt:
      </Typography>
      
      <Box sx={{ display: 'flex', mb: 2 }}>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={() => setSelectedChannels([])}
          sx={{ mr: 1 }}
        >
          Clear Selection
        </Button>
        <Typography variant="body2" sx={{ lineHeight: '30px' }}>
          {selectedChannels.length} channel(s) selected
        </Typography>
      </Box>
      
      <Box sx={{ maxHeight: '400px', overflow: 'auto', border: '1px solid rgba(0, 0, 0, 0.12)', borderRadius: 1, p: 1 }}>
        {subscriptions.map((channel) => (
          <Box 
            key={channel.id}
            sx={{ 
              py: 1, 
              px: 2,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              backgroundColor: selectedChannels.some(c => c.id === channel.id) 
                ? 'rgba(25, 118, 210, 0.08)'
                : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
            onClick={() => handleToggleChannel(channel)}
          >
            <Typography variant="body1">
              {channel.title}
            </Typography>
            <Checkbox
              checked={selectedChannels.some(c => c.id === channel.id)}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleChannel(channel);
              }}
            />
          </Box>
        ))}
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained"
          disabled={selectedChannels.length === 0}
          onClick={handleAddSelected}
        >
          Add Selected ({selectedChannels.length})
        </Button>
      </Box>
    </Box>
  );
};

export default AddChannelDialog; 