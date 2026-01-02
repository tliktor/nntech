const AWS = require('aws-sdk');
const axios = require('axios');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const ses = new AWS.SES();
const secretsManager = new AWS.SecretsManager();

exports.handler = async (event) => {
    console.log('Starting invoice matching process');
    
    try {
        const secrets = await getSecrets();
        const dateRange = getPreviousMonthRange();
        
        console.log(`Processing data for ${dateRange.year}-${dateRange.month}`);
        
        // Fetch data from all sources
        const [invoices, transactions, orders] = await Promise.all([
            fetchSzamlazzInvoices(secrets, dateRange),
            fetchBankTransactions(secrets, dateRange),
            fetchWooCommerceOrders(secrets, dateRange)
        ]);
        
        console.log(`Fetched: ${invoices.length} invoices, ${transactions.length} transactions, ${orders.length} orders`);
        
        // Store raw data
        await storeRawData(invoices, transactions, orders, dateRange);
        
        // Perform matching
        const matchingResults = await performMatching(invoices, transactions);
        
        console.log('Matching completed:', matchingResults.summary);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Invoice matching completed successfully',
                summary: matchingResults.summary
            })
        };
        
    } catch (error) {
        console.error('Error in invoice matching:', error);
        await sendErrorNotification(error);
        throw error;
    }
};

async function getSecrets() {
    const result = await secretsManager.getSecretValue({
        SecretId: process.env.SECRETS_ARN
    }).promise();
    
    return JSON.parse(result.SecretString);
}

function getPreviousMonthRange() {
    const now = new Date();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = now.getMonth() === 0 ? 12 : now.getMonth();
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    return {
        year,
        month,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
    };
}

async function fetchSzamlazzInvoices(secrets, dateRange) {
    try {
        console.log('Fetching Szamlazz.hu invoices...');
        
        const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamlaxml xmlns="http://www.szamlazz.hu/xmlszamlaxml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.szamlazz.hu/xmlszamlaxml xmlszamlaxml.xsd">
  <beallitasok>
    <szamlaagentkulcs>${secrets.szamlazz_token}</szamlaagentkulcs>
    <eszamla>true</eszamla>
    <szamlaLetoltes>true</szamlaLetoltes>
    <valaszVerzio>1</valaszVerzio>
  </beallitasok>
  <szamlaKeres>
    <keltDatumTol>${dateRange.startDate}</keltDatumTol>
    <keltDatumIg>${dateRange.endDate}</keltDatumIg>
  </szamlaKeres>
</xmlszamlaxml>`;
        
        const response = await axios.post('https://www.szamlazz.hu/szamla/', xmlData, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8'
            }
        });
        
        // Parse XML response to extract invoice data
        return [];
    } catch (error) {
        console.error('Szamlazz.hu API error:', error.message);
        return [];
    }
}

async function fetchBankTransactions(secrets, dateRange) {
    const transactions = [];
    
    // Wise API
    try {
        console.log('Fetching Wise transactions...');
        const wiseTransactions = await fetchWiseTransactions(secrets.wise_token, dateRange);
        transactions.push(...wiseTransactions.map(t => ({ ...t, bank: 'wise' })));
    } catch (error) {
        console.error('Wise API error:', error.message);
    }
    
    // MyPOS API
    try {
        console.log('Fetching MyPOS transactions...');
        const myposTransactions = await fetchMyPOSTransactions(secrets, dateRange);
        transactions.push(...myposTransactions.map(t => ({ ...t, bank: 'mypos' })));
    } catch (error) {
        console.error('MyPOS API error:', error.message);
    }
    
    return transactions;
}

async function fetchWiseTransactions(token, dateRange) {
    const response = await axios.get('https://api.wise.com/v1/profiles', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    // Mock data for testing
    return [
        {
            id: 'wise_001',
            amount: 15000,
            date: dateRange.startDate,
            description: 'E-NNTCH-2024-001 payment',
            currency: 'HUF'
        }
    ];
}

async function fetchMyPOSTransactions(secrets, dateRange) {
    // Mock data for testing
    return [
        {
            id: 'mypos_001',
            amount: 25000,
            date: dateRange.startDate,
            description: 'Card payment E-FRDLT-2024-002',
            currency: 'HUF'
        }
    ];
}

async function fetchWooCommerceOrders(secrets, dateRange) {
    try {
        console.log('Fetching WooCommerce orders...');
        
        const auth = Buffer.from(`${secrets.woocommerce_key}:${secrets.woocommerce_secret}`).toString('base64');
        
        const response = await axios.get('https://fordulat.com/wp-json/wc/v3/orders', {
            headers: {
                'Authorization': `Basic ${auth}`
            },
            params: {
                after: dateRange.startDate,
                before: dateRange.endDate,
                per_page: 100
            }
        });
        
        return response.data || [];
    } catch (error) {
        console.error('WooCommerce API error:', error.message);
        return [];
    }
}

async function storeRawData(invoices, transactions, orders, dateRange) {
    const items = [];
    
    // Store invoices
    invoices.forEach((invoice, index) => {
        items.push({
            PutRequest: {
                Item: {
                    PK: `INVOICE#${invoice.number || index}`,
                    SK: `${dateRange.year}-${dateRange.month}`,
                    type: 'invoice',
                    data: invoice,
                    GSI1PK: `MONTH#${dateRange.year}-${dateRange.month}`,
                    GSI1SK: `INVOICE#${invoice.number || index}`
                }
            }
        });
    });
    
    // Store transactions
    transactions.forEach(transaction => {
        items.push({
            PutRequest: {
                Item: {
                    PK: `TRANSACTION#${transaction.id}`,
                    SK: `${dateRange.year}-${dateRange.month}`,
                    type: 'transaction',
                    data: transaction,
                    GSI1PK: `MONTH#${dateRange.year}-${dateRange.month}`,
                    GSI1SK: `TRANSACTION#${transaction.id}`
                }
            }
        });
    });
    
    // Batch write to DynamoDB
    if (items.length > 0) {
        const chunks = chunkArray(items, 25);
        for (const chunk of chunks) {
            await dynamodb.batchWrite({
                RequestItems: {
                    [process.env.DYNAMODB_TABLE]: chunk
                }
            }).promise();
        }
    }
}

