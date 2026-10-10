const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Enlaces escritos sin https:// (href="mdmtrading.net/m") el navegador los pega detrás de la
// página actual: /mdmtrading.net/m/ . Se redirigen a la dirección buena.
app.get(/^\/(?:.*\/)?(?:www\.)?mdmtrading\.net(\/.*)?$/i, (req, res) => {
  res.redirect(301, req.params[0] || '/');
});

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`MDM Trading corriendo en puerto ${PORT}`);
});

// MDM móvil: web app en /m/ y puente con NinjaTrader en /m/ws
require('./mdm-movil/mobile')(app, server);
