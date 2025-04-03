import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ChannelsPage from './pages/ChannelsPage';
import SettingsPage from './pages/SettingsPage';
import DownloadsPage from './pages/DownloadsPage';
import { SettingsProvider } from './context/SettingsContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <CssBaseline />
        <Box sx={{ display: 'flex' }}>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/channels" element={<ChannelsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/downloads" element={<DownloadsPage />} />
            </Routes>
          </Layout>
        </Box>
      </ThemeProvider>
    </SettingsProvider>
  );
}

export default App; 