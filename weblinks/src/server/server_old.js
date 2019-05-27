const express = require('express');
const bodyParser = require('body-parser');
const { spawn, exec } = require('child_process');
const socketio = require('socket.io');
const fs = require('fs');
const kill  = require('tree-kill');
const { PythonShell } = require('python-shell');

const app = express();
app.use(bodyParser.json());

app.use(express.static('style'));
app.use(express.static('assets'));
app.use(express.static('utils'));

app.listen(5000, () => console.log('Server started at port 5000.'));

const io = socketio();
io.listen(1337);
console.log("Websockets listening on port 1337.");

io.on('connection', (socket) => {
  console.log('Client connected');
  let childRunning = false;

  socket.on('analyze', (data) => {
    console.log("Analysis starting");
    childRunning = true;
    process.chdir('utils');
    fs.writeFileSync("data/facebookPosts.txt", JSON.stringify(data));
    const child = spawn("/home/rladbsgh/anaconda3/bin/python", ["browserHistory.py"]);
    console.log(child.pid);
    process.chdir('../..');

    child.stdout.on('data', data => {
      if (!childRunning) {
        child.kill("SIGINT");
        kill(child.pid + 1);
      }
      const tmp = "" + data;
      console.log(tmp);
      if (tmp.substring(0, 4) !== "Log:") {
        const dataObject = JSON.parse(data);
        if (dataObject['suggest?']) {
          console.log("Suggesting!!!");
          io.emit('suggest', dataObject);
        }
      }
    });

    child.stderr.on('data', (data) => {
      console.log("" + data);
    });
  });

  socket.on('blacklist', (data) => {
    const fd2 = fs.openSync('utils/data/reinforce_negative.txt', 'a+');
    fs.appendFileSync(fd2, data + "\n");
  });

  socket.on('whitelist', (data) => {
    const fd = fs.openSync('utils/data/reinforce_positive.txt', 'a+');
    fs.appendFileSync(fd, data + "\n");
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    childRunning = false;
  });
});

// app.post('/analyzeHistory', (req, res) => {
//   const fbData = req.body.data;
//   const child = spawn(`cd utils && ~/anaconda3/bin/python browserHistory.py ${fbData}`, {
//     shell: true
//   });
//   const results = [];

//   child.stdout.on('data', data => {
//     console.log("ABCABCABC");
//     const stringData = "" + data;
//     results.push(stringData);
//   });

//   child.on('exit', () => {
//     view = {
//       username: 'Philip Hinch',
//       source: 'NYTimes',
//       link: 'https://www.nytimes.com/2018/02/27/travel/montgomery-alabama-history-race.html',
//       linkMainText: 'In Montgomery, A City Embedded With Pain, Finding Progress',
//       linkSubText: 'The Alabama city has a complicated history, heavy with racial tensions. But it\'s also a powerful place, and a friendly one for travelers.',
//     };
//     results.push(view);
//     console.log(results);
//     res.json(view);
//   });

//   child.stderr.on('data', (data) => {
//     console.log("" + data);
//   });
// });
