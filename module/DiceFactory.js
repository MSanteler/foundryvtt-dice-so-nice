import {DicePreset} from './DicePreset.js';
import {DiceColors} from './DiceColors.js';
import {DICE_MODELS} from './DiceModels.js';
export class DiceFactory {

	constructor() {
		this.dice = {};
		this.geometries = {};
		this.meshes = {};

		this.baseScale = 50;

		this.systemForced = false;
		this.systemActivated = "standard";

		this.materials_cache = {};
		this.loadedFonts = [];
		this.cache_hits = 0;
		this.cache_misses = 0;

		this.label_color = '';
		this.dice_color = '';
		this.label_outline = '';
		this.dice_texture = '';
		this.edge_color = '';
		this.bumpMapping = true;

		let loader = new THREE.CubeTextureLoader();
		loader.setPath('modules/dice-so-nice/textures/envmap_church/');

		let textureCube = loader.load( [
			'px.png', 'nx.png',
			'py.png', 'ny.png',
			'pz.png', 'nz.png'
		]);
		//textureCube.mapping = THREE.CubeRefractionMapping;

		this.material_options = {
			'plastic': {
				'type':"phong",
				'options':{
					specular: 0xffffff,
					color: 0xb5b5b5,
					shininess: 5,
					flatShading: true
				}
			},
			'metal': {
				'type':'standard',
				'options': {
					color: 0xdddddd,
					emissive:0x111111,
					roughness: 0.45,
					metalness: 0.98,
					envMap: textureCube,
					envMapIntensity:1
				}
			},
			'wood': {
				'type':'phong',
				'options': {
					specular: 0xffffff,
					color: 0xb5b5b5,
					shininess: 1,
					flatShading: true
				}
			},
			'glass': {
				'type':'phong',
				'options': {
					specular: 0xffffff,
					color: 0xb5b5b5,
					shininess: 0.3,
					reflectivity:0.1,
					envMap: textureCube,
					envMapIntensity:1,
					combine:THREE.MixOperation
				}
			},
			'chrome': {
				'type':'phong',
				'options': {
					specular: 0xffffff,
					color: 0xb5b5b5,
					shininess: 1,
					reflectivity:0.7,
					envMap: textureCube,
					envMapIntensity:1,
					combine:THREE.AddOperation
				}
			}
		}

		this.canvas;

		// fixes texture rotations on specific dice models
		this.rotate = {
			d8: {even: 7.5, odd: 127.5},
			d12: {all: -5},
			d20: {all: 8.5},
		};

		this.systems = {
			'standard': {id: 'standard', name: game.i18n.localize("DICESONICE.System.Standard"), dice:[]},
			'dot': {id: 'dot', name: game.i18n.localize("DICESONICE.System.Dot"), dice:[]},
			'dot_b': {id: 'dot_b', name: game.i18n.localize("DICESONICE.System.DotBlack"), dice:[]}
		};
		let diceobj;
		diceobj = new DicePreset('d2');
		diceobj.name = 'd2';
		diceobj.setLabels(['1','2']);
		diceobj.setValues(1,2);
		diceobj.inertia = 8;
		diceobj.mass = 400;
		diceobj.scale = 0.9;
		this.register(diceobj);
		
		diceobj = new DicePreset('dc','d2');
		diceobj.name = 'Coin';
		diceobj.setLabels([
			'modules/dice-so-nice/textures/coin/tail.png',
			'modules/dice-so-nice/textures/coin/heads.png'
		]);
		diceobj.setBumpMaps([
			'modules/dice-so-nice/textures/coin/tail_bump.png',
			'modules/dice-so-nice/textures/coin/heads_bump.png'
		]);
		diceobj.setValues(0,1);
		diceobj.inertia = 8;
		diceobj.scale = 0.9;
		diceobj.colorset = "coin_default"
		this.register(diceobj);

		diceobj = new DicePreset('d4');
		diceobj.name = 'd4';
		diceobj.setLabels(['1','2','3','4']);
		diceobj.setValues(1,4);
		diceobj.inertia = 5;
		diceobj.scale = 1.2;
		this.register(diceobj);

		diceobj = new DicePreset('d6');
		diceobj.name = 'd6';
		diceobj.setLabels(['1', '2', '3', '4', '5', '6']);
		diceobj.setValues(1,6);
		diceobj.scale = 0.9;
		this.register(diceobj);

		diceobj = new DicePreset('df', 'd6');
		diceobj.name = 'Fate Dice';
		diceobj.setLabels(['−', ' ', '+']);
		diceobj.setValues(-1,1);
		diceobj.scale = 0.9;
		diceobj.fontScale = 2;
		this.register(diceobj);

		diceobj = new DicePreset('d8');
		diceobj.name = 'd8';
		diceobj.setLabels(['1','2','3','4','5','6','7','8']);
		diceobj.setValues(1,8);
		this.register(diceobj);

		diceobj = new DicePreset('d10');
		diceobj.name = 'd10';
		diceobj.setLabels(['1','2','3','4','5','6','7','8','9','0']);
		diceobj.setValues(1,10);
		diceobj.mass = 450;
		diceobj.inertia = 9;
		diceobj.scale = 0.9;
		this.register(diceobj);

		diceobj = new DicePreset('d100', 'd10');
		diceobj.name = 'd100';
		diceobj.setLabels(['10', '20', '30', '40', '50', '60', '70', '80', '90', '00']);
		diceobj.setValues(10, 100, 10);
		diceobj.mass = 450;
		diceobj.inertia = 9;
		diceobj.scale = 0.9;
		this.register(diceobj);

		diceobj = new DicePreset('d12');
		diceobj.name = 'd12';
		diceobj.setLabels(['1','2','3','4','5','6','7','8','9','10','11','12']);
		diceobj.setValues(1,12);
		diceobj.mass = 450;
		diceobj.inertia = 8;
		diceobj.scale = 0.9;
		this.register(diceobj);

		diceobj = new DicePreset('d20');
		diceobj.name = 'd20';
		diceobj.setLabels(['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20']);
		diceobj.setValues(1,20);
		diceobj.mass = 500;
		diceobj.inertia = 6;
		this.register(diceobj);

		diceobj = new DicePreset('d6');
		diceobj.name = 'd6';
		diceobj.setLabels([
			'modules/dice-so-nice/textures/dot/d6-1.png',
			'modules/dice-so-nice/textures/dot/d6-2.png',
			'modules/dice-so-nice/textures/dot/d6-3.png',
			'modules/dice-so-nice/textures/dot/d6-4.png',
			'modules/dice-so-nice/textures/dot/d6-5.png',
			'modules/dice-so-nice/textures/dot/d6-6.png',
		]);
		diceobj.setBumpMaps([
			'modules/dice-so-nice/textures/dot/d6-1-b.png',
			'modules/dice-so-nice/textures/dot/d6-2-b.png',
			'modules/dice-so-nice/textures/dot/d6-3-b.png',
			'modules/dice-so-nice/textures/dot/d6-4-b.png',
			'modules/dice-so-nice/textures/dot/d6-5-b.png',
			'modules/dice-so-nice/textures/dot/d6-6-b.png',
		]);
		diceobj.setValues(1,6);
		diceobj.scale = 0.9;
		diceobj.system = "dot";
		this.register(diceobj);

		diceobj = new DicePreset('d6');
		diceobj.name = 'd6';
		diceobj.setLabels([
			'modules/dice-so-nice/textures/dot/d6-1-black.png',
			'modules/dice-so-nice/textures/dot/d6-2-black.png',
			'modules/dice-so-nice/textures/dot/d6-3-black.png',
			'modules/dice-so-nice/textures/dot/d6-4-black.png',
			'modules/dice-so-nice/textures/dot/d6-5-black.png',
			'modules/dice-so-nice/textures/dot/d6-6-black.png',
		]);
		diceobj.setBumpMaps([
			'modules/dice-so-nice/textures/dot/d6-1-b.png',
			'modules/dice-so-nice/textures/dot/d6-2-b.png',
			'modules/dice-so-nice/textures/dot/d6-3-b.png',
			'modules/dice-so-nice/textures/dot/d6-4-b.png',
			'modules/dice-so-nice/textures/dot/d6-5-b.png',
			'modules/dice-so-nice/textures/dot/d6-6-b.png',
		]);
		diceobj.setValues(1,6);
		diceobj.scale = 0.9;
		diceobj.system = "dot_b";
		this.register(diceobj);

		for(let i in CONFIG.Dice.terms){
			let term = CONFIG.Dice.terms[i];
			//If this is not a core dice type
			if(![Coin, FateDie, Die].includes(term)){
				let objTerm = new term();
				if([3, 4, 6, 8, 10, 12, 20].includes(objTerm.faces)){
					this.internalAddDicePreset(objTerm);
				}
			}
		}
	}

