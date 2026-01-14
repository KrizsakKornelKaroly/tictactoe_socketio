const socket = io()

let roomId = null

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
    box.classList.add('disabled')
    box.textContent = player
    console.log(`Board updated: Player ${player} moved to box ${id}`)
})

/* giving code to client to prevent refreshing bug
socket.on('roomCreated', (data) => {
    roomId = data
    socket.emit('joinRoom', { roomId })
})
*/