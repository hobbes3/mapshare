<?php
require_once('db_config.php');
require_once('error_handler.php');

class Map {
	private $mMysqli;

	function __construct() {
		$this -> mMysqli = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE);
	}

	function __destruct() {
		$this -> mMysqli -> close();
	}

	public function getSqlValue($kamei_id, $key) {
		$kamei_id = $this -> mMysqli -> real_escape_string($kamei_id);

		$sqlCommand = "SELECT $key FROM mapshare WHERE kamei_id = \"$kamei_id\"";

    $result = $this -> mMysqli -> query($sqlCommand);
		$row    = $result -> fetch_array(MYSQLI_ASSOC);
		$value = $row[$key];
		$result -> close();
		//fb($key, "key");
		//fb($row, "row");
		//fb($value, "value");

		return $value;
	}

	public function isRowEmpty($kamei_id) {
		$value = $this -> getSqlValue($kamei_id, 'kamei_id');
		//fb($value);

		return is_null($value);
	}

	public function checkDbCorruption($kamei_id) {
		fb("Checking for database corruption...");
		$kamei_id = $this -> mMysqli -> real_escape_string($kamei_id);

		$sqlCommand = "SELECT lat, lng, zoom, mapType, marker_count, marker_lastId, markers FROM mapshare WHERE kamei_id = \"$kamei_id\"";

		$result = $this -> mMysqli -> query($sqlCommand);
		$row    = $result -> fetch_array(MYSQLI_ASSOC);
		$result -> close();

		foreach($row as $key => $value) {
			$$key = $value;
		}

		if($lat < -90 || $lat > 90)
			return "latitude value was out of bounds";
		if($lng < -180 || $lng > 180)
			return "longtitude value was out of bounds";
		if($zoom < 0 || $zoom > 22)
			return "zoom value was out of bounds";
		if($mapType != 'SATELLITE' && $mapType != 'ROADMAP' && $mapType != 'HYBRID' && $mapType != 'TERRAIN')
			return "map type was invalid";
		if($marker_count < 0)
			return "marker count was negative";

		// the if statement below doesn't work, need to fix later
		//fb($markers, "markers");
		//fb($markers == '', "is markers an empty string?");
		//fb(simplexml_load_string($markers), "simplexml_load_string()");
		//if(simplexml_load_string($markers) === false && $markers != '')
			//return "marker data was not a well-formed XML string";

		$markersExploded = explode('<marker ', $markers);
		//fb($markersExploded, "markersExploded");
		//fb(sizeof($markersExploded), "sizeof(markersExploded)");
		if($marker_count != sizeof($markersExploded) - 1)
			return "marker_count did not agree with marker data";
		if(sizeof($markersExploded) > 1) {
			$lastId = 0;
			foreach($markersExploded as $key => $value) {
				//fb($value);
				if($value == "") {
					continue;
				}
				$nowId = intval($this -> getMarkerAttribute($value, 'id'));
				if($nowId <= $lastId) {
					return "marker ids were not in increasing order";
				} else {
					$lastId = $nowId;
				}
			}
			fb($lastId, "lastId");
			fb($marker_lastId, "marker_lastId");
			if($nowId > $marker_lastId) {
				return "marker last id does not match marker data";
			}
		}
		// sequential check no longer valid since markers can now be deleted
		/*for($i = 1; $i < sizeof($markersExploded); $i++) {
			//fb($i, "i");
			//fb($this -> getMarkerId($markersExploded[$i]), "markerId");
			if($this -> getMarkerId($markersExploded[$i]) != $i)
				return "markers were not sequential";
		}*/
		return "NO ERRORS FOUND";
	}

	public function getMarkerAttribute($marker, $attributeName) {
		fb($marker, "marker");
		$attributeName .= "='";
		$startPos = strpos($marker, $attributeName) + strlen($attributeName) - 1;
		$endPos   = strpos($marker, "'", $startPos + 1);
		fb($startPos, "startPos");
		fb($endPos,   "endPos");
		$returnedValue = substr($marker, $startPos + 1, $endPos - $startPos - 1);
		fb($returnedValue, "returned value");
		return $returnedValue;
	}

	public function insertData($mode, $dataArray, $status) {
		$kamei_id = $dataArray['kamei_id'];
		unset($dataArray['kamei_id']);
		$user = $dataArray['user'];
		$date = str_replace('+',  '.' . date('u') . '+', date('c'));
		$sqlCommand = "";

		if($mode == 'init') {
			if(strpos($status, "database was corrupted") !== false) {
				$sqlCommand = "UPDATE mapshare SET";
				$firstElement = true;
				foreach($dataArray as $key => $value) {
					if($firstElement) {
						// first element will be "user" which has a string value
						$sqlCommand .= " $key = \"$value\"";
						$firstElement = false;
					} else {
						if(is_string($value)) {
							$sqlCommand .= ", $key = \"$value\"";
						} else {
							$sqlCommand .= ", $key = $value";
						}
					}
				}
				$sqlCommand .= ", date = \"" . $date  . "\" WHERE kamei_id = \"$kamei_id\"";
			} else if(strpos($status, "new row created") !== false) {
				$sqlCommand = "INSERT INTO mapshare VALUES (\"$kamei_id\"";
				foreach($dataArray as $value) {
					if(is_string($value)) {
						$sqlCommand .= ", \"$value\"";
					} else {
						$sqlCommand .= ", $value";
					}
				}
				$sqlCommand .= ", \"$date\")";
			}
		} else {
			$newMarkers    = false;
			$updateMarkers = false;
			$sqlCommand = "UPDATE mapshare SET date = \"$date\"";
			$markerCount = intval($this -> getSqlValue($kamei_id, 'marker_count'));
			foreach($dataArray as $key => $value) {
				if($key == 'modifiedMarkers') {
					fb("MODIFIED MARKERS");
					if($markerCount) {
						$markersSql = $this -> getSqlValue($kamei_id, 'markers');
						fb($markersSql, "markerSql BEFORE");
						$markersSqlExploded  = explode('<marker ', $markersSql);
						$markersSentExploded = explode('<marker ', $value);
						fb($markersSentExploded, "markersSentExploded");
						fb($markersSqlExploded, "markersSqlExploded");
						foreach($markersSentExploded as $sentKey => $sentValue) {
							if($sentValue == "") {
								continue;
							}
							$markerSentId     = intval($this -> getMarkerAttribute($sentValue, 'id'));
							$markerLastAction = $this -> getMarkerAttribute($sentValue, 'lastAction');
							foreach($markersSqlExploded as $sqlKey => $sqlValue) {
								if($sqlValue == "") {
									continue;
								}
								$markerSqlId = intval($this -> getMarkerAttribute($sqlValue, 'id'));
								if($markerSentId == $markerSqlId) {
									if($markerLastAction == 'deleted') {
										fb("deleting marker (id: $markerSentId) from SQL");
										unset($markersSqlExploded[$sqlKey]);
										$markerCount--;
									} else {
										$markersSqlExploded[$sqlKey] = $markersSentExploded[$sentKey];
									}
								}
							}
							fb($markersSqlExploded, "markersSqlExploded");
						}
						$markersSql = implode('<marker ', $markersSqlExploded);
						fb($markersSql, "markerSql AFTER");
						$updateMarkers = true;
					} else {
						fb("WARNING: Trying to modify a non-existant marker!");
					}
				} else if($key == 'marker_count') {
					$sqlCommand .= ", $key = $markerCount";
				} else if($key == 'newMarkers') {
					fb("NEW MARKERS");
					if($value == 'deleteAll')
						$sqlCommand .= ", marker_count = 0, marker_lastId = 0, markers = \"\"";
					else {
						// if it's already set from modifiedMarkers
						if(!isset($markersSql)) {
							$markersSql = $this -> getSqlValue($kamei_id, 'markers');
						}
						$markersSentExploded = explode('<marker ', $value);
						fb($markersSentExploded, "markersSentExploded");
						fb($markersSql, "markersSql BEFORE");
						$lastId = intval($this -> getSqlValue($kamei_id, 'marker_lastId'));
						for($i = 1; $i < sizeof($markersSentExploded); $i++) {
							$markersSql .= "<marker id='" . ($i + $lastId) . "' " . $markersSentExploded[$i];
							$markerCount++;
						}
						fb($markersSql, "markersSql AFTER");
						$lastId += $i - 1;
						fb($lastId, "lastId");
						$newMarkers    = true;
						$updateMarkers = true;
					}
				} else {
					if(is_string($value)) {
						$sqlCommand .= ", $key = \"$value\"";
					} else {
						$sqlCommand .= ", $key = " . $value;
					}
				}
			}

			if($newMarkers || $updateMarkers) {
				if($newMarkers) {
					$sqlCommand .= ", marker_lastId = " . $lastId;
				}
				if($updateMarkers) {
					$sqlCommand .= ", markers = \"$markersSql\"";
				}
				$sqlCommand .= ", marker_count = $markerCount";
			}
			$sqlCommand .= " WHERE kamei_id = \"$kamei_id\"";
		}
		if($sqlCommand === "") {
			fb("sqlCommand: Nothing to update");
		} else {
			fb($sqlCommand, "sqlCommand");
			$this -> mMysqli -> query($sqlCommand);
		}
		$this -> createResponse($kamei_id, $user, $mode, $status);
	}

	public function createResponse($kamei_id, $user, $mode, $status) {
		$response = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>" .
								"<response>" .
		            "<request>" .
								"<kamei_id>$kamei_id</kamei_id>" .
								"<user>$user</user>" .
								"<mode>$mode</mode>" .
								"</request>" .
		            "<status>$status</status>";

		//if(strpos($status, 'retrieved') !== false) {
			$kamei_id = $this -> mMysqli -> real_escape_string($kamei_id);
			//$user     = $this -> mMysqli -> real_escape_string($user);

			$sqlCommand = "SELECT ";

			$dataViewTypes = array('lat', 'lng', 'zoom', 'mapType', 'marker_count', 'markers');

			$firstElement = true;
			foreach($dataViewTypes as $value) {
				if($firstElement) {
					$sqlCommand .= $value;
					$firstElement = false;
				} else {
					$sqlCommand .= ", $value";
				}
			}

			$sqlCommand .= " FROM mapshare WHERE kamei_id = \"$kamei_id\"";

			//fb($sqlCommand, "sqlCommand RESPONSE");

			$result = $this -> mMysqli -> query($sqlCommand);
			$row = $result -> fetch_array(MYSQLI_ASSOC);
			$result -> close();

			$response .= "<view>";
			foreach($dataViewTypes as $value) {
				$response .= "<$value>" . $row[$value] . "</$value>";
			}
			$response .= "</view>";
		//}

		$response .= "</response>";

		//fb($response, "xml RESPONSE");

		// clear the output
		if(ob_get_length()) ob_clean();

		// to prevent caching
		header('Expires: Fri, 25 Dec 1980 00:00:00 GMT'); // time in the past
		header('Last-Modified: ' . gmdate('D, d M Y H:i:s') . 'GMT');
		header('Cache-Control: no-cache, must-revalidate');
		header('Pragma: no-cache');
		header('Content-Type: text/xml');

		echo $response;
	}
}
?>
