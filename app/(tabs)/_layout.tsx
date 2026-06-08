import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1974f4', // Cor azul fixa
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          height: 100,
        },
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ title: 'Início', tabBarIcon: ({ color }) => <MaterialIcons name="home" size={30} color={color} /> }} 
      />
      <Tabs.Screen 
        name="scanner" 
        options={{ title: 'Scanner', tabBarIcon: ({ color }) => <MaterialIcons name="qr-code-scanner" size={28} color={color} /> }} 
      />
      <Tabs.Screen 
        name="encomendas" 
        options={{ title: 'Encomendas', tabBarIcon: ({ color }) => <MaterialIcons name="local-shipping" size={28} color={color} /> }} 
      />

      <Tabs.Screen
        name="historico"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color }) => <MaterialIcons name="history" size={28} color={color} />,
        }}
      />

      <Tabs.Screen 
        name="configuracoes" 
        options={{ title: 'configuracoes', tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={28} color={color} /> }} 
      />

    </Tabs>
  );
}