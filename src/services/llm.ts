import { execa } from 'execa';
import { EmailData, ClassificationResult } from '../types/index.js';
import { config } from '../utils/config.js';

export async function classifyEmail(email: EmailData): Promise<ClassificationResult> {
    try {
        const prompt = generatePrompt(email);
        const modelOutput = await runLLM(prompt);
        return parseModelOutput(modelOutput);
    } catch (error) {
        console.error('Error classifying email:', error);
        // Default to not classifying as advertisement in case of error
        return {
            isAdvertisement: false,
            confidence: 0,
            reasoning: 'Error in classification process'
        };
    }
}

function generatePrompt(email: EmailData): string {
    return `You are a helpful email assistant tasked with identifying advertisement emails. 
  
Email Details:
From: ${email.from}
Subject: ${email.subject}
Date: ${email.date}
Preview: ${email.snippet}
Body: ${email.body || '(No body available)'}

Your task is to analyze this email and determine if it's an advertisement that can be deleted or if it's an important email that should be kept.

Important emails that should be KEPT include:
- Receipts and order confirmations
- Account management emails
- Bills and payment notifications
- Official documents
- Personal communications
- Work-related communications
- Emails containing important information or time-sensitive notifications

Advertisements that can be DELETED include:
- Marketing promotions
- Newsletters that don't contain important information
- Sales announcements
- Product recommendations
- Marketing from companies you've purchased from before
- Promotions and deals

Please classify this email and respond in the following JSON format only:
{
  "isAdvertisement": true/false,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation of your decision>"
}`;
}

async function runLLM(prompt: string): Promise<string> {
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: config.modelName,
                prompt: prompt,
                stream: false
            }),
            signal: AbortSignal.timeout(60000) // 60 second timeout
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.response;
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Failed to connect to Ollama API. Make sure Ollama is running.');
        }
        console.error('Error running LLM:', error);
        throw error;
    }
}

function parseModelOutput(output: string): ClassificationResult {
    try {
        // Try to find JSON in the output
        const jsonMatch = output.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const jsonStr = jsonMatch[0];
            const result = JSON.parse(jsonStr);

            // Validate the parsed result
            if (
                typeof result.isAdvertisement === 'boolean' &&
                typeof result.confidence === 'number' &&
                typeof result.reasoning === 'string'
            ) {
                return result as ClassificationResult;
            }
        }

        // If JSON parsing fails, try to extract information manually
        const isAdMatch = output.toLowerCase().includes('isadvertisement": true') ||
            output.toLowerCase().includes('"isadvertisement":true') ||
            output.toLowerCase().includes('isadvertisement: true');

        return {
            isAdvertisement: isAdMatch,
            confidence: isAdMatch ? 0.6 : 0.5,
            reasoning: 'Parsed manually from model output'
        };
    } catch (error) {
        console.error('Error parsing model output:', error);

        // Fallback to a basic analysis of the text
        const lowerOutput = output.toLowerCase();
        const adKeywords = ['advertisement', 'promotion', 'marketing', 'newsletter', 'sale', 'deal', 'offer'];
        const adEvidence = adKeywords.some(keyword => lowerOutput.includes(keyword));

        return {
            isAdvertisement: adEvidence,
            confidence: adEvidence ? 0.6 : 0.5,
            reasoning: 'Fallback classification based on keywords'
        };
    }
} 