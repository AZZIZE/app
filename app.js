var express = require('express');
var https = require('https');


var amqp = require('amqplib/callback_api'); // richiamo libreria RabbitMQ
var conn;

//####################

amqp.connect('amqp://localhost',function(err, newconn){     // connetiamo al server RabbitMq
  conn=newconn;     
});
//-------------------------------

var ex = 'exchange_rc';
var app= express();
var porta= 3000;
var client_id_web = "670686920012-4bk2jhcdg5fnos40d9k1nuoqseegbe3m.apps.googleusercontent.com";
var client_secret_web = "3XZHnvBxLU1bls6HVr_4ecZ_";


var scope = "https://www.googleapis.com/auth/drive"; //GOOGLE DRIVE
var list_oper = "https://www.googleapis.com/drive/v3/files"; //LISTA I FILE

//OAUTHLINK
var oauthlink = "https://accounts.google.com/o/oauth2/auth?client_id="+client_id_web+"&response_type=code&redirect_uri=http://localhost:3000/oauthcallback&scope="+scope+"&access_type=online";

app.get('/api/drive', function(req, res){
  res.redirect(oauthlink);
});

app.get('/api/meteo', function(req, resw){
 var http= require('http');

var indirizzo="http://api.openweathermap.org/data/2.5/weather?q=Rome&appid=8ecb4cc7c10c7f17bb297394f3a47ad0"
var c = http.request(indirizzo, function(res){
	var body = '';
	res.on('data', function(chunk) {
		body+= chunk;
	});
	
	res.on('end', function(){
		var price = JSON.parse(body);
		resw.send(price);
		console.log(price);
	});

}).end();


});

//   #####################################

app.get('/oauthcallback', function(req, res){
  //Ricezione code
  //Controllo
  if (req.query.error)
    res.send("RECEIVED ERROR " + req.query.error);
  if (!req.query.code)
    res.send("NO CODE");
  code = req.query.code;
  //res.send("OK, CODE RECEIVED: " + code);
  
  
  //TOKEN
  
  //variabili token
  var risposta ="";
  var token;
  var options = {
    hostname: "www.googleapis.com",
    port: 443,
    method: 'POST',
    path: "/oauth2/v4/token?code="+code+"&client_id="+client_id_web+"&client_secret="+client_secret_web+"&redirect_uri=http://localhost:3000/oauthcallback&grant_type=authorization_code"
    };
    
    //RIchiesta token
  var reqtoken = https.request(options, function(restoken){
    restoken.setEncoding("utf8");
    restoken.on("data", function (pezzo) {   risposta += pezzo; });
    restoken.on("end", function () {
                             risposta=JSON.parse(risposta);
                             token = risposta.access_token;
                             //console.log(token);
                             leggiDatiDrive(token, function(dati){
                                      res.setHeader('Content-Type', 'application/json');
                                      
                                      conn.createChannel(function(err, ch) {  
                                      ch.assertExchange(ex, 'direct', {durable: true}); // creo canale per AMQP
                                      ch.publish(ex, 'bindkey', new Buffer(JSON.stringify(dati))); // mando messaggio
                                      console.log("Inviato all'exchange");
                                      ch.close();
                               });
                             res.send("JSON CON DATI MEMORIZZATO!!");
                             console.log("Risposta inviata");
      });

    });
  });
  reqtoken.end();
});
//    DA CAPIRE ---------------------------



//metto in ascolto il server

app.listen(porta);
console.log('Il server è in funzione sulla porta ' + porta);
//--------------------------------------------------------------------------------


function leggiDatiDrive(token, callback){
  var finalrisp="";
  var file = https.get(list_oper + "?access_token=" + token, function(res){
    res.on("data", function (pezzo) {
        finalrisp += pezzo;
    });
    res.on("end", function () {
      finalrisp=JSON.parse(finalrisp);
      callback(finalrisp);
    });
  });
  file.end();
};
