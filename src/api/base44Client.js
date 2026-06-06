import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { withOfflineEntityFallback } from '@/lib/offlineEntityAdapter';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
const base44Client = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

export const base44 = withOfflineEntityFallback(base44Client);
