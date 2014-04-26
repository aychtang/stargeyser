// Micro request module.

module.exports = function(url, cb) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.open("GET", url, false);
  xmlhttp.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
  xmlhttp.onreadystatechange = function() {
    cb(xmlhttp.response);
  };
  xmlhttp.send();
};
