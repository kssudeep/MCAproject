const http = require('http')
const fs = require('fs')
const port = 3000

const server = http.createServer(function(req, res){
res.writeHead(200, { 'content-type' : 'text/html'})
fs.readFile('index.html', function(error,data) {
    if(error){
        res.writeHead(404)
        res.write('error: file not found')
    }else {
        res.write(data)
    }
    res.end()
})
})

server.listen(port,function(error){
    if(error){
        console.log('somenthing went wrong', error)
    } else{
        console.log('server is listening on port ' + port)
    }
})