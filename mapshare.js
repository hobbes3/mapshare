var mapShareURL = "mapshare.php";

var updateInterval = 1000;
var maxMarkerLimit = 100;

//var panStepInterval = 30;
//var panTime         = 1000;

var map;
var geocoder;
var status;

// default view
var lat  = 32.5;
var lng  = 175;
var zoom = 3;
var mapType = "ROADMAP";

var newMarkersToSend      = new Array();
var markersLocal          = new Array();
var modifiedMarkersToSend = new Array();
var markersLocalIdentified = 0;
//var markerDeleteString = "<br><br><a href='#' onClick='deleteMarker(this);'>Delete this marker</a>";
var markerDeleteString = "<br><br><i>Right click the marker to delete.</i>";

//var tilesLoadingStatus = "Loading...";

var xmlHttpUpdateMap = createXmlHttpRequestObject();
var xmlRequestInfo;
var params;
var response;

window.onload = init;

// the initialization function which gets run first
function init() {
	// debugging only available in Firefox's FireBug
	if(typeof console === "undefined") {
		console = {
			log:  function() {},
			warn: function() {},
			info: function() {}
		};
	}

    new Draggable('control');
    new Draggable('debug');

	console.log(modifiedMarkersToSend);

	//console.log("init(): mode: " + xmlRequestInfo.mode);
	status = document.getElementById("status");

	showStatus("Loading...");

	map = new google.maps.Map(document.getElementById("map"), {
		zoom: zoom,
		center: new google.maps.LatLng(lat, lng),
		mapTypeId: mapType
	});
	geocoder = new google.maps.Geocoder();

	resetXmlRequest();
	xmlRequestInfo.mode = "init"; // for updateMap();
	updateMap();

	google.maps.event.addListener(map, 'center_changed', function() { eventCenterChanged(); });
	google.maps.event.addListener(map, 'zoom_changed', function() { eventZoomChanged(); });
	//google.maps.event.addListener(map, 'dragend', function() { eventDragEnd(); });
	google.maps.event.addListener(map, 'click', function(event) { eventClick(event.latLng); });
	google.maps.event.addListener(map, 'maptypeid_changed', function() { eventMapTypeChanged(); });
	//google.maps.event.addListener(map, 'tilesloaded', function() { eventTilesLoaded(); });

	debugUpdateCenter();
	debugUpdateZoom();
	debugUpdateView();
	debugUpdateTiles();

	if(debugMode) {
		document.getElementById("B_row").style.visibility                = "visible";
		document.getElementById("createMarkerB_Button").style.visibility = "visible";
		document.getElementById("getDirectionsButton").style.visibility  = "visible";
		document.getElementById("debug").style.visibility                = "visible";
		document.getElementById("debug_markerId").innerHTML         = "No markers selected.";
		document.getElementById("debug_markerWindowOpen").innerHTML = "No markers selected.";
	}
}

// function to change the status text
function showStatus(message) {
	status.innerHTML = message;
}

// to successfully create a XML HTTP Request under most browsers
function createXmlHttpRequestObject() {
	var xmlHttp;

	try {
		xmlHttp = new XMLHttpRequest();
	} catch(e) {
		// IE6 or older
		var XmlHttpVersions = new Array("MSXML2.XMLHTTP.6.0",
		                                "MSXML2.XMLHTTP.5.0",
		                                "MSXML2.XMLHTTP.4.0",
		                                "MSXML2.XMLHTTP.3.0",
		                                "MSXML2.XMLHTTP",
		                                "Microsoft.XMLHTTP");

		for(var i = 0; i < XmlHttpVersions.length && !xmlHttp; i++) {
			try{
				xmlHttp = new ActiveXObject(XmlHttpVersions[i]);
			} catch(e) { }
		}
	}

	if(!xmlHttp)
		alert("Error creating the XMLHttpRequest object.");
	else
		return xmlHttp;
}

