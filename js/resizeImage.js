document.addEventListener("DOMContentLoaded", function () {
  const images = document.querySelectorAll(".single .image img");
  console.log("Running resize script on", images);

  images.forEach(function (img) {
    const adjustImage = () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      if (ratio < 0.65) {
        img.style.width = "100%";
        img.style.height = "auto";
        img.style.maxHeight = "none";
      }
    };

    if (img.complete) {
      adjustImage();
    } else {
      img.onload = adjustImage;
    }
  });
});
