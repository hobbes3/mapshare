<?php
session_start();

$version = "v1.0";

if(isset($_REQUEST['kamei_id'])) {
	$kamei_id = $_REQUEST['kamei_id'];
	$_SESSION['kamei_id'] = $kamei_id;
} else if(isset($_SESSION['kamei_id'])) {
	$kamei_id = $_SESSION['kamei_id'];
} else {
	$_SESSION['kamei_id'] = 'TEMPORARY TEST KAMEI ID';
}

if(isset($_REQUEST['user'])) {
	$user = $_REQUEST['connect_type'];
	$_SESSION['connect_type'] = $user;
} else if(isset($_SESSION['user'])) {
	$user = $_SESSION['connect_type'];
} else {
	$_SESSION['connect_type'] = mt_rand();
}

if(isset($_REQUEST['debug'])) {
	$debug = $_REQUEST['debug'];
} else {
	$debug = 'false';
}

$pageContents = <<< EOPAGE
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns = "http://www.w3.org/1999/xhtml" xml:lang = "en" lang = "en">
	<head>
		<title>MapShare $version</title>
		<meta http-equiv = "Content-Type" content = "text/html; charset = UTF-8"/>
		<link href = "mapshare.css" rel = "stylesheet" type = "text/css"/>

        <script type = "text/javascript" src = "http://maps.google.com/maps/api/js?key=AIzaSyCNoZIIJIgDFab5EKGXreee7xZBHafc6wM&sensor=false"></script>
        <script type = "text/javascript">
            var debugMode = $debug;
        </script>
		<script type = "text/javascript" src = "mapshare.js"></script>
	</head>
	<body>
		<noscript>This application requires JavaScript!!</noscript>

		<div id = "title">MapShare $version</div>

		<div id = "map"></div>

		<div id = "status">Idle...</div>

		<div id = "directions">
			<table>
				<tr id = "A_row">
					<td>A:</td><td><input id = "addressA" type = "text" size = "100"/></td>
				</tr>
				<tr id = "B_row">
					<td>B:</td><td><input id = "addressB" type = "text" size = "100"/></td>
				</tr>
			</table>
			<input id = "createMarkerA_Button" type = "button" onclick = "createMarkerFromAddress('A');" value = "Create a marker at A"/>
			<input id = "createMarkerB_Button" type = "button" onclick = "createMarkerFromAddress('B');" value = "Create a marker at B"/>
			<input id = "getDirectionsButton" type = "button" onclick = "getDirections();" value = "Get directions from A to B"/>
		</div>

		<div id = "controls">
			<input id = "clearMarkersButton" type = "button" onclick = "deleteAllMarkers(false);" value = "Delete all markers"/>
			<input id = "openAllInfoWindowButton" type = "button" onclick = "openAllInfoWindows();" value = "Open all info windows"/>
			<input id = "closeAllInfoWindowButton" type = "button" onclick = "closeAllInfoWindows();" value = "Close all info windows"/>
		</div>

		<div id="debug">
			<b>==DEBUG==</b><br/>
			<input id = "updateMapButton" type = "button" onclick = "updateMap();" value = "Execute updateMap() once"/><br/>
			<b>Lat:</b> <span id = "debug_lat"></span><br/>
			<b>Lng:</b> <span id = "debug_lng"></span><br/>
			<b>Zoom:</b> <span id = "debug_zoom"></span><br/>
			<b>View:</b> <span id = "debug_mapType"></span><br/>
			<b>Marker id:</b> <span id = "debug_markerId"></span><br/>
			<b>Marker windowOpen:</b> <span id = "debug_markerWindowOpen"></span><br/>
			<b>Marker local id list:</b> <span id = "debug_markerLocalIdList"></span><br/>
			<b>Marker local length:</b> <span id = "debug_markerLocalLength"></span><br/>
			<b>Marker local identified:</b> <span id = "debug_markerLocalIdentified"></span><br/>
			<!--<b>Tiles:</b> <span id = "debug_tiles"></span><br/>-->
		</div>
	</body>
</html>
EOPAGE;

echo $pageContents;
?>
