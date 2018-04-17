const AmqpWrapper = require('amqp-wrapper');

const rabbitURL = 'amqp://guest:guest@localhost';
const rabbitExchange = 'RIW';

/**
 * @name RabbitCallback
 * @type {Function}
 * @param {Object} result
 * @param {Object} error
 */

/**
 * @name MessageHandler
 * @type {Function}
 * @param {Object} message
 * @param {RabbitCallback} cb
 */

/**
 * @name MyRabbitWrapper
 * @type {Object}
 * @property {function(Object, function(Object, Object))|null} sendMessage
 * @property {function()} close
 * @property {function()} closeConsumer
 * @property {function()} closePublisher
 */

/**
 * @typedef {Object} MyRabbitParams
 * @property from {string|null}
 * @property to {string|null}
 * @property prefetchCount {number|undefined}
 * @property messageHandler {function(Object, function(Object, Object))}
 */

/**
 * @async
 * @param params {MyRabbitParams}
 * @return {Promise<MyRabbitWrapper>}
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
            prefetchCount: params.prefetchCount === undefined ? 1 : params.prefetchCount
        });
        
        await amqpC.connect();
        setTimeout(() => amqpC.consume(params.messageHandler), 0);
    }
    
    const defaultSendCb = (err) => {
        if (err) {
            console.error(err);
        }
    };
    
    const closeConsumer = () => new Promise((resolve, reject) => {
        if (amqpC) {
            console.log('closing consumer...');
            amqpC.close((errC) => {
                console.log('closed consumer');
                if (errC) {
                    console.error(errC);
                }
                return resolve();
            });
            return amqpC = null;
        }
        return resolve();
    });
    
    const closePublisher = () => new Promise((resolve, reject) => {
        if (amqpP) {
            console.log('closing publisher...');
            amqpP.close((errP) => {
                console.log('closed publisher');
                if (errP) {
                    console.error(errP);
                }
                return resolve();
            });
            return amqpP = null;
        }
        return resolve();
    });
    
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
            
        },
        close: async () => {
            await closeConsumer();
            await closePublisher();
        },
        closeConsumer,
        closePublisher
    };
}

module.exports = RabbitWrapper;
