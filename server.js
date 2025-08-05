const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

// Système de logging des appels
const CALL_LOG_FILE = path.join(__dirname, 'data', 'call_log.json');
const EXCHANGE_DB_FILE = path.join(__dirname, 'data', 'exchange.db.json');

// Système de gestion des SMS/MMS
const SMS_LOG_FILE = path.join(__dirname, 'data', 'sms_log.json');
const MMS_LOG_FILE = path.join(__dirname, 'data', 'mms_log.json');
const MESSAGES_FOLDER = path.join(__dirname, 'data', 'messages');

// Configuration multer pour l'upload de fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.mimetype === 'text/vcard') {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non supporté. Utilisez JSON ou vCard.'), false);
    }
  }
});

// Configuration multer pour les fichiers MMS
const mmsUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, MESSAGES_FOLDER);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      cb(null, `mms_${timestamp}_${randomId}_${file.originalname}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max pour les MMS
  },
  fileFilter: (req, file, cb) => {
    // Accepter les images, vidéos, audios et documents
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
      'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
      'application/pdf', 'text/plain', 'application/msword'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté pour MMS.'), false);
    }
  }
});

// Créer les dossiers nécessaires
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(MESSAGES_FOLDER)) {
  fs.mkdirSync(MESSAGES_FOLDER, { recursive: true });
}

// Fonction pour charger les logs existants
function loadCallLogs() {
  try {
    if (fs.existsSync(CALL_LOG_FILE)) {
      const data = fs.readFileSync(CALL_LOG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement des logs:', error);
  }
  return [];
}

// Fonction pour sauvegarder les logs
function saveCallLogs(logs) {
  try {
    fs.writeFileSync(CALL_LOG_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde des logs:', error);
  }
}

// Fonction pour ajouter un log d'appel
function addCallLog(callData) {
  const logs = loadCallLogs();
  const logEntry = {
    id: callData.sid || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    direction: callData.direction || 'unknown',
    from: callData.from || 'unknown',
    to: callData.to || 'unknown',
    status: callData.status || 'unknown',
    duration: callData.duration || 0,
    startTime: callData.startTime ? new Date(callData.startTime).toISOString() : new Date().toISOString(),
    endTime: callData.endTime ? new Date(callData.endTime).toISOString() : null,
    clientIdentity: callData.clientIdentity || 'unknown'
  };
  
  logs.unshift(logEntry); // Ajouter au début
  
  // Garder seulement les 1000 derniers appels
  if (logs.length > 1000) {
    logs.splice(1000);
  }
  
  saveCallLogs(logs);
  
  // Notifier les clients via Socket.IO
  io.emit('call-log-updated', { logs });
  
  return logEntry;
}

// Fonction pour obtenir les statistiques des appels
function getCallStatistics() {
  const logs = loadCallLogs();
  const stats = {
    total: logs.length,
    inbound: logs.filter(log => log.direction === 'inbound').length,
    outbound: logs.filter(log => log.direction === 'outbound').length,
    completed: logs.filter(log => log.status === 'completed').length,
    failed: logs.filter(log => log.status === 'failed').length,
    missed: logs.filter(log => log.status === 'no-answer').length,
    totalDuration: logs.reduce((sum, log) => sum + (log.duration || 0), 0),
    averageDuration: 0
  };
  
  const completedCalls = logs.filter(log => log.duration > 0);
  if (completedCalls.length > 0) {
    stats.averageDuration = Math.round(stats.totalDuration / completedCalls.length / 1000); // en secondes
  }
  
  return stats;
}

const twilio = require('twilio');
// Initialiser le client Twilio seulement si les variables d'environnement sont définies
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
} else {
    console.warn('⚠️  Variables d\'environnement Twilio non définies. Créez un fichier .env avec vos identifiants Twilio.');
}

// Fonction pour charger les contacts depuis le fichier JSON
function loadContacts() {
  try {
    const contactsFile = path.join(__dirname, 'data', 'contacts.json');
    if (fs.existsSync(contactsFile)) {
      const data = fs.readFileSync(contactsFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement des contacts:', error);
  }
  return [];
}

// Fonction pour sauvegarder les contacts
function saveContacts(contacts) {
  try {
    const contactsFile = path.join(__dirname, 'data', 'contacts.json');
    fs.writeFileSync(contactsFile, JSON.stringify(contacts, null, 2), 'utf8');
    console.log(`✅ ${contacts.length} contacts sauvegardés`);
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde des contacts:', error);
    throw error;
  }
}

// === FONCTIONS SMS/MMS ===

// Fonction pour charger les SMS
function loadSMSLogs() {
  try {
    if (fs.existsSync(SMS_LOG_FILE)) {
      const data = fs.readFileSync(SMS_LOG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement des SMS:', error);
  }
  return [];
}

// Fonction pour sauvegarder les SMS
function saveSMSLogs(smsLogs) {
  try {
    fs.writeFileSync(SMS_LOG_FILE, JSON.stringify(smsLogs, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde des SMS:', error);
  }
}

// Fonction pour ajouter un SMS
function addSMSLog(smsData) {
  const logs = loadSMSLogs();
  const logEntry = {
    id: smsData.sid || `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    direction: smsData.direction || 'unknown',
    from: smsData.from || 'unknown',
    to: smsData.to || 'unknown',
    body: smsData.body || '',
    status: smsData.status || 'unknown',
    clientIdentity: smsData.clientIdentity || 'unknown'
  };
  
  logs.unshift(logEntry); // Ajouter au début
  
  // Garder seulement les 1000 derniers SMS
  if (logs.length > 1000) {
    logs.splice(1000);
  }
  
  saveSMSLogs(logs);
  
  // Notifier les clients via Socket.IO
  io.emit('sms-log-updated', { logs });
  
  return logEntry;
}

