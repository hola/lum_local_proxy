#!/usr/bin/env node
// LICENSE_CODE ZON
'use strict'; /*jslint node:true,esnext:true*/
var http = require('http');
var url = require('url');
var api_port = 11000;
var lum_customer = 'customer';
var lum_zones = {gen: 'password1', gen2: 'password2'};
var ports = [
    {from: 12000, count: 3, opt: {zone: 'gen'}},
    {from: 12010, count: 3, opt: {zone: 'gen2', country: 'ca'}},
];

var servers = [];
function start_servers(){
    ports.forEach(function(port_range){
        for (var i=0; i<(port_range.count||1); i++)
            servers.push(start_server(port_range.from+i, port_range.opt));
    });
    servers.push(start_api(api_port));
}

function start_server(port, opt){
    var server = http.createServer(run_proxy);
    server.on('connect', run_proxy);
    server.lum_port = port;
    server.lum_opt = {session: port};
    copy_opt(server.lum_opt, opt);
    server.listen(port);
    console.log(port+': '+JSON.stringify(server.lum_opt));
    return server;
}

function start_api(port){
    var server = http.createServer(api);
    server.listen(port);
    return server;
}

function lum_auth(opt){
    var arr = ['lum-customer', lum_customer];
    var username = arr.concat(opt_as_array(opt)).join('-');
    return new Buffer(username+':'+lum_zones[opt.zone]).toString('base64');
}

function lum_superproxy(opt){
    var arr = ['servercountry', opt.superproxy||'us', 'session', opt.session];
    return arr.join('-')+'.zproxy.luminati.io';
}

const CRLF = '\r\n';
function write_http_reply(stream, res){
    if (stream instanceof http.ServerResponse)
    {
        return stream.writeHead(res.statusCode, res.statusMessage,
            res.headers);
    }
    var str = 'HTTP/1.1 '+res.statusCode+' '+res.statusMessage+CRLF;
    for (var field in res.headers)
        str += field+': '+res.headers[field]+CRLF;
    str += CRLF;
    stream.write(str);
}

function run_proxy(client_req, client_res, head){
    var socket = client_req.socket;
    var server = socket.server;
    var lum_opt = server.lum_opt;
    var log = server.lum_port+' '+new Date().toISOString()+' '
        +client_req.socket.remoteAddress+' '+client_req.method+' '
        +client_req.url+' ';
    client_req.headers['proxy-authorization'] = 'Basic '+lum_auth(lum_opt);
    var lum_req = {
        protocol: 'http:',
        host: lum_superproxy(lum_opt),
        port: 22225,
        method: client_req.method,
        path: client_req.url,
        headers: client_req.headers,
    };
    var proxy = http.request(lum_req);
    if (client_req.method=='CONNECT')
        proxy.end();
    else
        client_req.pipe(proxy);
    proxy.on('response', function(proxy_res){
        console.log(log+proxy_res.statusCode);
        write_http_reply(client_res, proxy_res);
        proxy_res.pipe(client_res);
    });
    proxy.on('connect', function(proxy_res, proxy_socket, proxy_head){
        console.log(log+proxy_res.statusCode);
        write_http_reply(client_res, proxy_res);
        if (proxy_res.statusCode!=200)
            return client_res.end();
        proxy_socket.write(head);
        client_res.write(proxy_head);
        proxy_socket.pipe(client_res).pipe(proxy_socket);
    });
    proxy.on('error', function(error){
        if (!client_res.ended)
        {
            write_http_reply(client_res, {statusCode: '502',
                statusMessage: 'Bad gateway', headers: {Connection: 'close'}});
        }
        client_res.end();
        console.log(log+'502');
    });
}

function api_result(res, code, message, body){
    res.writeHead(code, message);
    res.end(body);
}

// API: /get?port=NN or /set?port=NN&country=ca&...
function api(req, res){
    var request = url.parse(req.url, true);
    var query = request.query;
    if (!query.port)
        return api_result(res, '400', 'Port not specified');
    var server = servers.find(function(s){ return s.lum_port==query.port; });
    if (!server)
        return api_result(res, '400', 'Port not found');
    delete query.port;
    switch(request.pathname)
    {
    case '/get': break;
    case '/set': copy_opt(server.lum_opt, query); break;
    default: return api_result(res, '400', 'Bad API endpoint');
    }
    return api_result(res, '200', 'OK', JSON.stringify(server.lum_opt));
}

function copy_opt(to, from){
    for (var key in from)
        to[key] = from[key];
}

function opt_as_array(obj){
    var arr = [];
    for (var key in obj){
        if (key=='superproxy')
            continue;
        arr.push(key);
        arr.push(obj[key]);
    }
    return arr;
}

console.log('Starting servers:');
start_servers();