	setScale(scale){
		this.baseScale = scale;
		this.geometries = {};
		this.meshes = {};
		this.materials_cache = {};
	}

	setBumpMapping(bumpMapping){
		this.bumpMapping = bumpMapping;
	}

	register(diceobj) {
		if(diceobj.system == "standard")
			this.dice[diceobj.type] = diceobj;
		this.systems[diceobj.system].dice.push(diceobj);
	}

	//{id: 'standard', name: game.i18n.localize("DICESONICE.System.Standard")}
	addSystem(system){
		system.dice = [];
		this.systems[system.id] = system;
	}
	//{type:"",labels:[],system:""}
	//Should have been called "addDicePresetFromModel" but ¯\_(ツ)_/¯
	addDicePreset(dice, shape = null){
		if(!shape)
			shape = dice.type;
		let model = this.systems["standard"].dice.find(el => el.type == shape);
		let preset = new DicePreset(dice.type, model.shape);
		preset.name = dice.type;
		preset.setLabels(dice.labels);
		preset.values = model.values;
		preset.valueMap = model.valueMap;
		preset.mass = model.mass;
		preset.scale = model.scale;
		preset.inertia = model.inertia;
		preset.system = dice.system;
		preset.font = dice.font || 'Arial';
		preset.fontScale = dice.fontScale || 1;
		preset.colorset = dice.colorset || null;
		if(dice.bumpMaps && dice.bumpMaps.length)
			preset.setBumpMaps(dice.bumpMaps);
		this.register(preset);
		if(this.systemActivated == dice.system)
			this.setSystem(dice.system);

		if(dice.font && !this.loadedFonts.includes(dice.font)){
			this._loadFont(dice.font);
		}
	}

