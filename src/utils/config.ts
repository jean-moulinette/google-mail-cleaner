import dotenv from 'dotenv';
import { Config } from '../types/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.join(__dirname, '..', '..', 'token.json');

export const config: Config = {
    clientId: process.env.CLIENT_ID || '',
    clientSecret: process.env.CLIENT_SECRET || '',
    redirectUri: process.env.REDIRECT_URI || 'http://localhost:3000/oauth2callback',
    batchSize: parseInt(process.env.BATCH_SIZE || '50', 10),
    confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.7'),
    modelName: process.env.MODEL_NAME || 'gemma3'
};

export function saveToken(token: any): void {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to', TOKEN_PATH);
}

export function loadToken(): any {
    try {
        if (fs.existsSync(TOKEN_PATH)) {
            return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading token:', error);
    }
    return null;
}

export function deleteToken(): void {
    try {
        if (fs.existsSync(TOKEN_PATH)) {
            fs.unlinkSync(TOKEN_PATH);
            console.log('Token deleted');
        }
    } catch (error) {
        console.error('Error deleting token:', error);
    }
} 