// this is a function that updates and checks the map, gets called in time intervals
function updateMap() {
	console.log("mode", xmlRequestInfo.mode);
	console.log("markersLocal",          markersLocal);
	console.log("modifiedMarkersToSend", modifiedMarkersToSend);
	console.log("newMarkersToSend",     newMarkersToSend);

	if(xmlHttpUpdateMap) {
		try {
			if(xmlHttpUpdateMap.readyState == 4 || xmlHttpUpdateMap.readyState == 0) {
				showStatus("Updating...");

				params = "mode=" + xmlRequestInfo.mode;
				//console.log("updateMap(): mode: " + xmlRequestInfo.mode);
				if(xmlRequestInfo.mode == "send") {
					if(xmlRequestInfo.center)
						params += "&lat=" + lat + "&lng=" + lng;

					if(xmlRequestInfo.zoom) {
						params += "&zoom=" + zoom;
					}
					if(xmlRequestInfo.mapType) {
						params += "&mapType=" + mapType;
					}
					if(xmlRequestInfo.clearMarkers) {
						params += "&newMarkers=deleteAll";
					} else {
						if(newMarkersToSend.length) {
							// new markers don't have ids
							params += "&newMarkers=" + createMarkersXml(newMarkersToSend, true);
						}
						if(modifiedMarkersToSend.length) {
							var i;
							console.log("Before: ", modifiedMarkersToSend);
							for(i = 0; i < modifiedMarkersToSend.length; i++) {
								if(typeof(modifiedMarkersToSend[i]) == "undefined") {
									modifiedMarkersToSend.splice(i, 1);
									i--;
								}
							}
							console.log("After: ", modifiedMarkersToSend);
							// modified markers already have ids
							if(modifiedMarkersToSend.length) {
								params += "&modifiedMarkers=" + createMarkersXml(modifiedMarkersToSend, false);
							}
						}
					}
					if(params.indexOf('&') == -1) {
						params = "mode=retrieve";
					}
				}
				console.info("PARAMS: ", params);
				xmlHttpUpdateMap.open("POST", mapShareURL, true);
				xmlHttpUpdateMap.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
				xmlHttpUpdateMap.onreadystatechange = handleUpdatingMap;
				xmlHttpUpdateMap.send(params);
			} else { // busy
				setTimeout("updateMap();", 1000);
			}
		} catch(e) {
			alert("Can't connect to server:\n" + e.toString());
		}
	} else {
		alert("The XMLHttpRequest object is null!");
	}
}

// after the AJAX response comes this function "handles" the response
function handleUpdatingMap() {
	if(xmlHttpUpdateMap.readyState == 4) {
		if(xmlHttpUpdateMap.status == 200) {
			//try {
				console.log("handleUpdateMap(): mode: " + xmlRequestInfo.mode);
				displayUpdates();
			//} catch(e) {
				//alert("Error updating the map:\n" + e.toString() + "\n" + xmlHttpUpdateMap.responseText);
			//}
		} else {
			alert("There was a problem when updating the map:\n" + xmlHttpUpdateMap.statusText);
		}
	}
}

