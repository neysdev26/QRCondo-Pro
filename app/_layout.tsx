import { Stack } from 'expo-router';
// Importe o Provider (verifique se o caminho está correto conforme o seu projeto)
import { EncomendaProvider } from '../contexts/EncomendaContext'; 

export default function RootLayout() {
  return (
    // O Provider deve envolver toda a navegação para que as abas e o dashboard funcionem
    <EncomendaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </EncomendaProvider>
  );
}