const RawIPC = require('node-ipc').IPC;


/**
 *
 * @param params {Object}
 * @param params.from {string|null}
 * @param params.current {string}
 * @param params.to {string|null}
 * @param params.messageHandler {function}
 */
function IpcWrapper(params) {
    let connected = false;
    const queue = [];
    const ipcSender = new RawIPC;
    const sndId = `${params.to}_receiver`;
    let isOkToSend = true;
    
    this.sendEvent = (msg) => {
        if (!params.to) {
            return;
        }
        
        if (!msg) {
            return;//in case the module doesn't return, but only sends events
        }
        
        if (!connected) {
            return queue.push(msg);
        }
        
        try {
            ipcSender.of[sndId].emit('message', msg);
        } catch (err) {
            queue.push(msg);
        }
    };
    
    if (params.from) {
        // if there is a from property, we should create a server to listen for incoming connections
        const ipcReceiver = new RawIPC;
        
        ipcReceiver.config.id = `${params.current}_receiver`;
        ipcReceiver.config.retry = 1500;
        ipcReceiver.config.silent = true;
        
        ipcReceiver.serve(() => {
                ipcReceiver.server.on('message', async (data, socket) => {
                        // ipcReceiver.log('got a message : '.debug, data);
                        // let intervalId = setInterval(async () => {
                        //     if (isOkToSend !== false) {
                        //         clearInterval(intervalId);
                        //         isOkToSend = false;
                        this.sendEvent(await params.messageHandler(data));//to handle result
                        // isOkToSend = true;
                        // }
                        // }, 100);
                    }
                );
                ipcReceiver.server.on('socket.disconnected', (socket, destroyedSocketID) => {
                        // ipcReceiver.log('client ' + destroyedSocketID + ' has disconnected!');
                    }
                );
            }
        );
        
        ipcReceiver.server.start();
    }
    
    if (params.to) {
        // if there is a to property, we should create a client to send the results
        
        ipcSender.config.id = `${params.current}_sender`;
        ipcSender.config.retry = 1500;
        ipcSender.config.silent = true;
        
        ipcSender.connectTo(sndId, () => {
                ipcSender.of[sndId].on('connect', () => {
                        // ipcSender.log(`## connected to ${params.to} ##`.rainbow, ipcSender.config.delay);
                        connected = true;
                        while (queue.length) {
                            this.sendEvent(queue.pop());
                        }
                    }
                );
                ipcSender.of[sndId].on('disconnect', () => {
                        // ipcSender.log(`disconnected from ${params.to}`.notice);
                        connected = false;
                    }
                );
                ipcSender.of[sndId].on('message', (data) => {
                        // ipcSender.log(`got a message from ${params.to} : `.debug, data);
                    }
                );
            }
        );
    }
}

module.exports = IpcWrapper;
