const { VertexAI } = require('@google-cloud/vertexai');
const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
const sanitized = serviceAccountStr.trim().replace(/^['"]|['"]$/g, '');
const cert = sanitized.startsWith('{') ? JSON.parse(sanitized) : JSON.parse(Buffer.from(sanitized, 'base64').toString());
if (cert.private_key) cert.private_key = cert.private_key.replace(/\\n/g, '\n');
const location = process.env.GCP_LOCATION || 'us-central1';
const vertexAIInstance = new VertexAI({ project: cert.project_id, location: location, apiEndpoint: location === 'global' ? 'aiplatform.googleapis.com' : undefined, googleAuthOptions: { credentials: { client_email: cert.client_email, private_key: cert.private_key } } });
const model = vertexAIInstance.getGenerativeModel({ model: process.env.GEMINI_MODEL });
model.generateContent('Say Vertex is working!').then(res => console.log('SUCCESS:', res.response.text())).catch(err => { console.error('ERROR:', err.message || err); });
