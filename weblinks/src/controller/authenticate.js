const { BrowserWindow, ipcMain, session } = require('electron');
const FB = require('fb');
const fs = require('fs');

var Env = JSON.parse(fs.readFileSync(`${__dirname}/../env.json`));

function getNextPage(link, data, callback) {
  FB.api(link, response => {
    data = data.concat(response.data)
    if (response.paging && response.paging.next) {
      this.getNextPage(response.paging.next, data, callback);
    } else {
      callback(data);
    }
  });
}

function graphCall(access_token, callback) {
  data = []
  FB.setAccessToken(access_token);
  Env.access_token = access_token;
  fs.writeFileSync(`${__dirname}/../env.json`, JSON.stringify(Env, null, 4));

  FB.api("/me/feed?fields=id,link,caption,description,full_picture,message,name,permalink_url",
  function (response) {
    if (response.paging && response.paging.next) {
      getNextPage(response.paging.next, response.data, callback);
    }
  });
}

function onFbAuthenticate(mainWindow) {
  // Code to create fb authentication window
  ipcMain.on('fb-authenticate', function (event, arg) {
    if (Env.use_sample_data) {
        const fbPosts = JSON.parse(fs.readFileSync(path.join(__dirname, 'files/facebookPosts.txt')));
        mainWindow.webContents.send('fb_authenticate', {facebookData: fbPosts});
        return;
    }

    var options = {
        client_id: Env.fb_client_id,
        scopes: 'email',
        redirect_uri: 'https://www.facebook.com/connect/login_success.html'
    };

    var authWindow = new BrowserWindow({
        width: 450,
        height: 300,
        show: false,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            nodeIntegration: false
        }
    });
    var facebookAuthURL = `https://www.facebook.com/v3.2/dialog/oauth?client_id=${options.client_id}&redirect_uri=${options.redirect_uri}&response_type=token,granted_scopes&scope=${options.scopes}&display=popup`;

    authWindow.loadURL(facebookAuthURL);
    authWindow.webContents.on('did-finish-load', function () {
        authWindow.show();
    });

    var access_token, error;
    var closedByUser = true;

    var handleUrl = function (url) {
        var raw_code = /access_token=([^&]*)/.exec(url) || null;
        access_token = (raw_code && raw_code.length > 1) ? raw_code[1] : null;
        error = /\?error=(.+)$/.exec(url);

        if (access_token || error) {
            closedByUser = false;
            graphCall(access_token, function (res) {
              fs.writeFileSync(`${__dirname}/../files/facebookPosts.txt`, JSON.stringify(res));
              mainWindow.webContents.send('fb_authenticate', {facebookData: res});
            });
            authWindow.close();
        }
    }

    authWindow.webContents.on('will-navigate', (event, url) => handleUrl(url));
    var filter = {
        urls: [options.redirect_uri + '*']
    };
    session.defaultSession.webRequest.onCompleted(filter, (details) => {
        var url = details.url;
        handleUrl(url);
    });

    authWindow.on('close', () => event.returnValue = closedByUser ? { error: 'The popup window was closed' } : { access_token, error })
  })
}

function onFbCheckAuth(mainWindow) {
  ipcMain.on('fb-check-auth', function (event, arg) {
    if (Env.use_sample_data) {
        mainWindow.webContents.send('fb-check-auth-result', {result: true});
        return;
    }

    if (!Env.access_token) {
      mainWindow.webContents.send('fb-check-auth-result', {result: false});
      return;
    }

    FB.setAccessToken(Env.access_token);
    FB.api("/me/permissions", (response) => {
      if (response.error) {
        mainWindow.webContents.send('fb-check-auth-result', {result: false});
      } else {
        graphCall(Env.access_token, (res) => {
          fs.writeFileSync(`${__dirname}/../files/facebookPosts.txt`, JSON.stringify(res));
          mainWindow.webContents.send('fb-check-auth-result', {result: true});
        });
      }
    });
  })

}

module.exports = {
  onFbAuthenticate: onFbAuthenticate,
  onFbCheckAuth: onFbCheckAuth
}
