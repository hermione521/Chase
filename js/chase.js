if ( !window.requestAnimationFrame ) {
	window.requestAnimationFrame = ( function() {
		return window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
			window.setTimeout( callback, 1000 / 60 );
		};
	})();
}


window.Chase = window.Chase  || {};
Chase.sounds = {};

Chase.init = function() {
	Chase.sounds["bad"] = document.getElementById("audio_bad");
	Chase.sounds["win"] = document.getElementById("audio_win");
	Chase.sounds["move"] = document.getElementById("audio_move");
	Chase.sounds["score"] = document.getElementById("audio_score");

	// set the scene size
	var WIDTH = window.innerWidth,
	HEIGHT = window.innerHeight;

	// set some camera attributes
	var VIEW_ANGLE = 45,
	ASPECT = WIDTH / HEIGHT,
	NEAR = 0.1,
	FAR = 10000;

	// create a WebGL renderer, camera and a scene
	Chase.renderer = new THREE.WebGLRenderer();
	Chase.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
	Chase.scene = new THREE.Scene();

	// the camera starts at 0,0,0 so pull it back
	Chase.camera.position.z = 600;
	Chase.scene.add(Chase.camera);
	// start the renderer
	Chase.renderer.setSize(WIDTH, HEIGHT);
	Chase.renderer.setClearColor(0xfaf8ef, 1);
	// attach the render-supplied DOM element
	document.body.appendChild(Chase.renderer.domElement);

	// configuration object
	var boundingBoxConfig = {
		width: 400,
		height: 400,
		depth: 2000,
		splitX: 4,
		splitY: 4,
		splitZ: 20
	};
	 
	Chase.boundingBoxConfig = boundingBoxConfig;
	Chase.blockSize = 100;
	Chase.maxVisible = 14;
	   
	var boundingBox = new THREE.Mesh(
		new THREE.BoxGeometry(	boundingBoxConfig.width, boundingBoxConfig.height, boundingBoxConfig.depth, 
								boundingBoxConfig.splitX, boundingBoxConfig.splitY, boundingBoxConfig.splitZ), 
		new THREE.MeshBasicMaterial({ color: 0xbbada0, wireframe: true })
	);
	Chase.scene.add(boundingBox);

	Chase.renderer.render(Chase.scene, Chase.camera);

	document.getElementById("play_button").addEventListener('click', function (event) {
		event.preventDefault();
		Chase.start();
	});
};

Chase.start = function() {
	document.getElementById("menu").style.display = "none";
	document.getElementById("points").style.display = "block";
	document.getElementById("collected").style.display = "block";

	Chase.animate();
};

// Chase.gameStepTime = 1000;
Chase.gameStepTime = 500;
 
Chase.frameTime = 0; // ms
Chase.cumulatedFrameTime = 0; // ms
Chase._lastFrameTime = Date.now(); // timestamp

Chase.gameOver = false;
Chase.collected = [0, 0, 0, 0, 0];
Chase.currentPoints = 0;

Chase.animate = function() {
	var time = Date.now();
	Chase.frameTime = time - Chase._lastFrameTime;
	Chase._lastFrameTime = time;
	Chase.cumulatedFrameTime += Chase.frameTime;
	Chase.setPoint(1);

	while(Chase.cumulatedFrameTime > Chase.gameStepTime) {
		Chase.cumulatedFrameTime -= Chase.gameStepTime;

		// moving all blocks nearer (z=14 visible, z=15 invisible)
		for (var x = 3; x >= 0; x--){
			if (Chase.staticBlocks[x]){
				for (var y = 3; y >= 0; y--){
					if (Chase.staticBlocks[x][y]){
						if (Chase.staticBlocks[x][y][Chase.maxVisible + 2]){
							Chase.staticBlocks[x][y][Chase.maxVisible + 2] = null;
						}
						for (var z = Chase.maxVisible + 1; z >= 0; z--) {
							if (Chase.staticBlocks[x][y][z]){
								Chase.staticBlocks[x][y][z + 1] = Chase.staticBlocks[x][y][z];
								Chase.staticBlocks[x][y][z + 1].position.z += Chase.blockSize;
								Chase.staticBlocks[x][y][z] = null;
							}
						}
					}
				}
			}
		}

		// generate new blocks
		var blockNum = Math.random() < 0.8 ? 2 : 1;
		for (var i = 0; i < blockNum; ++i){
			var x = Math.floor(Math.random() * 4);
			var y = Math.floor(Math.random() * 4);
			var r = Math.random(), num;
			for (var j = 0; j < 10; ++j){
				if (r < Chase.randomFreq[j]){
					num = j;
					break;
				}
			}
			//console.log("x = " + x + " y = " + y + " num = " + num);
			Chase.addStaticBlock(x, y, num);
		}

		// calculate score
		var cameraX = (Chase.camera.position.x - Chase.blockSize / 2) / Chase.blockSize + Chase.boundingBoxConfig.splitX / 2;
		var cameraY = (Chase.camera.position.y - Chase.blockSize / 2) / Chase.blockSize + Chase.boundingBoxConfig.splitY / 2;
		//console.log("cameraX = " + cameraX + " cameraY = " + cameraY);
		if (Chase.staticBlocks[cameraX] && Chase.staticBlocks[cameraX][cameraY]){
			var currentBlock = Chase.staticBlocks[cameraX][cameraY][Chase.maxVisible + 1];
			if (currentBlock){
				Chase.setEvent(currentBlock.num);
			}
		}
	}

	Chase.renderer.render(Chase.scene, Chase.camera);
	if(!Chase.gameOver){
		window.requestAnimationFrame(Chase.animate);
	}
}

