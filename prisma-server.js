
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


/*app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});
*/
app.configure('production', function(){
	app.use(express.errorHandler()); 
});



// Routes

app.get('/', function(req, res){
	res.render('prisma', {
		title: 'Express'
	});
});


app.listen(3000);

var socket = io.listen(app);
socket.configure('production', function(){
  socket.set('log level', 1);
});


socket.sockets.on('connection',function(client){


	var max_id = '0';

	mongoose.connect('mongodb://localhost/prisma_db');
	var Schema = mongoose.Schema,
    		ObjectId = Schema.ObjectId;

	var Color_Histogram = new Schema({
    		color_histogram  :  { type: String}
	});

	mongoose.model('color_histogram',Color_Histogram);
	var Color_Histogram = mongoose.model('color_histogram');


	Color_Histogram.find({}).sort(['_id'],-1).limit(1).run(function(err,doc){
        	max_id = doc[0]._id;
	});

	client.on('message',function(event){ 
		Color_Histogram.find({'_id':{$gt:max_id}}).sort(['_id'],1).limit(1).run(function(err,doc){
			if(doc[0]!=undefined){
				var json = eval('('+doc[0]['color_histogram']+')');
				client.emit('colorrow',{"color_histogram":json,'_id':doc[0]['_id']});
			}
			else{
				client.emit('nothing',{'_id':max_id});
			}
		});
	});
	client.on('getlatest',function(clientdata){
		client_id = clientdata['_id'];
		Color_Histogram.find({'_id':{$gt:client_id}}).sort(['_id'],1).limit(1).run(function(err,doc){
			if(doc!=undefined && doc[0]!=undefined){
				var json = eval('('+doc[0]['color_histogram']+')');
				client.emit('colorrow',{'color_histogram':json,'_id':doc[0]['_id']});
			}
			else{
				client.emit('nothing',clientdata);
			}
		});
		
	});
});

