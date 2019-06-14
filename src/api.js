const Server = require('./server');
const Errors = require('./errors');

class Api {
    constructor(config) {
        this.server = new Server(config);
        this.init = this.server.init.bind(this.server);
        this.Errors = Errors;
    }
}


module.exports = Api;