	//Is called when trying to create a DicePreset by guessing its faces from the CONFIG entries
	internalAddDicePreset(diceobj){
		let shape = "d";
		if(diceobj.faces == 3)
			shape += "6";
		else
			shape += diceobj.faces;
		let type = "d" + diceobj.constructor.DENOMINATION;
		let model = this.systems["standard"].dice.find(el => el.type == shape);
		let preset = new DicePreset(type, model.shape);
		preset.name = diceobj.name;
		let labels = [];
		for(let i = 1;i<= diceobj.faces;i++){
			labels.push(diceobj.constructor.getResultLabel(i));
		}
		preset.setLabels(labels);
		preset.setValues(1,diceobj.faces);
		preset.mass = model.mass;
		preset.inertia = model.inertia;
		preset.scale = model.scale;
		this.register(preset);
	}

	setSystem(systemId, force=false){
		if(this.systemForced && systemId != this.systemActivated)
			return;
		//first we reset to standard
		let dices = this.systems["standard"].dice;
		for(let i=0;i<dices.length;i++)
			this.dice[dices[i].type] = dices[i];
		//Then we apply override
		if(systemId!= "standard" && this.systems.hasOwnProperty(systemId))
		{
			dices = this.systems[systemId].dice;
			for(let i=0;i<dices.length;i++)
				this.dice[dices[i].type] = dices[i];
		}
		if(force)
			this.systemForced = true;
		this.systemActivated = systemId;
	}

	//Since FVTT will remove their fontloading method in 0.8, we're using our own.
	_loadFont(fontname){
		var canvas = document.createElement("canvas");
		//Setting the height and width is not really required
		canvas.width = 16;
		canvas.height = 16;
		var ctx = canvas.getContext("2d");
	
		//There is no need to attach the canvas anywhere,
		//calling fillText is enough to make the browser load the active font
	
		ctx.font = "4px "+fontname;
		ctx.fillText("text", 0, 8);
		this.loadedFonts.push(fontname);
	}

	// returns a dicemesh (THREE.Mesh) object
	create(type, colorset = null) {
		let diceobj = this.dice[type];
		if (!diceobj) return null;

		let cacheString = ""; //not used for now, too many issues with instanciating
		//We use either (by order of priority): a flavor/targeted colorset, the colorset of the diceobj, the colorset configured by the player
		if(colorset){
			cacheString = this.setMaterialInfo(colorset);
		}
		else if (diceobj.colorset) {
			cacheString = this.setMaterialInfo(diceobj.colorset);
		} else {
			cacheString = this.setMaterialInfo();
		}

		let geom = this.geometries[type];
		if(!geom) {
			geom = this.createGeometry(diceobj.shape, diceobj.scale * this.baseScale);
			this.geometries[type] = geom;
		}
		if (!geom) return null;
		
		let materials = this.createMaterials(diceobj, this.baseScale / 2, 1.0);
		let dicemesh = new THREE.Mesh(geom, materials.material);

		let nbFaces = parseInt(type.substring(1),10);
		let indexShift = ['d10','d2','d4'].includes(dicemesh.shape) ? true:false;
		for(let i = 0;i<dicemesh.geometry.faces.length;i++){
			let index  = indexShift ? i+1:i+2;
			if(i < nbFaces)
				dicemesh.geometry.faces[i].cacheString = materials.tabCacheStrings[index];
			else
				dicemesh.geometry.faces[i].cacheString = materials.tabCacheStrings[0];
		}
		
		dicemesh.result = [];
		dicemesh.shape = diceobj.shape;
		dicemesh.rerolls = 0;
		dicemesh.resultReason = 'natural';

		let factory = this;
		dicemesh.getFaceValue = function() {
			let reason = this.resultReason;
			let vector = new THREE.Vector3(0, 0, this.shape == 'd4' ? -1 : 1);

			let closest_face, closest_angle = Math.PI * 2;
			for (let i = 0, l = this.geometry.faces.length; i < l; ++i) {
				let face = this.geometry.faces[i];
				if (!face.dieValue) continue;
				let angle = face.normal.clone().applyQuaternion(this.body_sim.quaternion).angleTo(vector);
				if (angle < closest_angle) {
					closest_angle = angle;
					closest_face = face;
				}
			}
			let matindex = closest_face.dieValue;

			const diceobj = factory.dice[this.notation.type];

			if (this.shape == 'd4') {
				return {value: matindex, label: diceobj.labels[matindex-1], reason: reason};
			}
			if (['d10','d2'].includes(this.shape)) matindex += 1;

			let value = diceobj.values[((matindex-1) % diceobj.values.length)];
			let label = diceobj.labels[(((matindex-1) % (diceobj.labels.length-2))+2)];
			console.log(value);
			return {value: value, label: label, reason: reason};
		};

		dicemesh.storeRolledValue = function() {
			this.result.push(this.getFaceValue());
		};

		dicemesh.getLastValue = function() {
			if (!this.result || this.result.length < 1) return {value: undefined, label: '', reason: ''};

			return this.result[this.result.length-1];
		};

		dicemesh.setLastValue = function(result) {
			if (!this.result || this.result.length < 1) return;
			if (!result || result.length < 1) return;

			return this.result[this.result.length-1] = result;
		};

		if (diceobj.color) {
			dicemesh.material[0].color = new THREE.Color(diceobj.color);
			dicemesh.material[0].emissive = new THREE.Color(diceobj.color);
			dicemesh.material[0].emissiveIntensity = 1;
			dicemesh.material[0].needsUpdate = true;
		}

		switch (diceobj.values.length) {
			case 1:
				return this.fixmaterials(dicemesh, 1);
			case 3: 
				return this.fixmaterials(dicemesh, 3);
			default:
				return dicemesh;
		}
	}

