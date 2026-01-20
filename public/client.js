const socket = io()

const chatConfig = window.chatConfig || {}
let roomId = chatConfig.roomId || null

if (chatConfig && chatConfig.name && chatConfig.roomId) {
    socket.emit('joinRoom', chatConfig)
    roomId = chatConfig.roomId
}

const leaveBtn = document.getElementById('leave-btn')
leaveBtn.addEventListener('click', () => {
    socket.emit('playerLeave')
    window.location.href = `/`
})

const boxes = document.querySelectorAll('.box')
boxes.forEach(box => {
    box.addEventListener('click', () => {
        socket.emit('playerMove', { id: box.id })
        box.classList.add('disabled')
        console.log(`Player moved to box ${box.id}`)
    })
})

socket.on('updateBoard', (data) => {
    const { id, player } = data
    const box = document.getElementById(id)
    if (!box) return
    box.classList.add('disabled')
    box.textContent = player
    console.log(`Board updated: Player ${player} moved to box ${id}`)
})

const playersList = document.getElementById('players-list')

const renderPlayers = (players) => {
    playersList.innerHTML = ''
    players.forEach(player => {
        const li = document.createElement('li')
        li.innerHTML = (player.name || 'Unknown') + ' - ' + (player.character || '')
        playersList.appendChild(li)
    });
}

socket.on('room-players', ({ players }) => {
    renderPlayers(players)
})