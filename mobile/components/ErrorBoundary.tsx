import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logger, isDevelopment } from '../lib/logger';

interface Props {
  children: React.ReactNode;
  /** Optional custom fallback UI. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level Error Boundary (DEV-010).
 *
 * Without this, an uncaught render error becomes a white screen and users
 * have no path to recover other than killing the app. We catch the error,
 * log it, and offer a "Try again" button that re-mounts the subtree.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('Render error caught by ErrorBoundary', {
      message: error.message,
      // componentStack is only useful in development
      ...(isDevelopment ? { componentStack: info.componentStack } : {}),
    });
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.reset);
      }
      return (
        <View style={styles.container}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            We hit an unexpected error. Tap below to try again.
          </Text>
          {isDevelopment ? (
            <ScrollView style={styles.devBox} contentContainerStyle={styles.devBoxContent}>
              <Text style={styles.devText}>{error.message}</Text>
            </ScrollView>
          ) : null}
          <TouchableOpacity style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  devBox: {
    maxHeight: 160,
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    marginBottom: 24,
  },
  devBoxContent: {
    padding: 12,
  },
  devText: {
    fontSize: 12,
    color: '#7F1D1D',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#059669',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
