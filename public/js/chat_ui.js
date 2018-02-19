var socket = io.connect();
var myName = "Anonymous";
$(() => {
    var chatApp = new Chat(socket);
    var userData = {};

    //显示更名尝试的结果
    socket.on('nameResult', result => {
        myName = result.name;
        var message;

        if (result.success) {
            message = `You are now known as ${result.name}.`;
        } else {
            message = result.message;
        }
        $('#messages').append(divSystemContentElement(message));
    })

    //显示房间变更的结果
    socket.on('joinResult', result => {
        if(result.type == 'system'){
            $('#messages').append(divSystemContentElement(result.text));
            return;
        }

        $('#room').text(result.room);
        $('#messages').append(divSystemContentElement('Room changed.'));
    })

    //显示接收到的消息
    socket.on('messages', message => {
        var newElement = $('<div></div>').text(message.text);
        $('#messages').append(newElement);
    })

    //显示可用房间列表
    socket.on('room', rooms => {
        $('#room-list').empty();

        for (var room in rooms) {

            if (room != '') {
                $('#room-list').append(divEscapedContentElement(`${room}(${rooms[room]}人)`));
            }
        }

        $('#room-list div').click(function () {
            var currentRoom = $('#room').text();
            var targetRoom = $(this).text().match(/([^(]*)\(/)[1];

            if(currentRoom == targetRoom) {
                $('#messages').append(divSystemContentElement('你已经在这个房间里了'));
                return;
            };

            chatApp.processCommand(`/join ${targetRoom}`);
            userData.room = targetRoom;
            $('#send-message').focus();
        })
    })

    //定期请求可用房间列表
    setInterval(() => {
        socket.emit('rooms');
    }, 1000)
    $('#send-message').focus();

    //提交表单可以发送聊天消息
    $('#send-form').submit((e) => {
        e.preventDefault();
        processUserInput(chatApp, socket);
        return false;
    })
})






function divEscapedContentElement(message) {
    return $('<div></div>').text(message);
}
//用来显示系统创建的受信的内容
function divSystemContentElement(message) {
    return $('<div></div>').html('<i>' + message + '</i>');
}

function processUserInput(chatApp, socket) {
    var message = $('#send-message').val();
    var systemMessage;

    if (message.charAt(0) == '/') {
        systemMessage = chatApp.processCommand(message);
        if (systemMessage) {
            $('#messages').append(divSystemContentElement(systemMessage));
        }
    }
    //将非命令输入广播给其他用户
    else {
        chatApp.sendMessage($('#room').text(), message);
        //显示自己输入的内容
        $('#messages').append(divEscapedContentElement(`${myName}：${message}`));
        $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    }
    $('#send-message').val('');

}