	get(type) {
		return this.dice[type];
	}

	getGeometry(type) {
		return this.geometries[type];
	}

	createMaterials(diceobj, size, margin, allowcache = true, d4specialindex = 0) {
		let labels = diceobj.labels;
		if (diceobj.shape == 'd4') {
			labels = diceobj.labels[d4specialindex];
			size = this.baseScale / 2;
			margin = this.baseScale * 2;
		}
		//If the texture is an array of texture (for random face texture), we look at the first element to determine the faces material and the edge texture
		let dice_texture = Array.isArray(this.dice_texture_rand) ? this.dice_texture_rand[0] : this.dice_texture_rand;

		var mat;
		let materialSelected = this.material_options[this.material_rand] ? this.material_options[this.material_rand] : this.material_options["plastic"];

		switch(materialSelected.type){
			case "phong":
				mat = new THREE.MeshPhongMaterial(materialSelected.options);
				break;
			case "standard":
				mat = new THREE.MeshStandardMaterial(materialSelected.options);
				break;
			default: //plastic
				mat = new THREE.MeshPhongMaterial(this.material_options.plastic.options);
		}
		let texturesToMerge = [];
		let tabCacheStrings = [];
		let bumpToMerge = [];
		for (var i = 0; i < labels.length; ++i) {
		
			let canvasTextures;
			if(i==0)//edge
			{
				//if the texture is fully opaque, we do not use it for edge
				let texture = {name:"none"};
				if(dice_texture.composite != "source-over")
					texture = dice_texture;
				canvasTextures = this.createTextMaterial(diceobj, labels, i, size, margin, texture, this.label_color_rand, this.label_outline_rand, this.edge_color_rand, allowcache);
				texturesToMerge.push(canvasTextures.composite);
				tabCacheStrings.push(canvasTextures.cachestring);
				bumpToMerge.push(null);
			}
			else
			{
				canvasTextures = this.createTextMaterial(diceobj, labels, i, size, margin, this.dice_texture_rand, this.label_color_rand, this.label_outline_rand, this.dice_color_rand, allowcache);
				texturesToMerge.push(canvasTextures.composite);
				tabCacheStrings.push(canvasTextures.cachestring);
				if(this.bumpMapping)
				{
					if(canvasTextures.bump){
						bumpToMerge.push(canvasTextures.bump);
						mat.bumpScale = 1;
					}
					if(diceobj.shape != 'd4' && diceobj.normals[i]){
						mat.bumpScale = 3;
						bumpToMerge.push(diceobj.normals[i]);
					}
				}
			}
		}
		mat.map = this.createMergedTexture(texturesToMerge);
		if(this.bumpMapping)
			mat.bumpMap = this.createMergedTexture(bumpToMerge);
		
		mat.opacity = 1;
		mat.transparent = true;
		mat.depthTest = false;
		mat.needUpdate = true;

		return {material:mat,tabCacheStrings:tabCacheStrings};
	}

	createMergedTexture(facesCanvas, swapA = null, swapB = null){
		console.log([facesCanvas,swapA,swapB]);
		let canvas = document.createElement("canvas");
		let context = canvas.getContext("2d", {alpha: true});
		context.globalAlpha = 0;

		context.clearRect(0, 0, canvas.width, canvas.height);

		let texturesPerLine = Math.ceil(Math.sqrt(facesCanvas.length));
		let sizeTexture = Math.max(facesCanvas[facesCanvas.length-1].width,256);
		let ts = this.calc_texture_size(Math.sqrt(facesCanvas.length)*sizeTexture, true);

		canvas.width = canvas.height = ts;

		let x = 0;
		let y = 0;
		let texturesOnThisLine = 0;
		for(let i=0;i<facesCanvas.length;i++){
			if(texturesOnThisLine == texturesPerLine){
				y += sizeTexture;
				x = 0;
				texturesOnThisLine = 0;
			}
			let index = i;
			if(swapA !== null){
				if(index == (swapA+1))
					index = swapB+1;
				else if(index == (swapB+1))
					index = swapA+1;
			}

			if(facesCanvas[index])
				context.drawImage(facesCanvas[index], x, y, sizeTexture, sizeTexture);
			texturesOnThisLine++;
			x += sizeTexture;
		}
		let texture = new THREE.CanvasTexture(canvas);
		texture.flipY = false;
		return texture;
	}

	swapTexture(dicemesh, swapA, swapB){

		let indexShift = ['d10','d2','d4'].includes(dicemesh.shape) ? true:false;

		let texturesToMerge = [];
		let bumpToMerge = [null];
		texturesToMerge.push(this.materials_cache[dicemesh.geometry.faces[dicemesh.geometry.faces.length-1].cacheString].composite);//edge
		
		if(!indexShift){
			texturesToMerge.push(this.materials_cache[dicemesh.geometry.faces[dicemesh.geometry.faces.length-1].cacheString].composite);
			bumpToMerge.push(null);
		}

		let nbFaces = parseInt(dicemesh.shape.substring(1),10);
		for(let i = 0; i<nbFaces;i++){
			texturesToMerge.push(this.materials_cache[dicemesh.geometry.faces[i].cacheString].composite);
			bumpToMerge.push(this.materials_cache[dicemesh.geometry.faces[i].cacheString].bump);
		}
		
		if (['d10','d2','d4'].includes(dicemesh.shape)){
			swapA -= 1;
			swapB -= 1;
		}

		dicemesh.material.map = this.createMergedTexture(texturesToMerge, swapA, swapB);
		dicemesh.material.map.needsUpdate = true;
		if(this.bumpMapping){
			dicemesh.material.bumpMap = this.createMergedTexture(bumpToMerge, swapA, swapB);
			dicemesh.material.bumpMap.needsUpdate = true;
		}
		dicemesh.material.needsUpdate = true;
	}

