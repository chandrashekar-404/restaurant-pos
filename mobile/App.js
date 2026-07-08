import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ActivityIndicator, StatusBar, SafeAreaView 
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [serverIp, setServerIp] = useState('');
  const [inputIp, setInputIp] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(true);

  // Load configured IP on startup
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedIp = await AsyncStorage.getItem('server_ip');
        if (savedIp) {
          setServerIp(savedIp);
          setInputIp(savedIp);
          setIsConfigured(true);
        }
      } catch (err) {
        console.error('AsyncStorage error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleConnect = async () => {
    if (!inputIp.trim()) return;

    let target = inputIp.trim();
    
    // Check if it's a raw hostname/IP (e.g. "192.168.1.15" or "localhost") without protocol/port
    const isRawHostOrIp = /^[a-zA-Z0-9.-]+$/.test(target) && !target.startsWith('http');
    if (isRawHostOrIp) {
      target = `http://${target}:3000`;
    }

    try {
      await AsyncStorage.setItem('server_ip', target);
      setServerIp(target);
      setIsConfigured(true);
    } catch (err) {
      console.error('Failed to save IP:', err);
    }
  };

  const handleResetIp = async () => {
    try {
      await AsyncStorage.removeItem('server_ip');
      setIsConfigured(false);
      setServerIp('');
      setWebViewLoading(true);
    } catch (err) {
      console.error('Failed to clear IP:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Initializing POS terminal...</Text>
      </View>
    );
  }

  // View 1: IP Configurator Setup Screen
  if (!isConfigured) {
    return (
      <SafeAreaView style={styles.configContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#070913" />
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kings Family Restaurant</Text>
          <Text style={styles.cardSubtitle}>Terminal Connection Setup</Text>
          
          <Text style={styles.description}>
            Enter either the local IP address of your POS server or a production website URL (starting with http:// or https://).
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Server IP / URL</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 192.168.1.15 or https://pos.domain.com"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={inputIp}
              onChangeText={setInputIp}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleConnect}>
            <Text style={styles.buttonText}>Connect Terminal</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // View 2: Full Screen POS web client WebView
  const targetUrl = serverIp.startsWith('http') ? serverIp : `http://${serverIp}:3000`;

  return (
    <SafeAreaView style={styles.webviewContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#070913" />
      
      <WebView
        source={{ uri: targetUrl }}
        onLoadStart={() => setWebViewLoading(true)}
        onLoadEnd={() => setWebViewLoading(false)}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.webViewLoader}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Loading POS Terminal at {serverIp}...</Text>
          </View>
        )}
      />

      {/* Floating utility gear button to change settings */}
      <TouchableOpacity 
        style={styles.floatingSettingsBtn} 
        onPress={handleResetIp}
        activeOpacity={0.7}
      >
        <Text style={styles.settingsBtnText}>⚙️</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#070913',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 0.95,
    fontWeight: '500',
  },
  configContainer: {
    flex: 1,
    backgroundColor: '#070913',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 20,
  },
  description: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 14,
    color: '#f8fafc',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#6366F1',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: '#070913',
  },
  webview: {
    flex: 1,
    backgroundColor: '#070913',
  },
  webViewLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#070913',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  floatingSettingsBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  settingsBtnText: {
    fontSize: 20,
  },
});
