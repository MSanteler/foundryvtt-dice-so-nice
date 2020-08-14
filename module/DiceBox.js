import {DiceColors, COLORSETS} from './DiceColors.js';
//import { GLTFExporter,FaceNormalsHelper } from './GLTFExporter.js';
import { DICE_MODELS } from './DiceModels.js';

export class DiceBox {

	constructor(element_container, dice_factory, config) {
		//private variables
		this.known_types = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
		this.container = element_container;
		this.dimensions = config.dimensions;
		this.dicefactory = dice_factory;
		this.config = config;
		this.speed = 1;

		this.adaptive_timestep = false;
		this.last_time = 0;
		this.settle_time = 0;
		this.running = false;
		this.rolling = false;
		this.threadid;

		this.nbIterationsBetweenRolls = 15;

		this.display = {
			currentWidth: null,
			currentHeight: null,
			containerWidth: null,
			containerHeight: null,
			aspect: null,
			scale: null
		};

		this.mouse = {
			pos: new THREE.Vector2(),
			startDrag: undefined,
			startDragTime: undefined
		};

		this.cameraHeight = {
			max: null,
			close: null,
			medium: null,
			far: null
		};

		this.scene = new THREE.Scene();
		this.world = new CANNON.World();
		this.world_sim = new CANNON.World();
		this.dice_body_material = new CANNON.Material();
		this.desk_body_material = new CANNON.Material();
		this.barrier_body_material = new CANNON.Material();
		this.sounds_table = {};
		this.sounds_dice = {};
		this.sounds_coins = [];
		this.lastSoundType = '';
		this.lastSoundStep = 0;
		this.lastSound = 0;
		this.iteration;
		this.renderer;
		this.barrier;
		this.camera;
		this.light;
		this.light_amb;
		this.desk;
		this.pane;

		//public variables
		this.public_interface = {};
		this.diceList = []; //'private' variable
		this.deadDiceList = [];
		this.framerate = (1/60);
		this.sounds = true;
		this.volume = 1;
		this.soundDelay = 10; // time between sound effects in ms
		this.soundsSurface = "felt";
		this.animstate = '';

		this.selector = {
			animate: true,
			rotate: true,
			intersected: null,
			dice: []
		};

		this.colors = {
			ambient:  0xf0f5fb,
			spotlight: 0xefdfd5
		};

		this.shadows = true;

		this.rethrowFunctions = {};
		this.afterThrowFunctions = {};
	}

	preloadSounds(){

		let surfaces = [
			['felt', 7],
			['wood_table', 7],
			['wood_tray', 7],
			['metal', 9]
		];

		for (const [surface, numsounds] of surfaces) {
			this.sounds_table[surface] = [];
			for (let s=1; s <= numsounds; ++s) {
				let path = `modules/dice-so-nice/sounds/${surface}/surface_${surface}${s}.wav`;
				AudioHelper.play({
					src:path,
					autoplay:false
				},false);
				this.sounds_table[surface].push(path);
			}
		}

		let materials = [
			['plastic', 15],
			['metal', 12],
			['wood', 12]
		];

		for (const [material, numsounds] of materials) {
			this.sounds_dice[material] = [];
			for (let s=1; s <= numsounds; ++s) {
				let path = `modules/dice-so-nice/sounds/dicehit/dicehit${s}_${material}.wav`;
				AudioHelper.play({
					src:path,
					autoplay:false
				},false);
				this.sounds_dice[material].push(path);
			}
		}

		for (let i=1; i <= 6; ++i) {
			let path = `modules/dice-so-nice/sounds/dicehit/coinhit${i}.wav`;
			AudioHelper.play({
				src:path,
				autoplay:false
			},false);
			this.sounds_coins.push(path);
		}
	}

