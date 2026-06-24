import { AuthProvider, useAuth, AuthContextData } from '../contexts/AuthContext';
import { Slot, router } from 'expo-router';
import { View, ActivityIndicator, Text, SafeAreaView } from 'react-native';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableFreeze } from 'react-native-screens';

enableFreeze(false);

function RootLayoutNav() {
  const { session, isLoading } = useAuth() as AuthContextData;

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoading, session]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ced5df' }}>
        <ActivityIndicator size="large" color="#1974f4" />
        <Text style={{ marginTop: 10, color: '#64748b' }}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const RootView = GestureHandlerRootView as any;
  return (
    <RootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </RootView>
  );
}