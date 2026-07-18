// app/_layout.tsx
import { AuthProvider, useAuth, AuthContextData } from '../contexts/AuthContext';
import { Slot, router } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function RootLayoutNav() {
  const { session, isLoading } = useAuth() as AuthContextData;
  const [forceTimeout, setForceTimeout] = useState(false);

  useEffect(() => {
    // 🔥 Timeout de segurança: se o loading demorar mais de 8 segundos, força a saída
    const timer = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ Loading timeout: forçando saída do estado de loading');
        setForceTimeout(true);
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Se passou do timeout ou o loading terminou
  if (!isLoading || forceTimeout) {
    if (session) {
      router.replace('/(tabs)');
    } else {
      router.replace('/login');
    }
  }

  // Enquanto carrega, exibe tela de loading
  if (isLoading && !forceTimeout) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ced5df' }}>
        <ActivityIndicator size="large" color="#1974f4" />
        <Text style={{ marginTop: 10, color: '#64748b' }}>Carregando...</Text>
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const RootView = GestureHandlerRootView as any;
  return (
    <RootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </SafeAreaProvider>
    </RootView>
  );
}