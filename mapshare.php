<?php
session_start();

require_once("mapshare.class.php");

// for debugging
require_once("FirePHPCore/fb.php");

if(isset($_SESSION['kamei_id'])) {
	$kamei_id = $_SESSION['kamei_id'];
} else { }

if(isset($_SESSION['connect_type'])) {
	$user = $_SESSION['connect_type'];
} else { }

$mode = $_POST['mode'];

$map = new Map();

function doInsertData($map, $mode, $kamei_id, $user, $status) {
	$dataArray['kamei_id'] = $kamei_id;
	$dataArray['user']     = $user;

	if(strpos($status, '[write]') !== false) {
		// ordering is important, it needs to be modifiedMarkers then newMarkers
		$dataViewTypes = array('lat', 'lng', 'zoom', 'mapType', 'modifiedMarkers', 'newMarkers');

		foreach($dataViewTypes as $value) {
			if(isset($_POST[$value])) {
				$data = $_POST[$value];

				if($value == 'lat' || $value == 'lng'){
					$data = floatval($data);
				}
				if($value == 'zoom' || $value == 'marker_count') {
					$data = intval($data);
				}
				$dataArray[$value] = $data;
			}
		}

		if($mode == 'init') {
			// default values (same value in JavaScript too)
			$dataArray['lat']           = 32.5;
			$dataArray['lng']           = 175;
			$dataArray['zoom']          = 3;
			$dataArray['mapType']       = "roadmap";
			$dataArray['marker_count']  = 0;
			$dataArray['marker_lastId'] = 0;
			$dataArray['markers'] = '';
		}
	}
	fb($dataArray, "dataArray");
	$map -> insertData($mode, $dataArray, $status);
}

$status = "ERROR";
if($mode == 'init') {
	if($map -> isRowEmpty($kamei_id)) {
		$status = "OK: [write][read] kamei_id did not existed, new row created";
	} else {
		$reason = $map -> checkDbCorruption($kamei_id);
		if(strpos($reason, 'NO ERRORS') !== false) {
			$status = "OK: [read] kamei_id existed";
		} else {
			$status = "WARNING: [write][read] kamei_id existed, but database was corrupted [$reason], row reinitialized";
		}
	}
} else if($mode == 'send') {
	$status = "OK: [write][read] row updated";
	if(isset($_POST['newMarkers'])) {
		if($_POST['newMarkers'] == 'deleteAll') {
			$status = "OK: [write][read] markers deleted";
		}
	}
} else if($mode = 'retrieve') {
	$status = "OK: [read]";
}

doInsertData($map, $mode, $kamei_id, $user, $status);
?>
