// client/src/utils/backendAPI.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { InteractiveParams } from "../context/types";

let backendAPI: AxiosInstance = axios;

const setupBackendAPI = async (interactiveParams: InteractiveParams) => {
  backendAPI = axios.create({
    baseURL: `/api`,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Only do this if have interactive nonce.
  if (interactiveParams.interactiveNonce) {
    backendAPI.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      if (!config?.params) config.params = {};
      config.params = { ...config.params };
      config.params["assetId"] = interactiveParams.assetId;
      config.params["displayName"] = interactiveParams.displayName;
      config.params["identityId"] = interactiveParams.identityId;
      config.params["interactiveNonce"] = interactiveParams.interactiveNonce;
      config.params["interactivePublicKey"] = interactiveParams.interactivePublicKey;
      config.params["profileId"] = interactiveParams.profileId;
      config.params["sceneDropId"] = interactiveParams.sceneDropId;
      config.params["uniqueName"] = interactiveParams.uniqueName;
      config.params["urlSlug"] = interactiveParams.urlSlug;
      config.params["username"] = interactiveParams.username;
      config.params["visitorId"] = interactiveParams.visitorId;
      return config;
    });
  }
};

// Helper function to make API calls
const api = {
  post: async (url: string, data?: any) => {
    const response = await backendAPI.post(url, data);
    return response;
  },
  get: async (url: string) => {
    const response = await backendAPI.get(url);
    return response;
  },
};

// Add these new methods
export const gameAPI = {
  startGame: async (worldId: string) => {
    const response = await api.post('/start-game', { worldId });
    return response.data;
  },
  
  checkSession: async () => {
    const response = await api.get('/check-session');
    return response.data;
  },
  
  exitGame: async () => {
    const response = await api.post('/exit-game');
    return response.data;
  },
  
  updateProgress: async (puzzleId: number, solution: any) => {
    const response = await api.post('/update-progress', { puzzleId, solution });
    return response.data;
  },
  
  getGameState: async () => {
    const response = await api.get('/game-state');
    return response.data;
  },
};

export { backendAPI, setupBackendAPI };