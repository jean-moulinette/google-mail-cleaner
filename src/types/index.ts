export interface EmailData {
    id: string;
    threadId: string;
    subject: string;
    snippet: string;
    from: string;
    date: string;
    body?: string;
}

export interface ClassificationResult {
    isAdvertisement: boolean;
    confidence: number;
    reasoning: string;
}

export interface Config {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    batchSize: number;
    confidenceThreshold: number;
    modelName: string;
} 