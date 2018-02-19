class Chat {
    constructor(socket){
        this.socket = socket;
    }

    sendMessage(room,text){
        var message = {
            room: room,
            text: text
        };
        this.socket.emit('message',message)
    }

    changeRoom(room){
        this.socket.emit('join',{
            newRoom:room
        })
    }

    processCommand(command){
        var words = command.split(' ')
        var command = words[0].substring(1,words[0].length).toLowerCase();
        var message = false;

        switch(command){
            case 'join':
              words.shift()
              var room = words.join(' ');
              this.changeRoom(room);
              break;
            case 'nick':
              words.shift();
              this.socket.emit('nameAttempt',words.join(' '));
              break;
            default:
              message = 'Unrecognized command.'
              break;
        }
        return message;
    }
}