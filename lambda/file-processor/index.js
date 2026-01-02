import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const s3Client = new S3Client({ region: 'eu-west-1' });
const lambdaClient = new LambdaClient({ region: 'eu-west-1' });

const BUCKET_NAME = 'nntech-invoice-matcher-reports-00b6f5fd';

export const handler = async (event) => {
    try {
        const { httpMethod, path, body, isBase64Encoded, headers } = event;
        
        if (httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            };
        }

        if (path === '/process-files' && httpMethod === 'POST') {
            return await handleFileUpload(body, isBase64Encoded, headers);
        }

        if (path === '/manual-run' && httpMethod === 'POST') {
            return await handleManualRun();
        }

        return {
            statusCode: 404,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Not found' })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function handleFileUpload(body, isBase64Encoded, headers) {
    try {
        const buffer = isBase64Encoded ? Buffer.from(body, 'base64') : Buffer.from(body);
        const boundary = extractBoundary(headers['content-type'] || headers['Content-Type']);
        
        if (!boundary) {
            throw new Error('No boundary found in content-type header');
        }
        
        const parts = parseMultipart(buffer, boundary);
        const uploadedFiles = {};
        
        for (const part of parts) {
            if (part.filename) {
                const fileType = part.name.replace('_file', '');
                const key = `uploads/${fileType}/${Date.now()}-${part.filename}`;
                
                await s3Client.send(new PutObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: key,
                    Body: part.data,
                    ContentType: part.contentType || 'application/octet-stream'
                }));
                
                uploadedFiles[fileType] = key;
            }
        }
        
        // Trigger main processor with uploaded files
        const invokeParams = {
            FunctionName: 'nntech-invoice-matcher-main-processor',
            Payload: JSON.stringify({
                source: 'file-upload',
                uploadedFiles
            })
        };
        
        await lambdaClient.send(new InvokeCommand(invokeParams));
        
        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ 
                success: true, 
                message: 'Files uploaded and processing started',
                files: uploadedFiles
            })
        };
        
    } catch (error) {
        console.error('File upload error:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: error.message })
        };
    }
}

async function handleManualRun() {
    try {
        const invokeParams = {
            FunctionName: 'nntech-invoice-matcher-main-processor',
            Payload: JSON.stringify({ source: 'manual-trigger' })
        };
        
        await lambdaClient.send(new InvokeCommand(invokeParams));
        
        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ success: true, message: 'Manual processing started' })
        };
        
    } catch (error) {
        console.error('Manual run error:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: error.message })
        };
    }
}

function extractBoundary(contentType) {
    if (!contentType) return null;
    const match = contentType.match(/boundary=([^;]+)/);
    return match ? match[1] : null;
}

function parseMultipart(buffer, boundary) {
    const parts = [];
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const endBoundaryBuffer = Buffer.from(`--${boundary}--`);
    
    let start = 0;
    let end = buffer.indexOf(boundaryBuffer, start);
    
    while (end !== -1) {
        if (start > 0) {
            const partBuffer = buffer.slice(start, end);
            const part = parsePart(partBuffer);
            if (part) parts.push(part);
        }
        
        start = end + boundaryBuffer.length;
        end = buffer.indexOf(boundaryBuffer, start);
        
        if (end === -1) {
            end = buffer.indexOf(endBoundaryBuffer, start);
            if (end !== -1) {
                const partBuffer = buffer.slice(start, end);
                const part = parsePart(partBuffer);
                if (part) parts.push(part);
            }
            break;
        }
    }
    
    return parts;
}

function parsePart(partBuffer) {
    const headerEnd = partBuffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) return null;
    
    const headerSection = partBuffer.slice(0, headerEnd).toString();
    const dataSection = partBuffer.slice(headerEnd + 4);
    
    const nameMatch = headerSection.match(/name="([^"]+)"/);
    const filenameMatch = headerSection.match(/filename="([^"]+)"/);
    const contentTypeMatch = headerSection.match(/Content-Type: ([^\r\n]+)/);
    
    if (!nameMatch) return null;
    
    return {
        name: nameMatch[1],
        filename: filenameMatch ? filenameMatch[1] : null,
        contentType: contentTypeMatch ? contentTypeMatch[1] : null,
        data: dataSection
    };
}