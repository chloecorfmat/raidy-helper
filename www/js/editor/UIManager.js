var UIManager = function(){

}

UIManager.prototype.enableMapDownloadBarHide = function() {
  document.getElementById('downloadStatusBar').addEventListener('click', function() {
    this.classList.remove("statusBar--visible");
  });
}


UIManager.prototype.resetAddPOIPopin = function(distance) {
  document.getElementById('addPoi_name').value = "";
  document.getElementById('addPoi_nbhelper').value = "";
}

UIManager.prototype.displayCheckinOutZone = function() {
	document.getElementById('checkInButton').classList.add('checkin--out--zone');
	document.getElementById('checkInButton').innerHTML = 'Hors Zone';
}
UIManager.prototype.displayCheckinInZone = function() {
	document.getElementById('checkInButton').classList.remove('checkin--out--zone');
	document.getElementById('checkInButton').innerHTML = 'Valider ma position';
}
UIManager.prototype.displayCheckInPoi = function() {
	document.getElementById('checkInButton').classList.add('checkin--validated');
	document.getElementById('checkInButton').innerHTML = 'Position validée';
}

UIManager.prototype.showCheckInBox = function() {
	document.getElementById('checkInBox').classList.add("checkInBox--visible")
}
UIManager.prototype.hideCheckInBox = function() {
	document.getElementById('checkInBox').classList.remove("checkInBox--visible")
}
UIManager.prototype.updatePoiDistance = function(distance) {
  if (distance !=null) {
    document.getElementById('myPoiDistance').innerHTML = distance + "m";
  }
}