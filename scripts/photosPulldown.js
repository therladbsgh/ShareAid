window.fbAsyncInit = function() {
    FB.init({
      appId            : '125590924761098',
      autoLogAppEvents : true,
      xfbml            : true,
      version          : 'v2.10'
    });
    FB.AppEvents.logPageView();
  };

  function graphCall() {
    FB.login(function(){
      FB.api("/me/photos?fields=id,name,picture",
      function (response) {
        if (response && !response.error) {
          response.data.map(photo => {
            fetch(photo.picture).then(photoData => {
              const reader = photoData.body.getReader();
              
            });
          })
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
