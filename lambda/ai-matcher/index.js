import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrock = new BedrockRuntimeClient({
    region: 'eu-west-1' // EU region for GDPR compliance
});

export const handler = async (event) => {
    const { transaction, availableInvoices } = event;
    
    try {
        const prompt = buildPrompt(transaction, availableInvoices);
        
        const command = new InvokeModelCommand({
            modelId: 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0',
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                messages: [
                    {
                        role: "user",
                        content: [{
                            type: "text",
                            text: prompt
                        }]
                    }
                ],
                max_tokens: 1000,
                temperature: 0.1
            })
        });
        
        const response = await bedrock.send(command);
        
        const result = JSON.parse(new TextDecoder().decode(response.body));
        const aiResponse = JSON.parse(result.content[0].text);
        
        return {
            invoice: aiResponse.matched_invoice,
            confidence: aiResponse.confidence,
            reasoning: aiResponse.reasoning
        };
        
    } catch (error) {
        console.error('AI matching error:', error);
        return {
            invoice: null,
            confidence: 0,
            reasoning: 'AI processing error'
        };
    }
};

function buildPrompt(transaction, availableInvoices) {
    const invoiceList = availableInvoices.map(inv => 
        `- ${inv.number}: ${inv.amount} HUF, ${inv.date}, ${inv.customer || 'N/A'}`
    ).join('\\n');
    
    return `
Task: Match this bank transaction with the correct invoice.

Bank transaction:
- Amount: ${transaction.amount} HUF
- Date: ${transaction.date}
- Description: "${transaction.description}"
- Bank: ${transaction.bank}

Available invoices:
${invoiceList}

Rules:
1. Look for invoice number in description (E-NNTCH-YYYY-1234 or E-FRDLT-YYYY-1234 format)
2. Check amount match (±1% tolerance)
3. Consider date (±30 days tolerance)
4. If uncertain, give low confidence

Respond in JSON format:
{
    "matched_invoice": {invoice object or null},
    "confidence": 0-100,
    "reasoning": "explanation in Hungarian"
}
`;
}