const cds = require('@sap/cds');
const { register, login } = require('./lib/auth-handlers');
const {
    myApplicationStatus, submitApplication, myApplicationDetails, reapplyApplication
} = require('./lib/application-handlers');
const { decideApplication, analyzeApplication } = require('./lib/decision-handlers');

module.exports = cds.service.impl(async function () {
    this.on('register', register);
    this.on('login', login);
    this.on('myApplicationStatus', myApplicationStatus);
    this.on('submitApplication', submitApplication);
    this.on('myApplicationDetails', myApplicationDetails);
    this.on('reapplyApplication', reapplyApplication);
    this.on('decideApplication', decideApplication);
    this.on('analyzeApplication', analyzeApplication);
});
