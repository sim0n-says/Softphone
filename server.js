const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
require('dotenv').config();

const twilio = require('twilio');
// Initialiser le client Twilio seulement si les variables d'environnement sont définies
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
} else {
    console.warn('⚠️  Variables d\'environnement Twilio non définies. Créez un fichier .env avec vos identifiants Twilio.');
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configuration sécurité
app.use(helmet({
  contentSecurityPolicy: false // Désactiver la CSP par défaut de helmet
}));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite chaque IP à 100 requêtes par fenêtre
});
app.use(limiter);

// Servir les fichiers statiques
app.use(express.static('public'));

// Stockage des appels en cours
const activeCalls = new Map();
const callHistory = [];

// Routes API
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    activeCalls: activeCalls.size,
    totalCalls: callHistory.length,
    twilioConfigured: !!twilioClient
  });
});

// Route pour obtenir un token Twilio Client
app.post('/api/token', (req, res) => {
  console.log('🔧 Token request body:', req.body);
  const { identity } = req.body;
  console.log('🔧 Identity extracted:', identity);
  
  if (!identity) {
    return res.status(400).json({ error: 'Identity is required' });
  }

  // Forcer le chargement des variables d'environnement
  require('dotenv').config();
  
  console.log('🔧 TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID);
  console.log('🔧 TWILIO_API_KEY:', process.env.TWILIO_API_KEY);
  console.log('🔧 TWILIO_API_SECRET:', process.env.TWILIO_API_SECRET);

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return res.status(503).json({ error: 'Service Twilio non configuré. Veuillez configurer vos identifiants Twilio.' });
  }

  const AccessToken = require('twilio').jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  // Utiliser les bonnes variables d'environnement selon le tutoriel
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;

  console.log('🔧 Creating token with:', { accountSid, apiKey, apiSecret, identity });

  // Vérifier que toutes les variables sont définies
  if (!accountSid || !apiKey || !apiSecret) {
    console.error('❌ Variables manquantes:', { accountSid: !!accountSid, apiKey: !!apiKey, apiSecret: !!apiSecret });
    return res.status(500).json({ error: 'Configuration Twilio incomplète' });
  }

  // Syntaxe correcte pour Twilio v4.23.0
  const token = new AccessToken(accountSid, apiKey, apiSecret, { identity: identity });

  // Utiliser l'URL NGROK pour les webhooks Twilio
  const ngrokUrl = process.env.NGROK_URL || 'https://apt-buzzard-leading.ngrok-free.app';
  
  const grant = new VoiceGrant({
    // Pour Twilio.Device, utiliser le SID de l'application TwiML
    outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
    incomingAllow: true
  });

  token.addGrant(grant);

  res.json({
    token: token.toJwt(),
    identity: identity
  });
});

