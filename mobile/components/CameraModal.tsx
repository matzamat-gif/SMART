import React, { useRef, useState } from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, Text, ActivityIndicator, SafeAreaView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../lib/i18n';

interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
  onPictureTaken: (uri: string) => void;
}

export default function CameraModal({ visible, onClose, onPictureTaken }: CameraModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { t } = useI18n();
  const [taking, setTaking] = useState(false);

  if (!visible) return null;

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#6B7280" style={{ marginBottom: 20 }} />
          <Text style={styles.permissionText}>{t('addItem.cameraPermissionRequired')}</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>{t('scan.grantAccess') || 'Grant Permission'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }

  const handleTakePicture = async () => {
    if (!cameraRef.current || taking) return;
    setTaking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo && photo.uri) {
        onPictureTaken(photo.uri);
      }
    } catch (e) {
      console.error('Camera capture failed:', e);
    } finally {
      setTaking(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView style={styles.camera} facing="back" ref={cameraRef}>
          <SafeAreaView style={styles.overlay}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>
            <View style={styles.bottomBar}>
              <TouchableOpacity 
                style={styles.captureButton} 
                onPress={handleTakePicture} 
                disabled={taking}
              >
                {taking ? (
                  <ActivityIndicator color="#059669" size="large" />
                ) : (
                  <View style={styles.captureInner} />
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
  camera: { 
    flex: 1 
  },
  overlay: { 
    flex: 1, 
    backgroundColor: 'transparent', 
    justifyContent: 'space-between' 
  },
  closeButton: { 
    alignSelf: 'flex-start', 
    margin: 20,
    padding: 8,
  },
  bottomBar: { 
    paddingBottom: 40,
    alignItems: 'center',
  },
  captureButton: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: 'rgba(255, 255, 255, 0.3)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  captureInner: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: '#fff' 
  }
});
