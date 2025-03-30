import React, { useState } from 'react';
import { useQuery } from 'react-query';
import {
  Typography,
  Box,
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
  Paper,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getChannels } from '../services/api';
import ChannelCard from '../components/ChannelCard';
import AddChannelDialog from '../components/AddChannelDialog';

const ChannelsPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Query for getting channels
  const {
    data: channels = [],
    isLoading,
    isError,
    error,
  } = useQuery('channels', getChannels, {
    refetchOnWindowFocus: false,
  });
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Your Channel Subscriptions
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add Channel
        </Button>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {isError && (
        <Alert severity="error" sx={{ mb: 4 }}>
          <AlertTitle>Error</AlertTitle>
          Failed to load channels - {error?.message || 'Unknown error'}
        </Alert>
      )}
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : channels.length === 0 ? (
        <Alert severity="info" sx={{ mb: 4 }}>
          <AlertTitle>No Channels</AlertTitle>
          You haven't added any channel subscriptions yet. Add your first channel to get started.
        </Alert>
      ) : (
        <Paper elevation={0} sx={{ p: 2 }}>
          {channels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </Paper>
      )}
      
      <AddChannelDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </Box>
  );
};

export default ChannelsPage; 