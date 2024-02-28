const http = require('http');
var svr = new http.Server(8064, (req) => {
    console.log("hello, world");
    console.log(req.data);
    req.response.write('hello, world');
});
svr.start();