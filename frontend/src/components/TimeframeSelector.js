import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  FormControl, 
  InputLabel, 
  MenuItem, 
  Select, 
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, subDays, subWeeks, subMonths, subYears, startOfDay } from 'date-fns';
import { getChannels } from '../services/api';

const predefinedTimeframes = [
  { label: 'Last 24 hours', value: 'day', days: 1 },
  { label: 'Last 7 days', value: 'week', days: 7 },
  { label: 'Last 2 weeks', value: 'twoWeeks', days: 14 },
  { label: 'Last 30 days', value: 'month', days: 30 },
  { label: 'Last 3 months', value: 'quarter', days: 90 },
  { label: 'Last year', value: 'year', days: 365 },
  { label: 'Custom date range', value: 'custom' },
];

const TimeframeSelector = ({ onTimeframeChange, isLoading }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState(subWeeks(new Date(), 1));
  const [endDate, setEndDate] = useState(new Date());
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Fetch channels when component mounts
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setLoading(true);
        const channelData = await getChannels();
        setChannels(channelData);
        // Set default selected channel if available
        if (channelData.length > 0) {
          setSelectedChannel(channelData[0].id);
        }
      } catch (error) {
        console.error('Error fetching channels:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChannels();
  }, []);
  
  const handleTimeframeChange = (event) => {
    const value = event.target.value;
    setSelectedTimeframe(value);
    
    if (value === 'custom') {
      setCustomDialogOpen(true);
      return;
    }
    
    // Calculate dates based on selected timeframe
    const today = new Date();
    let start;
    
    switch (value) {
      case 'day':
        start = subDays(today, 1);
        break;
      case 'week':
        start = subWeeks(today, 1);
        break;
      case 'twoWeeks':
        start = subWeeks(today, 2);
        break;
      case 'month':
        start = subMonths(today, 1);
        break;
      case 'quarter':
        start = subMonths(today, 3);
        break;
      case 'year':
        start = subYears(today, 1);
        break;
      default:
        start = subWeeks(today, 1);
    }
    
    setStartDate(start);
    setEndDate(today);
  };
  
  const handleFetchVideos = () => {
    if (!selectedChannel) {
      return;
    }
    
    // Create request object with required fields
    const timeframeRequest = {
      channel_id: selectedChannel,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      days: getDaysFromTimeframe()
    };
    
    onTimeframeChange(timeframeRequest);
  };
  
  const getDaysFromTimeframe = () => {
    if (selectedTimeframe === 'custom') {
      // Calculate days between dates for custom timeframe
      const diffTime = Math.abs(endDate - startDate);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    // Return days from predefined timeframes
    return predefinedTimeframes.find(tf => tf.value === selectedTimeframe)?.days || 7;
  };
  
  const handleChannelChange = (event) => {
    setSelectedChannel(event.target.value);
  };
  
  const handleCustomSubmit = () => {
    setCustomDialogOpen(false);
    
    if (!selectedChannel) {
      return;
    }
    
    // Create request object with required fields
    const timeframeRequest = {
      channel_id: selectedChannel,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      days: getDaysFromTimeframe()
    };
    
    onTimeframeChange(timeframeRequest);
  };
  
  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center">
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Channel</InputLabel>
          <Select
            value={selectedChannel}
            label="Channel"
            onChange={handleChannelChange}
            disabled={isLoading || loading || channels.length === 0}
          >
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
            value={selectedTimeframe}
            label="Time Period"
            onChange={handleTimeframeChange}
            disabled={isLoading}
          >
            {predefinedTimeframes.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160 }}>
          {selectedTimeframe === 'custom' 
            ? `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
            : `Fetching videos from ${format(startDate, 'MMM d, yyyy')}`
          }
        </Typography>
        
        <Button 
          variant="contained" 
          onClick={handleFetchVideos}
          disabled={isLoading || !selectedChannel}
        >
          {isLoading ? 'Fetching...' : 'Fetch Videos'}
        </Button>
      </Stack>
      
      <Dialog open={customDialogOpen} onClose={() => setCustomDialogOpen(false)}>
        <DialogTitle>Select Custom Date Range</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                maxDate={endDate}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                minDate={startDate}
                maxDate={new Date()}
              />
            </Stack>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCustomSubmit} variant="contained">Apply</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TimeframeSelector; 