	createTextMaterial(diceobj, labels, index, size, margin, texture, forecolor, outlinecolor, backcolor, allowcache) {
		if (labels[index] === undefined) return null;

		texture = texture || this.dice_texture_rand;
		if(Array.isArray(texture))
			texture = texture[Math.floor(Math.random() * texture.length)];
        forecolor = forecolor || this.label_color_rand;
        outlinecolor = outlinecolor || this.label_outline_rand;
        backcolor = backcolor || this.dice_color_rand;
        allowcache = allowcache == undefined ? true : allowcache;
		
		let text = labels[index];
		let isTexture = false;
		let textCache = "";
		if(text instanceof HTMLImageElement)
			textCache = text.src;
		else if(text instanceof Array){
			text.forEach(el => {
				if(el instanceof HTMLImageElement)
					textCache += el.src;
				else
					textCache += el;
			});
		}
		else
			textCache = text;
			
		// an attempt at materials caching
		let cachestring = diceobj.type + textCache + index + texture.name + forecolor + outlinecolor + backcolor;
		if (diceobj.shape == 'd4') {
			cachestring = diceobj.type + textCache + texture.name + forecolor + outlinecolor + backcolor;
		}
		if (allowcache && this.materials_cache[cachestring] != null) {
			this.cache_hits++;
			return this.materials_cache[cachestring];
		}

		let canvas = document.createElement("canvas");
		let context = canvas.getContext("2d", {alpha: true});
		context.globalAlpha = 0;

		context.clearRect(0, 0, canvas.width, canvas.height);

		let canvasBump = document.createElement("canvas");
		let contextBump = canvasBump.getContext("2d", {alpha: true});
		contextBump.globalAlpha = 0;

		contextBump.clearRect(0, 0, canvasBump.width, canvasBump.height);

		let ts;

		if (diceobj.shape == 'd4') {
			ts = this.calc_texture_size(size + margin) * 2;
		} else {
			ts = this.calc_texture_size(size + size * 2 * margin) * 2;
		}

		canvas.width = canvas.height = ts;
		canvasBump.width = canvasBump.height = ts;

		// create color
		context.fillStyle = backcolor;
		context.fillRect(0, 0, canvas.width, canvas.height);

		contextBump.fillStyle = "#FFFFFF";
		contextBump.fillRect(0, 0, canvasBump.width, canvasBump.height);

		//create underlying texture
		if (texture.name != '' && texture.name != 'none') {
			context.globalCompositeOperation = texture.composite || 'source-over';
			context.drawImage(texture.texture, 0, 0, canvas.width, canvas.height);
			context.globalCompositeOperation = 'source-over';

			if (texture.bump != '') {
				contextBump.globalCompositeOperation = 'source-over';
				contextBump.drawImage(texture.bump, 0, 0, canvas.width, canvas.height);
			}
		} else {
			context.globalCompositeOperation = 'source-over';
		}
		

		// create text
		context.globalCompositeOperation = 'source-over';
		context.textAlign = "center";
		context.textBaseline = "middle";

		contextBump.textAlign = "center";
		contextBump.textBaseline = "middle";
		
		if (diceobj.shape != 'd4') {
			
			//custom texture face
			if(text instanceof HTMLImageElement){
				isTexture = true;
				context.drawImage(text, 0,0,text.width,text.height,0,0,canvas.width,canvas.height);
			}
			else{
				let fontsize = ts / (1 + 2 * margin);
				let textstarty = (canvas.height / 2);
				let textstartx = (canvas.width / 2);

				if(diceobj.fontScale)
					fontsize *= diceobj.fontScale;
				else
					diceobj.fontScale = 1;

				//Needed for every fonts
				switch(diceobj.shape){
					case 'd8':
						textstarty = textstarty*1.1;
						break;
				}

				//fix Arial strange alignment
				if(diceobj.font == "Arial"){
					switch(diceobj.shape){
						case 'd2':
							textstarty = textstarty*1.1;
							break;
						case 'd10':
							fontsize = fontsize*0.75;
							textstarty = textstarty*1.15;
							break;
						case 'd6':
							textstarty = textstarty*(1+(0.07*diceobj.fontScale));
							break;
						case 'd20':
							textstartx = textstartx*0.98;
							break;
						case 'd12':
							textstarty = textstarty*1.08;
							break;
					}
				}

				context.font =  fontsize+ 'pt '+diceobj.font;
				contextBump.font =  fontsize+ 'pt '+diceobj.font;
				var lineHeight = fontsize;
				
				let textlines = text.split("\n");

				if (textlines.length > 1) {
					fontsize = fontsize / textlines.length;
					context.font =  fontsize+ 'pt '+diceobj.font;
					contextBump.font =  fontsize+ 'pt '+diceobj.font;

					//to find the correct text height for every possible fonts, we have no choice but to use the great (and complex) pixi method
					//First we create a PIXI.TextStyle object, to pass later to the measure method
					let pixiStyle = new PIXI.TextStyle({
						fontFamily: diceobj.font,
						fontSize: fontsize,
						stroke: "#0000FF",
						strokeThickness: (outlinecolor != 'none' && outlinecolor != backcolor) ? 1:0
					});
					//Then we call the PIXI measureText method
					let textMetrics = PIXI.TextMetrics.measureText(textlines.join(""),pixiStyle);

					lineHeight = textMetrics.lineHeight;
					if(textlines[0]!=""){
						textstarty -= (lineHeight * textlines.length) / 2;
						//On a D12, we add a little padding because it looks better to human eyes even tho it's not really the center anymore
						if(diceobj.shape == "d12")
							textstarty = textstarty *1.08;
					}
					else
						textlines.shift();
				}

				for(let i = 0, l = textlines.length; i < l; i++){
					let textline = textlines[i].trim();

					// attempt to outline the text with a meaningful color
					if (outlinecolor != 'none' && outlinecolor != backcolor) {
						context.strokeStyle = outlinecolor;
						context.lineWidth = 5;
						context.strokeText(textlines[i], textstartx, textstarty);

						contextBump.strokeStyle = "#000000";
						contextBump.lineWidth = 5;
						contextBump.strokeText(textlines[i], textstartx, textstarty);
						if (textline == '6' || textline == '9') {
							context.strokeText('  .', textstartx, textstarty);
							contextBump.strokeText('  .', textstartx, textstarty);
						}
					}

					context.fillStyle = forecolor;
					context.fillText(textlines[i], textstartx, textstarty);

					contextBump.fillStyle = "#000000";
					contextBump.fillText(textlines[i], textstartx, textstarty);
					if (textline == '6' || textline == '9') {
						context.fillText('  .', textstartx, textstarty);
						contextBump.fillText('  .', textstartx, textstarty);
					}
					textstarty += (lineHeight * 1.5);
				}
			}

		} else {

			var hw = (canvas.width / 2);
			var hh = (canvas.height / 2);

			context.font =  (ts / 128 * 24)+'pt '+diceobj.font;
			contextBump.font =  (ts / 128 * 24)+'pt '+diceobj.font;

			//draw the numbers
			for (let i=0;i<text.length;i++) {
				//custom texture face
				if(text[i] instanceof HTMLImageElement){
					isTexture = true;
					let scaleTexture = text[i].width / canvas.width;
					context.drawImage(text[i], 0,0,text[i].width,text[i].height,100/scaleTexture,25/scaleTexture,60/scaleTexture,60/scaleTexture);
				}
				else{
					// attempt to outline the text with a meaningful color
					if (outlinecolor != 'none' && outlinecolor != backcolor) {
						context.strokeStyle = outlinecolor;
						
						context.lineWidth = 5;
						context.strokeText(text[i], hw, hh - ts * 0.3);

						contextBump.strokeStyle = "#000000";
						contextBump.lineWidth = 5;
						contextBump.strokeText(text[i], hw, hh - ts * 0.3);
					}

					//draw label in top middle section
					context.fillStyle = forecolor;
					context.fillText(text[i], hw, hh - ts * 0.3);
					contextBump.fillStyle = "#000000";
					contextBump.fillText(text[i], hw, hh - ts * 0.3);
				}

				//rotate 1/3 for next label
				context.translate(hw, hh);
				context.rotate(Math.PI * 2 / 3);
				context.translate(-hw, -hh);

				contextBump.translate(hw, hh);
				contextBump.rotate(Math.PI * 2 / 3);
				contextBump.translate(-hw, -hh);
			}
		}

		let bumpMap;
		if(!isTexture)
			bumpMap = canvasBump;
		else
			bumpMap = null;
		if (allowcache) {
			// cache new texture
			this.cache_misses++;
			this.materials_cache[cachestring] = {composite:canvas,bump:bumpMap,cachestring:cachestring};
		}

		return {composite:canvas,bump:bumpMap, cachestring:cachestring};
	}

