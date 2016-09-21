var http = require('http');
var express = require('express');

var app = express();

var server = http.createServer(app);
server.listen(process.env.PORT || 3000, function () {
  var bind = server.address();
  console.log("Listening on " + bind.address + ':' + bind.port);
});