// the function to modify the viewer's content (if neccessary) to maintain view content synchronization
function displayUpdates() {
	console.log("displayUpdate()");
	function parseAndCheckMarkers(markersXmlReceived) {
		console.log("parseAndCheckMarkers()");
		console.log("markersXmlReceived.length", markersXmlReceived.length);
		console.log("markersLocal.length", markersLocal.length);
		console.log("markersXmlReceived", markersXmlReceived);
		var markersReceived = new Array();
		var i;
		for(i = 0; i < markersXmlReceived.length; i++) {
			markersReceived[i] = {
				id: 0,
				lat: 0,
				lng: 0,
				text: "",
				windowOpen: false,
				isLocal: false
			};
			markersReceived[i].id         = parseInt(markersXmlReceived[i].getAttribute("id"));
			markersReceived[i].lat        = parseFloat(markersXmlReceived[i].getAttribute("lat"));
			markersReceived[i].lng        = parseFloat(markersXmlReceived[i].getAttribute("lng"));
			markersReceived[i].text       = markersXmlReceived[i].getAttribute("text");
			markersReceived[i].windowOpen = markersXmlReceived[i].getAttribute("windowOpen") === "true";
		}
		console.log("markersReceived", markersReceived);

		//try {
			console.info("Checking for deleted markers...");
			var deleted = false;
			for(i = 0; i < markersReceived.length; i++) {
				console.log("i = ", i, markersReceived[i]);
				if(!markersLocal[i]) {
					console.log("Local marker " + (i + 1) + " doesn't exist");
					break;
				} else if(markersLocal[i].marker.id > 0) {
					console.log("Local marker " + (i + 1) + " is identified");
					var j;
					//while(!isSameMarker(markersLocal[i], markersReceived[i])) {
					for(j = i; j < markersLocal.length; j++) {
						console.log("j =  ", j, markersLocal[j]);
						if(markersLocal[i].marker.id != markersReceived[i].id) {
							if(markersLocal[i].marker.id < markersReceived[i].id) {
								deleteMarker(markersLocal[i].marker, markersLocal[i].infoWindow, false);
								deleted = true;
							} else {
								console.warn("WARNING: Local marker #" + (j + 1) + " should have existed");
								//criticalMarkerReconstruction(markersReceived);
							}
						} else {
							break;
						}
					}
				}
			}
			if(markersLocal.length > markersReceived.length) {
				console.log("Local markers still longer than received markers");
				for(i = markersReceived.length; i < markersLocal.length; i++) {
					console.log("i = ", i);
					deleteMarker(markersLocal[i].marker, markersLocal[i].infoWindow, false);
				}
				deleted =  true;
			}
			if(!deleted) {
				console.log("No markers are deleted");
			}

			console.info("Identifying local markers...");
			for(i = 0; i < markersLocal.length; i++) {
				if(i < markersLocalIdentified) {
					if(markersLocal[i].marker.id == markersReceived[i].id) {
						markersReceived[i].isLocal = true;
					} else {
						console.warn("WARNING: Local marker does not sync with received marker at position " + (i + 1));
						console.log("Local id:", markersLocal[i].marker.id);
						console.log("Received id:", markersReceived[i].id);
						//criticalMarkerReconstruction(markersReceived);
					}
				} else {
					console.warn("Local marker #" + (i + 1) + " is unidentified!");
					console.log("The unidentified marker", markersLocal[i].marker);
					// sync marker ids
					var identified = false;
					var j;
					for(j = 0; j < markersReceived.length; j++) {
						if(!markersReceived[j].isLocal) {
							console.log("markersXmlReceived[" + j + "]", markersReceived[j]);
							if(isSameMarker(markersLocal[i], markersReceived[j])) {
								var id = markersReceived[j].id;
								markersLocal[i].marker.id = id;
								markersLocal[i].marker.setZIndex(id);
								markersLocal[i].infoWindow.setZIndex(id);
								identified = true;
								markersLocalIdentified++;
								markersReceived[j].isLocal = true;
								break;
							}
						}
					}

					if(identified) {
						console.info("Unidentified local marker #" + (i + 1) + " identified as " + (j + 1));
					} else {
						console.warn("WARNING: Sent local marker # " + (i + 1) + " could not be identified!");
						//criticalMarkerReconstruction(markersReceived);
					}
				}
			}
			if(markersLocal.length != markersLocalIdentified) {
				console.warn("WARNING: Not every marker was successfully identified!");
				criticalMarkerReconstruction(markersReceived);
			}

			console.info("Creating new markers...");
			var created = false;
			for(i = 0; i < markersReceived.length; i++) {
				if(!markersReceived[i].isLocal) {
					var location = new google.maps.LatLng(markersReceived[i].lat, markersReceived[i].lng);
					createSingleMarker(location, markersReceived[i].text, markersReceived[i].windowOpen, markersReceived[i].id);
					created = true;
				}
			}
			if(!created) {
				console.log("No new markers created");
			}

			console.info("Sorting local markers...");
			console.log("Unsorted", markersLocal);
			markersLocal = markersLocal.sort(function(a, b) {
				return a.marker.id - b.marker.id;
			});
			console.log("Sorted", markersLocal);

			console.info("Validating local markers id...");
			var error = false;
			if(markersLocal.length != markersReceived.length) {
				console.warn("WARNING: Local markers length and received markers length are different!");
				error = true;
			} else {
				for(i = 0; i < markersLocal.length; i++) {
					if(markersLocal[i].marker.id != markersReceived[i].id) {
						console.warn("WARNING: Local marker #" + (i + 1) + " does not sync with received marker #" + (i + 1));
						console.log("Local id:", markersLocal[i].marker.id);
						console.log("Received id:", markersReceived[i].id);
						error = true;
						//criticalMarkerReconstruction(markersReceived);
					}
				}
			}
			if(!error) {
				console.log("Local markers ids valid");
			}

			console.info("Checking local markers for changes...");
			var change = false;
			for(i = 0; i < markersLocal.length; i++) {
				// check for modifications and update markers if needed
				if(markersLocal[i].marker.position.lat() != markersReceived[i].lat || markersLocal[i].marker.position.lng() != markersReceived[i].lng) {
					console.log("marker position different");
					markersLocal[i].marker.position = new google.maps.LatLng(markersReceived[i].lat, markersReceived[i].lng);
					markersLocal[i].marker.setMap(null);
					markersLocal[i].marker.setMap(map);
					change = true;
				}
				if(markersLocal[i].marker.windowOpen != markersReceived[i].windowOpen) {
					console.log("marker windowOpen different");
					markersLocal[i].marker.windowOpen = markersReceived[i].windowOpen;
					if(markersReceived[i].windowOpen) {
						markersLocal[i].infoWindow.open(map, markersLocal[i].marker);
					} else {
						markersLocal[i].infoWindow.close();
					}
					change = true;
				}
				var location = new google.maps.LatLng(markersReceived[i].lat, markersReceived[i].lng);
				//console.log("Local marker's getContent()", markersLocal[i].infoWindow.getContent());
				//console.log("Received marker's text", markupMarkerText(markersReceived[i].text, location));
				if(markersLocal[i].infoWindow.getContent() != markupMarkerText(markersReceived[i].text, location)) {
					console.log("marker text different");
					markersLocal[i].infoWindow.setContent(markupMarkerText(markersReceived[i].text, location));
					change = true;
				}
			}
			if(!change) {
				console.log("All local markers are in sync.")
			}
		//} catch(e) {
			//criticalMarkerReconstruction(markersReceived);
		//}
	} // parseAndCheckMarkers()

	response = xmlHttpUpdateMap.responseText;

	if(response.indexOf("ERRNO") >= 0 || response.indexOf("error:") >= 0 || response.length == 0)
		throw(response.length == 0 ? "Response was empty!" : response);

	response = xmlHttpUpdateMap.responseXML.documentElement;

	var responseStatus = response.getElementsByTagName("status").item(0).firstChild.data;

	//console.log("displayUpdates()1: mode: " + xmlRequestInfo.mode);
	if(responseStatus.indexOf("WARNING") >= 0) {
		console.warn(responseStatus);
	} else {
		console.info(responseStatus);
	}

	lat     = parseFloat(response.getElementsByTagName("lat").item(0).firstChild.data);
	lng     = parseFloat(response.getElementsByTagName("lng").item(0).firstChild.data);
	zoom    = parseInt(response.getElementsByTagName("zoom").item(0).firstChild.data);
	mapType = response.getElementsByTagName("mapType").item(0).firstChild.data;

	//console.log("displayUpdates()3: mode: " + xmlRequestInfo.mode);
	var markerCountServer = parseInt(response.getElementsByTagName("marker_count").item(0).firstChild.data);
	var	markersXmlReceived = response.getElementsByTagName("marker");
	// need to create new markers locally

	if(markersLocal.length && !markerCountServer) {
		deleteAllMarkers(true, false);
	} else if(!xmlRequestInfo.clearMarkers && markersXmlReceived.length > 0) {
		parseAndCheckMarkers(markersXmlReceived);
	}

	// weird: after this block of code, xmlRequestInfo.mode = "send" ???
	console.info("Checking if map view needs to be updated...");
	var change = false;
	if(lat != map.getCenter().lat() || lng != map.getCenter().lng()) {
		console.log("map center different");
		map.panTo(new google.maps.LatLng(lat, lng));
		//panTo(map, oldLat, oldLng, lat, lng); // hopefully v3 API will replace this custom made function in the future
		change = true;
	}
	if(zoom != map.getZoom()) {
		console.log("map zoom different");
		map.setZoom(zoom);
		change = true;
	}
	if(mapType != map.getMapTypeId()) {
		console.log("map type different");
		map.setMapTypeId(mapType);
		change = true;
	}
	if(!change) {
		console.log("map view is in sync: no changes necessary");
	}

	showStatus("Idle");
	resetXmlRequest();
	modifiedMarkersToSend.length = 0;
	newMarkersToSend.length      = 0;
	markersLocalUnidentified = -1;

	if(!debugMode) {
		setTimeout("updateMap();", updateInterval)
	} else {
		debugMarkersLocal();
	}
}

