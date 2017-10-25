const express = require("express");
const app = express();
const https = require("https");
const fs = require("fs");

const options = {
  key: fs.readFileSync('./privatekey.pem'),
  cert: fs.readFileSync('./certificate.pem')
};

const server = https.createServer(options, app);
const io = require("socket.io")(server);

server.listen(8080);

const users = {
  1: { id: 1, name: "jason", token: "aaaaaa" },
  2: { id: 2, name: "pin", token: "bbbbbb" },
  3: { id: 3, name: "hongda", token: "cccccc" }
};

// app.get("/", function(req, res) {
//   res.sendFile(__dirname + "/index.html");
// });
app.use('/', express.static('example'));

// middleware
io.use((socket, next) => {
  let token = socket.handshake.query.token;
  if (isValid(token)) {
    return next();
  }
  return next(new Error("authentication error"));
});

io.on("connection", socket => {
  let token = socket.handshake.query.token;
  const user = getUser(token);
  console.log(`${user.name} connected. socketId: ${socket.id}`);

  users[user.id].socketId = socket.id;

  emitUsers();

  socket.on("disconnect", reason => {
    delete users[user.id].socketId;
    emitUsers();
  });

  socket.on("offer", message => {
    console.log("got offer: ", message);
    socket.broadcast.to(message.to).emit("offer", message);
  });

  socket.on("answer", message => {
    console.log("got answer: ", message);
    socket.broadcast.to(message.to).emit("answer", message);
  });

  socket.on("candidate", message => {
    console.log("got candidate: ", message);
    socket.broadcast.to(message.to).emit("candidate", message);
  });
});

function getUser(token) {
  return Object.values(users).find(user => user.token === token);
}

function isValid(token) {
  return Object.values(users).findIndex(user => user.token === token) !== -1;
}

function emitUsers() {
  io.clients((error, clients) => {
    if (error) throw error;
    io.emit("user-list", users);
  });
}
