import { Platform } from 'react-native';

// Set EXPO_PUBLIC_API_URL when the backend is not on this device/emulator's loopback.
// Android emulators reach the host machine through 10.0.2.2; iOS simulators and web use localhost.
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const defaultApiUrl = Platform.OS === 'android'
  ? 'http://10.0.2.2:8000/api'
  : 'http://127.0.0.1:8000/api';

export const API_BASE_URL = configuredApiUrl || defaultApiUrl;
export const BANK_NAMES_API_URL = `${API_BASE_URL}/banks/`;
export const QR_PERCENTAGES_API_URL = `${API_BASE_URL}/qr/`;

export const LOGIN_API_URL = `${API_BASE_URL}/auth/login/`;

export const ADS_API_URL = `${API_BASE_URL}/ads/`;
export const CARD_PERCENTAGES_API_URL = `${API_BASE_URL}/card-percentages/`;

export const CHAT_MESSAGES_API_URL = `${API_BASE_URL}/chat/messages/`;
export const CHAT_CONVERSATIONS_API_URL = `${API_BASE_URL}/chat/conversations/`;
export const CHAT_TYPING_API_URL = `${API_BASE_URL}/chat/typing/`;
export const NOTIFICATIONS_API_URL = `${API_BASE_URL}/notifications/`;