// a function to check whether 2 markers are the same based on lat, lng, opened/closed info window, info window content
function isSameMarker(markerLocal, markerReceived) {
	console.log("isSameMarker()");
	// local markers are API markers, received markers are custom made
	// thus lat, lng, and text must be handled differently between the 2 markers
	console.log("local lat", markerLocal.marker.position.lat(), "received lat", markerReceived.lat);
	if(markerLocal.marker.position.lat() != markerReceived.lat)
		return false;
	console.log("local lng", markerLocal.marker.position.lng(), "received lng", markerReceived.lng);
	if(markerLocal.marker.position.lng() != markerReceived.lng)
		return false;
	console.log("local windowOpen", markerLocal.marker.windowOpen, "received windowOpen", markerReceived.windowOpen);
	if(markerLocal.marker.windowOpen != markerReceived.windowOpen)
		return false;

	return true;
}

// simple geocoding to create a marker by address
function createMarkerFromAddress(whichInput) {
	var address = document.getElementById("address" + whichInput).value;
	console.log("Address", address);
	if(geocoder) {
		geocoder.geocode({
			address: address
		}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				if (status != google.maps.GeocoderStatus.ZERO_RESULTS) {
					var markerText = "";
					xmlRequestInfo.mode = "send";

					if(status == google.maps.GeocoderStatus.OK) {
						markerText = results[0].formatted_address;
					} else {
						markerText = status;
					}
					createSingleMarker(results[0].geometry.location, markerText, true, markersLocalUnidentified);
					markersLocalUnidentified--;
				} else {
					alert("No results found.");
				}
			} else {
				alert("Geocode was not successful for the following reason: " + status);
			}
		});
	}
}