// Fonction pour charger les MMS
function loadMMSLogs() {
  try {
    if (fs.existsSync(MMS_LOG_FILE)) {
      const data = fs.readFileSync(MMS_LOG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement des MMS:', error);
  }
  return [];
}

// Fonction pour sauvegarder les MMS
function saveMMSLogs(mmsLogs) {
  try {
    fs.writeFileSync(MMS_LOG_FILE, JSON.stringify(mmsLogs, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde des MMS:', error);
  }
}

// Fonction pour ajouter un MMS
function addMMSLog(mmsData) {
  const logs = loadMMSLogs();
  const logEntry = {
    id: mmsData.sid || `mms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    direction: mmsData.direction || 'unknown',
    from: mmsData.from || 'unknown',
    to: mmsData.to || 'unknown',
    body: mmsData.body || '',
    mediaUrl: mmsData.mediaUrl || '',
    mediaType: mmsData.mediaType || '',
    fileName: mmsData.fileName || '',
    status: mmsData.status || 'unknown',
    clientIdentity: mmsData.clientIdentity || 'unknown'
  };
  
  logs.unshift(logEntry); // Ajouter au début
  
  // Garder seulement les 500 derniers MMS (plus volumineux)
  if (logs.length > 500) {
    logs.splice(500);
  }
  
  saveMMSLogs(logs);
  
  // Notifier les clients via Socket.IO
  io.emit('mms-log-updated', { logs });
  
  return logEntry;
}

// Fonction pour obtenir les statistiques des messages
function getMessageStatistics() {
  const smsLogs = loadSMSLogs();
  const mmsLogs = loadMMSLogs();
  
  const stats = {
    sms: {
      total: smsLogs.length,
      inbound: smsLogs.filter(log => log.direction === 'inbound').length,
      outbound: smsLogs.filter(log => log.direction === 'outbound').length,
      delivered: smsLogs.filter(log => log.status === 'delivered').length,
      failed: smsLogs.filter(log => log.status === 'failed').length
    },
    mms: {
      total: mmsLogs.length,
      inbound: mmsLogs.filter(log => log.direction === 'inbound').length,
      outbound: mmsLogs.filter(log => log.direction === 'outbound').length,
      delivered: mmsLogs.filter(log => log.status === 'delivered').length,
      failed: mmsLogs.filter(log => log.status === 'failed').length
    }
  };
  
  return stats;
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

// Route pour obtenir les logs d'appels
app.get('/api/call-logs', (req, res) => {
  try {
    const logs = loadCallLogs();
    const stats = getCallStatistics();
    res.json({
      logs: logs,
      statistics: stats,
      total: logs.length
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des logs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des logs' });
  }
});

// Route pour obtenir les statistiques des appels
app.get('/api/call-stats', (req, res) => {
  try {
    const stats = getCallStatistics();
    res.json(stats);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// Route pour effacer les logs d'appels
app.delete('/api/call-logs', (req, res) => {
  try {
    saveCallLogs([]);
    io.emit('call-log-updated', { logs: [] });
    res.json({ success: true, message: 'Logs effacés avec succès' });
  } catch (error) {
    console.error('❌ Erreur lors de l\'effacement des logs:', error);
    res.status(500).json({ error: 'Erreur lors de l\'effacement des logs' });
  }
});



// Route pour obtenir les contacts du carnet d'adresses
app.get('/api/contacts', (req, res) => {
  try {
    const contacts = loadContacts();
    res.json(contacts);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des contacts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des contacts' });
  }
});

// Route pour ajouter un contact
app.post('/api/contacts', (req, res) => {
  try {
    const { nom, prenom, telephone, titre, organisation, email } = req.body;
    
    if (!nom || !telephone) {
      return res.status(400).json({ error: 'Nom et téléphone sont requis' });
    }
    
    const contacts = loadContacts();
    const newContact = {
      nom: nom,
      prenom: prenom || '',
      telephone: telephone,
      titre: titre || '',
      organisation: organisation || '',
      email: email || '',
      nom_complet: `${prenom || ''} ${nom}`.trim(),
      date_ajout: new Date().toISOString()
    };
    
    contacts.push(newContact);
    saveContacts(contacts);
    
    res.json({ success: true, contact: newContact });
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout du contact:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du contact' });
  }
});

// Route pour supprimer un contact
app.delete('/api/contacts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const contacts = loadContacts();
    
    const contactIndex = contacts.findIndex(c => 
      c.telephone === id || c.nom_complet === id
    );
    
    if (contactIndex === -1) {
      return res.status(404).json({ error: 'Contact non trouvé' });
    }
    
    const removedContact = contacts.splice(contactIndex, 1)[0];
    saveContacts(contacts);
    
    res.json({ success: true, contact: removedContact });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du contact:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du contact' });
  }
});

// Route pour importer des contacts depuis un fichier JSON
app.post('/api/contacts/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    
    const fileContent = req.file.buffer.toString();
    const data = JSON.parse(fileContent);
    
    let contactsToImport = [];
    
    // Gérer différents formats de fichiers
    if (data.employees) {
      // Format du fichier data_complete.json
      contactsToImport = data.employees.map(emp => ({
        nom: emp.nom,
        prenom: emp.prenom,
        telephone: emp.telephone,
        titre: emp.titre,
        organisation: emp.organisation,
        nom_complet: emp.nom_complet,
        date_ajout: new Date().toISOString()
      }));
    } else if (Array.isArray(data)) {
      // Format tableau simple
      contactsToImport = data;
    } else {
      return res.status(400).json({ error: 'Format de fichier non supporté' });
    }
    
    const currentContacts = loadContacts();
    const newContacts = [...currentContacts, ...contactsToImport];
    saveContacts(newContacts);
    
    res.json({ 
      success: true, 
      imported: contactsToImport.length,
      total: newContacts.length
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'import:', error);
    res.status(500).json({ error: 'Erreur lors de l\'import des contacts' });
  }
});

// Route pour exporter les contacts
app.get('/api/contacts/export', (req, res) => {
  try {
    const contacts = loadContacts();
    const format = req.query.format || 'json';
    
    if (format === 'vcard') {
      const vcardContent = contacts.map(contact => {
        return `BEGIN:VCARD
VERSION:3.0
FN:${contact.nom_complet}
N:${contact.nom};${contact.prenom};;;
TEL:${contact.telephone}
ORG:${contact.organisation}
TITLE:${contact.titre}
EMAIL:${contact.email || ''}
END:VCARD`;
      }).join('\n\n');
      
      res.setHeader('Content-Type', 'text/vcard');
      res.setHeader('Content-Disposition', 'attachment; filename=contacts.vcf');
      res.send(vcardContent);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=contacts.json');
      res.json(contacts);
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'export:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export des contacts' });
  }
});

// Route pour vider tous les contacts
app.delete('/api/contacts', (req, res) => {
  try {
    saveContacts([]);
    res.json({ success: true, message: 'Tous les contacts ont été supprimés' });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de tous les contacts:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression des contacts' });
  }
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
      direction: 'outbound',
      clientIdentity: identity
    };

    activeCalls.set(call.sid, callData);
    callHistory.push(callData);
    
    // Ajouter au log des appels
    addCallLog(callData);

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

// === ROUTES SMS/MMS ===

// Route pour obtenir les logs SMS
app.get('/api/sms-logs', (req, res) => {
  try {
    const logs = loadSMSLogs();
    const stats = getMessageStatistics();
    res.json({
      logs: logs,
      statistics: stats.sms,
      total: logs.length
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des SMS:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des SMS' });
  }
});

// Route pour obtenir les logs MMS
app.get('/api/mms-logs', (req, res) => {
  try {
    const logs = loadMMSLogs();
    const stats = getMessageStatistics();
    res.json({
      logs: logs,
      statistics: stats.mms,
      total: logs.length
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des MMS:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des MMS' });
  }
});

// Route pour envoyer un SMS
app.post('/api/send-sms', async (req, res) => {
  try {
    const { to, body, from } = req.body;
    
    if (!to || !body) {
      return res.status(400).json({ error: 'Numéro de destination et message requis' });
    }
    
    if (!twilioClient) {
      return res.status(500).json({ error: 'Client Twilio non configuré' });
    }
    
    const message = await twilioClient.messages.create({
      body: body,
      from: from || process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
    
    // Ajouter au log
    const smsData = {
      sid: message.sid,
      direction: 'outbound',
      from: from || process.env.TWILIO_PHONE_NUMBER,
      to: to,
      body: body,
      status: message.status,
      clientIdentity: currentClientIdentity || 'softphone-user'
    };
    
    addSMSLog(smsData);
    
    res.json({ 
      success: true, 
      message: 'SMS envoyé avec succès',
      sid: message.sid,
      status: message.status
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du SMS:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du SMS' });
  }
});

// Route pour envoyer un MMS
app.post('/api/send-mms', mmsUpload.single('media'), async (req, res) => {
  try {
    const { to, body, from } = req.body;
    const mediaFile = req.file;
    
    if (!to || !mediaFile) {
      return res.status(400).json({ error: 'Numéro de destination et fichier média requis' });
    }
    
    if (!twilioClient) {
      return res.status(500).json({ error: 'Client Twilio non configuré' });
    }
    
    // Construire l'URL du média
    const mediaUrl = `${req.protocol}://${req.get('host')}/api/media/${mediaFile.filename}`;
    
    const message = await twilioClient.messages.create({
      body: body || '',
      from: from || process.env.TWILIO_PHONE_NUMBER,
      to: to,
      mediaUrl: [mediaUrl]
    });
    
    // Ajouter au log
    const mmsData = {
      sid: message.sid,
      direction: 'outbound',
      from: from || process.env.TWILIO_PHONE_NUMBER,
      to: to,
      body: body || '',
      mediaUrl: mediaUrl,
      mediaType: mediaFile.mimetype,
      fileName: mediaFile.originalname,
      status: message.status,
      clientIdentity: currentClientIdentity || 'softphone-user'
    };
    
    addMMSLog(mmsData);
    
    res.json({ 
      success: true, 
      message: 'MMS envoyé avec succès',
      sid: message.sid,
      status: message.status,
      mediaUrl: mediaUrl
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du MMS:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du MMS' });
  }
});

// Route pour servir les fichiers média
app.get('/api/media/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(MESSAGES_FOLDER, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Fichier non trouvé' });
  }
});

// Route pour effacer les logs SMS
app.delete('/api/sms-logs', (req, res) => {
  try {
    saveSMSLogs([]);
    io.emit('sms-log-updated', { logs: [] });
    res.json({ success: true, message: 'Logs SMS effacés avec succès' });
  } catch (error) {
    console.error('❌ Erreur lors de l\'effacement des logs SMS:', error);
    res.status(500).json({ error: 'Erreur lors de l\'effacement des logs SMS' });
  }
});

// Route pour effacer les logs MMS
app.delete('/api/mms-logs', (req, res) => {
  try {
    saveMMSLogs([]);
    io.emit('mms-log-updated', { logs: [] });
    res.json({ success: true, message: 'Logs MMS effacés avec succès' });
  } catch (error) {
    console.error('❌ Erreur lors de l\'effacement des logs MMS:', error);
    res.status(500).json({ error: 'Erreur lors de l\'effacement des logs MMS' });
  }
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
      
      // Mettre à jour le log avec les informations finales
      addCallLog(callData);
      
      // Émettre la mise à jour des logs via Socket.IO
      const logs = loadCallLogs();
      const stats = getCallStatistics();
      io.emit('call-log-updated', { logs, statistics: stats });
    }
  } else if (Direction === 'inbound' && CallStatus === 'ringing') {
    // Créer un nouvel appel entrant
    const incomingCallData = {
      sid: CallSid,
      to: To,
      from: From,
      status: CallStatus,
      startTime: new Date(),
      direction: 'inbound',
      clientIdentity: currentClientIdentity || 'softphone-user'
    };
    
    activeCalls.set(CallSid, incomingCallData);
    callHistory.push(incomingCallData);
    
    // Ajouter au log des appels
    addCallLog(incomingCallData);
    
    // Émettre la mise à jour des logs via Socket.IO
    const logs = loadCallLogs();
    const stats = getCallStatistics();
    io.emit('call-log-updated', { logs, statistics: stats });
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
  
  const { To, From, Direction, CallSid } = req.body;
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
  
  const response = new twilio.twiml.VoiceResponse();

  if (Direction === 'inbound') {
    // Appel entrant vers notre numéro Twilio
    console.log('📱 Appel entrant de', From);
    
    // Créer un log d'appel entrant
    const callData = {
      sid: CallSid,
      to: To,
      from: From,
      status: 'ringing',
      startTime: new Date(),
      direction: 'inbound',
      clientIdentity: 'softphone-user'
    };
    
    activeCalls.set(CallSid, callData);
    callHistory.push(callData);
    
    // Ajouter au log des appels
    addCallLog(callData);
    
    // Connecter l'appel entrant au client Twilio
    const dial = response.dial({ 
      callerId: From,
      timeout: 30,
      record: 'record-from-answer',
      statusCallback: `${process.env.NGROK_URL || 'https://apt-buzzard-leading.ngrok-free.app'}/api/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed', 'failed', 'busy', 'no-answer'],
      statusCallbackMethod: 'POST'
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

// === WEBHOOKS SMS/MMS ===

// Webhook pour les SMS entrants
app.post('/handle_sms', (req, res) => {
  console.log('📱 SMS reçu:', req.body);
  console.log('📱 Headers:', req.headers);
  
  const { To, From, Body, MessageSid, MessageStatus } = req.body;
  
  console.log('📱 Données extraites:', { To, From, Body, MessageSid, MessageStatus });
  
  // Ajouter au log des SMS
  const smsData = {
    sid: MessageSid || `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    direction: 'inbound',
    from: From,
    to: To,
    body: Body,
    status: MessageStatus || 'received',
    clientIdentity: 'softphone-user'
  };
  
  console.log('📱 SMS data à sauvegarder:', smsData);
  
  addSMSLog(smsData);
  
  // Notifier les clients via Socket.IO
  io.emit('incoming-sms', smsData);
  
  console.log('📱 SMS traité et notifié aux clients');
  
  // Répondre avec un TwiML vide (pas de réponse automatique)
  const twiml = new twilio.twiml.MessagingResponse();
  res.type('text/xml');
  res.send(twiml.toString());
});

// Webhook pour les MMS entrants
app.post('/handle_mms', (req, res) => {
  console.log('📷 MMS reçu:', req.body);
  
  const { To, From, Body, MessageSid, MessageStatus, NumMedia, MediaUrl0, MediaContentType0 } = req.body;
  
  // Ajouter au log des MMS
  const mmsData = {
    sid: MessageSid,
    direction: 'inbound',
    from: From,
    to: To,
    body: Body || '',
    mediaUrl: MediaUrl0 || '',
    mediaType: MediaContentType0 || '',
    fileName: `mms_${MessageSid}`,
    status: MessageStatus || 'received',
    clientIdentity: 'softphone-user'
  };
  
  addMMSLog(mmsData);
  
  // Notifier les clients via Socket.IO
  io.emit('incoming-mms', mmsData);
  
  // Répondre avec un TwiML vide (pas de réponse automatique)
  const twiml = new twilio.twiml.MessagingResponse();
  res.type('text/xml');
  res.send(twiml.toString());
});

// Webhook pour les statuts de messages
app.post('/message-status', (req, res) => {
  console.log('📊 Statut message reçu:', req.body);
  
  const { MessageSid, MessageStatus, To, From } = req.body;
  
  // Mettre à jour le statut dans les logs
  const smsLogs = loadSMSLogs();
  const mmsLogs = loadMMSLogs();
  
  // Chercher dans les SMS
  const smsIndex = smsLogs.findIndex(log => log.id === MessageSid);
  if (smsIndex !== -1) {
    smsLogs[smsIndex].status = MessageStatus;
    saveSMSLogs(smsLogs);
    io.emit('sms-status-update', { messageSid: MessageSid, status: MessageStatus });
  }
  
  // Chercher dans les MMS
  const mmsIndex = mmsLogs.findIndex(log => log.id === MessageSid);
  if (mmsIndex !== -1) {
    mmsLogs[mmsIndex].status = MessageStatus;
    saveMMSLogs(mmsLogs);
    io.emit('mms-status-update', { messageSid: MessageSid, status: MessageStatus });
  }
  
  res.sendStatus(200);
});

// Route pour gérer les appels sortants via Twilio.Device
app.post('/twiml/outgoing', (req, res) => {
  console.log('📤 Appel sortant via Twilio.Device reçu:', req.body);
  
  const { To, From, CallSid } = req.body;
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
  
  console.log('📤 Paramètres:', { To, From, CallSid, twilioNumber });
  
  // Créer un log d'appel sortant
  const callData = {
    sid: CallSid,
    to: To,
    from: twilioNumber,
    status: 'initiated',
    startTime: new Date(),
    direction: 'outbound',
    clientIdentity: 'softphone-user'
  };
  
  activeCalls.set(CallSid, callData);
  callHistory.push(callData);
  
  // Ajouter au log des appels
  addCallLog(callData);
  
  const response = new twilio.twiml.VoiceResponse();
  const dial = response.dial({ 
    callerId: twilioNumber,
    timeout: 30,
    record: 'record-from-answer',
    statusCallback: `${process.env.NGROK_URL || 'https://apt-buzzard-leading.ngrok-free.app'}/api/call-status`,
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed', 'failed', 'busy', 'no-answer'],
    statusCallbackMethod: 'POST'
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
    twilioConfigured: !!twilioClient,
    webhooks: {
      calls: `${process.env.NGROK_URL || 'https://apt-buzzard-leading.ngrok-free.app'}/handle_calls`,
      sms: `${process.env.NGROK_URL || 'https://apt-buzzard-leading.ngrok-free.app'}/handle_sms`,
      mms: `${process.env.NGROK_URL || 'https://apt-buzzard-leading.ngrok-free.app'}/handle_mms`,
      status: `${process.env.NGROK_URL || 'https://apt-buzzard-leading.ngrok-free.app'}/message-status`
    }
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

const PORT = process.env.PORT || 3001;

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