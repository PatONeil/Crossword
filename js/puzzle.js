/* jshint esversion: 8   */
    puzzle = {
		currentCell:null,
		currentDir:'Across',
		currentClue:'',
		currentClueCell: null,
		currentFocus:null,
		getCurrentPuzzle: function(container) {
			let theme = localStorage.getItem('cwTheme')||'cwlight';
			document.documentElement.setAttribute('data-cwtheme',theme);
			document.addEventListener('contextmenu', function(e) {e.preventDefault();});
			window.addEventListener('resize',puzzle.setPuzzleWidth);
			container.innerHTML = `
				<div id="puzzleContainer">
					<div id="puzzleBody"></div>
					<div id="puzzleNav"></div>
					<div id="puzzleMenu"></div>
					<div id="puzzleClues"></div>
					<div id="puzzleKeyboard"></div>
			  </div> 
			`;
			fetch('messages/currentPuzzle.json', {
				cache: "no-store",
				method: 'GET',
				headers: {
				'Accept': 'application/json, text/plain, */*',
				'Content-Type': 'application/json'
				}
			}).
			then(res => {
				if (res.ok) return res.json();
				else Promise.reject('error');
			}).
			then(res => {
				this.puzzleSrc=res;
				this.generateKeyboardLayout();
				this.generatePuzzleNavigation(res);
				this.generatePuzzleClues(res);
				this.generatePuzzleHeader(res);
				this.generatePuzzleLayout(res);
				this.setupPuzzleCell();
				this.setupClues();
				this.setupNav();
				this.setupKeyboard();
				this.setupKeyPad();
				this.setupMenuHandler();
				this.setupSignalChannel();
				window.addEventListener('resize',puzzle.setPuzzleWidth);
			}).
			catch(error => {
				console.log('Puzzle not fetched, loading a new puzzle');
				puzzle.getNewPuzzle(false);
			});
		},
		setupSignalChannel: function() {
			document.addEventListener('ccReceive', function(event) {
				let newChar = event.detail; 
				let cells = document.querySelectorAll('.puzBox');
				let rows = parseInt(puzzle.puzzleSrc.size.rows);
				let row = parseInt(newChar.row);
				let col = parseInt(newChar.col);
				let cell = cells[row*rows+col]; 
				cell.querySelector('.puzChar').innerHTML=newChar.chr;
				
			});	
			// Update remote puzzle on Channel Open		
			document.addEventListener('ccRefresh', function(event) {
				let cells = document.querySelectorAll('.puzBox:not(.emptyCell)');
				for (let c of cells) {
					let ans  = c.dataset.chr;
					let chr=c.querySelector('.puzChar').innerHTML;
					if (chr!=' '&& chr==ans) {
						let event = new CustomEvent('ccSend', { detail:{chr:chr,row:c.dataset.row,col:c.dataset.col} });
						document.dispatchEvent(event);	
						if (chr==ans) 	c.classList.remove('cellError');
						else 			c.classList.add('cellError');
					}						
				}
			});
			document.addEventListener('ccNewPuz', function(event) {
				puzzle.getCurrentPuzzle(document.querySelector(".topPuzContainer"));
			});
		},
		clueChanged: function() {
			let cells = document.querySelectorAll('.puzBox');
			let rows = parseInt(this.puzzleSrc.size.rows);
			let cols = parseInt(this.puzzleSrc.size.cols);
			let clueNum = parseInt(puzzle.currentClue.dataset.num);
			let cell = document.querySelector('.puzBox[data-num="'+clueNum+'"]');
			puzzle.currentClueCell = cell;
			let row = parseInt(cell.dataset.row);
			let col = parseInt(cell.dataset.col);
			let i;
			if (this.currentDir=='Across') {
				for (i=col;i<cols;i++) {
					cell = cells[row*cols+i];
					if (cell.classList.contains('emptyCell')){
						cell = cells[row*cols+col];
						break;
					}
					if (cell.querySelector('.puzChar').innerHTML==' ') break;
				}
				if (i==cols) cell = cells[row*cols+col];
			}
			else {
				for (i=row;i<rows;i++) {
					cell = cells[i*rows+col];
					if (cell.classList.contains('emptyCell')){
						cell = cells[row*rows+col];
						break;
					}
					if (cell.querySelector('.puzChar').innerHTML==' ') break;
				}
				if (i==rows) cell = cells[row*rows+col];
			}
			cell.click();
		},
		puzzleKeyEntered: function(chr) {
			let cell = this.currentCell;
			let ans  = cell.dataset.chr;
			if (chr == '~') {
				return;
			}
			cell.querySelector('.puzChar').innerHTML=chr;
			if (chr==ans || chr==' ') 	cell.classList.remove('cellError');
			else {
				cell.classList.add('cellError');
				return;
			}
			// Dispatch a custom event
			let event = new CustomEvent('ccSend', { detail:{chr:chr,row:cell.dataset.row,col:cell.dataset.col} });
			document.dispatchEvent(event);			
			if (chr==' ') return;
			if (this.currentDir=='Across') 	this.puzCellMove('right',true);
			else							this.puzCellMove('down',true);
		},
		puzCellMove:   function(dir,skip=false) {
			let moveLeft  = function() {
				if (row==0 && col==0) {
					row=rows-1;
					col=cols-1;
					puzzle.currentCell=cells[row*rows+col];
					return;
				}
				if (col-1<0) {
					row--;
					if (row<0) row=rows-1;
					col = cols;
					moveLeft();
					return;
				}
				let ndx   = row*rows+col-1;
				let pCell = cells[ndx];
				if (pCell.classList.contains('emptyCell')||
						(skip==true && pCell.querySelector('.puzChar').innerHTML!=' ')) {
					col--;
					moveLeft();
					return;
				}
				puzzle.currentCell=pCell;
			};
			let moveRight = function() {
				if (row==rows-1 && col==col-1) {
					row=0;
					col=0;
					puzzle.currentCell=cells[row*rows+col];
					return;
				}
				if (col+1>=cols) {
					row++;
					if (row==rows) {
						row=0;
						col=0;
						puzzle.currentCell=cells[row*rows+col];
						return;
					}
					col = -1;
					moveRight();
					return;
				}
				let ndx   = row*rows+col+1;
				let pCell = cells[ndx];
				if (pCell.classList.contains('emptyCell')||
						(skip==true && pCell.querySelector('.puzChar').innerHTML!=' ')) {
					col++;
					moveRight();
					return;
				}
				puzzle.currentCell=pCell;
			};
			let moveUp 	  = function() {
				if (row==0 && col==0) {
					row=rows-1;
					col=cols-1;
					puzzle.currentCell=cells[row*rows+col];
					return;
				}
				if (row-1<0) {
					let previousSibling = puzzle.currentClue.previousSibling;
					if (previousSibling.classList.contains('puzClueHdr')) {
						row=rows-1;
						col=cols-1;
						puzzle.currentCell=cells[row*rows+col];
						return;
					}
					previousSibling.click();
					return;
				}
				let ndx   = (row-1)*rows+col;
				let pCell = cells[ndx];
				if (pCell.classList.contains('emptyCell')||
						(skip==true && pCell.querySelector('.puzChar').innerHTML!=' ')) {
					let previousSibling = puzzle.currentClue.previousSibling;
					if (previousSibling.classList.contains('puzClueHdr')) {
						row=rows-1;
						col=cols-1;
						puzzle.currentCell=cells[row*rows+col];
						return;
					}
					previousSibling.click();
					return;
				}
				puzzle.currentCell=pCell;
			};
			let moveDown  = function() {
				if (row==rows-1 && col==col-1) {
					row=0;
					col=0;
					puzzle.currentCell=cells[row*rows+col];
					return;
				}
				if (row+1>=rows) {
					let nextSibling = puzzle.currentClue.nextSibling;
					if (nextSibling.nodeName!='DIV') {
						row=0;
						col=0;
						puzzle.currentCell=cells[row*rows+col];
						return;
					}
					nextSibling.click();
					return;
				}
				let ndx   = (row+1)*rows+col;
				let pCell = cells[ndx];
				if (pCell.classList.contains('emptyCell')||
					(skip==true && pCell.querySelector('.puzChar').innerHTML!=' ')) {
						row++;
						moveDown();
						return;
				}
				puzzle.currentCell=pCell;
			};
			let cells = document.querySelectorAll('.puzBox');
			let cell= this.currentCell;
			let rows = parseInt(this.puzzleSrc.size.rows);
			let cols = parseInt(this.puzzleSrc.size.cols);
			let row = parseInt(cell.dataset.row);
			let col = parseInt(cell.dataset.col);
			switch (dir) {
				case 'left': 
					moveLeft();
					break;
				case 'right': 
					moveRight();
					break;
				case 'up': 
					moveUp();
					break;
				case 'down': 
					moveDown();
					break;
			}
			this.currentCell.click();
		},
		findAndSetClue: function(row,col) {
			let cells = document.querySelectorAll('.puzBox');
			let rows = parseInt(this.puzzleSrc.size.rows);
			let cols = parseInt(this.puzzleSrc.size.cols);
			let lastCell=cells[row*col+col],i,clue,ndx;
			if (this.currentDir=='Across') {
				for (i=col;i>=0;i--) {
					let cell = cells[row*cols+i];
					if (cell.classList.contains('emptyCell')) break;
					lastCell = cell;
				}
			}
			else {
				for (i=row;i>=0;i--) {
					let cell = cells[i*rows+col];
					if (cell.classList.contains('emptyCell')) break;
					lastCell = cell;
				}
			}
			let clueNum = parseInt(lastCell.querySelector('.puzNum').innerHTML);
			if (this.currentDir=='Across') {
				for (i in puzzle.puzzleSrc.clues.across) {
					clue = puzzle.puzzleSrc.clues.across[i];
					ndx = clue.indexOf('.');
					if (ndx==-1) continue;
					let num = clue.substring(0,ndx+1);
					if (clueNum==parseInt(num)) break;
				}
				puzzle.currentClue=document.querySelectorAll('.puzDirAcross .puzClue')[i];
			}
			else {
				for (i in puzzle.puzzleSrc.clues.down) {
					clue = puzzle.puzzleSrc.clues.down[i];
					ndx = clue.indexOf('.');
					if (ndx==-1) continue;
					let num = clue.substring(0,ndx+1);
					if (clueNum==parseInt(num)) break;
				}
				puzzle.currentClue=document.querySelectorAll('.puzDirDown .puzClue')[i];
			}
			let clueText = clue.substring(ndx+1);
			puzzle.currentClue.click();
			document.querySelector('.navClueNum').innerHTML=clueNum;
			document.querySelector('.navClueText').innerHTML=clueText;
		},
		highlightCells: function(row,col) {
			let cells = document.querySelectorAll('.puzBox');
			let rows = parseInt(this.puzzleSrc.size.rows);
			let cols = parseInt(this.puzzleSrc.size.cols);
			for (let cell of cells) cell.classList.remove('related','active');
			if (this.currentDir=='Across') {
				for (let i=col;i<cols;i++) {
					let cell = cells[row*cols+i];
					if (cell.classList.contains('emptyCell')) break;
					cell.classList.add('related');
				}
				for (let i=col;i>=0;i--) {
					let cell = cells[row*cols+i];
					if (cell.classList.contains('emptyCell')) break;
					cell.classList.add('related');
				}
			}
			else {
				for (let i=row;i<rows;i++) {
					let cell = cells[i*rows+col];
					if (cell.classList.contains('emptyCell')) break;
					cell.classList.add('related');
				}
				for (let i=row;i>=0;i--) {
					let cell = cells[i*rows+col];
					if (cell.classList.contains('emptyCell')) break;
					cell.classList.add('related');
				}
			}
			this.currentCell = cells[row*cols+col];
			this.currentCell.classList.add('active');
		},
		setupPuzzleCell:   function() {
			let puzCellClicked = function(event) {
				let cell = event.currentTarget;
				let row = parseInt(cell.dataset.row);
				let col = parseInt(cell.dataset.col);
				puzzle.findAndSetClue(row,col);
				puzzle.highlightCells(row,col);
				puzzle.currentFocus=cell;
			};
			let cells = document.querySelectorAll('.puzBox');
			for (let cell of cells) cell.addEventListener('click',puzCellClicked);
		},
		setupKeyboard: function() {
			var keyDown = function(event) {
				var key = event.key;
				if (key>='a'&& key<='z') puzzle.puzzleKeyEntered(key.toUpperCase());
				if (key=='^' || key==' '||key=='Backspace'||key=='Delete') puzzle.puzzleKeyEntered(' ');
				if (key=='~') puzzle.showMenuDialog();
				if (key=='ArrowUp'||key=='ArrowDown'||key=='ArrowLeft'||key=='ArrowRight') {
					if (puzzle.currentFocus.classList.contains('puzClue')) return;
					puzzle.puzCellMove(key.substr(5).toLowerCase());
				}
			};
			document.addEventListener('keydown',keyDown);
		},
		getNewPuzzle:  async function(msg=true) {
		let text = "Are you sure you want\nto load a new puzzle?";
		if(msg) if (confirm(text) != true) return;
		await fetch("scripts/updatePuzzle.php");
		puzzle.getCurrentPuzzle(document.querySelector(".topPuzContainer"));
		// Dispatch a custom event
		let event = new CustomEvent('ccSend', { detail:"newPuzzle"});
		document.dispatchEvent(event);			
		},
		setupMenuHandler: function() {
			var toggler = function(event) {
				var hamburger = event.currentTarget;
				if (event.srcElement.nodeName=='INPUT') return true;
				var btn = hamburger.querySelector('div'); 
				if (btn.classList.contains('show')) {
					btn.classList.remove('show');
				}
				else {
					btn.classList.add('show');
				}
			};
			var btnHandler = function(event) {
				var btn = event.currentTarget;
				var el  = document.querySelector('.dropDownMenu.show,.keypadMenu.show');
				if (!el) return; 		 // should not happen but it does
				var type = btn.dataset.type;
				var ltrs;
				switch (type) {
					case "ltr":
						puzzle.puzzleKeyEntered(puzzle.currentCell.dataset.chr);
						break;
					case "clue":
						ltrs = document.querySelectorAll('.puzBox.related');
						for (let ltr of ltrs) {
							ltr.click();
							puzzle.puzzleKeyEntered(ltr.dataset.chr);
						}
						break;
					case "puz":
						ltrs = document.querySelectorAll('.puzBox:not(.emptyCell)');
						for (let ltr of ltrs) {
							ltr.click();
							puzzle.puzzleKeyEntered(ltr.dataset.chr);
						}
						break;
					case "new":
						puzzle.getNewPuzzle();
						break;
					case "light":
						localStorage.setItem('cwTheme','cwlight');
						document.documentElement.setAttribute('data-cwtheme','cwlight');
						break;
					case "dark":
						localStorage.setItem('cwTheme','cwdark');
						document.documentElement.setAttribute('data-cwtheme','cwdark');
						break;
				}
			};
			document.querySelector('.hamburger').addEventListener('click',toggler);
			document.querySelector('.keyboardKey[data-chr="~"]').addEventListener('click',toggler);
			let btns=document.querySelectorAll('.puzkeypadButton');
			for (let btn of btns) btn.addEventListener('click',btnHandler);
		},
		setupKeyPad: function() {
			var keyboardKeyClicked=function(event){
				let key = event.currentTarget;
				let chr = key.dataset.chr.toUpperCase();
				if (chr=="^") chr=' ';
				puzzle.puzzleKeyEntered(chr);
			};
			let keys = document.querySelectorAll('.keyboardKey');
			for (let key of keys) key.addEventListener('click',keyboardKeyClicked);
		},
		setupNav:   function() {
			let handleNavArrow=function(event) {
				let arrow = event.currentTarget;
				let dir   = arrow.dataset.dir;
				let clues = document.querySelectorAll('.puzDir'+puzzle.currentDir+' .puzClue');
				let ndx   = parseInt(puzzle.currentClue.dataset.ndx);
				if (dir=='left') {
					if (ndx==0) ndx=clues.length;
					ndx--;
				}
				else {
					if (ndx==clues.length-1) ndx=-1;
					ndx++;
				}
				let clue = clues[ndx];
				for (let c of document.querySelectorAll('.puzClue')) c.classList.remove('active');
				clue.classList.add('active');
				puzzle.currentClue = clue;
				document.querySelector('.navClueNum').innerHTML=clue.dataset.num;
				document.querySelector('.navClueText').innerHTML=clue.querySelector('.puzClueChrs').innerHTML;
				puzzle.clueChanged();
			};
			var handleNavDir = function() {
				let newDir = puzzle.currentDir=="Across"?"Down":"Across";
				let row =  parseInt(puzzle.currentCell.dataset.row);
				let col =  parseInt(puzzle.currentCell.dataset.col);
				puzzle.currentDir  = newDir;
				puzzle.findAndSetClue(row,col);
				return;
			};
			let arrows = document.querySelectorAll('.navArrow');
			for (let arrow of arrows) arrow.addEventListener('click',handleNavArrow);
			document.querySelector(".navCenter").addEventListener('click',handleNavDir);
			puzzle.currentClue=document.querySelector('.puzDirAcross .puzClue');
			puzzle.currentClue.click();
		},
		setupClues: function() {
			let handleClueClick=function(event) {
				let clue = event.currentTarget;
				let dir  = clue.dataset.dir;
				puzzle.currentDir=dir;
				for (let c of document.querySelectorAll('.puzClue')) c.classList.remove('active');
				clue.classList.add('active');
				puzzle.currentClue = clue;
				puzzle.currentFocus= clue;
				puzzle.clueChanged();
			};
			let clues = document.querySelectorAll('.puzClue');
			puzzle.currentClue = clues[0];
			for (let clue of clues) {
				clue.addEventListener('click',handleClueClick);
			}
			puzzle.currentClue = document.querySelector('.puzDirAcross .puzClue');
			puzzle.currentFocus=puzzle.currentClue;
			puzzle.currentClueCell = puzzle.currentClue;
			//puzzle.currentClue.classList.add('active');
			puzzle.clueChanged();
		},
		generatePuzzleHeader: function(puzzleSrc) {
			let hdrBody = document.getElementById('puzzleMenu');
			let html = '';
			html+= `	<div id="puzTitle" class="puzTitle">Author: ${puzzleSrc.author}</div>`;
			html+= `	<div id="hamburger" class="hamburger">`;
			html+=			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
								<path d="M16 132h416c8.8 0 16-7.2 16-16V76c0-8.8-7.2-16-16-16H16C7.2 60 0 67.2 0 76v40c0 8.8 7.2 16 16 16zm0 160h416c8.8 0 16-7.2 16-16v-40c0-8.8-7.2-16-16-16H16c-8.8 0-16 7.2-16 16v40c0 8.8 7.2 16 16 16zm0 160h416c8.8 0 16-7.2 16-16v-40c0-8.8-7.2-16-16-16H16c-8.8 0-16 7.2-16 16v40c0 8.8 7.2 16 16 16z"/></svg>`;
			html+= `		<div class="dropDownMenu">`;
			html+=`				<input type="button" data-type="new" class="puzkeypadButton" value="New Puzzle" />`;
			html+= `			<input type="button" data-type="ltr" class="puzkeypadButton" value="Fill in letter" />`;
			html+= `			<input type="button" data-type="clue" class="puzkeypadButton" value="Fill in clue" />`;
			html+= `			<input type="button" data-type="puz" class="puzkeypadButton" value="Fill in puzzle" />`;
			html+= `			<div>`;
			html+= `				<input type="button" data-type="dark" name="keypadTheme" id="puzKeypadDark" class="puzkeypadButton" value="Dark Theme" />`;
			html+= `			</div><div>`;
			html+= `				<input type="button" data-type="light" name="keypadTheme" id="puzKeypadLight" class="puzkeypadButton" value="Light Theme" />`;
			html+= `			</div>`;
			html+= `		</div>`;
			html+=`		</div>`;
			hdrBody.innerHTML=html; 
		},
		setPuzzleWidth: function() {
			let el   = document.getElementById('puzzleContainer');
			let comps = getComputedStyle(el).getPropertyValue('--puzotherRowelements');
			let items = comps.split(' ');
			let adjust = 50;
			for (let item of items) {
				if (item) adjust += document.getElementById(item).offsetHeight+15;
			}
			let ch = el.parentNode.offsetHeight-adjust;
			let cw = document.getElementById('puzzleBody').offsetWidth;
			let puzWidth = cw<ch?cw:ch;
			el.style.setProperty('--puzWidth',(puzWidth-10)+'px');
		},
		generatePuzzleLayout: function(puzzleSrc) {
			document.documentElement.style.setProperty('--columns',puzzleSrc.size.cols);

			let puzBody = document.getElementById("puzzleBody");
			puzBody.style.setProperty('--cwcolumns',puzzleSrc.size.cols);
			this.setPuzzleWidth();
			let html = '<div id="puzInnerBody" >';
			let rows = puzzleSrc.size.rows;
			let cols = puzzleSrc.size.cols;
			for (let row=0; row<rows; row++) {
				for (let col=0; col<cols; col++) {
					let bLeft	= col==0?'pbl':'';
					let bRight= 'pbr';
					let bTop	= row==0?'pbt':'';
					let bBottom='pbb';
					let ndx = row*rows+col;
					let chr = puzzleSrc.grid[ndx];
					let num = puzzleSrc.gridnums[ndx];
//					let size=`calc(( var(--puzWidth) - 20px) / ${cols+2})`
					let type= chr=='.'?'emptyCell':'';
					html+=`<div class="puzBox ${bLeft} ${bRight} ${bTop} ${bBottom} ${type}" `;
//					html+=`   style="width:${size};height:${size};" `;
					html+=`   data-row="${row}" data-col="${col}" data-chr="${chr}" data-num="${num}">`;
					if (num!=0) {
						html+=`<span class="puzNum">${num}</span>`;
					}
					if (chr!='.') {
						html+=`<span class="puzChar" > </span>`;
					}
					html+='</div>';
					if (col==cols-1) {
						html+=`<div class="endRow"></div>`;
					}
				}
			}
			html+='</div>';
			puzBody.innerHTML = html;
			puzzle.currentCell=document.querySelector('.puzBox');
			puzzle.highlightCells(0,0);
		},
		generateKeyboardLayout:function() {
			let keyboardBody = document.getElementById("puzzleKeyboard");
			let keys=['qwertyuiop','asdfghjkl','~zxcvbnm^'];
			let html = '';
			for (let row=0;row<keys.length;row++) {
				let letters=keys[row].split('');
				html+='<div class="keypadKeyboard" style="">';
				for (let letter of letters) {
					let letr = letter;
					if (letr=='~') {
						letr =`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
								<!--!Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
								<path  fill="currentcolor" d="M16 132h416c8.8 0 16-7.2 16-16V76c0-8.8-7.2-16-16-16H16C7.2 60 0 67.2 0 76v40c0 8.8 7.2 16 16 16zm0 160h416c8.8 0 16-7.2 16-16v-40c0-8.8-7.2-16-16-16H16c-8.8 0-16 7.2-16 16v40c0 8.8 7.2 16 16 16zm0 160h416c8.8 0 16-7.2 16-16v-40c0-8.8-7.2-16-16-16H16c-8.8 0-16 7.2-16 16v40c0 8.8 7.2 16 16 16z"/></svg>`;
						letr+=`<div class="keypadMenu">`;
						letr+=`		<div>`;
						letr+=`		<input type="button" data-type="dark" name="keypadTheme" id="puzKeypadDark" class="puzkeypadButton" value="Dark Theme" />`;
						letr+=`		</div><div>`;
						letr+=`		<input type="button" data-type="light" name="keypadTheme" id="puzKeypadLight" class="puzkeypadButton" value="Light Theme" />`;
						letr+=`		</div>`;
						letr+=`		<input type="button" data-type="new" class="puzkeypadButton" value="New Puzzle" />`;
						letr+=`		<input type="button" data-type="ltr" class="puzkeypadButton" value="Fill in letter" />`;
						letr+=`		<input type="button" data-type="clue" class="puzkeypadButton" value="Fill in clue" />`;
						letr+=`		<input type="button" data-type="puz" class="puzkeypadButton" value="Fill in puzzle" />`;
						letr+=`</div>`;
					}
					if (letr=='^') letr=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
										 <path d="M576 128c0-35.3-28.7-64-64-64L205.3 64c-17 0-33.3 6.7-45.3 18.7L9.4 233.4c-6 6-9.4 14.1-9.4 22.6s3.4 16.6 9.4 22.6L160 429.3c12 12 28.3 18.7 45.3 18.7L512 448c35.3 0 64-28.7 64-64l0-256zM271 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>`;
					html+=`<button class="keyboardKey" data-chr="${letter}">${letr}</button>`;
				}
				html+='</div>';
			}
			keyboardBody.innerHTML = html;
		},
		generatePuzzleNavigation:function() {
			let navBody = document.getElementById("puzzleNav");
			let html = '';
			html += `<div class="navContainer">`;
			html += `<div class="navArrow" data-dir="left">`;
			html += `	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512">
						<path d="M9.4 278.6c-12.5-12.5-12.5-32.8 0-45.3l128-128c9.2-9.2 22.9-11.9 34.9-6.9s19.8 16.6 19.8 29.6l0 256c0 12.9-7.8 24.6-19.8 29.6s-25.7 2.2-34.9-6.9l-128-128z"/></svg>`;
			html += `</div>`;
			html += `<div class="navCenter">`;
			html += `	<div class="navClueNum">1</div>`;
			html += `	<div class="navClueText">this is a clue that is very long</div>`;
			html += `</div>`;
			html += `<div class="navArrow" data-dir="right">`;
			html += `	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512">
						<path d="M246.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-9.2-9.2-22.9-11.9-34.9-6.9s-19.8 16.6-19.8 29.6l0 256c0 12.9 7.8 24.6 19.8 29.6s25.7 2.2 34.9-6.9l128-128z"/></svg>`;
			html += `</div>`;
			html += `</div>`;
			navBody.innerHTML = html;
		},
		generatePuzzleClues:function(puzzleSrc) {
			let clueBody = document.getElementById("puzzleClues");
			let html = '';
			html += `<div class="puzClueContainer" >`;
			html += `	<div class="puzDirClues puzDirAcross" >`;
			html += `		<div class="puzClueHdr">Across</div>`;
			for (let i in puzzleSrc.clues.across) {
				let clue = puzzleSrc.clues.across[i];
				let ndx = clue.indexOf('.');
				if (ndx==-1) continue;
				let num = clue.substring(0,ndx+1);
				let chrs= clue.substring(ndx+1);
				html += `<div class="puzClue" data-dir="Across" data-num="${num}" data-ndx="${i}">`;
				html += `	<div class="puzClueNum">${num}</div>`;
				html += `	<div class="puzClueChrs">${chrs}</div>`;
				html += `</div>`;
			}
			html += `	</div>`;
			html += `	<div class="puzDirClues puzDirDown" >`;
			html += `		<div class="puzClueHdr">Down</div>`;
			for (let i in puzzleSrc.clues.down) {
				let clue = puzzleSrc.clues.down[i];
				let ndx = clue.indexOf('.');
				if (ndx==-1) continue;
				let num = clue.substring(0,ndx+1);
				let chrs= clue.substring(ndx+1);
				html += `<div class="puzClue" data-dir="Down" data-num="${num}" data-ndx="${i}">`;
				html += `	<div class="puzClueNum">${num}</div>`;
				html += `	<div class="puzClueChrs">${chrs}</div>`;
				html += `</div>`;
			}
			html += `	</div>`;
			html += `</div>`;
			clueBody.innerHTML = html;
		},
	};