// this function activates when something terrible goes wrong with the marker script
function criticalMarkerReconstruction(markersReceived) {
	console.warn("WARNING: CRITICAL MARKER RECONSTRUCTION");

	deleteAllMarkers(true, true);
	var i;
	for(i = 0; i < markersLocal.length; i++) {
		var location = new google.maps.LatLng(markersReceived[i].lat, markersReceived[i].lng);
		createSingleMarker(location, markersReceived[i].text, markersReceived[i].windowOpen, markersReceived[i].id);
	}
}

// directions currently not supported in Google Maps API v3 as of 2009/08/19
function getDirections() {
	alert("Sorry, directions are currently not supported in version 3 of Google Maps API.");
}

// resets the XML request information
function resetXmlRequest() {
	xmlRequestInfo = {
		mode: "retrieve",
		center: false,
		zoom: false,
		mapType: false,
		clearMarkers: false
	};
}

// for debugging to view the lat and lng in real time
function eventCenterChanged() {
	tilesLoadingStatus = "Loading...";
	xmlRequestInfo.mode = "send";
	xmlRequestInfo.center = true;

	lat = map.getCenter().lat();
	lng = map.getCenter().lng();

	debugUpdateCenter();
	debugUpdateTiles();
}

// debugging
function eventZoomChanged() {
	tilesLoadingStatus = "Loading...";
	xmlRequestInfo.mode = "send";
	xmlRequestInfo.zoom = true;

	zoom = map.getZoom();

	debugUpdateZoom();
	debugUpdateTiles();
}

