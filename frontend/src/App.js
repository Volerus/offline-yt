import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ChannelsPage from './pages/ChannelsPage';
import SettingsPage from './pages/SettingsPage';
import DownloadsPage from './pages/DownloadsPage';
import { SettingsProvider } from './context/SettingsContext';

function App() {
  return (
    <SettingsProvider>
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
    </SettingsProvider>
  );
}

export default App; 