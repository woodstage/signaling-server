const express = require("express");
const app = express();
const https = require("https");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const options = {
  key: fs.readFileSync("./ssl/privatekey.pem"),
  cert: fs.readFileSync("./ssl/certificate.pem")
};

const server = https.createServer(options, app);
const io = require("socket.io")(server);

server.listen(8080);

// middleware
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  authenticate(token).then(() => next()).catch(err => next(err));
});

const users = {};

io.on("connection", socket => {
  const token = socket.handshake.query.token;
  const decoded = jwt.decode(token);
  const user = { id: decoded.sub, username: decoded.username };
  console.log(`${user.username} connected. socketId: ${socket.id}`);

  users[user.id] = {};
  users[user.id].socketId = socket.id;
  users[user.id].profile = user;

  sendUserList(socket, users);
  broadcastUserOnline(io, users[user.id]);

  socket.on("disconnect", reason => {
    console.log(`${user.username} disconnected. socketId: ${socket.id}`);
    users[user.id] && broadcastUserOffline(io, users[user.id]);
    delete users[user.id];
  });

  // message
  socket.on("_message", message => {
    const toUser = users[message.to];
    const fromUser = Object.values(users).find(
      user => user.socketId === socket.id
    );
    if (toUser && toUser.socketId) {
      io.sockets.connected[toUser.socketId].once(
        "_message_ack_" + message.id,
        resp => {
          console.log(`${toUser.socketId} => server`, resp);
          console.log(`server => ${fromUser.socketId}`, resp);
          console.log("_message_ack_" + message.id, resp);
          socket.emit("_message_ack_" + message.id, resp);
        }
      );
      const msg = {
        id: message.id,
        from: fromUser.profile.id,
        data: message.data
      };
      console.log(`${fromUser.socketId} => ${toUser.socketId}`, msg);
      socket.to(toUser.socketId).emit("_message", msg);
    } else {
      console.error("user not available");
    }
  });
});

function sendUserList(socket, users) {
  socket.emit("_users", users);
}

function broadcastUserOnline(io, user) {
  io.clients((error, clients) => {
    if (error) throw error;
    io.emit("_user_online", user);
  });
}

function broadcastUserOffline(io, user) {
  io.clients((error, clients) => {
    if (error) throw error;
    io.emit("_user_offline", user);
  });
}

function authenticate(token) {
  return new Promise((resolve, reject) => {
    const decoded = jwt.decode(token, { complete: true });
    const client = jwksClient({
      strictSsl: true,
      jwksUri:
        "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_6a7cKUfQR/.well-known/jwks.json"
    });
    if(decoded && decoded.header) {
      client.getSigningKey(decoded.header.kid, (err, key) => {
        const signingKey = key.publicKey || key.rsaPublicKey;
        jwt.verify(
          token,
          signingKey,
          { algorithms: ["RS256"] },
          (err, decoded) => {
            if (err) {
              console.error(err);
              return reject(new Error("authentication error"));
            }
            if (decoded.exp * 1000 < new Date().getTime()) {
              return reject(new Error("token expired"));
            }
            return resolve();
          }
        );
      });
    } else {
      return reject(new Error("authentication error"));
    }
  });
}
