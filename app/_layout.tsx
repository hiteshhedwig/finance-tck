import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { initializeNhostStorage } from '../lib/nhost/client';
import { useAuth } from '../lib/hooks/useAuth';
import { useProfile } from '../lib/hooks/useProfile';
import { useAccounts } from '../lib/hooks/useAccounts';
import { Colors } from '../constants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, retry: 1 },
  },
});

function Spinner() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );
}

function RootLayoutNav() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const { data: accounts, isLoading: accountsLoading } = useAccounts(user?.id);
  const segments = useSegments();
  const router = useRouter();

  const stillLoading = isLoading || (isAuthenticated && (profileLoading || accountsLoading));
  // Onboarding needed if: no profile OR profile exists but no accounts seeded
  const needsOnboarding = isAuthenticated && !stillLoading &&
    (profile === null || (accounts !== undefined && accounts.length === 0));

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && (profileLoading || accountsLoading)) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace(needsOnboarding ? '/onboarding' : '/(tabs)/home');
    } else if (needsOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    } else if (!needsOnboarding && inOnboarding) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, isLoading, needsOnboarding, profileLoading, accountsLoading, segments]);

  if (stillLoading) return <Spinner />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="transaction/add" options={{ presentation: 'modal' }} />
      <Stack.Screen name="transaction/edit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="transaction/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="account/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="cc-statements/index" options={{ presentation: 'card' }} />
      <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  // Gate rendering until SecureStore session is loaded into Nhost's in-memory cache.
  // Without this, getUserSession() returns null on first render even if a session exists.
  const [nhostReady, setNhostReady] = useState(false);

  useEffect(() => {
    initializeNhostStorage().then(() => setNhostReady(true));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" backgroundColor={Colors.background} />
          {nhostReady ? <RootLayoutNav /> : <Spinner />}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
