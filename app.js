var http = require("http");
var fs = require("fs");
var path = require("path");
var mime = require("mime");
var socketio = require("socket.io");
var cache = {};

var chatServer = require("./server/chat_server.js");

//错误响应
function send404(response){
    response.writeHead(404,{"Content-Type":"text/plain"});
    response.write('Error 404:resource not found');
    response.end();
}

//发送文件
function sendFile(response, filePath, fileContents){
    response.writeHead(
        200,
        {"content-type":mime.getType(path.basename(filePath))}
    )
    response.end(fileContents);
}

//提供静态文件服务
function serveStatic(response, cache, absPath){
    //检查文件是否在内存中
    if(cache[absPath]){
        sendFile(response, absPath, cache[absPath])
    } else {
        //检查文件是否存在
        fs.exists(absPath, (exists)=>{  
            if(exists){
                fs.readFile(absPath,(err, data)=>{
                    if(err){
                        send404(response)
                    } else{
                        cache[absPath] = data;
                        sendFile(response, absPath, data);
                    }
                })
            }else{
                send404(response);
            }
        })
    }
}

var server = http.createServer((request, response)=>{
    var filePath = false;

    if(request.url == '/'){
        filePath = 'public/index.html'
    } else {
        filePath = 'public' + request.url
    }
    var absPath = path.join(__dirname, './' + filePath)
    serveStatic(response, cache, absPath);
})

server.listen(3000,()=>{
    console.log("Server listening on port 3000");
})

chatServer.listen(server);
