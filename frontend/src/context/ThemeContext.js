import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { useSettings } from './SettingsContext';

// Create the context
const ThemeContext = createContext();

// Theme options - matching original YouTube theme
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#ff0000', // YouTube red
    },
    secondary: {
      main: '#606060', // YouTube secondary color
    },
    background: {
      default: '#f9f9f9', // YouTube light background
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.24)',
        },
      },
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff0000', // YouTube red
    },
    secondary: {
      main: '#aaaaaa', // Light gray for dark mode
    },
    background: {
      default: '#121212', // Dark background
      paper: '#1e1e1e',   // Slightly lighter dark for cards/surfaces
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.24)',
        },
      },
    },
  },
});

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const { settings, updateSettings } = useSettings();
  const [darkMode, setDarkMode] = useState(false);

  // Update dark mode when settings change
  useEffect(() => {
    if (settings && settings.dark_mode !== undefined) {
      setDarkMode(settings.dark_mode);
    }
  }, [settings]);

  // Toggle theme function - also updates settings
  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);

    // Update the settings if they exist
    if (settings) {
      // Only update dark_mode, preserve other settings
      updateSettings({
        ...settings,
        dark_mode: newDarkMode,
      });
    }
  };

  // Current theme
  const currentTheme = darkMode ? darkTheme : lightTheme;

  // Context value
  const value = {
    darkMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={currentTheme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// Custom hook for using the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 