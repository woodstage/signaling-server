import io from "socket.io-client";

class SignalingServerClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.users = Object.create(null);
  }

  connect(url, { onConnect, onDisconnect }) {
    this.socket = io(url);
    this.connected = true;
    this.socket.on("offer", message => {
      if (message.type) {
        

      } else {
        throw "unknown message type";
      }
    });
    return new Promise((resolve, reject) => {
      this.socket.once("user-list", data => {
        data.forEach((user) => {
          
        });
        resolve(data);
      });
    });
  }

  sendMessage(message) {
    if (typeof message === "string") {
    } else {
      throw "sendMessage support string as input only.";
    }
  }

  _createDataConnection(toSocketId) {
    const dataConnection = new RTCPeerConnection({
      iceServers: [
        {
          url: "stun:stun.l.google.com:19302"
        }
      ]
    });
    dataConnection.createOffer().then(offer => {
      dataConnection.setLocalDescription(offer).then(() => {
        const message = {
          from: this.socket.id,
          to: toSocketId,
          type: "data",
          data: offer
        };
        console.log("send offer: ", JSON.stringify(message));
        this.socket.emit("offer", message);
      });
    });
  }

  addEventListener(event, callback) {
    if (
      event === "connect" ||
      event === "disconnect" ||
      event === "user-online" ||
      event === "user-offline"
    ) {
      this.socket.on(event, typeof callback === "function" ? callback : null);
    } else {
      console.warn("unknown event type.");
    }
  }
}

window.SignalingServerClient = SignalingServerClient;
