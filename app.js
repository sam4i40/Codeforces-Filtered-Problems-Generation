// add necessary extensions and packages
const express = require("express");
const https = require("https");
const bodyParser = require("body-parser");
const axios = require("axios");
const path = require("path");
const app = express();
// for login
const mongoose=require("mongoose");
let ejs = require('ejs');
const session = require('express-session');
const passport=require("passport")
const passportLocalMongoose = require('passport-local-mongoose');


app.use(session({
  secret:"Our_gamify_secret",
  resave:false,
  saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://localhost:27017/cpDB");
let coderSchema=new mongoose.Schema({
    username: String,
    password:String
  });

 coderSchema.plugin(passportLocalMongoose);

 const Coder = new mongoose.model("Coder",coderSchema);


 passport.use(Coder.createStrategy());
 passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  Coder.findById(id, function(err, user) {
    done(err, user);
  });
});


// these needs to be installed



var ret = [];  // final problem list
var failed = 0;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname));

// show the results in the problems.html page
app.get("/problems.html", (req, res) => {
  res.render('problems', {ret: ret, failed: failed});
});

app.post("/problems.html", async function(req, res){
  ret = [];
  failed = 0;
  
  // read data from the user input form
  const handle = req.body.handle;
  const minRating = req.body.minRating;
  const maxRating = req.body.maxRating;
  const numberOfProblems = req.body.noOfProblems;
  
  // get all problems attempted by the specified handle using CF api
  const count = "100000";
  const from = "1";
  const url = "https://codeforces.com/api/user.status?handle=" + handle + "&from=" + from + "&count=" + count;
  var solvedProblems = [];
  var problemList = [];
  await axios.get(url)
    .then(function(response){
      var len = response.data.result.length;
      for(var i = 0; i < len; i++){
        var rating = response.data.result[i].problem.rating;
        
        // only keep those problems that i) are solved (accepted verdict) by the handle and ii) within the given rating range
        if(response.data.result[i].verdict === "OK" && minRating <= rating && rating <= maxRating){
          var contestId = response.data.result[i].problem.contestId.toString();
          var index = response.data.result[i].problem.index;
          solvedProblems.push(contestId+index);
        }
      }
    })
    .catch(function(error){
      failed = 1;
    });
  
  // get the full problemset using CF api
  const problemsetURL = "https://codeforces.com/api/problemset.problems?";
  await axios.get(problemsetURL)
    .then(function(response){
      var len = response.data.result.problems.length;
      for(var i = 0; i < len; i++){
        var currentRating = response.data.result.problems[i].rating;
        
        //only keep those problem that are within the given rating range
        if(minRating <= currentRating && currentRating <= maxRating){
          var contestId = response.data.result.problems[i].contestId.toString();
          var index = response.data.result.problems[i].index;
          var name = response.data.result.problems[i].name;
          problemList.push({id: contestId+index, name: name, rating: currentRating});
        }
      }
    });
  var left = numberOfProblems;
  var alreadyTaken = [];
  while(left > 0){
    
    // take a random index from problemList[] (array that contains acceptable problems for this particular query by the user)
    var randomPosition = Math.floor(Math.random() * problemList.length);
    var currentId = problemList[randomPosition].id;
    var f = 1;
    
    //check if this random problem was already taken before
    for(var i = 0; i < alreadyTaken.length; i++){
      if(alreadyTaken[i] === randomPosition) f = 0;
    }
    
    //check if this random problem were solved previously by the user handle
    for(var i = 0; i < solvedProblems.length; i++){
      if(solvedProblems[i] === currentId) f = 0;
    }
    
    // if all ok then take this problem
    if(f){
      ret.push(problemList[randomPosition]);
      alreadyTaken.push(randomPosition);
      left--;
    }
  }
  res.redirect("/problems.html");
});
// signup and signin codes

app.post("/login",function(req,res){

  const coder=new Coder({
      username: req.body.username,
      password: req.body.password
  });

  req.login(coder,function(err){
    if(err){
      console.log(err);
      res.redirect("/");
    }else{
      passport.authenticate("local")(req,res,function(){
        // console.log(req.user);
        res.render("underConstruction");
        // res.send(JSON.parse(res));
      });
    }
  });
});



app.post("/register",function(req,res){

  Coder.register({username : req.body.username}, req.body.password, function(err,user){
    if(err){
      console.log(err);
      res.redirect("/errorPage");
    }else{
      passport.authenticate("local")(req,res,function(){
        res.render("underConstruction");
      });
    }
  });

});
app.post("/signout",function(req,res){
  req.logout();
  res.sendFile(__dirname+"/index.html");
});


// to here
app.listen(3000);
