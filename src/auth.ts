import { getGmailClient } from './services/auth.js';
import { deleteToken } from './utils/config.js';
import readlineSync from 'readline-sync';

async function main() {
    console.log('Google Mail Cleaner - Authentication Setup');
    console.log('=========================================');

    const reset = process.argv.includes('--reset');

    if (reset) {
        console.log('Resetting authentication...');
        deleteToken();
        console.log('Authentication token has been deleted. Please run the auth script again to re-authenticate.');
        return;
    }

    try {
        console.log('Authenticating with Google...');
        await getGmailClient();
        console.log('Authentication successful! You can now run the main program.');
    } catch (error) {
        console.error('Authentication failed:', error);
        console.log('Please check your credentials and try again.');
    }
}

main().catch(console.error); 