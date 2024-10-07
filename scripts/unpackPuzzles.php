<?php
	$count=1;
	function deleteFolders($dir) {
		$ffs = scandir($dir);
		unset($ffs[array_search('.', $ffs, true)]);
		unset($ffs[array_search('..', $ffs, true)]);
		foreach($ffs as $ff){
			if (is_dir($dir.'/'.$ff)) {
				rrmdir($dir.'/'.$ff);
				rmdir($dir.'/'.$ff);
			}
		}
	}

	function rrmdir($dir) {
		if (is_dir($dir)) {
			$objects = scandir($dir);
			foreach ($objects as $object) {
				if ($object != "." && $object != "..") {
					if (filetype($dir."/".$object) == "dir") 
						rrmdir($dir."/".$object); 
					else unlink   ($dir."/".$object);
				}
			}
			reset($objects);
			rmdir($dir);
		}
	}
	function listFolderFiles($dir){
		global $count;
		$ffs = scandir($dir);

		unset($ffs[array_search('.', $ffs, true)]);
		unset($ffs[array_search('..', $ffs, true)]);

		// prevent empty ordered elements
		if (count($ffs) < 1)
			return;

		foreach($ffs as $ff){
			if(is_dir($dir.'/'.$ff)) {
				listFolderFiles($dir.'/'.$ff);
			}
			else {
				$puz = file_get_contents($dir.'/'.$ff);
				$puz = json_decode($puz,true);
				if ($puz!=null and isset($puz['size']) and $puz['size']['cols']==15) {
					copy($dir.'/'.$ff,'../puzzleSrc/puz_'.$count.'.json');
					echo '<p>From:'.$dir.'/'.$ff.', To:../puzzleSrc/puz_'.$count.'.json'.'</p>';
					$count=$count+1;
				}
			}
		 }
	}

listFolderFiles('../puzzleSrc');
deleteFolders('../puzzleSrc');
?>