const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// make connection with MongoDB
mongoose.connect(process.env.URI);

// create user and exercise schemas
let userSchema = new mongoose.Schema({ username: String });

let exerciseSchema = new mongoose.Schema({
  user_id: String,
  date: Date,
  duration: Number,
  description: String
});

// create user and exercise models
let userModel = mongoose.model('user', userSchema);
let exerciseModel = mongoose.model('exercise', exerciseSchema);

// receive post request to create a new user
app.post('/api/users', async (req, res) => {
  // get input from request
  const input = req.body.username;

  // store username in database
  const userRecord = await new userModel({ username: input }).save();

  // respond with username and _id
  try {
    res.json({ username: input, _id: userRecord._id });
  }
  catch (err) {
    // if error
    console.error(err);
    res.json(err);
  }
});

// receive get request to show users
app.get('/api/users', async (req, res) => {
  try {
    // create array containing username and _id of each user
    const allUsers = await userModel.find();
    const usersArr = [...allUsers];
    res.send(usersArr);
  } catch (err) {
    console.error(err);
    res.json({ error: 'Internal Server Error' });
  }
});

// receive post request to log exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  // get _id from params
  const _id = req.params._id;

  // get duration, description from request body
  const duration = req.body.duration;
  const desc = req.body.description;

  // get date, if date is not specified, use current date
  let date = req.body.date ? new Date(req.body.date) : new Date();

  // if no date, get current date
  if (date == "" || date == undefined) {
    date = new Date().toDateString();
  }
  // get username from database
  const user = await userModel.findById(_id);
  // if user doesnt exist
  if (!user) {
    res.json({ error: "user does not exist" });
    return;
  }
  const username = user.username;

  // add exercise to database
  let exerciseRecord = await new exerciseModel({
    user_id: _id,
    date: date.toDateString(),
    duration: Number(duration),
    description: desc
  }).save();
  // respond with _id, username, description, duration and date
  res.json({
    _id: _id,
    username: username,
    date: date.toDateString(),
    duration: Number(duration),
    description: desc
  });
});

// receieve get request to get user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    // get _id, from, to and limit from params
    const _id = req.params._id;
    const from = req.query.from;
    const to = req.query.to;
    const limit = parseInt(req.query.limit) || 0; // it will be 0 if not specified 

    // get username from database
    const user = await userModel.findById(_id);
    // if user doesnt exist
    if (!user) {
      res.json({ error: "user does not exist" });
      return;
    }
    const username = user.username;

    // create filter to get log by id and by date from and to
    const filter = { user_id: _id };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    // get log based on filter and set limit if limit is specified (0 means return all)
    const fullLog = await exerciseModel.find(filter).limit(limit);

    // convert the dates to date strings
    const log = fullLog.map(element => ({
      ...element.toObject(),
      date: element.date.toDateString()
    }));

    // get count of user exercises
    const count = log.length;

    // respond with username, count, _id and array of log
    res.json({
      username: username,
      count: count,
      _id: _id,
      log: log
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
//    6595797b7d0c359254f1e167