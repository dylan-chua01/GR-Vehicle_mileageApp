import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxYpcOt5uGNB6F2Be5OMfXgNdUevW3Nva7yUDz5qJhBZfLjMUaraobiRR9NkA2_Jbl9/exec';

// XMLHttpRequest method for better Google Apps Script compatibility
const submitDataXHR = (dataToSend: { Date: string; CarPlate: string; Mileage: number; Agent: string; }) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200 || xhr.status === 302) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch (e) {
            // Sometimes Google Apps Script returns plain text
            if (xhr.responseText.includes('success') || xhr.responseText.includes('✅')) {
              resolve({ result: 'success', message: 'Data submitted successfully' });
            } else {
              reject(new Error('Invalid response format'));
            }
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      }
    };
    
    xhr.onerror = function() {
      reject(new Error('Network request failed'));
    };
    
    xhr.ontimeout = function() {
      reject(new Error('Request timed out'));
    };
    
    xhr.open('POST', GOOGLE_SCRIPT_URL, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 15000; // 15 second timeout
    
    xhr.send(JSON.stringify(dataToSend));
  });
};

const testConnection = async () => {
  try {
    console.log('Testing connection to:', GOOGLE_SCRIPT_URL);
    
    // Try XMLHttpRequest method
    const xhr = new XMLHttpRequest();
    xhr.open('GET', GOOGLE_SCRIPT_URL, true);
    xhr.timeout = 10000;
    
    xhr.onload = function() {
      console.log('XHR GET response status:', xhr.status);
      console.log('XHR GET response text:', xhr.responseText);
    };
    
    xhr.onerror = function() {
      console.log('XHR GET test failed');
    };
    
    xhr.send();
    
  } catch (error) {
    console.log('Connection test failed:', error);
  }
};

export default function App() {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    carPlate: '',
    mileage: '',
    agent: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: any, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.carPlate.trim()) {
      Alert.alert('Error', 'Please enter car plate number');
      return false;
    }
    if (!formData.mileage.trim()) {
      Alert.alert('Error', 'Please enter mileage');
      return false;
    }
    if (!formData.agent.trim()) {
      Alert.alert('Error', 'Please enter agent name');
      return false;
    }
    if (isNaN(formData.mileage) || formData.mileage <= 0) {
      Alert.alert('Error', 'Please enter a valid mileage number');
      return false;
    }
    return true;
  };

  const submitData = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const dataToSend = {
        Date: formData.date,
        CarPlate: formData.carPlate.toUpperCase().trim(),
        Mileage: parseInt(formData.mileage),
        Agent: formData.agent.trim(),
      };

      console.log('Sending data:', dataToSend);
      console.log('To URL:', GOOGLE_SCRIPT_URL);
      
      // Log individual field values for debugging
      console.log('Individual values:');
      console.log('- Date:', dataToSend.Date);
      console.log('- CarPlate:', dataToSend.CarPlate);
      console.log('- Mileage:', dataToSend.Mileage);
      console.log('- Agent:', dataToSend.Agent);

      // Try XMLHttpRequest method first (better for Google Apps Script)
      let result;
      try {
        result = await submitDataXHR(dataToSend);
        console.log('XHR Response:', result);
      } catch (xhrError) {
        console.log('XHR failed, trying fetch:', xhrError.message);
        
        // Fallback to fetch
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(dataToSend),
          redirect: 'follow',
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        result = await response.json();
        console.log('Fetch Response:', result);
      }

      if (result.result === 'success') {
        Alert.alert(
          'Success!', 
          'Mileage data submitted successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form but keep agent name and date
                setFormData(prev => ({
                  ...prev,
                  carPlate: '',
                  mileage: '',
                }));
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to submit data');
      }
    } catch (error) {
      console.error('Error submitting data:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      let errorMessage = 'Network error. Please check your connection and try again.';
      
      if (error.message.includes('Network request failed')) {
        errorMessage = 'Cannot connect to server. Please check:\n• Internet connection\n• Google Apps Script URL\n• Script permissions';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Image 
            source={require('../assets/images/GoRush_Logo.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={styles.title}>Car Mileage Tracker</Text>
          <Text style={styles.subtitle}>Enter vehicle information</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={formData.date}
              onChangeText={(value) => handleInputChange('date', value)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Car Plate Number *</Text>
            <TextInput
              style={styles.input}
              value={formData.carPlate}
              onChangeText={(value) => handleInputChange('carPlate', value)}
              placeholder="e.g., BB1234"
              placeholderTextColor="#999"
              autoCapitalize="characters"
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Mileage *</Text>
            <TextInput
              style={styles.input}
              value={formData.mileage}
              onChangeText={(value) => handleInputChange('mileage', value)}
              placeholder="e.g., 124567"
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Agent Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.agent}
              onChangeText={(value) => handleInputChange('agent', value)}
              placeholder="Enter your name"
              placeholderTextColor="#999"
              autoCapitalize="words"
              maxLength={50}
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={submitData}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Mileage</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>* Required fields</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  logo: {
    width: 120,
    height: 60,
    marginBottom: 10,
  },
});