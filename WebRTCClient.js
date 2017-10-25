function WebRTCClient(socket) {
  this.url = null;
  this.socket = socket;
  this.connected = false;
}

WebRTCClient.prototype.connect = (url, {onConnect, onDisconnect}) => {
  this.socket = io(url);
  this.connected = true;
  return new Promise(function(resolve, reject) {
    this.socket.once("user-list", data => {
      resolve(data);
    });
  })
};

WebRTCClient.prototype.sendMessage = (message) => {
  if(typeof message === "string") {

  } else {
    throw "sendMessage support string as input only.";
  }
}

WebRTCClient.prototype.addEventListener = (event, callback) => {
  if(event === "connect" || event === "disconnect" || event === "user-online" || event === "user-offline") {
    this.socket.on(event, typeof callback === "function" ? callback : null);
  } else {
    console.warn("unknown event type.");
  }
}

window.WebRTCClient = WebRTCClient;

