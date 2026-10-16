import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { useEffect } from 'react';
import { NOTIFICATIONS_API_URL } from '@/constants/api';
import { useAuthUser } from '@/lib/auth-session';
import { setUnreadNotificationCount } from '@/lib/notification-state';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

function NotificationMonitor() {
  const user = useAuthUser();

  useEffect(() => {
    if (!user?.token) {
      setUnreadNotificationCount(0);
      return;
    }

    let active = true;
    const headers = { Accept: 'application/json', Authorization: `Bearer ${user.token}` };
    const refresh = async () => {
      try {
        const response = await fetch(NOTIFICATIONS_API_URL, { headers });
        if (!response.ok) return;
        const result = await response.json() as { unread_count?: number };
        if (!active) return;
        const count = Number(result.unread_count) || 0;
        setUnreadNotificationCount(count);
      } catch {
        // The app continues to work when the notification endpoint is temporarily offline.
      }
    };

    void refresh();
    const timer = setInterval(() => void refresh(), 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user?.token]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <NotificationMonitor />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
