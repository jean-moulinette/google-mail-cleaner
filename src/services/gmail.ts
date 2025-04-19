import { gmail_v1 } from 'googleapis';
import { EmailData } from '../types/index.js';
import { config } from '../utils/config.js';

export async function getEmailBatch(
    gmail: gmail_v1.Gmail,
    pageToken?: string
): Promise<{ emails: EmailData[]; nextPageToken?: string }> {
    try {
        // Get a list of emails
        const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults: config.batchSize,
            pageToken
        });

        const messages = response.data.messages || [];
        const nextPageToken = response.data.nextPageToken;

        // Fetch details for each email
        const emails: EmailData[] = await Promise.all(
            messages.map(async (message) => {
                const email = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id!,
                    format: 'full'
                });

                const { id, threadId, payload, snippet, internalDate, labelIds } = email.data;
                const headers = payload?.headers || [];

                const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
                const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
                const date = new Date(parseInt(internalDate || '0')).toISOString();

                // Extract email body
                let body = '';
                if (payload?.body?.data) {
                    body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
                } else if (payload?.parts) {
                    // Attempt to get text from parts if the main body is empty
                    const textParts = payload.parts.filter(part =>
                        part.mimeType === 'text/plain' || part.mimeType === 'text/html'
                    );

                    for (const part of textParts) {
                        if (part.body?.data) {
                            body += Buffer.from(part.body.data, 'base64').toString('utf-8');
                            if (body.length > 1000) break; // Limit body size for LLM processing
                        }
                    }
                }

                return {
                    id: id || '',
                    threadId: threadId || '',
                    subject,
                    snippet: snippet || '',
                    from,
                    date,
                    labelIds,
                    body: body.substring(0, 3000) // Limit body size for LLM
                };
            })
        );

        return { emails, nextPageToken: nextPageToken || undefined };
    } catch (error) {
        console.error('Error fetching emails:', error);
        throw error;
    }
}

export async function trashEmail(gmail: gmail_v1.Gmail, emailId: string): Promise<void> {
    try {
        await gmail.users.messages.trash({
            userId: 'me',
            id: emailId
        });
        console.log(`Email ${emailId} moved to trash`);
    } catch (error) {
        console.error(`Error trashing email ${emailId}:`, error);
        throw error;
    }
}

export async function createLabel(gmail: gmail_v1.Gmail, labelName: string): Promise<string> {
    try {
        // Check if label already exists
        const response = await gmail.users.labels.list({ userId: 'me' });
        const labels = response.data.labels || [];
        const existingLabel = labels.find(label => label.name === labelName);

        if (existingLabel) {
            console.log(`Label "${labelName}" already exists`);
            return existingLabel.id!;
        }

        // Create new label
        const createResponse = await gmail.users.labels.create({
            userId: 'me',
            requestBody: {
                name: labelName,
                labelListVisibility: 'labelShow',
                messageListVisibility: 'show'
            }
        });

        console.log(`Label "${labelName}" created`);
        return createResponse.data.id!;
    } catch (error) {
        console.error(`Error creating label "${labelName}":`, error);
        throw error;
    }
}

export async function applyLabel(gmail: gmail_v1.Gmail, emailId: string, labelId: string): Promise<void> {
    try {
        await gmail.users.messages.modify({
            userId: 'me',
            id: emailId,
            requestBody: {
                addLabelIds: [labelId]
            }
        });
        console.log(`- label applied to email ${emailId}`);
    } catch (error) {
        console.error(`Error applying label to email ${emailId}:`, error);
        throw error;
    }
} 