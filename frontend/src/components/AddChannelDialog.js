import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Alert,
} from '@mui/material';
import { useMutation, useQueryClient } from 'react-query';
import { addChannel } from '../services/api';

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

const AddChannelDialog = ({ open, onClose }) => {
  const [channelInput, setChannelInput] = useState('');
  const [error, setError] = useState('');
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
      </DialogContent>
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
    </Dialog>
  );
};

export default AddChannelDialog; 