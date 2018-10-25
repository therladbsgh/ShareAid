// HOW TO USE:
// While in this directory, run in a terminal: python -m SimpleHTTPServer 8000 &
// In a browser, go to localhost://8000/getSharedLinks.html
// Click the Call Graph API button. 
// If you are not logged in to Facebook, it may ask you to log in and give permission for this app to access your timeline.
// It will take a few seconds to get all of the links. An alert will appear on the screen when it is finished. 
// (If a minute passes, check the browser console to see if anything went wrong)
// When it is finished, a Download button will appear - click it to download your links as a csv

window.fbAsyncInit = function() {
  FB.init({
    appId            : '125590924761098',
    autoLogAppEvents : true,
    xfbml            : true,
    version          : 'v2.10'
  });
  FB.AppEvents.logPageView();
};

function dataFinished(data){
  $('.loadingText.graph').css('display', 'none');
  $('.loadingText.history').css('display', 'block');
  console.log('finished collecting links', data);
  $.ajax({
    type: 'POST',
    data: JSON.stringify(data),
    contentType: 'application/json',
    url: 'http://localhost:3000/analyzeHistory',						
    success: result => {
      $('.loadingWrapper').fadeOut(400, () => {
        $('.facebookPost').fadeIn();
      })
    }
  });
}

function getNextPage(link, data) {
  FB.api(link, response => {
    data = data.concat(response.data)
    if (response.paging && response.paging.next) {
      getNextPage(response.paging.next, data);
    } else {
      dataFinished(data);
    }
  });
}

function graphCall() {
  $('.buttonWrapper').fadeOut(400, () => {
    $('.loadingWrapper').fadeIn();
  });
  FB.login(function(){
    data = []
    console.log('collecting posts...');
    FB.api("/me/feed?fields=id,link",
    function (response) {
      if (response.paging && response.paging.next) {
        getNextPage(response.paging.next, response.data);
      }
    });
   }, {scope: 'user_posts'});
}

(function(d, s, id){
   var js, fjs = d.getElementsByTagName(s)[0];
   if (d.getElementById(id)) {return;}
   js = d.createElement(s); js.id = id;
   js.src = "https://connect.facebook.net/en_US/sdk.js";
   fjs.parentNode.insertBefore(js, fjs);
 }(document, 'script', 'facebook-jssdk'));
