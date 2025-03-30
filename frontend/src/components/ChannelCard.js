import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardMedia, 
  Typography, 
  Button, 
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useMutation, useQueryClient } from 'react-query';
import { deleteChannel } from '../services/api';

const ChannelCard = ({ channel }) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const mutation = useMutation(deleteChannel, {
    onSuccess: () => {
      queryClient.invalidateQueries('channels');
      setOpen(false);
    },
    onError: (error) => {
      console.error('Error deleting channel:', error);
    },
  });
  
  const handleDelete = () => {
    mutation.mutate(channel.id);
  };
  
  return (
    <>
      <Card 
        sx={{ 
          width: 240, 
          height: 280, 
          m: 1, 
          display: 'inline-block',
          borderRadius: 2,
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
          }
        }}
      >
        <CardMedia
          component="img"
          sx={{ 
            width: '100%', 
            height: 140,
            objectFit: 'cover'
          }}
          image={channel.thumbnail_url || 'https://via.placeholder.com/240x140?text=No+Image'}
          alt={channel.title}
        />
        
        <CardContent sx={{ p: 2 }}>
          <Typography component="div" variant="h6" noWrap sx={{ mb: 0.5 }}>
            {channel.title}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            component="div" 
            noWrap
            sx={{ mb: 1 }}
          >
            ID: {channel.id}
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            component="div"
            sx={{ 
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxHeight: '2.5em',
            }}
          >
            {channel.description || 'No description available'}
          </Typography>
        </CardContent>
        
        <IconButton 
          aria-label="delete" 
          onClick={() => setOpen(true)} 
          color="error"
          size="small"
          sx={{ 
            position: 'absolute',
            right: 8,
            bottom: 8,
            bgcolor: 'rgba(255,255,255,0.8)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.95)',
            }
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Card>
      
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
      >
        <DialogTitle>Delete Channel</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{channel.title}" from your subscriptions?
            This will not delete any downloaded videos.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={mutation.isLoading}
          >
            {mutation.isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChannelCard; 