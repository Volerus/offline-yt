import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getSettings, updateSettings } from '../services/api';

// Create context
const SettingsContext = createContext();

// Settings provider component
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    download_directory: 'downloads',
    default_resolution: '720p',
    max_concurrent_downloads: 2,
    auto_update_interval: 24,
  });

  const queryClient = useQueryClient();

  // Fetch settings
  const { data, isLoading, error } = useQuery('settings', getSettings, {
    onSuccess: (data) => {
      setSettings(data);
    },
    onError: (error) => {
      console.error('Error fetching settings:', error);
    },
  });

  // Update settings mutation
  const mutation = useMutation(updateSettings, {
    onSuccess: (data) => {
      setSettings(data);
      queryClient.invalidateQueries('settings');
    },
    onError: (error) => {
      console.error('Error updating settings:', error);
    },
  });

  // Update settings function
  const updateAppSettings = (newSettings) => {
    mutation.mutate(newSettings);
  };

  // Context value
  const value = {
    settings,
    updateSettings: updateAppSettings,
    isLoading,
    error,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook for using the settings context
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}; 