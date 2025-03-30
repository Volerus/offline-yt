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
      <Card sx={{ display: 'flex', mb: 2 }}>
        <CardMedia
          component="img"
          sx={{ width: 80, height: 80, objectFit: 'cover' }}
          image={channel.thumbnail_url || 'https://via.placeholder.com/80?text=No+Image'}
          alt={channel.title}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <CardContent sx={{ flex: '1 0 auto' }}>
            <Typography component="div" variant="h6" noWrap>
              {channel.title}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" component="div" noWrap>
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
                height: '2.5em',
              }}
            >
              {channel.description || 'No description available'}
            </Typography>
          </CardContent>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', pl: 1, pr: 1 }}>
          <IconButton 
            aria-label="delete" 
            onClick={() => setOpen(true)} 
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
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