	initialize() {
		game.audio.pending.push(this.preloadSounds.bind(this));

		if(this.config.system != "standard")
			this.dicefactory.setSystem(this.config.system);

		this.sounds = this.config.sounds == '1';
		this.volume = this.config.soundsVolume;
		this.soundsSurface = this.config.soundsSurface;
		this.shadows = this.config.shadowQuality != "none";
		this.dicefactory.setBumpMapping(this.config.bumpMapping);
		let globalAnimationSpeed = game.settings.get("dice-so-nice", "globalAnimationSpeed");
		if(globalAnimationSpeed === "0")
			this.speed = this.config.speed;
		else
			this.speed = parseInt(globalAnimationSpeed,10);
			

		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference:"high-performance"});
		/*this.rendererStats	= new THREEx.RendererStats()

		this.rendererStats.domElement.style.position	= 'absolute';
		this.rendererStats.domElement.style.left	= '44px';
		this.rendererStats.domElement.style.bottom	= '178px';
		this.rendererStats.domElement.style.transform	= 'scale(2)';
		document.body.appendChild( this.rendererStats.domElement );*/

		this.container.appendChild(this.renderer.domElement);
		this.renderer.shadowMap.enabled = this.shadows;
		this.renderer.shadowMap.type = this.config.shadowQuality == "high" ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
		this.renderer.setClearColor(0x000000, 0);

		this.setDimensions(this.config.dimensions);

		this.world.gravity.set(0, 0, -9.8 * 800);
		this.world.broadphase = new CANNON.NaiveBroadphase();
		this.world.solver.iterations = 14;
		this.world.allowSleep = true;

		this.world_sim.gravity.set(0, 0, -9.8 * 800);
		this.world_sim.broadphase = new CANNON.NaiveBroadphase();
		this.world_sim.solver.iterations = 14;
		this.world_sim.allowSleep = true;
	
		let contactMaterial = new CANNON.ContactMaterial( this.desk_body_material, this.dice_body_material, {friction: 0.01, restitution: 0.5});
		this.world.addContactMaterial(contactMaterial);
		this.world_sim.addContactMaterial(contactMaterial);
		contactMaterial = new CANNON.ContactMaterial( this.barrier_body_material, this.dice_body_material, {friction: 0, restitution: 0.95});
		this.world.addContactMaterial(contactMaterial);
		this.world_sim.addContactMaterial(contactMaterial);
		contactMaterial = new CANNON.ContactMaterial( this.dice_body_material, this.dice_body_material, {friction: 0.01, restitution: 0.7});
		this.world.addContactMaterial(contactMaterial);
		this.world_sim.addContactMaterial(contactMaterial);
		let desk = new CANNON.Body({allowSleep: false, mass: 0, shape: new CANNON.Plane(), material: this.desk_body_material});
		this.world.add(desk);
		this.world_sim.add(desk);
		
		let barrier = new CANNON.Body({allowSleep: false, mass: 0, shape: new CANNON.Plane(), material: this.barrier_body_material});
		barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
		barrier.position.set(0, this.display.containerHeight * 0.93, 0);
		this.world.add(barrier);
		this.world_sim.add(barrier);

		barrier = new CANNON.Body({allowSleep: false, mass: 0, shape: new CANNON.Plane(), material: this.barrier_body_material});
		barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
		barrier.position.set(0, -this.display.containerHeight * 0.93, 0);
		this.world.add(barrier);
		this.world_sim.add(barrier);

		barrier = new CANNON.Body({allowSleep: false, mass: 0, shape: new CANNON.Plane(), material: this.barrier_body_material});
		barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
		barrier.position.set(this.display.containerWidth * 0.93, 0, 0);
		this.world.add(barrier);
		this.world_sim.add(barrier);

		barrier = new CANNON.Body({allowSleep: false, mass: 0, shape: new CANNON.Plane(), material: this.barrier_body_material});
		barrier.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
		barrier.position.set(-this.display.containerWidth * 0.93, 0, 0);
		this.world.add(barrier);
		this.world_sim.add(barrier);

		this.renderer.render(this.scene, this.camera);
	}

	setDimensions(dimensions) {
		this.display.currentWidth = this.container.clientWidth / 2;
		this.display.currentHeight = this.container.clientHeight / 2;
		if (dimensions) {
			this.display.containerWidth = dimensions.w;
			this.display.containerHeight = dimensions.h;
		} else {
			this.display.containerWidth = this.display.currentWidth;
			this.display.containerHeight = this.display.currentHeight;
		}
		this.display.aspect = Math.min(this.display.currentWidth / this.display.containerWidth, this.display.currentHeight / this.display.containerHeight);

		if(this.config.autoscale)
			this.display.scale = Math.sqrt(this.display.containerWidth * this.display.containerWidth + this.display.containerHeight * this.display.containerHeight) / 13;
		else
			this.display.scale = this.config.scale;
		this.dicefactory.setScale(this.display.scale);
		this.renderer.setSize(this.display.currentWidth * 2, this.display.currentHeight * 2);

		this.cameraHeight.max = this.display.currentHeight / this.display.aspect / Math.tan(10 * Math.PI / 180);

		this.cameraHeight.medium = this.cameraHeight.max / 1.5;
		this.cameraHeight.far = this.cameraHeight.max;
		this.cameraHeight.close = this.cameraHeight.max / 2;

		if (this.camera) this.scene.remove(this.camera);
		this.camera = new THREE.PerspectiveCamera(20, this.display.currentWidth / this.display.currentHeight, 1, this.cameraHeight.max * 1.3);

		switch (this.animstate) {
			case 'selector':
				this.camera.position.z = this.selector.dice.length > 9 ? this.cameraHeight.far : (this.selector.dice.length < 6 ? this.cameraHeight.close : this.cameraHeight.medium);
				break;
			case 'throw': case 'afterthrow': default: this.camera.position.z = this.cameraHeight.far;

		}

		this.camera.lookAt(new THREE.Vector3(0,0,0));
		
		const maxwidth = Math.max(this.display.containerWidth, this.display.containerHeight);

		if (this.light) this.scene.remove(this.light);
		if (this.light_amb) this.scene.remove(this.light_amb);
		this.light = new THREE.SpotLight(this.colors.spotlight, 1.0);
		this.light.position.set(-maxwidth / 2, maxwidth / 2, maxwidth * 3);
		this.light.target.position.set(0, 0, 0);
		this.light.distance = maxwidth * 5;
		this.light.angle = Math.PI/4;
		this.light.castShadow = this.shadows;
		this.light.shadow.camera.near = maxwidth / 10;
		this.light.shadow.camera.far = maxwidth * 5;
		this.light.shadow.camera.fov = 50;
		this.light.shadow.bias = 0.001;
		this.light.shadow.mapSize.width = 1024;
		this.light.shadow.mapSize.height = 1024;
		this.scene.add(this.light);

		this.light_amb = new THREE.HemisphereLight( 0xffffbb, 0x676771, 1 );
		this.scene.add(this.light_amb);

		if (this.desk) this.scene.remove(this.desk);
		let shadowplane = new THREE.ShadowMaterial();
		shadowplane.opacity = 0.5;
		this.desk = new THREE.Mesh(new THREE.PlaneGeometry(this.display.containerWidth * 6, this.display.containerHeight * 6, 1, 1), shadowplane);
		this.desk.receiveShadow = this.shadows;
		this.scene.add(this.desk);

		this.renderer.render(this.scene, this.camera);
	}

	update(config) {
        if(config.autoscale) {
            this.display.scale = Math.sqrt(this.display.containerWidth * this.display.containerWidth + this.display.containerHeight * this.display.containerHeight) / 13;
        } else {
            this.display.scale = config.scale
        }
		this.dicefactory.setScale(this.display.scale);
		this.dicefactory.setBumpMapping(config.bumpMapping);

		let globalAnimationSpeed = game.settings.get("dice-so-nice", "globalAnimationSpeed");
		if(globalAnimationSpeed === "0")
			this.speed = parseInt(config.speed,10);
		else
			this.speed = parseInt(globalAnimationSpeed,10);
		this.shadows = config.shadowQuality != "none";
		this.light.castShadow = this.shadows;
		this.desk.receiveShadow = this.shadows;
		this.renderer.shadowMap.enabled = this.shadows;
		this.renderer.shadowMap.type = config.shadowQuality == "high" ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
		this.sounds = config.sounds;
		this.volume = config.soundsVolume;
		this.soundsSurface = config.soundsSurface;
		if(config.system)
			this.dicefactory.setSystem(config.system);
        this.applyColorsForRoll(config);
    }


	vectorRand({x, y}) {
		let angle = Math.random() * Math.PI / 5 - Math.PI / 5 / 2;
		let vec = {
			x: x * Math.cos(angle) - y * Math.sin(angle),
			y: x * Math.sin(angle) + y * Math.cos(angle)
		};
		if (vec.x == 0) vec.x = 0.01;
		if (vec.y == 0) vec.y = 0.01;
		return vec;
	}

	//returns an array of vectordata objects
	getVectors(notationVectors, vector, boost, dist){

		for (let i = 0;i< notationVectors.dice.length;i++) {

			const diceobj = this.dicefactory.get(notationVectors.dice[i].type);

			let vec = this.vectorRand(vector);

			vec.x /= dist;
			vec.y /= dist;

			let pos = {
				x: this.display.containerWidth * (vec.x > 0 ? -1 : 1) * 0.9 + Math.floor(Math.random() * 201) - 100 ,
				y: this.display.containerHeight * (vec.y > 0 ? -1 : 1) * 0.9 + Math.floor(Math.random() * 201) - 100,
				z: Math.random() * 200 + 200
			};

			let projector = Math.abs(vec.x / vec.y);
			if (projector > 1.0) pos.y /= projector; else pos.x *= projector;


			let velvec = this.vectorRand(vector);

			velvec.x /= dist;
			velvec.y /= dist;
			let velocity, angle, axis;

			if(diceobj.shape != "d2"){

				velocity = { 
					x: velvec.x * boost, 
					y: velvec.y * boost, 
					z: -10
				};

				angle = {
					x: -(Math.random() * vec.y * 5 + diceobj.inertia * vec.y),
					y: Math.random() * vec.x * 5 + diceobj.inertia * vec.x,
					z: 0
				};

				axis = { 
					x: Math.random(), 
					y: Math.random(), 
					z: Math.random(), 
					a: Math.random()
				};

				axis = { 
					x: 0, 
					y: 0, 
					z: 0, 
					a: 0
				};
			}else {
				//coin flip
				velocity = { 
					x: velvec.x * boost / 10, 
					y: velvec.y * boost / 10, 
					z: 3000
				};

				angle = {
					x: 12 * diceobj.inertia,//-(Math.random() * velvec.y * 50 + diceobj.inertia * velvec.y ) ,
					y: 1 * diceobj.inertia,//Math.random() * velvec.x * 50 + diceobj.inertia * velvec.x ,
					z: 0
				};

				axis = { 
					x: 1,//Math.random(), 
					y: 1,//Math.random(), 
					z: Math.random(), 
					a: Math.random()
				};
			}

			notationVectors.dice[i].vectors = { 
				type: diceobj.type,  
				pos, 
				velocity, 
				angle, 
				axis
			};           
		}
		return notationVectors;
	}

	// swaps dice faces to match desired result
	swapDiceFace(dicemesh){
		const diceobj = this.dicefactory.get(dicemesh.notation.type);

		let value = parseInt(dicemesh.getLastValue().value);
		let result = parseInt(dicemesh.forcedResult);
		
		if (diceobj.shape == 'd10' && result == 0) result = 10;

		if(diceobj.valueMap){ //die with special values
			result = diceobj.valueMap[result];
		}
	
		if(value == result) return;

		let rotIndex = value > result ? result+","+value:value+","+result;
		let rotationDegrees = DICE_MODELS[dicemesh.shape].rotationCombinations[rotIndex];
		console.log([value,result,rotationDegrees]);
		let eulerAngle = new THREE.Euler(THREE.MathUtils.degToRad(rotationDegrees[0]),THREE.MathUtils.degToRad(rotationDegrees[1]),THREE.MathUtils.degToRad(rotationDegrees[2]));
		let quaternion = new THREE.Quaternion().setFromEuler(eulerAngle);
		if(value > result)
			quaternion.inverse();
		
		dicemesh.applyQuaternion(quaternion);

		dicemesh.resultReason = 'forced';
	}

	//spawns one dicemesh object from a single vectordata object
	spawnDice(dicedata) {
		let vectordata = dicedata.vectors;
		const diceobj = this.dicefactory.get(vectordata.type);
		if(!diceobj) return;
		let colorset = null;
		if(dicedata.options.colorset)
			colorset = dicedata.options.colorset;
		else if(dicedata.options.flavor && COLORSETS[dicedata.options.flavor]){
			colorset = dicedata.options.flavor;
		}

		let dicemesh = this.dicefactory.create(diceobj.type, colorset);
		if(!dicemesh) return;

		let mass = diceobj.mass;
		switch(this.dicefactory.material_rand){
			case "metal":
				mass *= 7;
				break;
			case "wood":
				mass *= 0.65;
				break;
			case "glass":
				mass *= 2;
				break;
		}

		dicemesh.notation = vectordata;
		dicemesh.result = [];
		dicemesh.forcedResult = dicedata.result;
		dicemesh.startAtIteration = dicedata.startAtIteration;
		dicemesh.stopped = 0;
		dicemesh.castShadow = this.shadows;
		/*dicemesh.body = new CANNON.Body({allowSleep: true, sleepSpeedLimit: 75, sleepTimeLimit:0.9, mass: mass, shape: dicemesh.geometry.cannon_shape, material: this.dice_body_material});
		dicemesh.body.type = CANNON.Body.DYNAMIC;
		dicemesh.body.position.set(vectordata.pos.x, vectordata.pos.y, vectordata.pos.z);
		dicemesh.body.quaternion.setFromAxisAngle(new CANNON.Vec3(vectordata.axis.x, vectordata.axis.y, vectordata.axis.z), vectordata.axis.a * Math.PI * 2);
		dicemesh.body.angularVelocity.set(vectordata.angle.x, vectordata.angle.y, vectordata.angle.z);
		dicemesh.body.velocity.set(vectordata.velocity.x, vectordata.velocity.y, vectordata.velocity.z);
		dicemesh.body.linearDamping = 0.1;
		dicemesh.body.angularDamping = 0.1;
		dicemesh.body.diceMaterial = this.dicefactory.material_rand;
		dicemesh.body.diceType = diceobj.type;
		dicemesh.body.addEventListener('collide', this.eventCollide.bind(this));*/

		dicemesh.body_sim = new CANNON.Body({allowSleep: true, sleepSpeedLimit: 75, sleepTimeLimit:0.9,mass: mass, shape: dicemesh.geometry.cannon_shape, material: this.dice_body_material});
		dicemesh.body_sim.type = CANNON.Body.DYNAMIC;
		dicemesh.body_sim.position.set(vectordata.pos.x, vectordata.pos.y, vectordata.pos.z);
		dicemesh.body_sim.quaternion.setFromAxisAngle(new CANNON.Vec3(vectordata.axis.x, vectordata.axis.y, vectordata.axis.z), vectordata.axis.a * Math.PI * 2);
		dicemesh.body_sim.angularVelocity.set(vectordata.angle.x, vectordata.angle.y, vectordata.angle.z);
		dicemesh.body_sim.velocity.set(vectordata.velocity.x, vectordata.velocity.y, vectordata.velocity.z);
		dicemesh.body_sim.linearDamping = 0.1;
		dicemesh.body_sim.angularDamping = 0.1;
		dicemesh.body_sim.addEventListener('collide', this.eventCollide.bind(this));
		dicemesh.body_sim.stepQuaternions = new Array(1000);
		dicemesh.body_sim.stepPositions = new Array(1000);
		dicemesh.body_sim.detectedCollides = [];

		//dicemesh.meshCannon = this.body2mesh(dicemesh.body,true);

		/*var gltfExporter = new GLTFExporter();

		//let t = new THREE.Mesh(this.dicefactory.buffergeom, new THREE.MeshBasicMaterial());
		gltfExporter.parse(dicemesh, function ( result ) {
			if ( result instanceof ArrayBuffer ) {
				saveArrayBuffer( result, 'scene.glb' );
			} else {
				var output = JSON.stringify( result, null, 2 );
				console.log( output );
				saveString( output, 'scene.gltf' );
			}
		}, {});

		var link = document.createElement( 'a' );
		link.style.display = 'none';
		document.body.appendChild( link ); // Firefox workaround, see #6594

		function save( blob, filename ) {
			link.href = URL.createObjectURL( blob );
			link.download = filename;
			link.click();
			// URL.revokeObjectURL( url ); breaks Firefox...
		}

		function saveString( text, filename ) {
			save( new Blob( [ text ], { type: 'text/plain' } ), filename );
		}

		function saveArrayBuffer( buffer, filename ) {
			save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );
		}*/


		let objectContainer = new THREE.Object3D();
		objectContainer.add(dicemesh);

		this.diceList.push(dicemesh);
		if(dicemesh.startAtIteration == 0){
			this.scene.add(objectContainer);
			//this.scene.add(dicemesh.meshCannon);
			//this.world.add(dicemesh.body);
			this.world_sim.add(dicemesh.body_sim);
		}
	}

	eventCollide({body, target}) {
		// collision events happen simultaneously for both colliding bodies
		// all this sanity checking helps limits sounds being played

		// don't play sounds if we're simulating
		if (this.animstate === 'simulate') return;
		if (!this.sounds || !body || !this.sounds_dice.plastic) return;

		let now = Date.now();
		let currentSoundType = (body.mass > 0) ? 'dice' : 'table';

		// 
		// the idea here is that a dice clack should never be skipped in favor of a table sound
		// if ((don't play sounds if we played one this world step, or there hasn't been enough delay) AND 'this sound IS NOT a dice clack') then 'skip it'
		if ((this.lastSoundStep == body.world.stepnumber || this.lastSound > now) && currentSoundType != 'dice') return;
		// also skip if it's too early and both last sound and this sound are the same
		if ((this.lastSoundStep == body.world.stepnumber || this.lastSound > now) && currentSoundType == 'dice' && this.lastSoundType == 'dice') return;

		if (body.mass > 0) { // dice to dice collision

			let speed = body.velocity.length();
			// also don't bother playing at low speeds
			if (speed < 250) return;

			let strength = 0.1;
			let high = 12000;
			let low = 250;
			strength = Math.max(Math.min(speed / (high-low), 1), strength);
			let sound;

			//TODO: Use body.diceMaterial to have different sounds of colisions
			//For now, we just have coins sounds
			if(body.diceType != "dc"){
				let sounds_dice = this.sounds_dice['plastic'];
				if(this.sounds_dice[body.diceMaterial])
					sounds_dice = this.sounds_dice[body.diceMaterial];
				sound = sounds_dice[Math.floor(Math.random() * sounds_dice.length)];
			}
			else
				sound = this.sounds_coins[Math.floor(Math.random() * this.sounds_coins.length)];
			AudioHelper.play({
				src: sound,
				volume: this.volume
			}, false);
			this.lastSoundType = 'dice';


		} else { // dice to table collision
			let speed = target.velocity.length();
			// also don't bother playing at low speeds
			if (speed < 100) return;

			let surface = this.soundsSurface;
			let strength = 0.1;
			let high = 12000;
			let low = 100;
			strength = Math.max(Math.min(speed / (high-low), 1), strength);

			let soundlist = this.sounds_table[surface];
			let sound = soundlist[Math.floor(Math.random() * soundlist.length)];

			AudioHelper.play({
				src: sound,
				volume: this.volume
			}, false);
			this.lastSoundType = 'table';
		}

		this.lastSoundStep = body.world.stepnumber;
		this.lastSound = now + this.soundDelay;
	}

	throwFinished(worldType = "render")  {
		
		let stopped = true;
		if (this.iteration > 1000) return true;
		if (this.iteration <= this.minIterations) return false;
		if(worldType == "render")
			stopped = this.iteration>=this.iterationsNeeded;
		else{
			for (let i=0, len=this.diceList.length; i < len; ++i) {
				let dicemesh = this.diceList[i];
				let body = dicemesh.body_sim;
				if(body.sleepState < 2)
					return false;
				else if(dicemesh.result.length==0)
					dicemesh.storeRolledValue();
			}
			//Throw is actually finished
			if(stopped){
				this.iterationsNeeded = this.iteration;
				let canBeFlipped = game.settings.get("dice-so-nice", "diceCanBeFlipped");
				if(!canBeFlipped){
					//make the current dice on the board STATIC object so they can't be knocked
					for (let i=0, len=this.diceList.length; i < len; ++i){
						let dicemesh = this.diceList[i];
						let body = dicemesh.body_sim;
						body.mass = 0;
						body.updateMassProperties();
					}
				}
			}
		}
		return stopped;
	}

	simulateThrow() {
		this.iterationsNeeded = 0;
		this.animstate = 'simulate';
		this.settle_time = 0;
		this.rolling = true;
		while (!this.throwFinished("sim")) {
			//Before each step, we copy the quaternions of every die in an array
			++this.iteration;
			
			
			if(!(this.iteration % this.nbIterationsBetweenRolls)){
				for(let i = 0; i < this.diceList.length; i++){
					if(this.diceList[i].startAtIteration == this.iteration)
						this.world_sim.add(this.diceList[i].body_sim);
				}
			}
			this.world_sim.step(this.framerate);
			
			for(let i = 0; i < this.world_sim.bodies.length; i++){
				if(this.world_sim.bodies[i].mass){
					this.world_sim.bodies[i].stepQuaternions[this.iteration] = {
						"w":this.world_sim.bodies[i].quaternion.w,
						"x":this.world_sim.bodies[i].quaternion.x,
						"y":this.world_sim.bodies[i].quaternion.y,
						"z":this.world_sim.bodies[i].quaternion.z
					};
					this.world_sim.bodies[i].stepPositions[this.iteration] = {
						"x":this.world_sim.bodies[i].position.x,
						"y":this.world_sim.bodies[i].position.y,
						"z":this.world_sim.bodies[i].position.z
					};
				}
			}
		}
	}

	animateThrow(me, threadid, callback, throws){
		me.animstate = 'throw';
		let time = (new Date()).getTime();
		me.last_time = me.last_time || time - (me.framerate*1000);
		let time_diff = (time - me.last_time) / 1000;
		
		let neededSteps = Math.floor(time_diff / me.framerate);
		if(neededSteps){
			for(let i =0; i < neededSteps*me.speed; i++) {
				++me.iteration;
				if(!(me.iteration % me.nbIterationsBetweenRolls)){
					for(let i = 0; i < me.diceList.length; i++){
						if(me.diceList[i].startAtIteration == me.iteration){
							me.scene.add(me.diceList[i].parent);
							//me.world.add(me.diceList[i].body);
						}		
					}
				}
				//me.world.step(me.framerate);
			}
			if(me.iteration > me.iterationsNeeded)
				me.iteration = me.iterationsNeeded;
			// update physics interactions visually
			for (let i in me.scene.children) {
				let interact = me.scene.children[i];
				if (interact.children && interact.children.length && interact.children[0].body_sim != undefined) {
					interact.position.copy(interact.children[0].body_sim.stepPositions[me.iteration]);
					interact.quaternion.copy(interact.children[0].body_sim.stepQuaternions[me.iteration]);
					if(interact.children[0].meshCannon){
						interact.children[0].meshCannon.position.copy(interact.children[0].body_sim.stepPositions[me.iteration]);
						interact.children[0].meshCannon.quaternion.copy(interact.children[0].body_sim.stepQuaternions[me.iteration]);
					}
				}
			}

			me.renderer.render(me.scene, me.camera);
		}
		//me.rendererStats.update(me.renderer);
		me.last_time = me.last_time + neededSteps*me.framerate*1000;

		// roll finished
		if (me.running == threadid && me.throwFinished("render")) {
			me.running = false;
			me.rolling = false;

			if(callback) callback(throws);

			me.running = (new Date()).getTime();
			return;
		}

		// roll not finished, keep animating
		if (me.running == threadid) {
			((call, tid, at, aftercall, vecs) => {
				requestAnimationFrame(() => { call(me,tid, aftercall, vecs); });
			})(me.animateThrow, threadid, me.adaptive_timestep, callback, throws);
		}
	}

	start_throw(throws, callback) {
		if (this.rolling) return;
		let countNewDice = 0;
		throws.forEach(notation => {
			let vector = { x: (Math.random() * 2 - 0.5) * this.display.currentWidth, y: -(Math.random() * 2 - 0.5) * this.display.currentHeight};
			let dist = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
			let boost = ((Math.random() + 3)*0.8) * dist;

			notation = this.getVectors(notation, vector, boost, dist);
			countNewDice += notation.dice.length;
		});

		let maxDiceNumber = game.settings.get("dice-so-nice", "maxDiceNumber");
		if(this.deadDiceList.length + countNewDice > maxDiceNumber) {
			this.clearAll();
		}

		this.rollDice(throws,callback);
	}

	applyColorsForRoll(dsnConfig){
		let texture = null;
		let material = null;
		if(dsnConfig.colorset == "custom")
			DiceColors.setColorCustom(dsnConfig.labelColor, dsnConfig.diceColor, dsnConfig.outlineColor, dsnConfig.edgeColor);

		if(dsnConfig.texture != "none")
			texture = dsnConfig.texture;
		else if(dsnConfig.colorset != "custom")
		{
			let set = DiceColors.getColorSet(dsnConfig.colorset);
			texture = set.texture.id;
		}

		if(dsnConfig.material != "auto")
			material = dsnConfig.material;
		else if(dsnConfig.colorset != "custom")
		{
			let set = DiceColors.getColorSet(dsnConfig.colorset);
			material = set.material;
		}

		DiceColors.applyColorSet(this.dicefactory, dsnConfig.colorset, texture, material);
	}

	clearDice() {
		this.running = false;
		this.deadDiceList = this.deadDiceList.concat(this.diceList);
		this.diceList = [];
	}

	clearAll(){
		this.clearDice();
		let dice;
		while (dice = this.deadDiceList.pop()) {
			this.scene.remove(dice.parent.type == "Scene" ? dice:dice.parent); 
			if (dice.body_sim) this.world_sim.remove(dice.body_sim);
		}
		
		if (this.pane) this.scene.remove(this.pane);
		this.renderer.render(this.scene, this.camera);

		setTimeout(() => { this.renderer.render(this.scene, this.camera); }, 100);
	}

	rollDice(throws, callback){

		this.camera.position.z = this.cameraHeight.far;
		this.clearDice();
		this.minIterations = (throws.length-1) * this.nbIterationsBetweenRolls;

		for(let j = 0; j < throws.length; j++){
			let notationVectors = throws[j];
			this.applyColorsForRoll(notationVectors.dsnConfig);
			this.dicefactory.setSystem(notationVectors.dsnConfig.system);
			for (let i=0, len=notationVectors.dice.length; i < len; ++i) {
				notationVectors.dice[i].startAtIteration = j*this.nbIterationsBetweenRolls;
				this.spawnDice(notationVectors.dice[i]);
			}
		}
		this.iteration = 0;
		
		this.simulateThrow();
		this.iteration = 0;
		this.settle_time = 0;


		//check forced results, fix dice faces if necessary
		for (let i=0, len=this.diceList.length; i < len; ++i) {
			let dicemesh = this.diceList[i];
			if (!dicemesh) continue;
			this.swapDiceFace(dicemesh);
		}
		//GC
		this.dicefactory.canvasGC = [];

		//reset the result
		for (let i=0, len=this.diceList.length; i < len; ++i) {
			if (!this.diceList[i]) continue;

			if (this.diceList[i].resultReason != 'forced') {
				this.diceList[i].result = [];
			}
		}

		// animate the previously simulated roll
		this.rolling = true;
		this.running = (new Date()).getTime();
		this.last_time = 0;
		this.animateThrow(this,this.running, callback, throws);
	}

	showcase(config) {
		this.clearAll();
		let step = this.display.containerWidth / 5 *1.15;

		if (this.pane) this.scene.remove(this.pane);
		if (this.desk) this.scene.remove(this.desk);
		if (this.shadows) {
			let shadowplane = new THREE.ShadowMaterial();
			shadowplane.opacity = 0.5;

			this.pane = new THREE.Mesh(new THREE.PlaneGeometry(this.display.containerWidth * 6, this.display.containerHeight * 6, 1, 1), shadowplane);
			this.pane.receiveShadow = this.shadows;
			this.pane.position.set(0, 0, 1);
			this.scene.add(this.pane);
		}

		let selectordice = Object.keys(this.dicefactory.dice);
		this.camera.position.z = selectordice.length > 10 ? this.cameraHeight.far : this.cameraHeight.medium;
		let posxstart = selectordice.length > 10 ? -2.5 : -2.0;
		let posystart = selectordice.length > 10 ? 1 : 0.5;
		let poswrap = selectordice.length > 10 ? 3 : 2;
		this.applyColorsForRoll(config);
		for (let i = 0, posx = posxstart, posy = posystart; i < selectordice.length; ++i, ++posx) {

			if (posx > poswrap) {
				posx = posxstart;
				posy--;
			}

			let dicemesh = this.dicefactory.create(selectordice[i]);
			dicemesh.position.set(posx * step, posy * step, step * 0.5);
			dicemesh.castShadow = this.shadows;
			dicemesh.userData = selectordice[i];

			this.diceList.push(dicemesh);
			this.scene.add(dicemesh);
		}

		this.running = (new Date()).getTime();
		this.last_time = 0;
		if (this.selector.animate) {
			this.container.style.opacity = 0;
			this.animateSelector(this.running);
		}
		else this.renderer.render(this.scene, this.camera);
	}

	animateSelector(threadid) {
		this.animstate = 'selector';
		let time = (new Date()).getTime();
		let time_diff = (time - this.last_time) / 1000;
		if (time_diff > 3) time_diff = this.framerate;

		if (this.container.style.opacity != '1') this.container.style.opacity = Math.min(1, (parseFloat(this.container.style.opacity) + 0.05));

		if (this.selector.rotate) {
			let angle_change = 0.005 * Math.PI;
			for (let i=0;i<this.diceList.length;i++) {
				this.diceList[i].rotation.y += angle_change;
				this.diceList[i].rotation.x += angle_change / 4;
				this.diceList[i].rotation.z += angle_change / 10;
			}
		}

		this.last_time = time;
		this.renderer.render(this.scene, this.camera);
		if (this.running == threadid) {
			(function(animateCallback, tid, at) {
				if (!at && time_diff < this.framerate) {
					setTimeout(() => { requestAnimationFrame(() => { animateCallback.call(this, tid); }); }, (this.framerate - time_diff) * 1000);
				} else {
					requestAnimationFrame(() => { animateCallback.call(this, tid); });
				}
			}).bind(this)(this.animateSelector, threadid, this.adaptive_timestep);
		}
	}

	//used to debug cannon shape vs three shape
	body2mesh(body) {
		var obj = new THREE.Object3D();
		let currentMaterial = new THREE.MeshBasicMaterial( {wireframe:true} );
		for (var l = 0; l < body.shapes.length; l++) {
		  var shape = body.shapes[l];
	  
		  var mesh;
	  
		  switch(shape.type){
	  
		  case CANNON.Shape.types.SPHERE:
			var sphere_geometry = new THREE.SphereGeometry( shape.radius, 8, 8);
			mesh = new THREE.Mesh( sphere_geometry, currentMaterial );
			break;
	  
		  case CANNON.Shape.types.PARTICLE:
			mesh = new THREE.Mesh( this.particleGeo, this.particleMaterial );
			var s = this.settings;
			mesh.scale.set(s.particleSize,s.particleSize,s.particleSize);
			break;
	  
		  case CANNON.Shape.types.PLANE:
			var geometry = new THREE.PlaneGeometry(10, 10, 4, 4);
			mesh = new THREE.Object3D();
			var submesh = new THREE.Object3D();
			var ground = new THREE.Mesh( geometry, currentMaterial );
			ground.scale.set(100, 100, 100);
			submesh.add(ground);
	  
			ground.castShadow = true;
			ground.receiveShadow = true;
	  
			mesh.add(submesh);
			break;
	  
		  case CANNON.Shape.types.BOX:
			var box_geometry = new THREE.BoxGeometry(  shape.halfExtents.x*2,
								  shape.halfExtents.y*2,
								  shape.halfExtents.z*2 );
			mesh = new THREE.Mesh( box_geometry, currentMaterial );
			break;
	  
		  case CANNON.Shape.types.CONVEXPOLYHEDRON:
			var geo = new THREE.Geometry();
	  
			// Add vertices
			for (var i = 0; i < shape.vertices.length; i++) {
			  var v = shape.vertices[i];
			  geo.vertices.push(new THREE.Vector3(v.x, v.y, v.z));
			}
	  
			for(var i=0; i < shape.faces.length; i++){
			  var face = shape.faces[i];
	  
			  // add triangles
			  var a = face[0];
			  for (var j = 1; j < face.length - 1; j++) {
				var b = face[j];
				var c = face[j + 1];
				geo.faces.push(new THREE.Face3(a, b, c));
			  }
			}
			geo.computeBoundingSphere();
			geo.computeFaceNormals();
			mesh = new THREE.Mesh( geo, currentMaterial );
			break;
	  
		  case CANNON.Shape.types.HEIGHTFIELD:
			var geometry = new THREE.Geometry();
	  
			var v0 = new CANNON.Vec3();
			var v1 = new CANNON.Vec3();
			var v2 = new CANNON.Vec3();
			for (var xi = 0; xi < shape.data.length - 1; xi++) {
			  for (var yi = 0; yi < shape.data[xi].length - 1; yi++) {
				for (var k = 0; k < 2; k++) {
				  shape.getConvexTrianglePillar(xi, yi, k===0);
				  v0.copy(shape.pillarConvex.vertices[0]);
				  v1.copy(shape.pillarConvex.vertices[1]);
				  v2.copy(shape.pillarConvex.vertices[2]);
				  v0.vadd(shape.pillarOffset, v0);
				  v1.vadd(shape.pillarOffset, v1);
				  v2.vadd(shape.pillarOffset, v2);
				  geometry.vertices.push(
					new THREE.Vector3(v0.x, v0.y, v0.z),
					new THREE.Vector3(v1.x, v1.y, v1.z),
					new THREE.Vector3(v2.x, v2.y, v2.z)
				  );
				  var i = geometry.vertices.length - 3;
				  geometry.faces.push(new THREE.Face3(i, i+1, i+2));
				}
			  }
			}
			geometry.computeBoundingSphere();
			geometry.computeFaceNormals();
			mesh = new THREE.Mesh(geometry, currentMaterial);
			break;
	  
		  case CANNON.Shape.types.TRIMESH:
			var geometry = new THREE.Geometry();
	  
			var v0 = new CANNON.Vec3();
			var v1 = new CANNON.Vec3();
			var v2 = new CANNON.Vec3();
			for (var i = 0; i < shape.indices.length / 3; i++) {
			  shape.getTriangleVertices(i, v0, v1, v2);
			  geometry.vertices.push(
				new THREE.Vector3(v0.x, v0.y, v0.z),
				new THREE.Vector3(v1.x, v1.y, v1.z),
				new THREE.Vector3(v2.x, v2.y, v2.z)
			  );
			  var j = geometry.vertices.length - 3;
			  geometry.faces.push(new THREE.Face3(j, j+1, j+2));
			}
			geometry.computeBoundingSphere();
			geometry.computeFaceNormals();
			mesh = new THREE.Mesh(geometry, currentMaterial);
			break;
	  
		  default:
			throw "Visual type not recognized: "+shape.type;
		  }
	  
		  //mesh.receiveShadow = true;
		  mesh.castShadow = true;
		  if(mesh.children){
			for(var i=0; i<mesh.children.length; i++){
			  mesh.children[i].castShadow = true;
			  mesh.children[i].receiveShadow = true;
			  if(mesh.children[i]){
				for(var j=0; j<mesh.children[i].length; j++){
				  mesh.children[i].children[j].castShadow = true;
				  mesh.children[i].children[j].receiveShadow = true;
				}
			  }
			}
		  }
	  
		  var o = body.shapeOffsets[l];
		  var q = body.shapeOrientations[l];
		  mesh.position.set(o.x, o.y, o.z);
		  mesh.quaternion.set(q.x, q.y, q.z, q.w);
	  
		  obj.add(mesh);
		}
	  
		return obj;
	   };
}