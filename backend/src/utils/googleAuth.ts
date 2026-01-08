import { OAuth2Client } from 'google-auth-library';
import { IGoogleUser } from '../types/index.js';

let client: OAuth2Client | null = null;

const getClient = (): OAuth2Client => {
  if (!client) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Google OAuth credentials are not properly configured in environment variables');
    }

    client = new OAuth2Client(clientId, clientSecret, redirectUri);
  }
  return client;
};

export const getGoogleAuthUrl = (): string => {
  const oauthClient = getClient();
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  return oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
};

export const getGoogleUser = async (code: string): Promise<IGoogleUser> => {
  try {
    const oauthClient = getClient();
    const clientId = process.env.GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID is not configured');
    }

    const { tokens } = await oauthClient.getToken(code);
    oauthClient.setCredentials(tokens);

    if (!tokens.id_token) {
      throw new Error('No ID token received from Google');
    }

    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Failed to get user payload from Google');
    }

    if (!payload.sub || !payload.email || !payload.name) {
      throw new Error('Missing required user information from Google');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture || '',
      emailVerified: payload.email_verified || false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Google authentication failed: ${errorMessage}`);
  }
};

