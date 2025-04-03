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
  Tab,
  Tabs,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import BrowserUpdatedIcon from '@mui/icons-material/BrowserUpdated';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { uploadCookies, getAuthStatus, extractBrowserCookies } from '../services/api';

const resolutionOptions = [
  { label: '360p', value: '360p' },
  { label: '480p', value: '480p' },
  { label: '720p', value: '720p' },
  { label: '1080p', value: '1080p' },
  { label: 'Best Quality', value: 'best' },
];

const browserOptions = [
  { label: 'Chrome', value: 'chrome' },
  { label: 'Firefox', value: 'firefox' },
  { label: 'Edge', value: 'edge' },
  { label: 'Opera', value: 'opera' },
  { label: 'Safari', value: 'safari' },
  { label: 'Chromium', value: 'chromium' },
];

const SettingsPage = () => {
  const { settings, updateSettings, isLoading, error } = useSettings();
  const { darkMode, toggleTheme } = useTheme();
  const [formValues, setFormValues] = React.useState({
    download_directory: 'downloads',
    default_resolution: '720p',
    max_concurrent_downloads: 2,
    auto_update_interval: 24,
    dark_mode: false,
  });
  
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState('');
  const [cookieFile, setCookieFile] = React.useState(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadMessage, setUploadMessage] = React.useState('');
  const [uploadError, setUploadError] = React.useState('');
  const [authStatus, setAuthStatus] = React.useState(null);
  const [cookieMethod, setCookieMethod] = React.useState('file');
  
  // Browser cookie extraction
  const [selectedBrowser, setSelectedBrowser] = React.useState('chrome');
  const [browserProfile, setBrowserProfile] = React.useState('');
  const [isExtractingCookies, setIsExtractingCookies] = React.useState(false);
  
  // Update form when settings are loaded
  React.useEffect(() => {
    if (settings) {
      setFormValues({
        download_directory: settings.download_directory || 'downloads',
        default_resolution: settings.default_resolution || '720p',
        max_concurrent_downloads: settings.max_concurrent_downloads || 2,
        auto_update_interval: settings.auto_update_interval || 24,
        dark_mode: darkMode,
      });
    }
    
    // Fetch auth status
    fetchAuthStatus();
  }, [settings, darkMode]);
  
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
      dark_mode: darkMode,
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
  
  const handleBrowserCookieExtraction = async () => {
    setIsExtractingCookies(true);
    setUploadMessage('');
    setUploadError('');
    
    try {
      const result = await extractBrowserCookies({
        browser: selectedBrowser,
        profile: browserProfile.trim() || undefined
      });
      
      if (result.success) {
        setUploadMessage(result.message || 'Cookies extracted successfully from browser');
      } else {
        setUploadError(result.message || 'Failed to extract cookies from browser');
      }
      
      // Refresh auth status
      fetchAuthStatus();
    } catch (error) {
      setUploadError(error.response?.data?.detail || 'Failed to extract cookies from browser');
    } finally {
      setIsExtractingCookies(false);
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
          
            {/* UI Settings Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                UI Settings
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={darkMode}
                    onChange={toggleTheme}
                    name="dark_mode"
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {darkMode ? <Brightness4Icon sx={{ mr: 1 }} /> : <Brightness7Icon sx={{ mr: 1 }} />}
                    {darkMode ? 'Dark Mode' : 'Light Mode'}
                  </Box>
                }
              />
            </Grid>
            
            {/* Download Settings Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Download Settings
              </Typography>
              <Divider sx={{ mb: 2 }} />
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
                label="Max Concurrent Downloads"
                value={formValues.max_concurrent_downloads}
                onChange={handleInputChange}
                inputProps={{ min: 1, max: 5 }}
                helperText="Maximum number of videos to download simultaneously"
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
                inputProps={{ min: 1 }}
                helperText="How often to check for new videos"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                type="submit"
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
              Authentication is required to access your YouTube subscriptions and protected videos.
            </Typography>
            
            <Tabs 
              value={cookieMethod} 
              onChange={(e, newValue) => setCookieMethod(newValue)}
              sx={{ mb: 2 }}
            >
              <Tab label="Upload File" value="file" />
              <Tab label="Extract from Browser" value="browser" />
            </Tabs>
            
            {cookieMethod === 'file' ? (
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  Upload a cookies.txt file exported from your browser.
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      type="file"
                      id="cookie-file-input"
                      onChange={handleFileChange}
                      inputProps={{
                        accept: '.txt'
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Button
                      variant="contained"
                      onClick={handleFileUpload}
                      disabled={isUploading || !cookieFile}
                      startIcon={<UploadFileIcon />}
                      fullWidth
                    >
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Extract cookies directly from your browser. Make sure you're logged into YouTube.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Browser</InputLabel>
                      <Select
                        value={selectedBrowser}
                        label="Browser"
                        onChange={(e) => setSelectedBrowser(e.target.value)}
                      >
                        {browserOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Profile Name (optional)"
                      value={browserProfile}
                      onChange={(e) => setBrowserProfile(e.target.value)}
                      helperText="Leave empty for default profile"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={handleBrowserCookieExtraction}
                      disabled={isExtractingCookies}
                      startIcon={<BrowserUpdatedIcon />}
                    >
                      {isExtractingCookies ? 'Extracting...' : 'Extract Cookies from Browser'}
                    </Button>
                  </Grid>
                </Grid>
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  This will extract YouTube cookies from your local browser. 
                  Make sure you're logged into YouTube before extracting.
                </Alert>
              </Box>
            )}
            
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
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Troubleshooting Tips:
              </Typography>
              <ul>
                <li>Make sure you're logged into YouTube in your browser before extracting cookies</li>
                <li>Try using a different browser if one method doesn't work</li>
                <li>Cookies expire over time, so you may need to refresh them occasionally</li>
                <li>If you're having trouble with subscriptions, ensure you're logged into a YouTube account that has subscriptions</li>
              </ul>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default SettingsPage; 