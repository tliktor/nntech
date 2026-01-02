const https = require('https');
const querystring = require('querystring');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const path = event.path;
    
    try {
        let result = {};
        
        if (path === '/test-szamlazz') {
            result = { status: 'offline', invoices: [{ id: 'disabled', name: 'API Disabled', description: 'Szamlazz.hu API temporarily disabled' }] };
        } else if (path === '/test-wise') {
            result = { status: 'offline', data: [{ id: 'disabled', name: 'API Disabled', description: 'Using extracted documents' }] };
        } else if (path === '/test-mypos') {
            result = { status: 'offline', data: [{ id: 'disabled', name: 'API Disabled', description: 'Using extracted documents' }] };
        } else if (path === '/test-woocommerce') {
            result = await testWooCommerce();
        } else {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
        }

        return { statusCode: 200, headers, body: JSON.stringify(result) };
    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};

async function testWooCommerce() {
    const auth = Buffer.from('ck_1d6d7bdca307fd5d00a09bdf8b27382faf7af209:cs_37a31b114ce9c9be94cdc2d7593edf923b9b70d3').toString('base64');

    return new Promise((resolve) => {
        const options = {
            hostname: 'fordulat.com',
            port: 443,
            path: '/wp-json/wc/v3/products?per_page=5',
            method: 'GET',
            headers: { 'Authorization': `Basic ${auth}` }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const products = JSON.parse(data);
                        resolve({ 
                            status: 'online', 
                            data: products.map(p => ({
                                id: p.id,
                                name: p.name,
                                price: p.price,
                                status: p.status
                            }))
                        });
                    } catch (e) {
                        resolve({ status: 'error', error: 'JSON parse error' });
                    }
                } else {
                    resolve({ status: 'error', error: `HTTP ${res.statusCode}` });
                }
            });
        });

        req.on('error', (e) => resolve({ status: 'error', error: e.message }));
        req.end();
    });
}