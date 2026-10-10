// Genera las claves para los avisos push. Ejecútalo UNA vez: node mobile/vapid.js
// y copia las dos líneas en Railway → tu servicio → Variables.
const webpush = require('web-push');
const k = webpush.generateVAPIDKeys();
console.log('VAPID_PUBLIC_KEY=' + k.publicKey);
console.log('VAPID_PRIVATE_KEY=' + k.privateKey);
console.log('VAPID_SUBJECT=mailto:soporte.mdmtrading@gmail.com');
