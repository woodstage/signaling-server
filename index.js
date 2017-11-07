const express = require("express");
const app = express();
const https = require("https");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  strictSsl: true, // Default value
  jwksUri: 'https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_6a7cKUfQR/.well-known/jwks.json'
});

const options = {
  key: fs.readFileSync('./privatekey.pem'),
  cert: fs.readFileSync('./certificate.pem')
};

const server = https.createServer(options, app);
const io = require("socket.io")(server);

server.listen(8080);

// app.get("/", function(req, res) {
//   res.sendFile(__dirname + "/index.html");
// });
app.use('/', express.static('example'));

// middleware
io.use((socket, next) => {
  let token = socket.handshake.query.token;
  const decoded = jwt.decode(token, {complete: true});
  client.getSigningKey(decoded.header.kid, (err, key) => {
    const signingKey = key.publicKey || key.rsaPublicKey;
    jwt.verify(token, signingKey,{ algorithms: ['RS256'] }, function(err, decoded) {
      if(err) {console.log(err);
        return next(new Error("authentication error"));
      };
      if(decoded.exp * 1000 < new Date().getTime()) {
        return next(new Error("token expired"));
      }
      return next();
    });
  });
});

const users = {};

io.on("connection", socket => {
  let token = socket.handshake.query.token;
  const decoded = jwt.decode(token);

  const user = {id: decoded.sub, name: decoded.username};
  console.log(`${user.name} connected. socketId: ${socket.id}`);

  users[user.id] = {};
  users[user.id].socketId = socket.id;
  users[user.id].profile = user;

  emitUsers();

  socket.on("disconnect", reason => {
    console.log(`${user.name} disconnected. socketId: ${socket.id}`);
    delete users[user.id];
    emitUsers();
  });

  // message
  socket.on("_message", message => {
    const toUser = users[message.to];
    const fromUser = Object.values(users).find(user => user.socketId === socket.id);
    if(toUser && toUser.socketId) {
      io.sockets.connected[toUser.socketId].once("_message_ack_" + message.id, resp => {
        console.log(`${toUser.socketId} => server`, resp);
        console.log(`server => ${fromUser.socketId}`, resp);
        console.log("_message_ack_" + message.id, resp);
        socket.emit("_message_ack_" + message.id, resp);
      });
      const msg = {id: message.id, from: fromUser.profile.id, data: message.data};
      console.log(`${fromUser.socketId} => ${toUser.socketId}`, msg);
      socket.to(toUser.socketId).emit("_message", msg);
    } else {
      console.error("user not available");
    }
  });
});

function emitUsers() {
  io.clients((error, clients) => {
    if (error) throw error;
    io.emit("_users", users);
  });
}