	applyColorSet(colordata) {
		this.colordata = colordata;
		this.label_color = colordata.foreground;
		this.dice_color = colordata.background;
		this.label_outline = colordata.outline != '' ? colordata.outline:"none";
		this.dice_texture = colordata.texture;
		this.material = colordata.material;
		this.edge_color = colordata.hasOwnProperty("edge") && colordata.edge != '' ? colordata.edge:colordata.background;
	}

	applyTexture(texture) {
		this.dice_texture = texture;
	}

	applyMaterial(material) {
		this.material = material;
	}

	setMaterialInfo(colorset = '') {

		let prevcolordata = this.colordata;
		let prevtexture = this.dice_texture;
		let prevmaterial = this.material;

		if (colorset) {
			let colordata = DiceColors.getColorSet(colorset);

			if (this.colordata.id != colordata.id) {
				this.applyColorSet(colordata);
			}
		}

		//reset random choices
		this.dice_color_rand = '';
		this.label_color_rand = '';
		this.label_outline_rand = '';
		this.dice_texture_rand = '';
		this.edge_color_rand = '';
		this.material_rand = '';

		// set base color first
		if (Array.isArray(this.dice_color)) {

			var colorindex = Math.floor(Math.random() * this.dice_color.length);

			// if color list and label list are same length, treat them as a parallel list
			if (Array.isArray(this.label_color) && this.label_color.length == this.dice_color.length) {
				this.label_color_rand = this.label_color[colorindex];

				// if label list and outline list are same length, treat them as a parallel list
				if (Array.isArray(this.label_outline) && this.label_outline.length == this.label_color.length) {
					this.label_outline_rand = this.label_outline[colorindex];
				}
			}
			// if texture list is same length do the same
			if (Array.isArray(this.dice_texture) && this.dice_texture.length == this.dice_color.length) {
				this.dice_texture_rand = this.dice_texture[colorindex];
			}

			//if edge list and color list are same length, treat them as a parallel list
			if (Array.isArray(this.edge_color) && this.edge_color.length == this.dice_color.length) {
				this.edge_color_rand = this.edge_color[colorindex];
			}

			this.dice_color_rand = this.dice_color[colorindex];
		} else {
			this.dice_color_rand = this.dice_color;
		}

		// set edge color if not set
		if(this.edge_color_rand == ''){
			if (Array.isArray(this.edge_color)) {

				var colorindex = Math.floor(Math.random() * this.edge_color.length);

				this.edge_color_rand = this.edge_color[colorindex];
			} else {
				this.edge_color_rand = this.edge_color;
			}
		}

		// if selected label color is still not set, pick one
		if (this.label_color_rand == '' && Array.isArray(this.label_color)) {
			var colorindex = this.label_color[Math.floor(Math.random() * this.label_color.length)];

			// if label list and outline list are same length, treat them as a parallel list
			if (Array.isArray(this.label_outline) && this.label_outline.length == this.label_color.length) {
				this.label_outline_rand = this.label_outline[colorindex];
			}

			this.label_color_rand = this.label_color[colorindex];

		} else if (this.label_color_rand == '') {
			this.label_color_rand = this.label_color;
		}

		// if selected label outline is still not set, pick one
		if (this.label_outline_rand == '' && Array.isArray(this.label_outline)) {
			var colorindex = this.label_outline[Math.floor(Math.random() * this.label_outline.length)];

			this.label_outline_rand = this.label_outline[colorindex];
			
		} else if (this.label_outline_rand == '') {
			this.label_outline_rand = this.label_outline;
		}

		// same for textures list
		if (this.dice_texture_rand == '' && Array.isArray(this.dice_texture)) {
			this.dice_texture_rand = this.dice_texture[Math.floor(Math.random() * this.dice_texture.length)];
		} else if (this.dice_texture_rand == '') {
			this.dice_texture_rand = this.dice_texture;
		}

		//Same for material
		let baseTexture = Array.isArray(this.dice_texture_rand) ? this.dice_texture_rand[0]:this.dice_texture_rand;
		if(this.material){
			this.material_rand = this.material;
		}
		else if(this.colordata.material)
			this.material_rand = this.colordata.material;
		else if(baseTexture && baseTexture.material)
			this.material_rand = baseTexture.material;
		
		
		if (this.colordata.id != prevcolordata.id) {
			this.applyColorSet(prevcolordata);
			this.applyTexture(prevtexture);
			this.applyMaterial(prevmaterial);
		}
		return this.dice_color_rand+this.label_color_rand+this.label_outline_rand+this.dice_texture_rand.name+this.edge_color_rand+this.material_rand;
	}

