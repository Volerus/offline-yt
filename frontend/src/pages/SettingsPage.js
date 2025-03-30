import React from 'react';
import {
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useSettings } from '../context/SettingsContext';
import { uploadCookies, getAuthStatus } from '../services/api';

const resolutionOptions = [
  { label: '360p', value: '360p' },
  { label: '480p', value: '480p' },
  { label: '720p', value: '720p' },
  { label: '1080p', value: '1080p' },
  { label: 'Best Quality', value: 'best' },
];

const SettingsPage = () => {
  const { settings, updateSettings, isLoading, error } = useSettings();
  const [formValues, setFormValues] = React.useState({
    download_directory: 'downloads',
    default_resolution: '720p',
    max_concurrent_downloads: 2,
    auto_update_interval: 24,
  });
  
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState('');
  const [cookieFile, setCookieFile] = React.useState(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadMessage, setUploadMessage] = React.useState('');
  const [uploadError, setUploadError] = React.useState('');
  const [authStatus, setAuthStatus] = React.useState(null);
  
  // Update form when settings are loaded
  React.useEffect(() => {
    if (settings) {
      setFormValues({
        download_directory: settings.download_directory || 'downloads',
        default_resolution: settings.default_resolution || '720p',
        max_concurrent_downloads: settings.max_concurrent_downloads || 2,
        auto_update_interval: settings.auto_update_interval || 24,
      });
    }
    
    // Fetch auth status
    fetchAuthStatus();
  }, [settings]);
  
  const fetchAuthStatus = async () => {
    try {
      const status = await getAuthStatus();
      setAuthStatus(status);
    } catch (error) {
      console.error('Failed to fetch auth status:', error);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value,
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');
    
    // Convert numeric values
    const updatedSettings = {
      ...formValues,
      max_concurrent_downloads: Number(formValues.max_concurrent_downloads),
      auto_update_interval: Number(formValues.auto_update_interval),
    };
    
    // Update settings
    updateSettings(updatedSettings);
    
    // Show success message
    setIsSaving(false);
    setSaveMessage('Settings saved successfully');
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setSaveMessage('');
    }, 3000);
  };
  
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setCookieFile(e.target.files[0]);
      // Reset messages
      setUploadMessage('');
      setUploadError('');
    }
  };
  
  const handleFileUpload = async () => {
    if (!cookieFile) {
      setUploadError('Please select a file first');
      return;
    }
    
    setIsUploading(true);
    setUploadMessage('');
    setUploadError('');
    
    try {
      const result = await uploadCookies(cookieFile);
      setUploadMessage(result.message || 'Cookies file uploaded successfully');
      setCookieFile(null);
      
      // Clear file input
      const fileInput = document.getElementById('cookie-file-input');
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Refresh auth status
      fetchAuthStatus();
    } catch (error) {
      setUploadError(error.response?.data?.detail || 'Failed to upload cookies file');
    } finally {
      setIsUploading(false);
    }
  };
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      
      <Divider sx={{ mb: 3 }} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load settings. {error.message || 'Unknown error'}
        </Alert>
      )}
      
      {saveMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {saveMessage}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Download Settings
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="download_directory"
                label="Download Directory"
                value={formValues.download_directory}
                onChange={handleInputChange}
                helperText="Directory where videos will be saved"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Default Resolution</InputLabel>
                <Select
                  name="default_resolution"
                  value={formValues.default_resolution}
                  label="Default Resolution"
                  onChange={handleInputChange}
                >
                  {resolutionOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                name="max_concurrent_downloads"
                label="Maximum Concurrent Downloads"
                value={formValues.max_concurrent_downloads}
                onChange={handleInputChange}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                name="auto_update_interval"
                label="Auto Update Interval (hours)"
                value={formValues.auto_update_interval}
                onChange={handleInputChange}
                inputProps={{ min: 1, max: 168 }}
                helperText="How often to check for new videos"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>
            
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              YouTube Authentication
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            {authStatus && (
              <Alert 
                severity={authStatus.authenticated ? "success" : "info"}
                sx={{ mb: 2 }}
              >
                {authStatus.authenticated 
                  ? `YouTube authentication is active. Cookie file age: ${authStatus.cookie_age_days} days.` 
                  : "No YouTube authentication found. Upload a cookies.txt file to access protected videos."}
                {authStatus.warning && (
                  <Typography sx={{ mt: 1 }} variant="body2">
                    Warning: {authStatus.warning}
                  </Typography>
                )}
              </Alert>
            )}
            
            <Typography variant="body1" gutterBottom>
              Upload a cookies.txt file to authenticate with YouTube and access protected videos.
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <input
                accept=".txt"
                style={{ display: 'none' }}
                id="cookie-file-input"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="cookie-file-input">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadFileIcon />}
                >
                  Select cookies.txt file
                </Button>
              </label>
              {cookieFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected file: {cookieFile.name}
                </Typography>
              )}
              
              <Button
                onClick={handleFileUpload}
                variant="contained"
                color="primary"
                disabled={!cookieFile || isUploading}
                sx={{ ml: 2 }}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </Box>
            
            {uploadMessage && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {uploadMessage}
              </Alert>
            )}
            
            {uploadError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {uploadError}
              </Alert>
            )}
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              How to get cookies.txt
            </Typography>
            
            <ol>
              <li>Log in to YouTube in your web browser</li>
              <li>Install a browser extension like "EditThisCookie" or "Get cookies.txt"</li>
              <li>Go to youtube.com and use the extension to export cookies as cookies.txt</li>
              <li>Save the file and upload it here</li>
            </ol>
            
            <Alert severity="warning" sx={{ mt: 2 }}>
              Your YouTube login credentials are stored in the cookies.txt file.
              For security, this file is only stored on your local server.
            </Alert>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default SettingsPage; 