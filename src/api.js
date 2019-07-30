const Server = require('./server');
const Errors = require('./errors');
const JSONWebToken = require('jsonwebtoken');

class Api {
    constructor(config) {
        this.server = new Server(config);
        this.init = this.server.init.bind(this.server);
    }
}

Api.Errors = Errors;
Api.Auth = JSONWebToken;

module.exports = Api;