$("document").ready(() => {
  function rotateImage(orientationText, imageNode, wrapperNode) {
    console.log(orientationText);
    if (!orientationText || orientationText == "Horizontal (normal)") {
      imageNode.css('transform', 'rotate(0deg)');
      wrapperNode.css('height', 'initial');
      return;
    }
    orientationText = orientationText.split(' ')
    degree = orientationText[1]
    if (orientationText[2] == 'CW') {
      imageNode.css('transform', 'rotate(90deg)')
      wrapperNode.css('height', '600px');
    } else if (orientationText[2] == 'CCW') {
      imageNode.css('transform', 'rotate(270deg)')
      wrapperNode.css('height', '600px');
    } else if (!orientationText[2]) {
      imageNode.css('transform', 'rotate(' + degree + 'deg)')
      wrapperNode.css('height', 'initial');
    }
  }

  function setPhoto() {
    $.get('/loadPhoto', data => {
      rotateImage(data['Orientation'], $('.postedImage'), $('.photo'))
      $('.postedImage').attr('src', data['SourceFile'].replace('assets/', ''));
      $('.caption').text(data['Caption'])
    })
  }

  setPhoto();

  $(".newPhotoButton").click(() => {
    setPhoto();
  })
})
