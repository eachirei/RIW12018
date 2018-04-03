const AmqpWrapper = require('amqp-wrapper');

const rabbitURL = 'amqp://guest:guest@localhost';
const rabbitExchange = 'RIW';

/**
 *
 * @param params {Object}
 * @param params.from {string|null}
 * @param params.to {string|null}
 * @param params.messageHandler {Function(message, cb)}
 */
async function RabbitWrapper(params) {
    let amqpC = null, amqpP = null;
    
    if (params.to) {
        amqpP = new AmqpWrapper({
            url: rabbitURL,
            exchange: rabbitExchange,
            queue: {
                name: params.to,
                routingKey: params.to
            }
        });
        
        await amqpP.connect();
    }
    
    if (params.from) {
        amqpC = new AmqpWrapper({
            url: rabbitURL,
            exchange: rabbitExchange,
            queue: {
                name: params.from
            },
            prefetchCount: 1
        });
        
        await amqpC.connect();
        setTimeout(() => amqpC.consume(params.messageHandler), 0);
    }
    
    const defaultSendCb = (err) => {
        if (err) {
            console.error(err);
        }
    };
    
    return {
        sendMessage: (msg, cb) => {
            if (!params.to || !amqpP) {
                return;
            }
            
            if (!msg) {
                return;//in case the module doesn't return, but only sends events
            }
        
            if (!cb) {
                cb = defaultSendCb;
            }
        
            amqpP.publish(params.to, JSON.stringify(msg), {persistent: true}, cb);
            
        }
    };
}

module.exports = RabbitWrapper;
