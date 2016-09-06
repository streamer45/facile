'use strict';

function loadScript(url) {
  return new Promise((res, rej) => {
    const req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.responseType = 'blob';
    req.onload = () => {
      const blob = req.response;
      const blobURL = URL.createObjectURL(blob);
      res(blobURL);
    };
    req.onerror = (e) => {
      rej(e);
    };
    req.send();
  });
}

module.exports = {
  loadScript
};
