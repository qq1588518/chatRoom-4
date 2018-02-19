var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

function assignGuestName(socket, guestNumber, nickName, namesUsed) {
    var name = "Guest" + guestNumber;
    //把用户昵称跟客户端链接ID关联上
    nickNames[socket.id] = name;
    socket.emit('nameResult', {
        success: true,
        name: name
    });
    namesUsed.push(name);
    return guestNumber + 1;
}

function joinRoom(socket, room) {
    
    socket.join(room, () => {
        currentRoom[socket.id] = room;
        socket.emit('joinResult', {
            room: room
        });
        //让其他用户知道有新用户加入了聊天室
        socket.to(room).emit('messages', {
            type: 'system',
            text: nickNames[socket.id] + ' has joined ' + room + '.'
        })
        //确定有哪些用户在房间里
        var usersInRoom = Object.keys(io.sockets.adapter.rooms[room].sockets);

            var usersInRoomSummary = 'Users currently in ' + room + ' are: ';
            for (var i=0; i<usersInRoom.length; i++) {
                var userSocketId = usersInRoom[i];
                // if (userSocketId != socket.id) {
                    if (i > 0) {
                       usersInRoomSummary += ',';
                    }
                    usersInRoomSummary += nickNames[userSocketId];

                // }
            }
            usersInRoomSummary += '.';
            //将房间里其他用户的汇总发送给这个用户
            socket.emit('messages', {
                type: 'system',
                text: usersInRoomSummary
            });
        
    });

}

function handleNameChangeAttempts(socket, nickNames, nameUsed) {
    socket.on('nameAttempt', name => {

        //昵称不能以Guest开头
        if (name.indexOf('Guest') == 0) {
            socket.emit('nameResult', {
                success: false,
                message: 'Name cannot begin with "Guest".'
            });
            return;
        }

        //如果昵称已经被占用，给客户端发送错误消息
        if (namesUsed.indexOf(name) > -1) {
            socket.emit('nameResult', {
                success: false,
                message: 'That name is already in use'
            })
            return;
        }

        //如果昵称还没注册就注册上
        var previousName = nickNames[socket.id];
        var previousNameIndex = namesUsed.indexOf(previousName);
        nameUsed.push(name);
        nickNames[socket.id] = name;
        delete namesUsed[previousNameIndex];
        socket.emit('nameResult', {
            success: true,
            name: name
        })
        socket.to(currentRoom[socket.id]).emit('messages', {
            text: previousName + ' is now known as ' + name + '.'
        })
    })
}

//处理聊天室消息,将消息发送给同房间其他的用户
function handleMessageBroadcasting(socket, nickNames) {
    socket.on('message', message => {
        socket.to(message.room).emit('messages', {
            text: nickNames[socket.id] + ':' + message.text
        })
    })
}

function handleRoomJoining(socket) {
    socket.on('join', room => {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    })
}

function handleClientDisconnection(socket) {
    socket.on('disconnect', () => {
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    })
}

//获取排除客户端自身的room列表
function getRoomsExcludeSelf(ioSockets){
    var everySocketRoomList = Object.keys(ioSockets.clients().connected);
    var roomCopy = Object.assign({},ioSockets.adapter.rooms);
    var roomIncludeAmount;
    //排除那些默认加入room的socket
    for(let i=0;i<everySocketRoomList.length;i++){
        (everySocketRoomList[i] in roomCopy) && delete roomCopy[everySocketRoomList[i]]
    }
    //统计当前房间的人数（key=》value）
    for(let roomName in roomCopy){
        roomCopy[roomName] = getClientsInRoom(ioSockets,roomName)
    }

    return roomCopy;
}

//获取当前room客户端在线人数
function getClientsInRoom(ioSockets,roomName){
    return Object.keys(ioSockets.adapter.rooms[roomName].sockets).length;
}

exports.listen = function (server) {

    //启动socketIO服务器，允许它搭载在已有的HTTP服务器上
    io = socketio(server);

    io.sockets.on('connection', (socket) => {
        /**
         * 定义每个用户链接的处理逻辑
         * */
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
        //用户连接上来，把它放入lobby聊天室
        joinRoom(socket, 'Lobby')
        //处理用户的消息，更名，以及聊天室的创建和更名
        handleMessageBroadcasting(socket, nickNames);
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleRoomJoining(socket);
        //用户发出请求时，向其提供已经占用的聊天室列表
        socket.on('rooms', () => {
            socket.emit('room', getRoomsExcludeSelf(io.sockets));
        })
        //定义链接断开后的清楚逻辑
        handleClientDisconnection(socket, nickNames, namesUsed)
    })
}