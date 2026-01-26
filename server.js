const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const ejs = require('ejs');
const path = require('path')


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
    let roomId = req.query.room;
    res.render('main', { roomId });
})

function generateCode() {
    return Math.random().toString(36).substring(2, 8);
}


io.on('connection', (socket) => {
    console.log('A player connected')

    socket.on('playerLeave', () => {
        console.log('A player disconnected')

        socket.disconnect()
    })

    let player = 'X'

    socket.on('playerMove', (data) => {
        console.log(`Player moved to box ${data.id}`)

        if (player == 'X') {
            player = 'O'
        } else {
            player = 'X'
        }

        io.emit('updateBoard', { id: data.id, player })
    })

})

server.listen(3000, () => {
    console.log('Server is listening on port 3000 (http://localhost:3000)');
});