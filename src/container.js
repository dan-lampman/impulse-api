class Container {
    constructor(services) {
        const self = this;
        this.registry = {};

        if (services) {
            for(let key in services) {
                self.register(key, services[key]);
            }
        }

        return this.registry;
    }

    register(name, service) {
        if (this.registry[name] !== null && this.registry[name] !== undefined) {
            throw new Error('Service already registered with name: ' + name);
        }
        this.registry[name] = service;
    }
}

module.exports = Container;
