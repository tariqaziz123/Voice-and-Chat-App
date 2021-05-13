const app = require('express')();
const server = require('http').createServer(app);
const cors = require('cors');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');



const io = require("socket.io")(server, {
    cors:{
        origin:"*",
        methods:["GET","POST"]
    }
})

app.use(cors());

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send("Server is running");
});

io.on('connection',(socket) =>{
    socket.emit('me', socket.id);

    socket.on('disconnect', () => {
        socket.broadcast.emit("call ended");
    });

    socket.on('calluser', ( userToCall, signalData, from, name ) => {
        io.to(userToCall).emit('calluser', {signal:signalData, from, name})
    });

    socket.on('answercall', (data) => {
        io.to(data.to).emit("callaccepted", data.signal);
    })
})
//Chat App
io.on('connect', (socket) => {
    socket.on('join', ({ name, room }, callback) => {
      const { error, user } = addUser({ id: socket.id, name, room });
  
      if(error) return callback(error);
  
      socket.join(user.room);
  
      socket.emit('message', { user: 'admin', text: `${user.name}, welcome to room ${user.room}.`});
      socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined!` });
  
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
  
      callback();
    });
  
    socket.on('sendMessage', (message, callback) => {
      const user = getUser(socket.id);
  
      io.to(user.room).emit('message', { user: user.name, text: message });
  
      callback();
    });
  
    socket.on('disconnect', () => {
      const user = removeUser(socket.id);
  
      if(user) {
        io.to(user.room).emit('message', { user: 'Admin', text: `${user.name} has left.` });
        io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
      }
    })
  });

server.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));