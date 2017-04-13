var Firebase = require('firebase-admin');
var elasticsearch = require('elasticsearch');
var express = require("express");
var app = express();
 
var config = {
    firebaseUrl: "https://scavenger-7165d.firebaseio.com/",
    elasticSearchUrl: "https://site:851fb3c2e604d2eec5ad7e1f1cf01443@nori-us-east-1.searchly.com"
}

var serviceAccount = require("./accountkey.json");

Firebase.initializeApp({
  credential: Firebase.credential.cert(serviceAccount),
  databaseURL: "https://scavenger-7165d.firebaseio.com"
});

var db = Firebase.database();
var ref = db.ref("/");
var plantsRef = ref.child("plants");
 
var client = new elasticsearch.Client({
    host: config.elasticSearchUrl
});
 
 
plantsRef.on('child_added', upsert);
plantsRef.on('child_changed', upsert);
plantsRef.on('child_removed', remove);
 
function upsert(snapshot){
    client.index({
        index: 'firebase',
        type: 'plants',
        id: snapshot.key,
        body: snapshot.val()
    }, function(err, response){
        if(err){
            console.log("Error indexing user : " + err);
        }
    })
 
}
 
function remove(snapshot){
    client.delete({
        index: 'firebase',
        type: 'plants',
        id: snapshot.key
    }, function(error, response){
        if(error){
            console.log("Error deleting user : " + error);
        }
    });
}

app.get("/search", function(req, res){
	var searchTerm = req.query.search;
	console.log("SEARCH REQUESTED FOR: " + searchTerm);
    client.search({
      index: 'firebase',
      body: {
        query: {
          match: {
            _all: searchTerm
          }
        }
      }
    }).then(function (resp) {
        var hits = resp.hits.hits;
        console.log(hits);
        res.send(JSON.stringify(hits));
    }, function (err) {
        console.trace(err.message);
    });
});

app.listen(process.env.PORT, process.env.IP, function(){
    console.log("Scavenger server has started");
});