// debugging
function eventMapTypeChanged() {
	tilesLoadingStatus = "Loading...";
	xmlRequestInfo.mode = "send";
	xmlRequestInfo.mapType = true;

	mapType = map.getMapTypeId();

	debugUpdateView();
	debugUpdateTiles();
}

// currently inactive
function eventDragEnd() {

}

// when the user clicks on the map -> create a marker
function eventClick(location) {
	//console.log("eventClick()");
	if(markersLocal.length >= maxMarkerLimit) {
		alert("Sorry, too many markers!");
		return;
	}

	if(geocoder) {
		geocoder.geocode({
			latLng: location
		},
		function(results, status) {
			var markerText = "";
			xmlRequestInfo.mode = "send";

			if(status == google.maps.GeocoderStatus.OK) {
				markerText = results[0].formatted_address;
			} else {
				markerText = status;
			}
			//console.log("evenClick(): " + markerText);
			createSingleMarker(location, markerText, true, markersLocalUnidentified);
			markersLocalUnidentified--;
		});
	}
}

// an important function for creating a single marker
function createSingleMarker(location, markerText, markerWindowOpen, id) {
	console.info("createSingleMarker()");
	console.log("markerWindowOpen", markerWindowOpen);
	console.log("id", id);
	var marker = new google.maps.Marker({
		position: location,
		map: map,
		zIndex: markersLocal.length + 1//,
		//draggable: true
	});
	marker.id = id;
	marker.lastAction = "created";

	var infoWindow = new google.maps.InfoWindow({
		//disableAutoPan: xmlRequestInfo.mode == "init",
		disableAutoPan: true,
		zIndex: markersLocal.length + 1
	});

	infoWindow.setContent(markupMarkerText(markerText, location));
	if(markerWindowOpen) {
		infoWindow.open(map, marker);
		marker.windowOpen = true;
	} else
		marker.windowOpen = false;

	google.maps.event.addListener(marker, 'click', function() {
		if(marker.windowOpen) {
			infoWindow.close();
			marker.windowOpen = false;
		} else {
			infoWindow.open(map, marker);
			marker.windowOpen = true;
		}

		if(marker.id > 0) {
			modifiedMarkersToSend[marker.id] = {
				marker: marker,
				infoWindow: infoWindow
			};

			if(marker.windowOpen) {
				modifiedMarkersToSend[marker.id].marker.lastAction = "info window opened";
			} else {
				modifiedMarkersToSend[marker.id].marker.lastAction = "info window closed";
			}
			xmlRequestInfo.mode = "send";
		}
	});

	google.maps.event.addListener(marker, 'rightclick', function() { deleteMarker(marker, infoWindow, true); });

	google.maps.event.addListener(infoWindow, 'closeclick', function() {
		xmlRequestInfo.mode = "send";
		infoWindow.close();
		marker.windowOpen = false;

		if(marker.id > 0) {
			modifiedMarkersToSend[marker.id] = {
				marker: marker,
				infoWindow: infoWindow
			};
			modifiedMarkersToSend[marker.id].marker.lastAction = "info window closed";
			xmlRequestInfo.mode = "send";
		}
	});

	if(debugMode) {
		google.maps.event.addListener(marker, 'mouseover', function() {
			document.getElementById("debug_markerId").innerHTML         = marker.id;
			document.getElementById("debug_markerWindowOpen").innerHTML = marker.windowOpen;
		});

		google.maps.event.addListener(marker, 'mouseout', function() {
			document.getElementById("debug_markerId").innerHTML         = "No markers selected.";
			document.getElementById("debug_markerWindowOpen").innerHTML = "No markers selected.";
		});
	}

	if(id > 0) { // Has id: Received
		markersLocalIdentified++;
	} else { // Doesn't have id: Local
		newMarkersToSend.push({
			marker: marker,
			infoWindow: infoWindow
		});
	}

	markersLocal.push({
		marker: marker,
		infoWindow: infoWindow
	});

	if(debugMode) {
		debugMarkersLocal();
	}
}

