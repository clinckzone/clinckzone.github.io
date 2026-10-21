// Clears the grey loading placeholder from each image once it has loaded
// (or failed), so transparent images don't keep a grey background.
document.querySelectorAll("img.img-ph").forEach(function (img) {
  const done = function () {
    img.classList.add("loaded");
  };

  if (img.complete) {
    done();
  } else {
    img.addEventListener("load", done);
    img.addEventListener("error", done);
  }
});
