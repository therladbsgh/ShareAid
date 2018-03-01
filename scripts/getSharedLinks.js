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
  console.log('finished collecting posts');
  links = []
  for (var d in data) {
    if (!data[d].link) continue;
    if (data[d].link.includes('facebook')) continue;
    links.push(data[d].link);
  }
  console.log(links);
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