function debugMarkersLocal() {
	function createMarkerIdListString(markersLocal) {
		var string = "[";
		var i;
		for(i = 0; i < markersLocal.length; i++) {
			string += " " + markersLocal[i].marker.id;
		}
		string += " ]";
		return string;
	}
	document.getElementById("debug_markerLocalIdList").innerHTML     = createMarkerIdListString(markersLocal);
	document.getElementById("debug_markerLocalLength").innerHTML     = markersLocal.length;
	document.getElementById("debug_markerLocalIdentified").innerHTML = markersLocalIdentified;
}

// plain text for AJAX -> "pretty" text for the info window
function markupMarkerText(markerText, location) {
	markerText = "Lat: " + location.lat() + " Lng: " + location.lng() + " Address: " + markerText;
	var prettyMarkerText = markerText.replace("Lat: ", "<b>Lat:</b> ").replace(" Lng: ", "<br><b>Lng:</b> ").replace(" Address: ", "<br><b>Address:</b> ");
	prettyMarkerText += markerDeleteString;
	return unescape(prettyMarkerText);
}

// "pretty" text for the info window -> plain text for AJAX
function markdownMarkerText(prettyMarkerText) {
	console.log("markdownMarkerText()");
	console.log("prettyMarkerText:", prettyMarkerText);
	//var markerText = prettyMarkerText.replace("<b>Lat: </b>", "Lat: ").replace("<br><b>Lng: </b>", " Lng: ").replace("<br><b>Address: </b>", " Address: ").replace(markerDeleteString, "");
	//console.log("markerText", markerText);
	// truncate everything past the 'Address:' and the 'Delete this marker' part
	var markerText = prettyMarkerText.substring(prettyMarkerText.indexOf("<br><b>Address:</b> ") + 20).replace(markerDeleteString, "");
	console.log("markerText:", markerText);
	return escape(markerText);
}

// takes the marker/info window object and converts to XML format
function createMarkersXml(markersArrayToSend, isCreation) {
	console.log("createMarkersXml");
	console.log("isCreation", isCreation);
	var xmlString = "";
	for(i = 0; i < markersArrayToSend.length; i++) {
		markerLat        = markersArrayToSend[i].marker.position.lat();
		markerLng        = markersArrayToSend[i].marker.position.lng();
		markerWindowOpen = markersArrayToSend[i].marker.windowOpen;
		markerLastAction = markersArrayToSend[i].marker.lastAction;
		prettyMarkerText = markersArrayToSend[i].infoWindow.getContent();

		//console.log("i = " + i + " markerLat: " + markerLat);
		//console.log("i = " + i + " markerLng: " + markerLng);
		//console.log("i = " + i + " markerWindowOpen: " + markerWindowOpen);
		//console.log("i = " + i + " prettyMarkerText: " + prettyMarkerText);
		xmlString += "<marker ";
		if(!isCreation) {
			xmlString += "id='" + markersArrayToSend[i].marker.id + "' ";
		}
		xmlString += "lat='" + markerLat + "' lng='" + markerLng + "' text='" + markdownMarkerText(prettyMarkerText) + "' windowOpen='" + markerWindowOpen + "' lastAction='" + markerLastAction + "'/>";
	}
	console.log("xmlString", xmlString);
	return xmlString;
}

