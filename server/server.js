var session = require('express-session')
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser')
var logger = require('morgan');

// var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/users');

var app = express();
const cors = require('cors')
const server = require('http').createServer(app)
const fs = require("fs");
//for future automatic refreshing
const { Server } = require("socket.io")
const jwt = require('jsonwebtoken')

const io = new Server(server)
const port = process.env.PORT || 8080;

app.use(cors({
  origin: 'http://localhost:4200',
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, 
}));

app.use(cookieParser('secret'));

app.use(session({
  cookie: { secure: false, sameSite: 'none' },
  name: 'session',
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  maxAge: 1000*60*60,
}))

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
//app.use('/', express.static(path.join(__dirname, 'public'), { index: ['index.html'] }));

// app.use('/', express.static(path.join(__dirname, '../frontend/dist/bccompsciconnect/browser')));
// app.get('/*', function(req, res) {
//   res.sendFile(path.join(__dirname, '../frontend/dist/bccompsciconnect/browser/index.html'));
// });

// internal modules
const db = require('./models/db')


app.get('/', async (req, res) => {
  console.log(req.session.user)
  const boards = await db.helpers.getBoards();
  res.json(boards)
})

app.get('/usercheck', async (req, res) => {
  let name = req.query.name
  let exists = false;
  const user = await db.helpers.getUser(name);
  console.log('User length:' + user.length)
  if(user.length !== 0) {
    exists = true;
  }
  res.json({
    exists: exists
  })
})

app.post('/register', async (req, res) => {
  let name = req.body.name;
  let email = req.body.email;
  let password = req.body.password

  await db.helpers.addUser(name, email, password, 'user');
  res.redirect(303, '/');
})

app.post('/login', async (req, res) => {
  let username = req.body.name
  let password = req.body.password

  const targetUser = await db.helpers.getUser(username);
  if(targetUser.length === 0)
  {
    console.log('Account not found')
    res.send({"status": "failed"})
  }
  else if(username === targetUser[0].username && password === targetUser[0].password)
  {
    req.session.user = {username: username, password: password}
    if(req.session.user) {
      console.log(req.session.id)
    }
    req.session.save();
    res.send({"status": "success"})
  }
})



// BOARDS //

app.get('/board', async (req, res) => {
  const boards = await db.helpers.getBoards();
  res.json(boards)
})

// Either id based params (the easy way) or hard coded board topics into url (e.g. /java or /algorithms, etc)
app.get('/board/:id', async(req, res) => {
  try {
    let id = req.params.id

    // i.e. /board/:id/?page=<number>
    let page = req.query.page
    let offset = 0;
    let range = 100;

    //if there is a page number query grab associated topics
    if(Object.keys(req.query).length !== 0) {
      offset = (page - 1) * 10;
      range = page * 10;
    }
    
    const board = await db.helpers.getBoard(id)
    const topics = await db.helpers.getTopicsByRange(id, offset, range);
    res.json({
      board: board,
      topics: topics
    })
  } catch (err) {
    console.log("Redirect or 404 here")
  }
  
})

app.get('/board/:id/latest', async(req, res) => {
  try {
    let id = req.params.id;
    let range = 10;
    let offset = 0;

    const board = await db.helpers.getBoard(id)
    const topics = await db.helpers.getTopicsByRange(id, offset, range);
    res.json({
      board: board,
      topics: topics
    })
  } catch (err) {
    console.log("Redirect or 404 here")
  }
})



app.post('/board', async (req, res) => {
  let boardTitle = req.body.boardTitle;
  const board = await db.helpers.addBoard(boardTitle);
  res.redirect(303, '/board')
})

app.put('/board/:boardId', async (req, res) => {
  let boardId = req.params.boardId;
  let boardTitle = req.body.boardTitle;
  await db.helpers.editBoard(boardId, boardTitle)
  res.redirect(303, '/board')
})

app.delete('/board/:boardId', async (req, res) => {
  let boardId = req.params.boardId;
  const deletedBoard = await db.helpers.deleteBoard(boardId);
  res.redirect(303, '/board');
})

// TOPICS AND POSTS //

app.post('/board/:boardId', async (req, res) => {
  let boardId = req.params.boardId;
  let question = req.body.question
  await db.helpers.addTopic(boardId, question);
  res.redirect(`/board/${boardId}`)
})

app.post('/board/:boardId/latest', async (req, res) => {
  let boardId = req.params.boardId;
  let question = req.body.question
  await db.helpers.addTopic(boardId, question);
  res.redirect(`/board/${boardId}`)
})


app.get('/board/:boardId/topic/:topicId', async (req, res) => {
  let boardId = req.params.boardId;
  let topicId = req.params.topicId;
  const topic = await db.helpers.getTopic(topicId);
  const posts = await db.helpers.getPosts(topicId);
  const postCount = await db.helpers.getPostCount(topicId);

  //Subject to change; this just bundles the topic and associated Posts together
  res.json({
    topic: topic,
    posts: posts,
    postCount: postCount.rows[0].count
  })
})

app.delete('/board/:boardId/topic/:topicId', async (req, res) => {
  let boardId = req.params.boardId;
  let topicId = req.params.topicId
  await db.helpers.deleteTopic(topicId)
  res.redirect(302, `/board/${boardId}`)
})

app.post('/board/:boardId/topic/:topicId', async(req, res) => {
  let boardId = req.params.boardId;
  let topicId = req.params.topicId
  let text = req.body.text
  await db.helpers.addPost(topicId, text)
  res.redirect(302, `/board/${boardId}/topic/${topicId}`);
})

//CHANGING THESE ENDPOINTS LATER IF NEEDED
app.delete('/board/:boardId/topic/:topicId/delete', async(req, res) => {
  let boardId = req.params.boardId;
  let topicId = req.params.topicId
  let postId = req.body.postId;
  await db.helpers.deletePost(postId);
  res.redirect(302, `/board/${boardId}/topic/${topicId}`);
})

app.put('/board/:boardId/topic/:topicId/edit', async(req, res) => {
  let boardId = req.params.boardId;
  let topicId = req.params.topicId

  let postId = req.body.postId;
  let postText = req.body.text;

  await db.helpers.editPost(postId, postText)
  res.redirect(302, `/board/${boardId}/topic/${topicId}`);
})


//TODO: Socket connection

function isLoggedIn(req, res, next) {
  if(req.session.user) {
    next()
  }
  else
  {
    //some login redirect
  }
}


// Initialize the database
async function InitDB() {
  await db.helpers.init()
  console.log("Successfully init db")
}

InitDB().then(() => {
  app.listen(port, () => {
    console.log(`Listening on port ${port}`)
  })
})
.catch((err) => { console.log(err)})




module.exports = app;
