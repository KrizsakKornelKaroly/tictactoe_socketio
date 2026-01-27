const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const ejs = require('ejs');
const path = require('path')

const connectedUsers = new Map()
const roomBoards = new Map()
const roomTurns = new Map()
const roomScores = new Map()

const winningCombinations = [
    ['1','2','3'], ['4','5','6'], ['7','8','9'], // row
    ['1','4','7'], ['2','5','8'], ['3','6','9'], // col
    ['1','5','9'], ['3','5','7'] // diag
]

function checkWinner(board) {
    return winningCombinations.some(combo => {
        const [a, b, c] = combo
        return (
            board[a] &&
            board[a] === board[b] &&
            board[a] === board[c]
        )
    })
}

function resetRoom(roomId) {
    roomBoards.set(roomId, {
        '1': null, '2': null, '3': null,
        '4': null, '5': null, '6': null,
        '7': null, '8': null, '9': null
    })
}

const emitRoomPlayers = (roomId) => {
    const playersInRoom = Array.from(connectedUsers.values())
        .filter(p => p.roomId === roomId)
        .map(p => ({ name: p.name, character: p.character }))
    io.to(roomId).emit('room-players', { players: playersInRoom })
}

const convertScoresToNames = (roomId, scores) => {
    const nameScores = {}
    Object.entries(scores).forEach(([character, score]) => {
        const player = Array.from(connectedUsers.values())
            .find(p => p.roomId === roomId && p.character === character)
        if (player) {
            nameScores[player.name] = score
        }
    })
    return nameScores
}

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/new', (req, res) => {
    const playerName = req.query.name;
    const character = req.query.character;
    const newRoom = generateCode();
    res.redirect(`/main?name=${playerName}&character=${character}&room=${newRoom}`);
});

app.get('/join', (req, res) => {
    const roomId = req.query.roomCode;
    const playerName = req.query.name;
    const character = req.query.character;
    res.redirect(`/main?name=${playerName}&character=${character}&room=${roomId}`);
});

app.get('/main', (req, res) => {
    let roomConfig = {
        roomId: req.query.room,
        name: req.query.name,
        character: req.query.character
    }
    res.render('main', { roomConfig });
})

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
    console.log('A player connected')

    socket.on('joinRoom', (data) => {
        const { name, character, roomId } = data
        
        // Check how many players are already in the room
        const playersInRoom = Array.from(connectedUsers.values())
            .filter(p => p.roomId === roomId)
        
        // Limit room to 2 players
        if (playersInRoom.length >= 2) {
            socket.emit('joinError', { 
                message: 'A szoba megtelt! Maximum 2 játékos csatlakozhat!',
                title: 'CSATLAKOZÁSI HIBA'
            })
            return
        }
        
        socket.join(roomId)

        connectedUsers.set(socket.id, { name, character, roomId })

        if (!roomScores.has(roomId)) roomScores.set(roomId, {})
        const scores = roomScores.get(roomId)
        if (scores[character] === undefined) scores[character] = 0

        if (!roomBoards.has(roomId)) {
            roomBoards.set(roomId, {
                '1': null, '2': null, '3': null,
                '4': null, '5': null, '6': null,
                '7': null, '8': null, '9': null
            })
        }

        if (!roomTurns.has(roomId)) {
            roomTurns.set(roomId, character)
        }

        emitRoomPlayers(roomId)
        io.to(roomId).emit('scoreUpdate', convertScoresToNames(roomId, scores))
        io.to(roomId).emit('turnUpdate', roomTurns.get(roomId))
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

    socket.on('playerMove', ({ id }) => {
        const user = connectedUsers.get(socket.id)
        if (!user) return

        const { roomId, character } = user
        const board = roomBoards.get(roomId)
        const currentTurn = roomTurns.get(roomId)

        if (character !== currentTurn) return

        if (board[id]) return

        board[id] = character
        io.to(roomId).emit('updateBoard', { id, player: character })

        if (checkWinner(board)) {
            const scores = roomScores.get(roomId)
            scores[character]++

            io.to(roomId).emit('scoreUpdate', convertScoresToNames(roomId, scores))

            const winnerUser = Array.from(connectedUsers.values())
                .find(u => u.roomId === roomId && u.character === character)

            io.to(roomId).emit('gameOver', {
                winner: winnerUser ? winnerUser.name : character
            })

            resetRoom(roomId)
            return
        }

        if (Object.values(board).every(v => v !== null)) {
            io.to(roomId).emit('gameOver', { winner: null })
            resetRoom(roomId)
            return
        }

        const players = Array.from(connectedUsers.values())
            .filter(p => p.roomId === roomId)
            .map(p => p.character)

        const next = players.find(p => p !== character)
        roomTurns.set(roomId, next)

        io.to(roomId).emit('turnUpdate', next)
    })

    socket.on('playerWon', ({ player }) => {
        const user = connectedUsers.get(socket.id)
        if (!user) return

        const { roomId } = user
        const scores = roomScores.get(roomId)
        if (!scores || scores[player] === undefined) return

        scores[player]++
        io.to(roomId).emit('scoreUpdate', convertScoresToNames(roomId, scores))
        io.to(roomId).emit('gameOver', { winner: player })
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