Chase.staticBlocks = [];
Chase.randomFreq = [
	0.06, 0.12, 0.18, 0.24, 0.3,
	0.44, 0.58, 0.72, 0.86, 1
];
Chase.materialArray = [];
for (var i = 0; i < 10; i++) {
	var tempArray = [];
	var texture = new THREE.MeshBasicMaterial({map:THREE.ImageUtils.loadTexture( 'img/' + i + '.png')});
	for (var j = 0; j < 6; ++j){
		tempArray.push(texture);
	}
	Chase.materialArray.push(tempArray);
};
// console.log(Chase.materialArray);
Chase.addStaticBlock = function(x, y, num) {
	if(Chase.staticBlocks[x] === undefined) Chase.staticBlocks[x] = [];
	if(Chase.staticBlocks[x][y] === undefined) Chase.staticBlocks[x][y] = [];
	var z = 0;

	var MovingCubeMat = new THREE.MeshFaceMaterial(Chase.materialArray[num]);
	var MovingCubeGeom = new THREE.BoxGeometry( Chase.blockSize, Chase.blockSize, Chase.blockSize, 1, 1, 1, Chase.materialArray[num] );
	var MovingCube = new THREE.Mesh( MovingCubeGeom, MovingCubeMat );

	MovingCube.position.x = (x - Chase.boundingBoxConfig.splitX/2)*Chase.blockSize + Chase.blockSize/2;
	MovingCube.position.y = (y - Chase.boundingBoxConfig.splitY/2)*Chase.blockSize + Chase.blockSize/2;
	MovingCube.position.z = (z - Chase.boundingBoxConfig.splitZ/2)*Chase.blockSize + Chase.blockSize/2;
	MovingCube.num = num;

	Chase.scene.add(MovingCube);	
	Chase.staticBlocks[x][y][z] = MovingCube;
};

Chase.setPoint = function(n) {
	Chase.currentPoints += n;
	document.getElementById("points").innerHTML = "<h1>" + Chase.currentPoints + "</h1>";
}
Chase.setCollected = function() {
	var goodEvent = ['帮忙签到', '给好吃的', '送回寝室', '促膝谈心', '帮刷早锻'];
	var str = '';
	for (var i = 0; i < 5; ++i) {
		str += goodEvent[i] + ' ' + Chase.collected[i] + '/3<br/>';
	}
	document.getElementById("collected").innerHTML = str;
}
Chase.setEvent = function(evt) {
	var badEvent = ['不修边幅', '不回短信', '见面失约', '搭讪他人', '叫错名字'];
	if (evt < 5) {
		++Chase.collected[evt];
		Chase.setCollected();

		var collectedNum = 0;
		for (var i = 0; i < 5; ++i) {
			if (Chase.collected[i] >= 3) {
				++collectedNum;
			}
		}
		if (collectedNum === 5) {
			Chase.gameOver = true;
			document.getElementById("you-win").style.display = "block";
			document.getElementById("red").innerText = Chase.currentPoints + '';
			Chase.sounds["win"].play();
		}
		else {
			Chase.sounds["score"].play();
		}	
	}
	else {
		var popup = document.getElementById("popup");
		popup.innerText = badEvent[evt - 5] + ' +100小时 :(';
		popup.style.display = "block";
		setTimeout(function(){
			document.getElementById("popup").style.display = "none";
		}, 1000);

		Chase.setPoint(100);
		Chase.sounds["bad"].play();
	}
}

window.addEventListener("load", Chase.init);

window.addEventListener('keydown', function (event) {
	var key = event.which ? event.which : event.keyCode;
	switch(key) {
		case 38: // up (arrow)
			if (Chase.camera.position.y < 150){
				Chase.camera.position.y += Chase.blockSize / 2;
				Chase.sounds["move"].play();
			}
			break;
		case 40: // down (arrow)
			if (Chase.camera.position.y > -150){
				Chase.camera.position.y -= Chase.blockSize / 2;
				Chase.sounds["move"].play();
			}
			break;
		case 37: // left(arrow)
			if (Chase.camera.position.x > -150){
				Chase.camera.position.x -= Chase.blockSize / 2;
				Chase.sounds["move"].play();
			}
			break;
		case 39: // right (arrow)
			if (Chase.camera.position.x < 150){
				Chase.camera.position.x += Chase.blockSize / 2;
				Chase.sounds["move"].play();
			}
			break;	
	}
}, false);

