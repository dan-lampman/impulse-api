exports.xmlData = {
    name: 'xmlData',
    description: 'this route parses xml data',
    method: 'post',
    endpoint: '/xml',
    version: 'v1',
    inputs: {
        films: {}
    },
    run: (services, inputs, next) => {
        next(inputs);
    }
}