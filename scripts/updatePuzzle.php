<?php
	$files =  glob('../puzzleSrc/puz*.json');
	$puz = file_get_contents('../puzzleSrc/puz_'.rand(1,count($files)).'.json');
	$puz = str_replace('\"','&quot;',$puz);  // fix for javascript not handling single backslash
	file_put_contents('../messages/currentPuzzle.json',$puz);
?>