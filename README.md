# Google Mail Cleaner

A TypeScript/Node.js application that helps clean up your Gmail inbox by using Gemma3 LLM to identify and remove advertisement emails while preserving important ones.

## Features

- Connect to Gmail using OAuth2 authentication
- Process emails in batches to manage large inboxes efficiently
- Use Gemma3 (running locally via Ollama) to classify emails as advertisements or important
- Three processing modes:
  - Interactive: Review each classification and decide what to do
  - Auto-label: Automatically label advertisements without deleting
  - Auto-delete: Automatically trash identified advertisements

## Prerequisites

- Node.js (v16 or later)
- npm
- Ollama with Gemma3 model installed
- Google Cloud Platform account with Gmail API enabled

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a Google Cloud Platform project and enable the Gmail API:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable the Gmail API for the project
   - Create OAuth 2.0 credentials (Web application type)
   - Add `http://localhost:3000/oauth2callback` as an authorized redirect URI

4. Create a `.env` file based on the `.env.example` template:
   ```
   # Google API credentials
   CLIENT_ID=your-client-id
   CLIENT_SECRET=your-client-secret
   REDIRECT_URI=http://localhost:3000/oauth2callback

   # Number of emails to process at once
   BATCH_SIZE=50

   # Confidence threshold for classification (0.0 to 1.0)
   CONFIDENCE_THRESHOLD=0.7

   # Model settings
   MODEL_NAME=gemma3
   ```

5. Make sure Ollama is installed and Gemma3 model is pulled:
   ```
   ollama pull gemma3
   ```

## Usage

### Building the Application

```
npm run build
```

### Authentication

Before using the application, you need to authenticate with Gmail:

```
npm run auth
```

This will open a browser window for you to authenticate with Google. After authentication, the token will be saved for future use.

To reset authentication:

```
npm run auth -- --reset
```

### Running the Application

```
npm start
```

The application will:
1. Authenticate with Gmail
2. Ask you to choose a processing mode
3. Ask how many batches of emails to process
4. Process the emails according to your selected mode
5. Display a summary of results

## Processing Modes

1. **Interactive Mode**: For each email, the application will:
   - Show the subject and sender
   - Classify it using Gemma3
   - Show the classification result and confidence score
   - Let you decide whether to delete it, keep it, or skip it

2. **Auto-label Mode**: The application will:
   - Process emails in batches
   - Label identified advertisements without deleting them
   - Keep all other emails untouched

3. **Auto-delete Mode**: The application will:
   - Process emails in batches
   - Automatically trash identified advertisements
   - Keep all other emails untouched

## License

ISC 