	calc_texture_size(approx, ceil = false) {
		let size = 0;
		if(!ceil)
			size = Math.pow(2, Math.floor(Math.log(approx) / Math.log(2)));
		else
			size = Math.pow(2, Math.ceil(Math.log(approx) / Math.log(2)));
		return size;
	}

	createGeometry(type, radius) {
		let geom = null;
		switch (type) {
			case 'd2':
				geom = this.create_d2_geometry(radius);
				break;
			case 'd4':
				geom = this.create_d4_geometry(radius);
				break;
			case 'd6':
				geom = this.create_d6_geometry(radius);
				break;
			case 'd8':
				geom = this.create_d8_geometry(radius);
				break;
			case 'd10':
				geom = this.create_d10_geometry(radius);
				break;
			case 'd12':
				geom = this.create_d12_geometry(radius);
				break;
			case 'd20':
				geom = this.create_d20_geometry(radius);
				break;
		}
		return geom;
	}

	load_geometry(type){
		var loader = new THREE.BufferGeometryLoader();
		let bufferGeometry = loader.parse(DICE_MODELS[type]);
		let geometry = new THREE.Geometry().fromBufferGeometry(bufferGeometry);
		geometry.mergeVertices();
		
		let faceValues = DICE_MODELS[type].faceValues;
		for(let i=0;i<8;i++){
			geometry.faces[i].dieValue = faceValues[i];
		}
		return geometry;
	}

	create_d2_geometry(radius){
		let geom = this.load_geometry("d2");
		geom.lookAt(new THREE.Vector3(0,1,0));
		geom.cannon_shape = new CANNON.Cylinder(1*radius,1*radius,0.1*radius,8);
		return geom;
	}

	create_d4_geometry(radius) {
		let geom = this.load_geometry("d4");
		geom.lookAt(new THREE.Vector3(0,1,0));
		var vertices = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
		var faces = [[1, 0, 2, 1], [0, 1, 3, 2], [0, 3, 2, 3], [1, 2, 3, 4]];
		geom.cannon_shape = this.create_geom(vertices, faces, radius);
		return geom;
	}

