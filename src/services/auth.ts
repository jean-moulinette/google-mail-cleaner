import { google } from 'googleapis';
import { config, saveToken, loadToken } from '../utils/config.js';
import readlineSync from 'readline-sync';

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels'
];

export async function getGmailClient() {
    const oAuth2Client = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        config.redirectUri
    );

    // Check if we have previously stored a token
    const token = loadToken();
    if (token) {
        oAuth2Client.setCredentials(token);
        return google.gmail({ version: 'v1', auth: oAuth2Client });
    }

    // If we don't have a token, get a new one
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    console.log('Authorize this app by visiting this URL:', authUrl);
    const code = readlineSync.question('Enter the code from that page here: ');

    try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        // Save the token for future use
        saveToken(tokens);

        return google.gmail({ version: 'v1', auth: oAuth2Client });
    } catch (error) {
        console.error('Error retrieving access token', error);
        throw error;
    }
} 