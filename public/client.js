const socket = io()

const leaveBtn = document.getElementById('leave-btn')
leaveBtn.addEventListener('click', () => {
    socket.emit('playerLeave')
    window.location.href = `/`
})