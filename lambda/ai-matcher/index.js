const AWS = require('aws-sdk');

const bedrock = new AWS.BedrockRuntime({
    region: 'eu-west-1'
});

exports.handler = async (event) => {
    const { transaction, availableInvoices } = event;
    
    try {
        const prompt = buildPrompt(transaction, availableInvoices);
        
        const response = await bedrock.invokeModel({
            modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 1000,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            })
        }).promise();
        
        const result = JSON.parse(response.body.toString());
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