	create_d6_geometry(radius) {
		let geom = this.load_geometry("d6");
		var vertices = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
				[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
		var faces = [[0, 3, 2, 1, 1], [1, 2, 6, 5, 2], [0, 1, 5, 4, 3],
				[3, 7, 6, 2, 4], [0, 4, 7, 3, 5], [4, 5, 6, 7, 6]];
		geom.cannon_shape = this.create_geom(vertices, faces, radius);
		return geom;
	}

	create_d8_geometry(radius) {
		let geometry = this.load_geometry("d8");
		
		var vertices = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
		var faces = [[0, 2, 4, 1], [0, 4, 3, 2], [0, 3, 5, 3], [0, 5, 2, 4], [1, 3, 4, 5],
				[1, 4, 2, 6], [1, 2, 5, 7], [1, 5, 3, 8]];
		geometry.cannon_shape = this.create_geom(vertices, faces, radius);
		return geometry;
	}

	create_d10_geometry(radius) {
		let geom = this.load_geometry("d10");
		var a = Math.PI * 2 / 10, h = 0.105, v = -1;
		var vertices = [];
		for (var i = 0, b = 0; i < 10; ++i, b += a) {
			vertices.push([Math.cos(b), Math.sin(b), h * (i % 2 ? 1 : -1)]);
		}
		vertices.push([0, 0, -1]);
		vertices.push([0, 0, 1]);

		var faces = [
            [5, 6, 7, 11, 0],
            [4, 3, 2, 10, 1],
            [1, 2, 3, 11, 2],
            [0, 9, 8, 10, 3],
            [7, 8, 9, 11, 4],
            [8, 7, 6, 10, 5],
            [9, 0, 1, 11, 6],
            [2, 1, 0, 10, 7],
            [3, 4, 5, 11, 8],
            [6, 5, 4, 10, 9]
        ];
		geom.cannon_shape = this.create_geom(vertices, faces, radius);
		return geom;
	}

	create_d12_geometry(radius) {
		let geom = this.load_geometry("d12");
		var p = (1 + Math.sqrt(5)) / 2, q = 1 / p;
		var vertices = [[0, q, p], [0, q, -p], [0, -q, p], [0, -q, -p], [p, 0, q],
				[p, 0, -q], [-p, 0, q], [-p, 0, -q], [q, p, 0], [q, -p, 0], [-q, p, 0],
				[-q, -p, 0], [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1], [-1, 1, 1],
				[-1, 1, -1], [-1, -1, 1], [-1, -1, -1]];
		var faces = [[2, 14, 4, 12, 0, 1], [15, 9, 11, 19, 3, 2], [16, 10, 17, 7, 6, 3], [6, 7, 19, 11, 18, 4],
				[6, 18, 2, 0, 16, 5], [18, 11, 9, 14, 2, 6], [1, 17, 10, 8, 13, 7], [1, 13, 5, 15, 3, 8],
				[13, 8, 12, 4, 5, 9], [5, 4, 14, 9, 15, 10], [0, 12, 8, 10, 16, 11], [3, 19, 7, 17, 1, 12]];

		geom.cannon_shape = this.create_geom(vertices, faces, radius);
		return geom;
	}

	create_d20_geometry(radius) {
		let geom = this.load_geometry("d20");
		var t = (1 + Math.sqrt(5)) / 2;
		var vertices = [[-1, t, 0], [1, t, 0 ], [-1, -t, 0], [1, -t, 0],
				[0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
				[t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
		var faces = [[0, 11, 5, 1], [0, 5, 1, 2], [0, 1, 7, 3], [0, 7, 10, 4], [0, 10, 11, 5],
				[1, 5, 9, 6], [5, 11, 4, 7], [11, 10, 2, 8], [10, 7, 6, 9], [7, 1, 8, 10],
				[3, 9, 4, 11], [3, 4, 2, 12], [3, 2, 6, 13], [3, 6, 8, 14], [3, 8, 9, 15],
				[4, 9, 5, 16], [2, 4, 11, 17], [6, 2, 10, 18], [8, 6, 7, 19], [9, 8, 1, 20]];
		geom.cannon_shape = this.create_geom(vertices, faces, radius);
		return geom;
	}

	fixmaterials(mesh, unique_sides) {
		alert("TODO fixmaterials");

		// this makes the mesh reuse textures for other sides
		for (let i = 0, l = mesh.geometry.faces.length; i < l; ++i) {
			var matindex = mesh.geometry.faces[i].materialIndex - 2;
			if (matindex < unique_sides) continue;

			let modmatindex = (matindex % unique_sides);

			mesh.geometry.faces[i].materialIndex = modmatindex + 2;
		}
		mesh.geometry.elementsNeedUpdate = true;
		return mesh;
	}

	create_shape(vertices, faces, radius) {
		var cv = new Array(vertices.length), cf = new Array(faces.length);
		for (var i = 0; i < vertices.length; ++i) {
			var v = vertices[i];
			cv[i] = new CANNON.Vec3(v.x * radius, v.y * radius, v.z * radius);
		}
		for (var i = 0; i < faces.length; ++i) {
			cf[i] = faces[i].slice(0, faces[i].length - 1);
		}
		return new CANNON.ConvexPolyhedron(cv, cf);
	}

	create_geom(vertices, faces, radius) {
		var vectors = new Array(vertices.length);
		for (var i = 0; i < vertices.length; ++i) {
			vectors[i] = (new THREE.Vector3).fromArray(vertices[i]).normalize();
		}
		let cannon_shape = this.create_shape(vectors, faces, radius);
		return cannon_shape;
	}
}