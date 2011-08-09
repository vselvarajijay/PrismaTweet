

/**
 * Module dependencies.
 */

var express = require('express');
var io = require('socket.io');
var sys = require('sys');
var mongoose = require('mongoose');
var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res){
  console.log('rendering...');
  res.render('prisma', {
    title: 'Express'
  });
});

// socket.io

app.listen(3000);

var socket = io.listen(app);

mongoose.connect('mongodb://localhost/prisma_db');
var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Color_Histogram = new Schema({
    color_histogram  :  { type: String}
});


mongoose.model('color_histogram',Color_Histogram);

var Color_Histogram = mongoose.model('color_histogram');

/*var color = new Color_Histogram();
color.color_histogram = "{red:50,blue:25,green:25}";
color.save(function(err){});
*/

var max_id='0'

Color_Histogram.find({}).run(function(err,doc){
	//get the max id for the documents in the collection
	// this will get the max id once the server starts
	console.log(doc[0]._id);
	max_id=doc[0]._id;
});

socket.sockets.on('connection',function(client){
	console.log('connection!');
	client.on('message',function(event){ 
		console.log('Received message from client!',event);
		console.log(max_id);
//		Color_Histogram.find({'_id':{$lt:max_id}}).sort(['_id'],1).limit(1).run(function(err,doc){
		Color_Histogram.find().sort(['_id'],-1).limit(1).run(function(err,doc){
			docs = doc;
//  			var json = eval('('+'{red:20,blue:20,green:20}'+')');
			var json = eval('('+doc[0]['color_histogram']+')');
			console.log(doc[0]['color_histogram']);
			client.emit('colorrow',{"color_histogram":json})
		});
	});
});

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
console.log(max_id);
