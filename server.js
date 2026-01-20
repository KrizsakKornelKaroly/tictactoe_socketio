const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const ejs = require('ejs');
const path = require('path')

const connectedUsers = new Map()

const emitRoomPlayers = (roomId) => {
    const playersInRoom = Array.from(connectedUsers.values())
        .filter(p => p.roomId === roomId)
        .map(p => ({ name: p.name, character: p.character }))
    io.to(roomId).emit('room-players', { players: playersInRoom })
}

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/main', (req, res) => {
    const { name, character, room } = req.query

    if (!name) {
        return res.redirect('/')
    }

    const roomId = room || generateCode();
    const chatConfig = {
        name,
        character: character,
        roomId
    }

    console.log(`Room ID: ${roomId} (user: ${name}, char: ${chatConfig.character})`);

    res.render('main', { chatConfig });
    io.emit('roomCreated', { chatConfig });
})

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}


io.on('connection', (socket) => {
    console.log('A player connected')

    socket.on('joinRoom', (data) => {
        const { name, character, roomId } = data
        socket.join(roomId)
        connectedUsers.set(socket.id, { name, character, roomId })
        console.log(`${name} joined room ${roomId}`)
        emitRoomPlayers(roomId)
    })

    socket.on('playerLeave', () => {
        const user = connectedUsers.get(socket.id)
        if (user) {
            const { roomId, name } = user
            connectedUsers.delete(socket.id)
            socket.leave(roomId)
            console.log(`${name} left room ${roomId}`)
            emitRoomPlayers(roomId)
        }
        socket.disconnect(true)
    })

    socket.on('playerMove', (data) => {
        const user = connectedUsers.get(socket.id)
        if (!user) return
        const { roomId, character } = user
        console.log(`Player ${user.name} (${character}) moved to box ${data.id} in room ${roomId}`)

        io.to(roomId).emit('updateBoard', { id: data.id, player: character })
    })

    socket.on('disconnect', () => {
        const user = connectedUsers.get(socket.id)
        if (user) {
            const { roomId, name } = user
            connectedUsers.delete(socket.id)
            console.log(`${name} disconnected from room ${roomId}`)
            emitRoomPlayers(roomId)
        } else {
            console.log('A socket disconnected (no tracked user)')
        }
    })

})

server.listen(3000, () => {
    console.log('Server is listening on port 3000 (http://localhost:3000)');
});