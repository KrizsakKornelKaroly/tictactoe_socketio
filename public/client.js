const socket = io()

const playersList = document.getElementById('players-list')
const scoreList = document.getElementById('score-list')
const modal = document.getElementById('game-modal')
const modalText = document.getElementById('modal-winner-text')
const modalTitle = document.getElementById('modal-title')
const closeModalBtn = document.getElementById('close-modal-btn')
const boxes = document.querySelectorAll('.box')
const leaveBtn = document.getElementById('leave-btn')
const roomConfig = window.roomConfig || {}
let roomId = roomConfig.roomId || null
let myCharacter = roomConfig.character
let currentTurn = null

if (roomConfig && roomConfig.name && roomConfig.roomId) {
    socket.emit('joinRoom', roomConfig)
    roomId = roomConfig.roomId
}

socket.on('joinError', ({ message, title }) => {
    modal.classList.remove('hidden')
    modalText.textContent = message
    modalTitle.textContent = title

    setTimeout(() => {
        window.location.href = `/`
    }, 3000)
})

leaveBtn.addEventListener('click', () => {
    socket.emit('playerLeave')
    window.location.href = `/`
})

boxes.forEach(box => {
    box.addEventListener('click', () => {
        socket.emit('playerMove', { id: box.id })
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

socket.on('turnUpdate', (turn) => {
    currentTurn = turn
    updateGridState()
    highlightCurrentPlayer()
})

function updateGridState() {
    const isMyTurn = currentTurn === myCharacter

    boxes.forEach(box => {
        if (box.textContent) return
        box.disabled = !isMyTurn
    })
}

function highlightCurrentPlayer() {
    socket.emit('requestPlayersRefresh')
}

socket.on('scoreUpdate', (scores) => {
    scoreList.innerHTML = ''

    Object.entries(scores).forEach(([char, score]) => {
        const li = document.createElement('li')
        li.textContent = `${char}: ${score}`
        scoreList.appendChild(li)
    })
})

socket.on('gameOver', ({ winner }) => {
    if (winner) {
        modalText.textContent = `${winner} nyert!`
    } else {
        modalText.textContent = 'Döntetlen!'
    }

    modal.classList.remove('hidden')

    boxes.forEach(box => {
        box.textContent = ''
        box.classList.remove('disabled')
    })

    updateGridState()
})

closeModalBtn.addEventListener('click', () => {
    modal.classList.add('hidden')
})

const renderPlayers = (players) => {
    playersList.innerHTML = ''

    players.forEach(player => {
        const li = document.createElement('li')
        li.textContent = `${player.name} - ${player.character}`

        if (player.character === currentTurn) {
            li.classList.add('current-turn')
        }

        playersList.appendChild(li)
    })
}

socket.on('room-players', ({ players }) => {
    renderPlayers(players)
})