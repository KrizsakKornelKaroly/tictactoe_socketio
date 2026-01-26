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

    checkForWinner(player)
})


const winningCombinations = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['1', '4', '7'],
    ['2', '5', '8'],
    ['3', '6', '9'],
    ['1', '5', '9'],
    ['3', '5', '7']
]

const checkForWinner = (player) => {
    const playerBoxes = Array.from(boxes).filter(
        box => box.textContent === player
    )
    const playerBoxIds = playerBoxes.map(box => box.id)

    const hasWon = winningCombinations.some(combination =>
        combination.every(boxId => playerBoxIds.includes(boxId))
    )

    if (hasWon) {
        alert(`Player ${player} won.`)
    }

    return hasWon
}


const playersList = document.getElementById('players-list')

const renderPlayers = (players) => {
    playersList.innerHTML = ''
    players.forEach(player => {
        const li = document.createElement('li')
        li.innerHTML = (player.name) + ' - ' + (player.character)
        playersList.appendChild(li)
    });
}

socket.on('room-players', ({ players }) => {
    renderPlayers(players)
})