// Route pour passer un appel sortant
app.post('/api/call', async (req, res) => {
  try {
    const { to, from, identity } = req.body;
    
    if (!to || !from || !identity) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (!twilioClient) {
      return res.status(503).json({ error: 'Service Twilio non configuré. Veuillez configurer vos identifiants Twilio.' });
    }

    // Utiliser l'URL NGROK pour les webhooks Twilio
    const ngrokUrl = process.env.NGROK_URL || 'https://apt-buzzard-leading.ngrok-free.app';
    
    const call = await twilioClient.calls.create({
      url: `${ngrokUrl}/twiml/voice`,
      to: to,
      from: from,
      statusCallback: `${ngrokUrl}/api/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });

    const callData = {
      sid: call.sid,
      to: to,
      from: from,
      status: call.status,
      startTime: new Date(),
      identity: identity,
      direction: 'outbound'
    };

    activeCalls.set(call.sid, callData);
    callHistory.push(callData);

    res.json({ success: true, callSid: call.sid });
  } catch (error) {
    console.error('Erreur lors de l\'appel:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour terminer un appel
app.post('/api/hangup', async (req, res) => {
  try {
    const { callSid } = req.body;
    
    if (!callSid) {
      return res.status(400).json({ error: 'Call SID is required' });
    }

    if (!twilioClient) {
      return res.status(503).json({ error: 'Service Twilio non configuré. Veuillez configurer vos identifiants Twilio.' });
    }

    await twilioClient.calls(callSid).update({ status: 'completed' });
    
    const callData = activeCalls.get(callSid);
    if (callData) {
      callData.endTime = new Date();
      callData.duration = callData.endTime - callData.startTime;
      activeCalls.delete(callSid);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la fin d\'appel:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour obtenir l'historique des appels
app.get('/api/call-history', (req, res) => {
  res.json(callHistory);
});

// Callback pour les statuts d'appel
app.post('/api/call-status', (req, res) => {
  const { CallSid, CallStatus, CallDuration, From, To, Direction } = req.body;
  
  console.log('📞 Statut appel reçu:', { CallSid, CallStatus, From, To, Direction });
  
  const callData = activeCalls.get(CallSid);
  if (callData) {
    callData.status = CallStatus;
    
    if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
      callData.endTime = new Date();
      callData.duration = callData.endTime - callData.startTime;
      activeCalls.delete(CallSid);
    }
  } else if (Direction === 'inbound' && CallStatus === 'ringing') {
    // Créer un nouvel appel entrant
    const incomingCallData = {
      sid: CallSid,
      to: To,
      from: From,
      status: CallStatus,
      startTime: new Date(),
      direction: 'inbound'
    };
    
    activeCalls.set(CallSid, incomingCallData);
    callHistory.push(incomingCallData);
  }

  // Notifier les clients via Socket.IO
  io.emit('call-status-update', { 
    callSid: CallSid, 
    status: CallStatus, 
    from: From, 
    to: To, 
    direction: Direction 
  });
  
  res.sendStatus(200);
});

// TwiML pour les appels sortants
app.post('/twiml/voice', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Vérifier si c'est un appel entrant ou sortant
  const { To, From, Direction } = req.body;
  
  if (Direction === 'inbound') {
    // Appel entrant - connecter au client Twilio
    const dial = twiml.dial({ callerId: From });
    dial.client(process.env.TWILIO_CLIENT_IDENTITY || 'softphone-user');
  } else {
    // Appel sortant - message de bienvenue
    twiml.say('Bonjour, vous êtes connecté au softphone Twilio.');
    twiml.pause({ length: 1 });
    twiml.say('Votre appel est en cours.');
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Route pour gérer les appels entrants (webhook Twilio)
app.post('/handle_calls', (req, res) => {
  console.log('📞 Appel reçu:', req.body);
  
  const { To, From, Direction } = req.body;
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
  
  const response = new twilio.twiml.VoiceResponse();

  if (Direction === 'inbound') {
    // Appel entrant vers notre numéro Twilio
    console.log('📱 Appel entrant de', From);
    
    // Connecter l'appel entrant au client Twilio
    const dial = response.dial({ 
      callerId: From,
      timeout: 30,
      record: 'record-from-answer'
    });
    
    // Utiliser l'identité du client Twilio enregistrée
    const clientIdentity = currentClientIdentity || 'softphone-user';
    dial.client(clientIdentity);
    
    console.log('📱 Appel entrant connecté au client:', clientIdentity);
  } else {
    // Appel sortant - connecter directement au numéro
    console.log('📤 Appel sortant vers', To);
    const dial = response.dial({ callerId: twilioNumber });
    dial.number(To);
  }

  res.type('text/xml');
  res.send(response.toString());
});

// Route pour gérer les appels sortants via Twilio.Device
app.post('/twiml/outgoing', (req, res) => {
  console.log('📤 Appel sortant via Twilio.Device reçu:', req.body);
  
  const { To, From, CallSid } = req.body;
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
  
  console.log('📤 Paramètres:', { To, From, CallSid, twilioNumber });
  
  const response = new twilio.twiml.VoiceResponse();
  const dial = response.dial({ 
    callerId: twilioNumber,
    timeout: 30,
    record: 'record-from-answer'
  });
  dial.number(To);
  
  const twimlString = response.toString();
  console.log('📤 TwiML généré:', twimlString);
  
  res.type('text/xml');
  res.send(twimlString);
});

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
  console.log('🔌 Client connecté:', socket.id);
  
  // Envoyer l'état actuel au nouveau client
  socket.emit('active-calls', Array.from(activeCalls.values()));
  
  socket.on('disconnect', () => {
    console.log('🔌 Client déconnecté:', socket.id);
  });
  
  socket.on('new-call', (callData) => {
    io.emit('call-started', callData);
  });
  
  socket.on('call-ended', (callSid) => {
    io.emit('call-finished', callSid);
  });
  
  socket.on('incoming-call-accepted', (callSid) => {
    console.log('✅ Appel entrant accepté:', callSid);
    io.emit('incoming-call-accepted', callSid);
  });
  
  socket.on('incoming-call-rejected', (callSid) => {
    console.log('❌ Appel entrant rejeté:', callSid);
    io.emit('incoming-call-rejected', callSid);
  });
});

// Route principale
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Route pour obtenir la configuration par défaut
app.get('/api/config', (req, res) => {
  res.json({
    defaultPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '+18199754345',
    twilioConfigured: !!twilioClient
  });
});

// Variable globale pour stocker l'identité du client actuel
let currentClientIdentity = 'softphone-user'; // Identité par défaut

// Route pour enregistrer l'identité du client
app.post('/api/register-identity', (req, res) => {
  const { identity } = req.body;
  if (identity) {
    currentClientIdentity = identity;
    console.log('📱 Identité client enregistrée:', identity);
    res.json({ success: true, message: 'Identité enregistrée' });
  } else {
    res.status(400).json({ error: 'Identité requise' });
  }
});

// Endpoint pour transférer un appel
app.post('/api/transfer', async (req, res) => {
  try {
    const { callSid, to } = req.body;
    
    if (!callSid || !to) {
      return res.status(400).json({ error: 'CallSid et numéro de destination requis' });
    }
    
    // Utiliser l'API Twilio pour transférer l'appel
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    await client.calls(callSid)
      .update({
        twiml: `<Response><Dial>${to}</Dial></Response>`
      });
    
    res.json({ success: true, message: 'Appel transféré avec succès' });
  } catch (error) {
    console.error('Erreur lors du transfert:', error);
    res.status(500).json({ error: 'Erreur lors du transfert' });
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Softphone Twilio démarré sur le port ${PORT}`);
  console.log(`📞 Interface disponible sur: http://localhost:${PORT}`);
  console.log(`🔧 Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 Webhook URL: http://localhost:${PORT}/handle_calls`);
  
  if (!twilioClient) {
    console.log(`⚠️  Pour activer les appels, configurez vos variables d'environnement Twilio dans le fichier .env`);
  }
});

module.exports = app; 