// an important function to delete a single marker
function deleteMarker(marker, infoWindow, toSend) {
	console.log("Marker to be deleted", marker);
	console.log("markersLocal before:", markersLocal);
	var found = false;
	var i;
	for(i = 0; i < markersLocal.length; i++) {
		if(marker.id == markersLocal[i].marker.id) {
			markersLocal.splice(i, 1);
			found = true;
			break;
		}
	}
	if(marker.id > 0) {
		console.log("identified marker deleted");
		markersLocalIdentified--;
	} else {
		console.log("unidentified marker deleted");
	}
	if(!found) {
		console.warn("WARNING: Couldn't find the marker to delete");
		//criticalMarkerReconstruction(markersReceived);
	}

	console.log("markersLocal after:", markersLocal);
	if(toSend) {
		if(marker.id < 0) {
			var i;
			for(i = 0; i < newMarkersToSend.length; i++) {
				if(marker.id == newMarkersToSend[i].marker.id) {
					console.log("Removing deleted marker (id: " + marker.id + ") from newMarkersToSend (location: " + i + ")...");
					newMarkersToSend.splice(i, 1);
					break;
				}
			}
		} else {
			modifiedMarkersToSend[marker.id] = {
				marker: marker,
				infoWindow: infoWindow
			};

			xmlRequestInfo.mode = "send";
			modifiedMarkersToSend[marker.id].marker.lastAction = "deleted";
		}
	}
	marker.setMap(null);
	infoWindow.close();

	if(debugMode) {
		debugMarkersLocal();
	}
}

// when the "Clear markers" button is pressed or AJAX response calls for deleting all markers
function deleteAllMarkers(forcedAction, doNotSend) {
	var confirmation = true;

	if(!forcedAction)
		confirmation = confirm("Delete all markers?");

	if(confirmation) {
		for(i = 0; i < markersLocal.length; i++) {
			markersLocal[i].marker.setMap(null);
			markersLocal[i].infoWindow.close();
		}

		markersLocal.length = 0;
		markersLocalIdentified = 0;
		if(!doNotSend) {
			xmlRequestInfo.mode = "send";
			xmlRequestInfo.clearMarkers = true;
		}
	}

	if(debugMode) {
		debugMarkersLocal();
	}
}

// when "Open all info windows" button is clicked
function openAllInfoWindows() {
	modifiedMarkerArrayAllInfoWindow(true);
}

// when "Close all info windows" button is clicked
function closeAllInfoWindows() {
	modifiedMarkerArrayAllInfoWindow(false);
}

// either opens all closed info windows or close all opened info windows
function modifiedMarkerArrayAllInfoWindow(toOpen) {
	var i;
	for(i = 0; i < markersLocal.length; i++) {
		var marker     = markersLocal[i].marker;
		var infoWindow = markersLocal[i].infoWindow;
		var isOpen     = marker.windowOpen;
		var markerModified = false;

		if(toOpen && !isOpen) {
			marker.windowOpen = true;
			infoWindow.open(map, marker);
			markerModified = true;
		} else if(!toOpen && isOpen) {
			marker.windowOpen = false;
			infoWindow.close();
			markerModified = true;
		}

		if(markerModified) {
			modifiedMarkersToSend[marker.id] = {
				marker: marker,
				infoWindow: infoWindow
			};
			if(toOpen) {
				modifiedMarkersToSend[marker.id].marker.lastAction = "info window opened";
			} else {
				modifiedMarkersToSend[marker.id].marker.lastAction = "info window closed";
			}
			xmlRequestInfo.mode = "send";
		}
	}
}

// this function is inactive
function eventTilesLoaded() {
	tilesLoadingStatus = "Loading done!";
	debugUpdateTiles();
}

// real-time update for lat, lng debug info
function debugUpdateCenter() {
	document.getElementById("debug_lat").innerHTML = lat;
	document.getElementById("debug_lng").innerHTML = lng;
}

// ... for zoom
function debugUpdateZoom() {
	document.getElementById("debug_zoom").innerHTML = zoom;
}

// .. for map type
function debugUpdateView() {
	document.getElementById("debug_mapType").innerHTML = mapType;
}

// inactive
function debugUpdateTiles() {
//	document.getElementById("debug_tiles").innerHTML = tilesLoadingStatus;
}

