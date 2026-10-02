const cds = require('@sap/cds');
const express = require('express');

cds.on('bootstrap', (app) => {
    app.use(express.json({ limit: '15mb' }));
});

module.exports = cds.server;