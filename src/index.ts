import { getGmailClient } from './services/auth.js';
import { getEmailBatch, trashEmail, createLabel, applyLabel } from './services/gmail.js';
import { classifyEmail } from './services/llm.js';
import { config } from './utils/config.js';
import readlineSync from 'readline-sync';

// Label for identified advertisements
const AD_LABEL = 'Advertisement';

async function main() {
    console.log('Google Mail Cleaner');
    console.log('==================');

    try {
        // Get Gmail client
        console.log('Authenticating with Gmail...');
        const gmail = await getGmailClient();
        console.log('Authentication successful!');

        // Create advertisement label if it doesn't exist
        console.log('Setting up labels...');
        const adLabelId = await createLabel(gmail, AD_LABEL);

        let pageToken: string | undefined;
        let processedCount = 0;
        let advertisementCount = 0;
        let keepCount = 0;

        // Ask user for processing mode
        const mode = readlineSync.question(
            'Choose processing mode (1 = Interactive, 2 = Auto-label only, 3 = Auto-delete): ',
            { limit: ['1', '2', '3'], defaultInput: '1' }
        );

        const isInteractive = mode === '1';
        const autoDelete = mode === '3';

        const batchesToProcess = readlineSync.questionInt(
            'How many batches to process (each batch has ' + config.batchSize + ' emails)? ',
            { defaultInput: '1', limit: [1, 100] }
        );

        let batchesProcessed = 0;

        // Process emails in batches
        while (batchesProcessed < batchesToProcess) {
            console.log(`\nProcessing batch ${batchesProcessed + 1} of ${batchesToProcess}...`);

            // Get batch of emails
            const { emails, nextPageToken } = await getEmailBatch(gmail, pageToken);

            pageToken = nextPageToken;


            if (emails.length === 0) {
                console.log('No more emails to process.');
                break;
            }

            console.log(`Processing ${emails.length} emails...`);

            // Process each email in the batch
            for (const email of emails) {
                if (email.labelIds?.includes('CATEGORY_PROMOTIONS')) {
                    console.log('Skipping email already labeled as CATEGORY_PROMOTIONS by Google');
                    continue;
                }

                process.stdout.write(`\nProcessing email: "${email.subject.substring(0, 50)}${email.subject.length > 50 ? '...' : ''}" from ${email.from.substring(0, 30)}${email.from.length > 30 ? '...' : ''} ... \n`);

                // Classify email using LLM
                const classification = await classifyEmail(email);

                processedCount++;

                if (classification.isAdvertisement && classification.confidence >= config.confidenceThreshold) {
                    process.stdout.write('ADVERTISEMENT');
                    advertisementCount++;

                    // Apply advertisement label
                    await applyLabel(gmail, email.id, adLabelId);
                    console.log(`Reasoning: ${classification.reasoning}`);

                    // Handle based on mode
                    if (isInteractive) {
                        console.log(`\nEmail classified as advertisement (confidence: ${classification.confidence.toFixed(2)})`);

                        const action = readlineSync.question(
                            'Action (d = delete, k = keep, s = skip): ',
                            { limit: ['d', 'k', 's'], defaultInput: 's' }
                        );

                        if (action === 'd') {
                            await trashEmail(gmail, email.id);
                            console.log('Email moved to trash.');
                        } else if (action === 'k') {
                            console.log('Email marked to keep.');
                            keepCount++;
                        } else {
                            console.log('Skipped.');
                        }
                    } else if (autoDelete) {
                        await trashEmail(gmail, email.id);
                        process.stdout.write('Deleted\n');
                    } else {
                        process.stdout.write('Labeled\n');
                    }
                } else {
                    process.stdout.write('IMPORTANT');
                    keepCount++;
                    console.log(`\nReasoning: ${classification.reasoning}`);

                    if (isInteractive) {
                        console.log(`\nEmail classified as important (confidence: ${(1 - classification.confidence).toFixed(2)})`);

                        const action = readlineSync.question(
                            'Action (d = delete, k = keep): ',
                            { limit: ['d', 'k'], defaultInput: 'k' }
                        );

                        if (action === 'd') {
                            await trashEmail(gmail, email.id);
                            console.log('Email moved to trash.');
                            keepCount--;
                            advertisementCount++;
                        } else {
                            console.log('Email kept.');
                        }
                    } else {
                        process.stdout.write(' - Kept\n');
                    }
                }
            }

            batchesProcessed++;

            if (!pageToken) {
                console.log('No more emails to process.');
                break;
            }

            if (batchesProcessed < batchesToProcess && !isInteractive) {
                // Ask to continue to next batch in non-interactive modes
                const continueProcessing = readlineSync.question(
                    'Continue to next batch? (y/n): ',
                    { limit: ['y', 'n'], defaultInput: 'y' }
                );

                if (continueProcessing !== 'y') {
                    break;
                }
            }
        }

        // Print summary
        console.log('\nProcessing complete!');
        console.log('--------------------');
        console.log(`Total emails processed: ${processedCount}`);
        console.log(`Advertisements found: ${advertisementCount}`);
        console.log(`Important emails kept: ${keepCount}`);

    } catch (error) {
        console.error('Error:', error);
    }
}

main().catch(console.error); 