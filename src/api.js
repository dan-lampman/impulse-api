const Server = require('./server');
const Errors = require('./errors');
const Auth = require('./auth');

class Api {
    constructor(config) {
        this.server = new Server(config);
        this.init = this.server.init.bind(this.server);
    }
}

Api.Errors = Errors;
Api.Auth = Auth;

module.exports = Api;