async function performMatching(invoices, transactions) {
    const matches = [];
    const unmatchedInvoices = [...invoices];
    const unmatchedTransactions = [...transactions];
    
    // Simple exact matching for testing
    for (const transaction of transactions) {
        const invoiceNumber = extractInvoiceNumber(transaction.description);
        
        if (invoiceNumber) {
            const matchingInvoice = invoices.find(inv => inv.number === invoiceNumber);
            
            if (matchingInvoice && Math.abs(matchingInvoice.amount - transaction.amount) < 0.01) {
                matches.push({
                    invoice: matchingInvoice,
                    transaction: transaction,
                    confidence: 100,
                    matchType: 'exact'
                });
                
                // Remove from unmatched arrays
                const invIndex = unmatchedInvoices.findIndex(inv => inv.number === matchingInvoice.number);
                const transIndex = unmatchedTransactions.findIndex(trans => trans.id === transaction.id);
                
                if (invIndex > -1) unmatchedInvoices.splice(invIndex, 1);
                if (transIndex > -1) unmatchedTransactions.splice(transIndex, 1);
            }
        }
    }
    
    return {
        exactMatches: matches,
        uncertainMatches: [],
        unmatchedInvoices: unmatchedInvoices,
        unmatchedTransactions: unmatchedTransactions,
        summary: {
            totalInvoices: invoices.length,
            totalTransactions: transactions.length,
            exactMatches: matches.length,
            uncertainMatches: 0,
            unmatchedInvoices: unmatchedInvoices.length,
            unmatchedTransactions: unmatchedTransactions.length
        }
    };
}

function extractInvoiceNumber(text) {
    if (!text) return null;
    
    const regex = /E-(NNTCH|FRDLT)-(\\d{4})-(\\d+)/i;
    const match = text.match(regex);
    
    return match ? match[0] : null;
}

async function sendErrorNotification(error) {
    try {
        await ses.sendEmail({
            Destination: {
                ToAddresses: ['szamlazas@nanotech.co.hu']
            },
            Message: {
                Body: {
                    Text: {
                        Data: `Error in invoice matching: ${error.message}\\n\\nStack: ${error.stack}`
                    }
                },
                Subject: {
                    Data: 'HIBA: Invoice Matching Failed'
                }
            },
            Source: 'szamlazas@nanotech.co.hu'
        }).promise();
    } catch (emailError) {
        console.error('Failed to send error notification:', emailError);
    }
}

function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}