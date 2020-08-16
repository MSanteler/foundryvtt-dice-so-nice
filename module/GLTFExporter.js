let Scene = THREE.Scene;
let AnimationClip = THREE.AnimationClip;
let Bone = THREE.Bone;
let Box3 = THREE.Box3;
let BufferAttribute = THREE.BufferAttribute;
let BufferGeometry = THREE.BufferGeometry;
let CanvasTexture = THREE.CanvasTexture;
let ClampToEdgeWrapping = THREE.ClampToEdgeWrapping;
let Color = THREE.Color;
let DirectionalLight = THREE.DirectionalLight;
let DoubleSide = THREE.DoubleSide;
let FileLoader = THREE.FileLoader;
let FrontSide = THREE.FrontSide;
let Group = THREE.Group;
let ImageBitmapLoader = THREE.ImageBitmapLoader;
let InterleavedBuffer = THREE.InterleavedBuffer;
let InterleavedBufferAttribute = THREE.InterleavedBufferAttribute;
let Interpolant = THREE.Interpolant;
let InterpolateDiscrete = THREE.InterpolateDiscrete;
let InterpolateLinear = THREE.InterpolateLinear;
let Line = THREE.Line;
let LineBasicMaterial = THREE.LineBasicMaterial;
let LineLoop = THREE.LineLoop;
let LineSegments = THREE.LineSegments;
let LinearFilter = THREE.LinearFilter;
let LinearMipmapLinearFilter = THREE.LinearMipmapLinearFilter;
let LinearMipmapNearestFilter = THREE.LinearMipmapNearestFilter;
let Loader = THREE.Loader;
let LoaderUtils = THREE.LoaderUtils;
let Material = THREE.Material;
let MathUtils = THREE.MathUtils;
let Matrix4 = THREE.Matrix4;
let Mesh = THREE.Mesh;
let MeshBasicMaterial = THREE.MeshBasicMaterial;
let MeshPhysicalMaterial = THREE.MeshPhysicalMaterial;
let MeshStandardMaterial = THREE.MeshStandardMaterial;
let MirroredRepeatWrapping = THREE.MirroredRepeatWrapping;
let NearestFilter = THREE.NearestFilter;
let NearestMipmapLinearFilter = THREE.NearestMipmapLinearFilter;
let NearestMipmapNearestFilter = THREE.NearestMipmapNearestFilter;
let NumberKeyframeTrack = THREE.NumberKeyframeTrack;
let Object3D = THREE.Object3D;
let OrthographicCamera = THREE.OrthographicCamera;
let PerspectiveCamera = THREE.PerspectiveCamera;
let PointLight = THREE.PointLight;
let Points = THREE.Points;
let PointsMaterial = THREE.PointsMaterial;
let PropertyBinding = THREE.PropertyBinding;
let QuaternionKeyframeTrack = THREE.QuaternionKeyframeTrack;
let RGBAFormat = THREE.RGBAFormat;
let RGBFormat = THREE.RGBFormat;
let RepeatWrapping = THREE.RepeatWrapping;
let Skeleton = THREE.Skeleton;
let SkinnedMesh = THREE.SkinnedMesh;
let Sphere = THREE.Sphere;
let SpotLight = THREE.SpotLight;
let TangentSpaceNormalMap = THREE.TangentSpaceNormalMap;
let TextureLoader = THREE.TextureLoader;
let TriangleFanDrawMode = THREE.TriangleFanDrawMode;
let TriangleStripDrawMode = THREE.TriangleStripDrawMode;
let Vector2 = THREE.Vector2;
let Vector3 = THREE.Vector3;
let VectorKeyframeTrack = THREE.VectorKeyframeTrack;
let sRGBEncoding = THREE.sRGBEncoding;

//------------------------------------------------------------------------------
// Constants
//------------------------------------------------------------------------------
var WEBGL_CONSTANTS = {
	POINTS: 0x0000,
	LINES: 0x0001,
	LINE_LOOP: 0x0002,
	LINE_STRIP: 0x0003,
	TRIANGLES: 0x0004,
	TRIANGLE_STRIP: 0x0005,
	TRIANGLE_FAN: 0x0006,

	UNSIGNED_BYTE: 0x1401,
	UNSIGNED_SHORT: 0x1403,
	FLOAT: 0x1406,
	UNSIGNED_INT: 0x1405,
	ARRAY_BUFFER: 0x8892,
	ELEMENT_ARRAY_BUFFER: 0x8893,

	NEAREST: 0x2600,
	LINEAR: 0x2601,
	NEAREST_MIPMAP_NEAREST: 0x2700,
	LINEAR_MIPMAP_NEAREST: 0x2701,
	NEAREST_MIPMAP_LINEAR: 0x2702,
	LINEAR_MIPMAP_LINEAR: 0x2703,

	CLAMP_TO_EDGE: 33071,
	MIRRORED_REPEAT: 33648,
	REPEAT: 10497
};

var THREE_TO_WEBGL = {};

THREE_TO_WEBGL[ NearestFilter ] = WEBGL_CONSTANTS.NEAREST;
THREE_TO_WEBGL[ NearestMipmapNearestFilter ] = WEBGL_CONSTANTS.NEAREST_MIPMAP_NEAREST;
THREE_TO_WEBGL[ NearestMipmapLinearFilter ] = WEBGL_CONSTANTS.NEAREST_MIPMAP_LINEAR;
THREE_TO_WEBGL[ LinearFilter ] = WEBGL_CONSTANTS.LINEAR;
THREE_TO_WEBGL[ LinearMipmapNearestFilter ] = WEBGL_CONSTANTS.LINEAR_MIPMAP_NEAREST;
THREE_TO_WEBGL[ LinearMipmapLinearFilter ] = WEBGL_CONSTANTS.LINEAR_MIPMAP_LINEAR;

THREE_TO_WEBGL[ ClampToEdgeWrapping ] = WEBGL_CONSTANTS.CLAMP_TO_EDGE;
THREE_TO_WEBGL[ RepeatWrapping ] = WEBGL_CONSTANTS.REPEAT;
THREE_TO_WEBGL[ MirroredRepeatWrapping ] = WEBGL_CONSTANTS.MIRRORED_REPEAT;

var PATH_PROPERTIES = {
	scale: 'scale',
	position: 'translation',
	quaternion: 'rotation',
	morphTargetInfluences: 'weights'
};

//------------------------------------------------------------------------------
// GLTF Exporter
//------------------------------------------------------------------------------
var GLTFExporter = function () {};

GLTFExporter.prototype = {

	constructor: GLTFExporter,

	/**
	 * Parse scenes and generate GLTF output
	 * @param  {Scene or [THREE.Scenes]} input   Scene or Array of THREE.Scenes
	 * @param  {Function} onDone  Callback on completed
	 * @param  {Object} options options
	 */
	parse: function ( input, onDone, options ) {

		var DEFAULT_OPTIONS = {
			binary: false,
			trs: false,
			onlyVisible: true,
			truncateDrawRange: true,
			embedImages: true,
			maxTextureSize: Infinity,
			animations: [],
			forcePowerOfTwoTextures: false,
			includeCustomExtensions: false
		};

		options = Object.assign( {}, DEFAULT_OPTIONS, options );

		if ( options.animations.length > 0 ) {

			// Only TRS properties, and not matrices, may be targeted by animation.
			options.trs = true;

		}

		var outputJSON = {

			asset: {

				version: "2.0",
				generator: "GLTFExporter"

			}

		};

		var byteOffset = 0;
		var buffers = [];
		var pending = [];
		var nodeMap = new Map();
		var skins = [];
		var extensionsUsed = {};
		var cachedData = {

			meshes: new Map(),
			attributes: new Map(),
			attributesNormalized: new Map(),
			materials: new Map(),
			textures: new Map(),
			images: new Map()

		};

		var cachedCanvas;

		var uids = new Map();
		var uid = 0;

		/**
		 * Assign and return a temporal unique id for an object
		 * especially which doesn't have .uuid
		 * @param  {Object} object
		 * @return {Integer}
		 */
		function getUID( object ) {

			if ( ! uids.has( object ) ) uids.set( object, uid ++ );

			return uids.get( object );

		}

		/**
		 * Compare two arrays
		 * @param  {Array} array1 Array 1 to compare
		 * @param  {Array} array2 Array 2 to compare
		 * @return {Boolean}        Returns true if both arrays are equal
		 */
		function equalArray( array1, array2 ) {

			return ( array1.length === array2.length ) && array1.every( function ( element, index ) {

				return element === array2[ index ];

			} );

		}

		/**
		 * Converts a string to an ArrayBuffer.
		 * @param  {string} text
		 * @return {ArrayBuffer}
		 */
		function stringToArrayBuffer( text ) {

			if ( window.TextEncoder !== undefined ) {

				return new TextEncoder().encode( text ).buffer;

			}

			var array = new Uint8Array( new ArrayBuffer( text.length ) );

			for ( var i = 0, il = text.length; i < il; i ++ ) {

				var value = text.charCodeAt( i );

				// Replacing multi-byte character with space(0x20).
				array[ i ] = value > 0xFF ? 0x20 : value;

			}

			return array.buffer;

		}

		/**
		 * Get the min and max vectors from the given attribute
		 * @param  {BufferAttribute} attribute Attribute to find the min/max in range from start to start + count
		 * @param  {Integer} start
		 * @param  {Integer} count
		 * @return {Object} Object containing the `min` and `max` values (As an array of attribute.itemSize components)
		 */
		function getMinMax( attribute, start, count ) {

			var output = {

				min: new Array( attribute.itemSize ).fill( Number.POSITIVE_INFINITY ),
				max: new Array( attribute.itemSize ).fill( Number.NEGATIVE_INFINITY )

			};

			for ( var i = start; i < start + count; i ++ ) {

				for ( var a = 0; a < attribute.itemSize; a ++ ) {

					var value = attribute.array[ i * attribute.itemSize + a ];
					output.min[ a ] = Math.min( output.min[ a ], value );
					output.max[ a ] = Math.max( output.max[ a ], value );

				}

			}

			return output;

		}

		/**
		 * Checks if image size is POT.
		 *
		 * @param {Image} image The image to be checked.
		 * @returns {Boolean} Returns true if image size is POT.
		 *
		 */
		function isPowerOfTwo( image ) {

			return MathUtils.isPowerOfTwo( image.width ) && MathUtils.isPowerOfTwo( image.height );

		}

		/**
		 * Checks if normal attribute values are normalized.
		 *
		 * @param {BufferAttribute} normal
		 * @returns {Boolean}
		 *
		 */
		function isNormalizedNormalAttribute( normal ) {

			if ( cachedData.attributesNormalized.has( normal ) ) {

				return false;

			}

			var v = new Vector3();

			for ( var i = 0, il = normal.count; i < il; i ++ ) {

				// 0.0005 is from glTF-validator
				if ( Math.abs( v.fromArray( normal.array, i * 3 ).length() - 1.0 ) > 0.0005 ) return false;

			}

			return true;

		}

		/**
		 * Creates normalized normal buffer attribute.
		 *
		 * @param {BufferAttribute} normal
		 * @returns {BufferAttribute}
		 *
		 */
		function createNormalizedNormalAttribute( normal ) {

			if ( cachedData.attributesNormalized.has( normal ) ) {

				return cachedData.attributesNormalized.get( normal );

			}

			var attribute = normal.clone();

			var v = new Vector3();

			for ( var i = 0, il = attribute.count; i < il; i ++ ) {

				v.fromArray( attribute.array, i * 3 );

				if ( v.x === 0 && v.y === 0 && v.z === 0 ) {

					// if values can't be normalized set (1, 0, 0)
					v.setX( 1.0 );

				} else {

					v.normalize();

				}

				v.toArray( attribute.array, i * 3 );

			}

			cachedData.attributesNormalized.set( normal, attribute );

			return attribute;

		}

		/**
		 * Get the required size + padding for a buffer, rounded to the next 4-byte boundary.
		 * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#data-alignment
		 *
		 * @param {Integer} bufferSize The size the original buffer.
		 * @returns {Integer} new buffer size with required padding.
		 *
		 */
		function getPaddedBufferSize( bufferSize ) {

			return Math.ceil( bufferSize / 4 ) * 4;

		}

		/**
		 * Returns a buffer aligned to 4-byte boundary.
		 *
		 * @param {ArrayBuffer} arrayBuffer Buffer to pad
		 * @param {Integer} paddingByte (Optional)
		 * @returns {ArrayBuffer} The same buffer if it's already aligned to 4-byte boundary or a new buffer
		 */
		function getPaddedArrayBuffer( arrayBuffer, paddingByte ) {

			paddingByte = paddingByte || 0;

			var paddedLength = getPaddedBufferSize( arrayBuffer.byteLength );

			if ( paddedLength !== arrayBuffer.byteLength ) {

				var array = new Uint8Array( paddedLength );
				array.set( new Uint8Array( arrayBuffer ) );

				if ( paddingByte !== 0 ) {

					for ( var i = arrayBuffer.byteLength; i < paddedLength; i ++ ) {

						array[ i ] = paddingByte;

					}

				}

				return array.buffer;

			}

			return arrayBuffer;

		}

		/**
		 * Serializes a userData.
		 *
		 * @param {THREE.Object3D|THREE.Material} object
		 * @param {Object} gltfProperty
		 */
		function serializeUserData( object, gltfProperty ) {

			if ( Object.keys( object.userData ).length === 0 ) {

				return;

			}

			try {

				var json = JSON.parse( JSON.stringify( object.userData ) );

				if ( options.includeCustomExtensions && json.gltfExtensions ) {

					if ( gltfProperty.extensions === undefined ) {

						gltfProperty.extensions = {};

					}

					for ( var extensionName in json.gltfExtensions ) {

						gltfProperty.extensions[ extensionName ] = json.gltfExtensions[ extensionName ];
						extensionsUsed[ extensionName ] = true;

					}

					delete json.gltfExtensions;

				}

				if ( Object.keys( json ).length > 0 ) {

					gltfProperty.extras = json;

				}

			} catch ( error ) {

				console.warn( 'THREE.GLTFExporter: userData of \'' + object.name + '\' ' +
					'won\'t be serialized because of JSON.stringify error - ' + error.message );

			}

		}

		/**
		 * Applies a texture transform, if present, to the map definition. Requires
		 * the KHR_texture_transform extension.
		 */
		function applyTextureTransform( mapDef, texture ) {

			var didTransform = false;
			var transformDef = {};

			if ( texture.offset.x !== 0 || texture.offset.y !== 0 ) {

				transformDef.offset = texture.offset.toArray();
				didTransform = true;

			}

			if ( texture.rotation !== 0 ) {

				transformDef.rotation = texture.rotation;
				didTransform = true;

			}

			if ( texture.repeat.x !== 1 || texture.repeat.y !== 1 ) {

				transformDef.scale = texture.repeat.toArray();
				didTransform = true;

			}

			if ( didTransform ) {

				mapDef.extensions = mapDef.extensions || {};
				mapDef.extensions[ 'KHR_texture_transform' ] = transformDef;
				extensionsUsed[ 'KHR_texture_transform' ] = true;

			}

		}

		/**
		 * Process a buffer to append to the default one.
		 * @param  {ArrayBuffer} buffer
		 * @return {Integer}
		 */
		function processBuffer( buffer ) {

			if ( ! outputJSON.buffers ) {

				outputJSON.buffers = [ { byteLength: 0 } ];

			}

			// All buffers are merged before export.
			buffers.push( buffer );

			return 0;

		}

		/**
		 * Process and generate a BufferView
		 * @param  {BufferAttribute} attribute
		 * @param  {number} componentType
		 * @param  {number} start
		 * @param  {number} count
		 * @param  {number} target (Optional) Target usage of the BufferView
		 * @return {Object}
		 */
		function processBufferView( attribute, componentType, start, count, target ) {

			if ( ! outputJSON.bufferViews ) {

				outputJSON.bufferViews = [];

			}

			// Create a new dataview and dump the attribute's array into it

			var componentSize;

			if ( componentType === WEBGL_CONSTANTS.UNSIGNED_BYTE ) {

				componentSize = 1;

			} else if ( componentType === WEBGL_CONSTANTS.UNSIGNED_SHORT ) {

				componentSize = 2;

			} else {

				componentSize = 4;

			}

			var byteLength = getPaddedBufferSize( count * attribute.itemSize * componentSize );
			var dataView = new DataView( new ArrayBuffer( byteLength ) );
			var offset = 0;

			for ( var i = start; i < start + count; i ++ ) {

				for ( var a = 0; a < attribute.itemSize; a ++ ) {

					var value;

					if ( attribute.itemSize > 4 ) {

						 // no support for interleaved data for itemSize > 4

						value = attribute.array[ i * attribute.itemSize + a ];

					} else {

						if ( a === 0 ) value = attribute.getX( i );
						else if ( a === 1 ) value = attribute.getY( i );
						else if ( a === 2 ) value = attribute.getZ( i );
						else if ( a === 3 ) value = attribute.getW( i );

					}

					if ( componentType === WEBGL_CONSTANTS.FLOAT ) {

						dataView.setFloat32( offset, value, true );

					} else if ( componentType === WEBGL_CONSTANTS.UNSIGNED_INT ) {

						dataView.setUint32( offset, value, true );

					} else if ( componentType === WEBGL_CONSTANTS.UNSIGNED_SHORT ) {

						dataView.setUint16( offset, value, true );

					} else if ( componentType === WEBGL_CONSTANTS.UNSIGNED_BYTE ) {

						dataView.setUint8( offset, value );

					}

					offset += componentSize;

				}

			}

			var gltfBufferView = {

				buffer: processBuffer( dataView.buffer ),
				byteOffset: byteOffset,
				byteLength: byteLength

			};

			if ( target !== undefined ) gltfBufferView.target = target;

			if ( target === WEBGL_CONSTANTS.ARRAY_BUFFER ) {

				// Only define byteStride for vertex attributes.
				gltfBufferView.byteStride = attribute.itemSize * componentSize;

			}

			byteOffset += byteLength;

			outputJSON.bufferViews.push( gltfBufferView );

			// @TODO Merge bufferViews where possible.
			var output = {

				id: outputJSON.bufferViews.length - 1,
				byteLength: 0

			};

			return output;

		}

		/**
		 * Process and generate a BufferView from an image Blob.
		 * @param {Blob} blob
		 * @return {Promise<Integer>}
		 */
		function processBufferViewImage( blob ) {

			if ( ! outputJSON.bufferViews ) {

				outputJSON.bufferViews = [];

			}

			return new Promise( function ( resolve ) {

				var reader = new window.FileReader();
				reader.readAsArrayBuffer( blob );
				reader.onloadend = function () {

					var buffer = getPaddedArrayBuffer( reader.result );

					var bufferView = {
						buffer: processBuffer( buffer ),
						byteOffset: byteOffset,
						byteLength: buffer.byteLength
					};

					byteOffset += buffer.byteLength;

					outputJSON.bufferViews.push( bufferView );

					resolve( outputJSON.bufferViews.length - 1 );

				};

			} );

		}

		/**
		 * Process attribute to generate an accessor
		 * @param  {BufferAttribute} attribute Attribute to process
		 * @param  {BufferGeometry} geometry (Optional) Geometry used for truncated draw range
		 * @param  {Integer} start (Optional)
		 * @param  {Integer} count (Optional)
		 * @return {Integer}           Index of the processed accessor on the "accessors" array
		 */
		function processAccessor( attribute, geometry, start, count ) {

			var types = {

				1: 'SCALAR',
				2: 'VEC2',
				3: 'VEC3',
				4: 'VEC4',
				16: 'MAT4'

			};

			var componentType;

			// Detect the component type of the attribute array (float, uint or ushort)
			if ( attribute.array.constructor === Float32Array ) {

				componentType = WEBGL_CONSTANTS.FLOAT;

			} else if ( attribute.array.constructor === Uint32Array ) {

				componentType = WEBGL_CONSTANTS.UNSIGNED_INT;

			} else if ( attribute.array.constructor === Uint16Array ) {

				componentType = WEBGL_CONSTANTS.UNSIGNED_SHORT;

			} else if ( attribute.array.constructor === Uint8Array ) {

				componentType = WEBGL_CONSTANTS.UNSIGNED_BYTE;

			} else {

				throw new Error( 'THREE.GLTFExporter: Unsupported bufferAttribute component type.' );

			}

			if ( start === undefined ) start = 0;
			if ( count === undefined ) count = attribute.count;

			// @TODO Indexed buffer geometry with drawRange not supported yet
			if ( options.truncateDrawRange && geometry !== undefined && geometry.index === null ) {

				var end = start + count;
				var end2 = geometry.drawRange.count === Infinity
					? attribute.count
					: geometry.drawRange.start + geometry.drawRange.count;

				start = Math.max( start, geometry.drawRange.start );
				count = Math.min( end, end2 ) - start;

				if ( count < 0 ) count = 0;

			}

			// Skip creating an accessor if the attribute doesn't have data to export
			if ( count === 0 ) {

				return null;

			}

			var minMax = getMinMax( attribute, start, count );

			var bufferViewTarget;

			// If geometry isn't provided, don't infer the target usage of the bufferView. For
			// animation samplers, target must not be set.
			if ( geometry !== undefined ) {

				bufferViewTarget = attribute === geometry.index ? WEBGL_CONSTANTS.ELEMENT_ARRAY_BUFFER : WEBGL_CONSTANTS.ARRAY_BUFFER;

			}

			var bufferView = processBufferView( attribute, componentType, start, count, bufferViewTarget );

			var gltfAccessor = {

				bufferView: bufferView.id,
				byteOffset: bufferView.byteOffset,
				componentType: componentType,
				count: count,
				max: minMax.max,
				min: minMax.min,
				type: types[ attribute.itemSize ]

			};

			if ( attribute.normalized === true ) {

				gltfAccessor.normalized = true;

			}

			if ( ! outputJSON.accessors ) {

				outputJSON.accessors = [];

			}

			outputJSON.accessors.push( gltfAccessor );

			return outputJSON.accessors.length - 1;

		}

		/**
		 * Process image
		 * @param  {Image} image to process
		 * @param  {Integer} format of the image (e.g. THREE.RGBFormat, RGBAFormat etc)
		 * @param  {Boolean} flipY before writing out the image
		 * @return {Integer}     Index of the processed texture in the "images" array
		 */
		function processImage( image, format, flipY ) {

			if ( ! cachedData.images.has( image ) ) {

				cachedData.images.set( image, {} );

			}

			var cachedImages = cachedData.images.get( image );
			var mimeType = format === RGBAFormat ? 'image/png' : 'image/jpeg';
			var key = mimeType + ":flipY/" + flipY.toString();

			if ( cachedImages[ key ] !== undefined ) {

				return cachedImages[ key ];

			}

			if ( ! outputJSON.images ) {

				outputJSON.images = [];

			}

			var gltfImage = { mimeType: mimeType };

			if ( options.embedImages ) {

				var canvas = cachedCanvas = cachedCanvas || document.createElement( 'canvas' );

				canvas.width = Math.min( image.width, options.maxTextureSize );
				canvas.height = Math.min( image.height, options.maxTextureSize );

				if ( options.forcePowerOfTwoTextures && ! isPowerOfTwo( canvas ) ) {

					console.warn( 'GLTFExporter: Resized non-power-of-two image.', image );

					canvas.width = MathUtils.floorPowerOfTwo( canvas.width );
					canvas.height = MathUtils.floorPowerOfTwo( canvas.height );

				}

				var ctx = canvas.getContext( '2d' );

				if ( flipY === true ) {

					ctx.translate( 0, canvas.height );
					ctx.scale( 1, - 1 );

				}

				ctx.drawImage( image, 0, 0, canvas.width, canvas.height );

				if ( options.binary === true ) {

					pending.push( new Promise( function ( resolve ) {

						canvas.toBlob( function ( blob ) {

							processBufferViewImage( blob ).then( function ( bufferViewIndex ) {

								gltfImage.bufferView = bufferViewIndex;

								resolve();

							} );

						}, mimeType );

					} ) );

				} else {

					gltfImage.uri = canvas.toDataURL( mimeType );

				}

			} else {

				gltfImage.uri = image.src;

			}

			outputJSON.images.push( gltfImage );

			var index = outputJSON.images.length - 1;
			cachedImages[ key ] = index;

			return index;

		}

		/**
		 * Process sampler
		 * @param  {Texture} map Texture to process
		 * @return {Integer}     Index of the processed texture in the "samplers" array
		 */
		function processSampler( map ) {

			if ( ! outputJSON.samplers ) {

				outputJSON.samplers = [];

			}

			var gltfSampler = {

				magFilter: THREE_TO_WEBGL[ map.magFilter ],
				minFilter: THREE_TO_WEBGL[ map.minFilter ],
				wrapS: THREE_TO_WEBGL[ map.wrapS ],
				wrapT: THREE_TO_WEBGL[ map.wrapT ]

			};

			outputJSON.samplers.push( gltfSampler );

			return outputJSON.samplers.length - 1;

		}

		/**
		 * Process texture
		 * @param  {Texture} map Map to process
		 * @return {Integer}     Index of the processed texture in the "textures" array
		 */
		function processTexture( map ) {

			if ( cachedData.textures.has( map ) ) {

				return cachedData.textures.get( map );

			}

			if ( ! outputJSON.textures ) {

				outputJSON.textures = [];

			}

			var gltfTexture = {

				sampler: processSampler( map ),
				source: processImage( map.image, map.format, map.flipY )

			};

			if ( map.name ) {

				gltfTexture.name = map.name;

			}

			outputJSON.textures.push( gltfTexture );

			var index = outputJSON.textures.length - 1;
			cachedData.textures.set( map, index );

			return index;

		}

		/**
		 * Process material
		 * @param  {THREE.Material} material Material to process
		 * @return {Integer}      Index of the processed material in the "materials" array
		 */
		function processMaterial( material ) {

			if ( cachedData.materials.has( material ) ) {

				return cachedData.materials.get( material );

			}

			if ( material.isShaderMaterial ) {

				console.warn( 'GLTFExporter: THREE.ShaderMaterial not supported.' );
				return null;

			}

			if ( ! outputJSON.materials ) {

				outputJSON.materials = [];

			}

			// @QUESTION Should we avoid including any attribute that has the default value?
			var gltfMaterial = {

				pbrMetallicRoughness: {}

			};

			if ( material.isMeshBasicMaterial ) {

				gltfMaterial.extensions = { KHR_materials_unlit: {} };

				extensionsUsed[ 'KHR_materials_unlit' ] = true;

			} else if ( material.isGLTFSpecularGlossinessMaterial ) {

				gltfMaterial.extensions = { KHR_materials_pbrSpecularGlossiness: {} };

				extensionsUsed[ 'KHR_materials_pbrSpecularGlossiness' ] = true;

			} else if ( ! material.isMeshStandardMaterial ) {

				console.warn( 'GLTFExporter: Use MeshStandardMaterial or MeshBasicMaterial for best results.' );

			}

			// pbrMetallicRoughness.baseColorFactor
			var color = material.color.toArray().concat( [ material.opacity ] );

			if ( ! equalArray( color, [ 1, 1, 1, 1 ] ) ) {

				gltfMaterial.pbrMetallicRoughness.baseColorFactor = color;

			}

			if ( material.isMeshStandardMaterial ) {

				gltfMaterial.pbrMetallicRoughness.metallicFactor = material.metalness;
				gltfMaterial.pbrMetallicRoughness.roughnessFactor = material.roughness;

			} else if ( material.isMeshBasicMaterial ) {

				gltfMaterial.pbrMetallicRoughness.metallicFactor = 0.0;
				gltfMaterial.pbrMetallicRoughness.roughnessFactor = 0.9;

			} else {

				gltfMaterial.pbrMetallicRoughness.metallicFactor = 0.5;
				gltfMaterial.pbrMetallicRoughness.roughnessFactor = 0.5;

			}

			// pbrSpecularGlossiness diffuse, specular and glossiness factor
			if ( material.isGLTFSpecularGlossinessMaterial ) {

				if ( gltfMaterial.pbrMetallicRoughness.baseColorFactor ) {

					gltfMaterial.extensions.KHR_materials_pbrSpecularGlossiness.diffuseFactor = gltfMaterial.pbrMetallicRoughness.baseColorFactor;

				}

				var specularFactor = [ 1, 1, 1 ];
				material.specular.toArray( specularFactor, 0 );
				gltfMaterial.extensions.KHR_materials_pbrSpecularGlossiness.specularFactor = specularFactor;

				gltfMaterial.extensions.KHR_materials_pbrSpecularGlossiness.glossinessFactor = material.glossiness;

			}

			// pbrMetallicRoughness.metallicRoughnessTexture
			if ( material.metalnessMap || material.roughnessMap ) {

				if ( material.metalnessMap === material.roughnessMap ) {

					var metalRoughMapDef = { index: processTexture( material.metalnessMap ) };
					applyTextureTransform( metalRoughMapDef, material.metalnessMap );
					gltfMaterial.pbrMetallicRoughness.metallicRoughnessTexture = metalRoughMapDef;

				} else {

					console.warn( 'THREE.GLTFExporter: Ignoring metalnessMap and roughnessMap because they are not the same Texture.' );

				}

			}

			// pbrMetallicRoughness.baseColorTexture or pbrSpecularGlossiness diffuseTexture
			if ( material.map ) {

				var baseColorMapDef = { index: processTexture( material.map ) };
				applyTextureTransform( baseColorMapDef, material.map );

				if ( material.isGLTFSpecularGlossinessMaterial ) {

					gltfMaterial.extensions.KHR_materials_pbrSpecularGlossiness.diffuseTexture = baseColorMapDef;

				}

				gltfMaterial.pbrMetallicRoughness.baseColorTexture = baseColorMapDef;

			}

			// pbrSpecularGlossiness specular map
			if ( material.isGLTFSpecularGlossinessMaterial && material.specularMap ) {

				var specularMapDef = { index: processTexture( material.specularMap ) };
				applyTextureTransform( specularMapDef, material.specularMap );
				gltfMaterial.extensions.KHR_materials_pbrSpecularGlossiness.specularGlossinessTexture = specularMapDef;

			}

			if ( material.emissive ) {

				// emissiveFactor
				var emissive = material.emissive.clone().multiplyScalar( material.emissiveIntensity ).toArray();

				if ( ! equalArray( emissive, [ 0, 0, 0 ] ) ) {

					gltfMaterial.emissiveFactor = emissive;

				}

				// emissiveTexture
				if ( material.emissiveMap ) {

					var emissiveMapDef = { index: processTexture( material.emissiveMap ) };
					applyTextureTransform( emissiveMapDef, material.emissiveMap );
					gltfMaterial.emissiveTexture = emissiveMapDef;

				}

			}

			// normalTexture
			if ( material.normalMap ) {

				var normalMapDef = { index: processTexture( material.normalMap ) };

				if ( material.normalScale && material.normalScale.x !== - 1 ) {

					if ( material.normalScale.x !== material.normalScale.y ) {

						console.warn( 'THREE.GLTFExporter: Normal scale components are different, ignoring Y and exporting X.' );

					}

					normalMapDef.scale = material.normalScale.x;

				}

				applyTextureTransform( normalMapDef, material.normalMap );

				gltfMaterial.normalTexture = normalMapDef;

			}

			// occlusionTexture
			if ( material.aoMap ) {

				var occlusionMapDef = {
					index: processTexture( material.aoMap ),
					texCoord: 1
				};

				if ( material.aoMapIntensity !== 1.0 ) {

					occlusionMapDef.strength = material.aoMapIntensity;

				}

				applyTextureTransform( occlusionMapDef, material.aoMap );

				gltfMaterial.occlusionTexture = occlusionMapDef;

			}

			// alphaMode
			if ( material.transparent ) {

				gltfMaterial.alphaMode = 'BLEND';

			} else {

				if ( material.alphaTest > 0.0 ) {

					gltfMaterial.alphaMode = 'MASK';
					gltfMaterial.alphaCutoff = material.alphaTest;

				}

			}

			// doubleSided
			if ( material.side === DoubleSide ) {

				gltfMaterial.doubleSided = true;

			}

			if ( material.name !== '' ) {

				gltfMaterial.name = material.name;

			}

			serializeUserData( material, gltfMaterial );

			outputJSON.materials.push( gltfMaterial );

			var index = outputJSON.materials.length - 1;
			cachedData.materials.set( material, index );

			return index;

		}

		/**
		 * Process mesh
		 * @param  {THREE.Mesh} mesh Mesh to process
		 * @return {Integer}      Index of the processed mesh in the "meshes" array
		 */
		function processMesh( mesh ) {

			var meshCacheKeyParts = [ mesh.geometry.uuid ];
			if ( Array.isArray( mesh.material ) ) {

				for ( var i = 0, l = mesh.material.length; i < l; i ++ ) {

					meshCacheKeyParts.push( mesh.material[ i ].uuid	);

				}

			} else {

				meshCacheKeyParts.push( mesh.material.uuid );

			}

			var meshCacheKey = meshCacheKeyParts.join( ':' );
			if ( cachedData.meshes.has( meshCacheKey ) ) {

				return cachedData.meshes.get( meshCacheKey );

			}

			var geometry = mesh.geometry;

			var mode;

			// Use the correct mode
			if ( mesh.isLineSegments ) {

				mode = WEBGL_CONSTANTS.LINES;

			} else if ( mesh.isLineLoop ) {

				mode = WEBGL_CONSTANTS.LINE_LOOP;

			} else if ( mesh.isLine ) {

				mode = WEBGL_CONSTANTS.LINE_STRIP;

			} else if ( mesh.isPoints ) {

				mode = WEBGL_CONSTANTS.POINTS;

			} else {

				mode = mesh.material.wireframe ? WEBGL_CONSTANTS.LINES : WEBGL_CONSTANTS.TRIANGLES;

			}

			if ( ! geometry.isBufferGeometry ) {

				console.warn( 'GLTFExporter: Exporting THREE.Geometry will increase file size. Use BufferGeometry instead.' );
				geometry = new BufferGeometry().setFromObject( mesh );

			}

			var gltfMesh = {};

			var attributes = {};
			var primitives = [];
			var targets = [];

			// Conversion between attributes names in threejs and gltf spec
			var nameConversion = {

				uv: 'TEXCOORD_0',
				uv2: 'TEXCOORD_1',
				color: 'COLOR_0',
				skinWeight: 'WEIGHTS_0',
				skinIndex: 'JOINTS_0'

			};

			var originalNormal = geometry.getAttribute( 'normal' );

			if ( originalNormal !== undefined && ! isNormalizedNormalAttribute( originalNormal ) ) {

				console.warn( 'THREE.GLTFExporter: Creating normalized normal attribute from the non-normalized one.' );

				geometry.setAttribute( 'normal', createNormalizedNormalAttribute( originalNormal ) );

			}

			// @QUESTION Detect if .vertexColors = true?
			// For every attribute create an accessor
			var modifiedAttribute = null;
			for ( var attributeName in geometry.attributes ) {

				// Ignore morph target attributes, which are exported later.
				if ( attributeName.substr( 0, 5 ) === 'morph' ) continue;

				var attribute = geometry.attributes[ attributeName ];
				attributeName = nameConversion[ attributeName ] || attributeName.toUpperCase();

				// Prefix all geometry attributes except the ones specifically
				// listed in the spec; non-spec attributes are considered custom.
				var validVertexAttributes =
						/^(POSITION|NORMAL|TANGENT|TEXCOORD_\d+|COLOR_\d+|JOINTS_\d+|WEIGHTS_\d+)$/;
				if ( ! validVertexAttributes.test( attributeName ) ) {

					attributeName = '_' + attributeName;

				}

				if ( cachedData.attributes.has( getUID( attribute ) ) ) {

					attributes[ attributeName ] = cachedData.attributes.get( getUID( attribute ) );
					continue;

				}

				// JOINTS_0 must be UNSIGNED_BYTE or UNSIGNED_SHORT.
				modifiedAttribute = null;
				var array = attribute.array;
				if ( attributeName === 'JOINTS_0' &&
					! ( array instanceof Uint16Array ) &&
					! ( array instanceof Uint8Array ) ) {

					console.warn( 'GLTFExporter: Attribute "skinIndex" converted to type UNSIGNED_SHORT.' );
					modifiedAttribute = new BufferAttribute( new Uint16Array( array ), attribute.itemSize, attribute.normalized );

				}

				var accessor = processAccessor( modifiedAttribute || attribute, geometry );
				if ( accessor !== null ) {

					attributes[ attributeName ] = accessor;
					cachedData.attributes.set( getUID( attribute ), accessor );

				}

			}

			if ( originalNormal !== undefined ) geometry.setAttribute( 'normal', originalNormal );

			// Skip if no exportable attributes found
			if ( Object.keys( attributes ).length === 0 ) {

				return null;

			}

			// Morph targets
			if ( mesh.morphTargetInfluences !== undefined && mesh.morphTargetInfluences.length > 0 ) {

				var weights = [];
				var targetNames = [];
				var reverseDictionary = {};

				if ( mesh.morphTargetDictionary !== undefined ) {

					for ( var key in mesh.morphTargetDictionary ) {

						reverseDictionary[ mesh.morphTargetDictionary[ key ] ] = key;

					}

				}

				for ( var i = 0; i < mesh.morphTargetInfluences.length; ++ i ) {

					var target = {};

					var warned = false;

					for ( var attributeName in geometry.morphAttributes ) {

						// glTF 2.0 morph supports only POSITION/NORMAL/TANGENT.
						// Three.js doesn't support TANGENT yet.

						if ( attributeName !== 'position' && attributeName !== 'normal' ) {

							if ( ! warned ) {

								console.warn( 'GLTFExporter: Only POSITION and NORMAL morph are supported.' );
								warned = true;

							}

							continue;

						}

						var attribute = geometry.morphAttributes[ attributeName ][ i ];
						var gltfAttributeName = attributeName.toUpperCase();

						// Three.js morph attribute has absolute values while the one of glTF has relative values.
						//
						// glTF 2.0 Specification:
						// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#morph-targets

						var baseAttribute = geometry.attributes[ attributeName ];

						if ( cachedData.attributes.has( getUID( attribute ) ) ) {

							target[ gltfAttributeName ] = cachedData.attributes.get( getUID( attribute ) );
							continue;

						}

						// Clones attribute not to override
						var relativeAttribute = attribute.clone();

						if ( ! geometry.morphTargetsRelative ) {

							for ( var j = 0, jl = attribute.count; j < jl; j ++ ) {

								relativeAttribute.setXYZ(
									j,
									attribute.getX( j ) - baseAttribute.getX( j ),
									attribute.getY( j ) - baseAttribute.getY( j ),
									attribute.getZ( j ) - baseAttribute.getZ( j )
								);

							}

						}

						target[ gltfAttributeName ] = processAccessor( relativeAttribute, geometry );
						cachedData.attributes.set( getUID( baseAttribute ), target[ gltfAttributeName ] );

					}

					targets.push( target );

					weights.push( mesh.morphTargetInfluences[ i ] );
					if ( mesh.morphTargetDictionary !== undefined ) targetNames.push( reverseDictionary[ i ] );

				}

				gltfMesh.weights = weights;

				if ( targetNames.length > 0 ) {

					gltfMesh.extras = {};
					gltfMesh.extras.targetNames = targetNames;

				}

			}

			var isMultiMaterial = Array.isArray( mesh.material );

			if ( isMultiMaterial && geometry.groups.length === 0 ) return null;

			var materials = isMultiMaterial ? mesh.material : [ mesh.material ];
			var groups = isMultiMaterial ? geometry.groups : [ { materialIndex: 0, start: undefined, count: undefined } ];

			for ( var i = 0, il = groups.length; i < il; i ++ ) {

				var primitive = {
					mode: mode,
					attributes: attributes,
				};

				serializeUserData( geometry, primitive );

				if ( targets.length > 0 ) primitive.targets = targets;

				if ( geometry.index !== null ) {

					var cacheKey = getUID( geometry.index );

					if ( groups[ i ].start !== undefined || groups[ i ].count !== undefined ) {

						cacheKey += ':' + groups[ i ].start + ':' + groups[ i ].count;

					}

					if ( cachedData.attributes.has( cacheKey ) ) {

						primitive.indices = cachedData.attributes.get( cacheKey );

					} else {

						primitive.indices = processAccessor( geometry.index, geometry, groups[ i ].start, groups[ i ].count );
						cachedData.attributes.set( cacheKey, primitive.indices );

					}

					if ( primitive.indices === null ) delete primitive.indices;

				}

				var material = processMaterial( materials[ groups[ i ].materialIndex ] );

				if ( material !== null ) {

					primitive.material = material;

				}

				primitives.push( primitive );

			}

			gltfMesh.primitives = primitives;

			if ( ! outputJSON.meshes ) {

				outputJSON.meshes = [];

			}

			outputJSON.meshes.push( gltfMesh );

			var index = outputJSON.meshes.length - 1;
			cachedData.meshes.set( meshCacheKey, index );

			return index;

		}

		/**
		 * Process camera
		 * @param  {THREE.Camera} camera Camera to process
		 * @return {Integer}      Index of the processed mesh in the "camera" array
		 */
		function processCamera( camera ) {

			if ( ! outputJSON.cameras ) {

				outputJSON.cameras = [];

			}

			var isOrtho = camera.isOrthographicCamera;

			var gltfCamera = {

				type: isOrtho ? 'orthographic' : 'perspective'

			};

			if ( isOrtho ) {

				gltfCamera.orthographic = {

					xmag: camera.right * 2,
					ymag: camera.top * 2,
					zfar: camera.far <= 0 ? 0.001 : camera.far,
					znear: camera.near < 0 ? 0 : camera.near

				};

			} else {

				gltfCamera.perspective = {

					aspectRatio: camera.aspect,
					yfov: MathUtils.degToRad( camera.fov ),
					zfar: camera.far <= 0 ? 0.001 : camera.far,
					znear: camera.near < 0 ? 0 : camera.near

				};

			}

			if ( camera.name !== '' ) {

				gltfCamera.name = camera.type;

			}

			outputJSON.cameras.push( gltfCamera );

			return outputJSON.cameras.length - 1;

		}

		/**
		 * Creates glTF animation entry from AnimationClip object.
		 *
		 * Status:
		 * - Only properties listed in PATH_PROPERTIES may be animated.
		 *
		 * @param {THREE.AnimationClip} clip
		 * @param {THREE.Object3D} root
		 * @return {number}
		 */
		function processAnimation( clip, root ) {

			if ( ! outputJSON.animations ) {

				outputJSON.animations = [];

			}

			clip = GLTFExporter.Utils.mergeMorphTargetTracks( clip.clone(), root );

			var tracks = clip.tracks;
			var channels = [];
			var samplers = [];

			for ( var i = 0; i < tracks.length; ++ i ) {

				var track = tracks[ i ];
				var trackBinding = PropertyBinding.parseTrackName( track.name );
				var trackNode = PropertyBinding.findNode( root, trackBinding.nodeName );
				var trackProperty = PATH_PROPERTIES[ trackBinding.propertyName ];

				if ( trackBinding.objectName === 'bones' ) {

					if ( trackNode.isSkinnedMesh === true ) {

						trackNode = trackNode.skeleton.getBoneByName( trackBinding.objectIndex );

					} else {

						trackNode = undefined;

					}

				}

				if ( ! trackNode || ! trackProperty ) {

					console.warn( 'THREE.GLTFExporter: Could not export animation track "%s".', track.name );
					return null;

				}

				var inputItemSize = 1;
				var outputItemSize = track.values.length / track.times.length;

				if ( trackProperty === PATH_PROPERTIES.morphTargetInfluences ) {

					outputItemSize /= trackNode.morphTargetInfluences.length;

				}

				var interpolation;

				// @TODO export CubicInterpolant(InterpolateSmooth) as CUBICSPLINE

				// Detecting glTF cubic spline interpolant by checking factory method's special property
				// GLTFCubicSplineInterpolant is a custom interpolant and track doesn't return
				// valid value from .getInterpolation().
				if ( track.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline === true ) {

					interpolation = 'CUBICSPLINE';

					// itemSize of CUBICSPLINE keyframe is 9
					// (VEC3 * 3: inTangent, splineVertex, and outTangent)
					// but needs to be stored as VEC3 so dividing by 3 here.
					outputItemSize /= 3;

				} else if ( track.getInterpolation() === InterpolateDiscrete ) {

					interpolation = 'STEP';

				} else {

					interpolation = 'LINEAR';

				}

				samplers.push( {

					input: processAccessor( new BufferAttribute( track.times, inputItemSize ) ),
					output: processAccessor( new BufferAttribute( track.values, outputItemSize ) ),
					interpolation: interpolation

				} );

				channels.push( {

					sampler: samplers.length - 1,
					target: {
						node: nodeMap.get( trackNode ),
						path: trackProperty
					}

				} );

			}

			outputJSON.animations.push( {

				name: clip.name || 'clip_' + outputJSON.animations.length,
				samplers: samplers,
				channels: channels

			} );

			return outputJSON.animations.length - 1;

		}

		function processSkin( object ) {

			var node = outputJSON.nodes[ nodeMap.get( object ) ];

			var skeleton = object.skeleton;

			if ( skeleton === undefined ) return null;

			var rootJoint = object.skeleton.bones[ 0 ];

			if ( rootJoint === undefined ) return null;

			var joints = [];
			var inverseBindMatrices = new Float32Array( skeleton.bones.length * 16 );

			for ( var i = 0; i < skeleton.bones.length; ++ i ) {

				joints.push( nodeMap.get( skeleton.bones[ i ] ) );

				skeleton.boneInverses[ i ].toArray( inverseBindMatrices, i * 16 );

			}

			if ( outputJSON.skins === undefined ) {

				outputJSON.skins = [];

			}

			outputJSON.skins.push( {

				inverseBindMatrices: processAccessor( new BufferAttribute( inverseBindMatrices, 16 ) ),
				joints: joints,
				skeleton: nodeMap.get( rootJoint )

			} );

			var skinIndex = node.skin = outputJSON.skins.length - 1;

			return skinIndex;

		}

		function processLight( light ) {

			var lightDef = {};

			if ( light.name ) lightDef.name = light.name;

			lightDef.color = light.color.toArray();

			lightDef.intensity = light.intensity;

			if ( light.isDirectionalLight ) {

				lightDef.type = 'directional';

			} else if ( light.isPointLight ) {

				lightDef.type = 'point';
				if ( light.distance > 0 ) lightDef.range = light.distance;

			} else if ( light.isSpotLight ) {

				lightDef.type = 'spot';
				if ( light.distance > 0 ) lightDef.range = light.distance;
				lightDef.spot = {};
				lightDef.spot.innerConeAngle = ( light.penumbra - 1.0 ) * light.angle * - 1.0;
				lightDef.spot.outerConeAngle = light.angle;

			}

			if ( light.decay !== undefined && light.decay !== 2 ) {

				console.warn( 'THREE.GLTFExporter: Light decay may be lost. glTF is physically-based, '
					+ 'and expects light.decay=2.' );

			}

			if ( light.target
					&& ( light.target.parent !== light
					 || light.target.position.x !== 0
					 || light.target.position.y !== 0
					 || light.target.position.z !== - 1 ) ) {

				console.warn( 'THREE.GLTFExporter: Light direction may be lost. For best results, '
					+ 'make light.target a child of the light with position 0,0,-1.' );

			}

			var lights = outputJSON.extensions[ 'KHR_lights_punctual' ].lights;
			lights.push( lightDef );
			return lights.length - 1;

		}

		/**
		 * Process Object3D node
		 * @param  {THREE.Object3D} node Object3D to processNode
		 * @return {Integer}      Index of the node in the nodes list
		 */
		function processNode( object ) {

			if ( ! outputJSON.nodes ) {

				outputJSON.nodes = [];

			}

			var gltfNode = {};

			if ( options.trs ) {

				var rotation = object.quaternion.toArray();
				var position = object.position.toArray();
				var scale = object.scale.toArray();

				if ( ! equalArray( rotation, [ 0, 0, 0, 1 ] ) ) {

					gltfNode.rotation = rotation;

				}

				if ( ! equalArray( position, [ 0, 0, 0 ] ) ) {

					gltfNode.translation = position;

				}

				if ( ! equalArray( scale, [ 1, 1, 1 ] ) ) {

					gltfNode.scale = scale;

				}

			} else {

				if ( object.matrixAutoUpdate ) {

					object.updateMatrix();

				}

				if ( ! equalArray( object.matrix.elements, [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ] ) ) {

					gltfNode.matrix = object.matrix.elements;

				}

			}

			// We don't export empty strings name because it represents no-name in Three.js.
			if ( object.name !== '' ) {

				gltfNode.name = String( object.name );

			}

			serializeUserData( object, gltfNode );

			if ( object.isMesh || object.isLine || object.isPoints ) {

				var mesh = processMesh( object );

				if ( mesh !== null ) {

					gltfNode.mesh = mesh;

				}

			} else if ( object.isCamera ) {

				gltfNode.camera = processCamera( object );

			} else if ( object.isDirectionalLight || object.isPointLight || object.isSpotLight ) {

				if ( ! extensionsUsed[ 'KHR_lights_punctual' ] ) {

					outputJSON.extensions = outputJSON.extensions || {};
					outputJSON.extensions[ 'KHR_lights_punctual' ] = { lights: [] };
					extensionsUsed[ 'KHR_lights_punctual' ] = true;

				}

				gltfNode.extensions = gltfNode.extensions || {};
				gltfNode.extensions[ 'KHR_lights_punctual' ] = { light: processLight( object ) };

			} else if ( object.isLight ) {

				console.warn( 'THREE.GLTFExporter: Only directional, point, and spot lights are supported.', object );
				return null;

			}

			if ( object.isSkinnedMesh ) {

				skins.push( object );

			}

			if ( object.children.length > 0 ) {

				var children = [];

				for ( var i = 0, l = object.children.length; i < l; i ++ ) {

					var child = object.children[ i ];

					if ( child.visible || options.onlyVisible === false ) {

						var node = processNode( child );

						if ( node !== null ) {

							children.push( node );

						}

					}

				}

				if ( children.length > 0 ) {

					gltfNode.children = children;

				}


			}

			outputJSON.nodes.push( gltfNode );

			var nodeIndex = outputJSON.nodes.length - 1;
			nodeMap.set( object, nodeIndex );

			return nodeIndex;

		}

		/**
		 * Process Scene
		 * @param  {Scene} node Scene to process
		 */
		function processScene( scene ) {

			if ( ! outputJSON.scenes ) {

				outputJSON.scenes = [];
				outputJSON.scene = 0;

			}

			var gltfScene = {};

			if ( scene.name !== '' ) {

				gltfScene.name = scene.name;

			}

			outputJSON.scenes.push( gltfScene );

			var nodes = [];

			for ( var i = 0, l = scene.children.length; i < l; i ++ ) {

				var child = scene.children[ i ];

				if ( child.visible || options.onlyVisible === false ) {

					var node = processNode( child );

					if ( node !== null ) {

						nodes.push( node );

					}

				}

			}

			if ( nodes.length > 0 ) {

				gltfScene.nodes = nodes;

			}

			serializeUserData( scene, gltfScene );

		}

		/**
		 * Creates a Scene to hold a list of objects and parse it
		 * @param  {Array} objects List of objects to process
		 */
		function processObjects( objects ) {

			var scene = new Scene();
			scene.name = 'AuxScene';

			for ( var i = 0; i < objects.length; i ++ ) {

				// We push directly to children instead of calling `add` to prevent
				// modify the .parent and break its original scene and hierarchy
				scene.children.push( objects[ i ] );

			}

			processScene( scene );

		}

		function processInput( input ) {

			input = input instanceof Array ? input : [ input ];

			var objectsWithoutScene = [];

			for ( var i = 0; i < input.length; i ++ ) {

				if ( input[ i ] instanceof Scene ) {

					processScene( input[ i ] );

				} else {

					objectsWithoutScene.push( input[ i ] );

				}

			}

			if ( objectsWithoutScene.length > 0 ) {

				processObjects( objectsWithoutScene );

			}

			for ( var i = 0; i < skins.length; ++ i ) {

				processSkin( skins[ i ] );

			}

			for ( var i = 0; i < options.animations.length; ++ i ) {

				processAnimation( options.animations[ i ], input[ 0 ] );

			}

		}

		processInput( input );

		Promise.all( pending ).then( function () {

			// Merge buffers.
			var blob = new Blob( buffers, { type: 'application/octet-stream' } );

			// Declare extensions.
			var extensionsUsedList = Object.keys( extensionsUsed );
			if ( extensionsUsedList.length > 0 ) outputJSON.extensionsUsed = extensionsUsedList;

			// Update bytelength of the single buffer.
			if ( outputJSON.buffers && outputJSON.buffers.length > 0 ) outputJSON.buffers[ 0 ].byteLength = blob.size;

			if ( options.binary === true ) {

				// https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#glb-file-format-specification

				var GLB_HEADER_BYTES = 12;
				var GLB_HEADER_MAGIC = 0x46546C67;
				var GLB_VERSION = 2;

				var GLB_CHUNK_PREFIX_BYTES = 8;
				var GLB_CHUNK_TYPE_JSON = 0x4E4F534A;
				var GLB_CHUNK_TYPE_BIN = 0x004E4942;

				var reader = new window.FileReader();
				reader.readAsArrayBuffer( blob );
				reader.onloadend = function () {

					// Binary chunk.
					var binaryChunk = getPaddedArrayBuffer( reader.result );
					var binaryChunkPrefix = new DataView( new ArrayBuffer( GLB_CHUNK_PREFIX_BYTES ) );
					binaryChunkPrefix.setUint32( 0, binaryChunk.byteLength, true );
					binaryChunkPrefix.setUint32( 4, GLB_CHUNK_TYPE_BIN, true );

					// JSON chunk.
					var jsonChunk = getPaddedArrayBuffer( stringToArrayBuffer( JSON.stringify( outputJSON ) ), 0x20 );
					var jsonChunkPrefix = new DataView( new ArrayBuffer( GLB_CHUNK_PREFIX_BYTES ) );
					jsonChunkPrefix.setUint32( 0, jsonChunk.byteLength, true );
					jsonChunkPrefix.setUint32( 4, GLB_CHUNK_TYPE_JSON, true );

					// GLB header.
					var header = new ArrayBuffer( GLB_HEADER_BYTES );
					var headerView = new DataView( header );
					headerView.setUint32( 0, GLB_HEADER_MAGIC, true );
					headerView.setUint32( 4, GLB_VERSION, true );
					var totalByteLength = GLB_HEADER_BYTES
						+ jsonChunkPrefix.byteLength + jsonChunk.byteLength
						+ binaryChunkPrefix.byteLength + binaryChunk.byteLength;
					headerView.setUint32( 8, totalByteLength, true );

					var glbBlob = new Blob( [
						header,
						jsonChunkPrefix,
						jsonChunk,
						binaryChunkPrefix,
						binaryChunk
					], { type: 'application/octet-stream' } );

					var glbReader = new window.FileReader();
					glbReader.readAsArrayBuffer( glbBlob );
					glbReader.onloadend = function () {

						onDone( glbReader.result );

					};

				};

			} else {

				if ( outputJSON.buffers && outputJSON.buffers.length > 0 ) {

					var reader = new window.FileReader();
					reader.readAsDataURL( blob );
					reader.onloadend = function () {

						var base64data = reader.result;
						outputJSON.buffers[ 0 ].uri = base64data;
						onDone( outputJSON );

					};

				} else {

					onDone( outputJSON );

				}

			}

		} );

	}

};

GLTFExporter.Utils = {

	insertKeyframe: function ( track, time ) {

		var tolerance = 0.001; // 1ms
		var valueSize = track.getValueSize();

		var times = new track.TimeBufferType( track.times.length + 1 );
		var values = new track.ValueBufferType( track.values.length + valueSize );
		var interpolant = track.createInterpolant( new track.ValueBufferType( valueSize ) );

		var index;

		if ( track.times.length === 0 ) {

			times[ 0 ] = time;

			for ( var i = 0; i < valueSize; i ++ ) {

				values[ i ] = 0;

			}

			index = 0;

		} else if ( time < track.times[ 0 ] ) {

			if ( Math.abs( track.times[ 0 ] - time ) < tolerance ) return 0;

			times[ 0 ] = time;
			times.set( track.times, 1 );

			values.set( interpolant.evaluate( time ), 0 );
			values.set( track.values, valueSize );

			index = 0;

		} else if ( time > track.times[ track.times.length - 1 ] ) {

			if ( Math.abs( track.times[ track.times.length - 1 ] - time ) < tolerance ) {

				return track.times.length - 1;

			}

			times[ times.length - 1 ] = time;
			times.set( track.times, 0 );

			values.set( track.values, 0 );
			values.set( interpolant.evaluate( time ), track.values.length );

			index = times.length - 1;

		} else {

			for ( var i = 0; i < track.times.length; i ++ ) {

				if ( Math.abs( track.times[ i ] - time ) < tolerance ) return i;

				if ( track.times[ i ] < time && track.times[ i + 1 ] > time ) {

					times.set( track.times.slice( 0, i + 1 ), 0 );
					times[ i + 1 ] = time;
					times.set( track.times.slice( i + 1 ), i + 2 );

					values.set( track.values.slice( 0, ( i + 1 ) * valueSize ), 0 );
					values.set( interpolant.evaluate( time ), ( i + 1 ) * valueSize );
					values.set( track.values.slice( ( i + 1 ) * valueSize ), ( i + 2 ) * valueSize );

					index = i + 1;

					break;

				}

			}

		}

		track.times = times;
		track.values = values;

		return index;

	},

	mergeMorphTargetTracks: function ( clip, root ) {

		var tracks = [];
		var mergedTracks = {};
		var sourceTracks = clip.tracks;

		for ( var i = 0; i < sourceTracks.length; ++ i ) {

			var sourceTrack = sourceTracks[ i ];
			var sourceTrackBinding = PropertyBinding.parseTrackName( sourceTrack.name );
			var sourceTrackNode = PropertyBinding.findNode( root, sourceTrackBinding.nodeName );

			if ( sourceTrackBinding.propertyName !== 'morphTargetInfluences' || sourceTrackBinding.propertyIndex === undefined ) {

				// Tracks that don't affect morph targets, or that affect all morph targets together, can be left as-is.
				tracks.push( sourceTrack );
				continue;

			}

			if ( sourceTrack.createInterpolant !== sourceTrack.InterpolantFactoryMethodDiscrete
				&& sourceTrack.createInterpolant !== sourceTrack.InterpolantFactoryMethodLinear ) {

				if ( sourceTrack.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline ) {

					// This should never happen, because glTF morph target animations
					// affect all targets already.
					throw new Error( 'THREE.GLTFExporter: Cannot merge tracks with glTF CUBICSPLINE interpolation.' );

				}

				console.warn( 'THREE.GLTFExporter: Morph target interpolation mode not yet supported. Using LINEAR instead.' );

				sourceTrack = sourceTrack.clone();
				sourceTrack.setInterpolation( InterpolateLinear );

			}

			var targetCount = sourceTrackNode.morphTargetInfluences.length;
			var targetIndex = sourceTrackNode.morphTargetDictionary[ sourceTrackBinding.propertyIndex ];

			if ( targetIndex === undefined ) {

				throw new Error( 'THREE.GLTFExporter: Morph target name not found: ' + sourceTrackBinding.propertyIndex );

			}

			var mergedTrack;

			// If this is the first time we've seen this object, create a new
			// track to store merged keyframe data for each morph target.
			if ( mergedTracks[ sourceTrackNode.uuid ] === undefined ) {

				mergedTrack = sourceTrack.clone();

				var values = new mergedTrack.ValueBufferType( targetCount * mergedTrack.times.length );

				for ( var j = 0; j < mergedTrack.times.length; j ++ ) {

					values[ j * targetCount + targetIndex ] = mergedTrack.values[ j ];

				}

				// We need to take into consideration the intended target node
				// of our original un-merged morphTarget animation.
				mergedTrack.name = sourceTrackBinding.nodeName + '.morphTargetInfluences';
				mergedTrack.values = values;

				mergedTracks[ sourceTrackNode.uuid ] = mergedTrack;
				tracks.push( mergedTrack );

				continue;

			}

			var sourceInterpolant = sourceTrack.createInterpolant( new sourceTrack.ValueBufferType( 1 ) );

			mergedTrack = mergedTracks[ sourceTrackNode.uuid ];

			// For every existing keyframe of the merged track, write a (possibly
			// interpolated) value from the source track.
			for ( var j = 0; j < mergedTrack.times.length; j ++ ) {

				mergedTrack.values[ j * targetCount + targetIndex ] = sourceInterpolant.evaluate( mergedTrack.times[ j ] );

			}

			// For every existing keyframe of the source track, write a (possibly
			// new) keyframe to the merged track. Values from the previous loop may
			// be written again, but keyframes are de-duplicated.
			for ( var j = 0; j < sourceTrack.times.length; j ++ ) {

				var keyframeIndex = this.insertKeyframe( mergedTrack, sourceTrack.times[ j ] );
				mergedTrack.values[ keyframeIndex * targetCount + targetIndex ] = sourceTrack.values[ j ];

			}

		}

		clip.tracks = tracks;

		return clip;

	}

};

export { GLTFExporter };

var GLTFLoader = ( function () {

	function GLTFLoader( manager ) {

		Loader.call( this, manager );

		this.dracoLoader = null;
		this.ddsLoader = null;
		this.ktx2Loader = null;

		this.pluginCallbacks = [];

		this.register( function ( parser ) {

			return new GLTFMaterialsClearcoatExtension( parser );

		} );
		this.register( function ( parser ) {

			return new GLTFTextureBasisUExtension( parser );

		} );

		this.register( function ( parser ) {

			return new GLTFMaterialsTransmissionExtension( parser );

		} );

	}

	GLTFLoader.prototype = Object.assign( Object.create( Loader.prototype ), {

		constructor: GLTFLoader,

		load: function ( url, onLoad, onProgress, onError ) {

			var scope = this;

			var resourcePath;

			if ( this.resourcePath !== '' ) {

				resourcePath = this.resourcePath;

			} else if ( this.path !== '' ) {

				resourcePath = this.path;

			} else {

				resourcePath = LoaderUtils.extractUrlBase( url );

			}

			// Tells the LoadingManager to track an extra item, which resolves after
			// the model is fully loaded. This means the count of items loaded will
			// be incorrect, but ensures manager.onLoad() does not fire early.
			scope.manager.itemStart( url );

			var _onError = function ( e ) {

				if ( onError ) {

					onError( e );

				} else {

					console.error( e );

				}

				scope.manager.itemError( url );
				scope.manager.itemEnd( url );

			};

			var loader = new FileLoader( scope.manager );

			loader.setPath( this.path );
			loader.setResponseType( 'arraybuffer' );
			loader.setRequestHeader( this.requestHeader );

			if ( scope.crossOrigin === 'use-credentials' ) {

				loader.setWithCredentials( true );

			}

			loader.load( url, function ( data ) {

				try {

					scope.parse( data, resourcePath, function ( gltf ) {

						onLoad( gltf );

						scope.manager.itemEnd( url );

					}, _onError );

				} catch ( e ) {

					_onError( e );

				}

			}, onProgress, _onError );

		},

		setDRACOLoader: function ( dracoLoader ) {

			this.dracoLoader = dracoLoader;
			return this;

		},

		setDDSLoader: function ( ddsLoader ) {

			this.ddsLoader = ddsLoader;
			return this;

		},

		setKTX2Loader: function ( ktx2Loader ) {

			this.ktx2Loader = ktx2Loader;
			return this;

		},

		register: function ( callback ) {

			if ( this.pluginCallbacks.indexOf( callback ) === - 1 ) {

				this.pluginCallbacks.push( callback );

			}

			return this;

		},

		unregister: function ( callback ) {

			if ( this.pluginCallbacks.indexOf( callback ) !== - 1 ) {

				this.pluginCallbacks.splice( this.pluginCallbacks.indexOf( callback ), 1 );

			}

			return this;

		},

		parse: function ( data, path, onLoad, onError ) {

			var content;
			var extensions = {};
			var plugins = {};

			if ( typeof data === 'string' ) {

				content = data;

			} else {

				var magic = LoaderUtils.decodeText( new Uint8Array( data, 0, 4 ) );

				if ( magic === BINARY_EXTENSION_HEADER_MAGIC ) {

					try {

						extensions[ EXTENSIONS.KHR_BINARY_GLTF ] = new GLTFBinaryExtension( data );

					} catch ( error ) {

						if ( onError ) onError( error );
						return;

					}

					content = extensions[ EXTENSIONS.KHR_BINARY_GLTF ].content;

				} else {

					content = LoaderUtils.decodeText( new Uint8Array( data ) );

				}

			}

			var json = JSON.parse( content );

			if ( json.asset === undefined || json.asset.version[ 0 ] < 2 ) {

				if ( onError ) onError( new Error( 'THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported.' ) );
				return;

			}

			var parser = new GLTFParser( json, {

				path: path || this.resourcePath || '',
				crossOrigin: this.crossOrigin,
				manager: this.manager,
				ktx2Loader: this.ktx2Loader

			} );

			parser.fileLoader.setRequestHeader( this.requestHeader );

			for ( var i = 0; i < this.pluginCallbacks.length; i ++ ) {

				var plugin = this.pluginCallbacks[ i ]( parser );
				plugins[ plugin.name ] = plugin;

				// Workaround to avoid determining as unknown extension
				// in addUnknownExtensionsToUserData().
				// Remove this workaround if we move all the existing
				// extension handlers to plugin system
				extensions[ plugin.name ] = true;

			}

			if ( json.extensionsUsed ) {

				for ( var i = 0; i < json.extensionsUsed.length; ++ i ) {

					var extensionName = json.extensionsUsed[ i ];
					var extensionsRequired = json.extensionsRequired || [];

					switch ( extensionName ) {

						case EXTENSIONS.KHR_LIGHTS_PUNCTUAL:
							extensions[ extensionName ] = new GLTFLightsExtension( json );
							break;

						case EXTENSIONS.KHR_MATERIALS_UNLIT:
							extensions[ extensionName ] = new GLTFMaterialsUnlitExtension();
							break;

						case EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS:
							extensions[ extensionName ] = new GLTFMaterialsPbrSpecularGlossinessExtension();
							break;

						case EXTENSIONS.KHR_DRACO_MESH_COMPRESSION:
							extensions[ extensionName ] = new GLTFDracoMeshCompressionExtension( json, this.dracoLoader );
							break;

						case EXTENSIONS.MSFT_TEXTURE_DDS:
							extensions[ extensionName ] = new GLTFTextureDDSExtension( this.ddsLoader );
							break;

						case EXTENSIONS.KHR_TEXTURE_TRANSFORM:
							extensions[ extensionName ] = new GLTFTextureTransformExtension();
							break;

						case EXTENSIONS.KHR_MESH_QUANTIZATION:
							extensions[ extensionName ] = new GLTFMeshQuantizationExtension();
							break;

						default:

							if ( extensionsRequired.indexOf( extensionName ) >= 0 && plugins[ extensionName ] === undefined ) {

								console.warn( 'THREE.GLTFLoader: Unknown extension "' + extensionName + '".' );

							}

					}

				}

			}

			parser.setExtensions( extensions );
			parser.setPlugins( plugins );
			parser.parse( onLoad, onError );

		}

	} );

	/* GLTFREGISTRY */

	function GLTFRegistry() {

		var objects = {};

		return	{

			get: function ( key ) {

				return objects[ key ];

			},

			add: function ( key, object ) {

				objects[ key ] = object;

			},

			remove: function ( key ) {

				delete objects[ key ];

			},

			removeAll: function () {

				objects = {};

			}

		};

	}

	/*********************************/
	/********** EXTENSIONS ***********/
	/*********************************/

	var EXTENSIONS = {
		KHR_BINARY_GLTF: 'KHR_binary_glTF',
		KHR_DRACO_MESH_COMPRESSION: 'KHR_draco_mesh_compression',
		KHR_LIGHTS_PUNCTUAL: 'KHR_lights_punctual',
		KHR_MATERIALS_CLEARCOAT: 'KHR_materials_clearcoat',
		KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS: 'KHR_materials_pbrSpecularGlossiness',
		KHR_MATERIALS_TRANSMISSION: 'KHR_materials_transmission',
		KHR_MATERIALS_UNLIT: 'KHR_materials_unlit',
		KHR_TEXTURE_BASISU: 'KHR_texture_basisu',
		KHR_TEXTURE_TRANSFORM: 'KHR_texture_transform',
		KHR_MESH_QUANTIZATION: 'KHR_mesh_quantization',
		MSFT_TEXTURE_DDS: 'MSFT_texture_dds'
	};

	/**
	 * DDS Texture Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/MSFT_texture_dds
	 *
	 */
	function GLTFTextureDDSExtension( ddsLoader ) {

		if ( ! ddsLoader ) {

			throw new Error( 'THREE.GLTFLoader: Attempting to load .dds texture without importing DDSLoader' );

		}

		this.name = EXTENSIONS.MSFT_TEXTURE_DDS;
		this.ddsLoader = ddsLoader;

	}

	/**
	 * Punctual Lights Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_lights_punctual
	 */
	function GLTFLightsExtension( json ) {

		this.name = EXTENSIONS.KHR_LIGHTS_PUNCTUAL;

		var extension = ( json.extensions && json.extensions[ EXTENSIONS.KHR_LIGHTS_PUNCTUAL ] ) || {};
		this.lightDefs = extension.lights || [];

	}

	GLTFLightsExtension.prototype.loadLight = function ( lightIndex ) {

		var lightDef = this.lightDefs[ lightIndex ];
		var lightNode;

		var color = new Color( 0xffffff );
		if ( lightDef.color !== undefined ) color.fromArray( lightDef.color );

		var range = lightDef.range !== undefined ? lightDef.range : 0;

		switch ( lightDef.type ) {

			case 'directional':
				lightNode = new DirectionalLight( color );
				lightNode.target.position.set( 0, 0, - 1 );
				lightNode.add( lightNode.target );
				break;

			case 'point':
				lightNode = new PointLight( color );
				lightNode.distance = range;
				break;

			case 'spot':
				lightNode = new SpotLight( color );
				lightNode.distance = range;
				// Handle spotlight properties.
				lightDef.spot = lightDef.spot || {};
				lightDef.spot.innerConeAngle = lightDef.spot.innerConeAngle !== undefined ? lightDef.spot.innerConeAngle : 0;
				lightDef.spot.outerConeAngle = lightDef.spot.outerConeAngle !== undefined ? lightDef.spot.outerConeAngle : Math.PI / 4.0;
				lightNode.angle = lightDef.spot.outerConeAngle;
				lightNode.penumbra = 1.0 - lightDef.spot.innerConeAngle / lightDef.spot.outerConeAngle;
				lightNode.target.position.set( 0, 0, - 1 );
				lightNode.add( lightNode.target );
				break;

			default:
				throw new Error( 'THREE.GLTFLoader: Unexpected light type, "' + lightDef.type + '".' );

		}

		// Some lights (e.g. spot) default to a position other than the origin. Reset the position
		// here, because node-level parsing will only override position if explicitly specified.
		lightNode.position.set( 0, 0, 0 );

		lightNode.decay = 2;

		if ( lightDef.intensity !== undefined ) lightNode.intensity = lightDef.intensity;

		lightNode.name = lightDef.name || ( 'light_' + lightIndex );

		return Promise.resolve( lightNode );

	};

	/**
	 * Unlit Materials Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_unlit
	 */
	function GLTFMaterialsUnlitExtension() {

		this.name = EXTENSIONS.KHR_MATERIALS_UNLIT;

	}

	GLTFMaterialsUnlitExtension.prototype.getMaterialType = function () {

		return MeshBasicMaterial;

	};

	GLTFMaterialsUnlitExtension.prototype.extendParams = function ( materialParams, materialDef, parser ) {

		var pending = [];

		materialParams.color = new Color( 1.0, 1.0, 1.0 );
		materialParams.opacity = 1.0;

		var metallicRoughness = materialDef.pbrMetallicRoughness;

		if ( metallicRoughness ) {

			if ( Array.isArray( metallicRoughness.baseColorFactor ) ) {

				var array = metallicRoughness.baseColorFactor;

				materialParams.color.fromArray( array );
				materialParams.opacity = array[ 3 ];

			}

			if ( metallicRoughness.baseColorTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'map', metallicRoughness.baseColorTexture ) );

			}

		}

		return Promise.all( pending );

	};

	/**
	 * Clearcoat Materials Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_clearcoat
	 */
	function GLTFMaterialsClearcoatExtension( parser ) {

		this.parser = parser;
		this.name = EXTENSIONS.KHR_MATERIALS_CLEARCOAT;

	}

	GLTFMaterialsClearcoatExtension.prototype.getMaterialType = function ( /* materialIndex */ ) {

		return MeshPhysicalMaterial;

	};

	GLTFMaterialsClearcoatExtension.prototype.extendMaterialParams = function ( materialIndex, materialParams ) {

		var parser = this.parser;
		var materialDef = parser.json.materials[ materialIndex ];

		if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) {

			return Promise.resolve();

		}

		var pending = [];

		var extension = materialDef.extensions[ this.name ];

		if ( extension.clearcoatFactor !== undefined ) {

			materialParams.clearcoat = extension.clearcoatFactor;

		}

		if ( extension.clearcoatTexture !== undefined ) {

			pending.push( parser.assignTexture( materialParams, 'clearcoatMap', extension.clearcoatTexture ) );

		}

		if ( extension.clearcoatRoughnessFactor !== undefined ) {

			materialParams.clearcoatRoughness = extension.clearcoatRoughnessFactor;

		}

		if ( extension.clearcoatRoughnessTexture !== undefined ) {

			pending.push( parser.assignTexture( materialParams, 'clearcoatRoughnessMap', extension.clearcoatRoughnessTexture ) );

		}

		if ( extension.clearcoatNormalTexture !== undefined ) {

			pending.push( parser.assignTexture( materialParams, 'clearcoatNormalMap', extension.clearcoatNormalTexture ) );

			if ( extension.clearcoatNormalTexture.scale !== undefined ) {

				var scale = extension.clearcoatNormalTexture.scale;

				materialParams.clearcoatNormalScale = new Vector2( scale, scale );

			}

		}

		return Promise.all( pending );

	};

	/**
	 * Transmission Materials Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_transmission
	 * Draft: https://github.com/KhronosGroup/glTF/pull/1698
	 */
	function GLTFMaterialsTransmissionExtension( parser ) {

		this.parser = parser;
		this.name = EXTENSIONS.KHR_MATERIALS_TRANSMISSION;

	}

	GLTFMaterialsTransmissionExtension.prototype.getMaterialType = function ( /* materialIndex */ ) {

		return MeshPhysicalMaterial;

	};

	GLTFMaterialsTransmissionExtension.prototype.extendMaterialParams = function ( materialIndex, materialParams ) {

		var parser = this.parser;
		var materialDef = parser.json.materials[ materialIndex ];

		if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) {

			return Promise.resolve();

		}

		var pending = [];

		var extension = materialDef.extensions[ this.name ];

		if ( extension.transmissionFactor !== undefined ) {

			materialParams.transmission = extension.transmissionFactor;

		}

		if ( extension.transmissionTexture !== undefined ) {

			pending.push( parser.assignTexture( materialParams, 'transmissionMap', extension.transmissionTexture ) );

		}

		return Promise.all( pending );

	};

	/**
	 * BasisU Texture Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_texture_basisu
	 * (draft PR https://github.com/KhronosGroup/glTF/pull/1751)
	 */
	function GLTFTextureBasisUExtension( parser ) {

		this.parser = parser;
		this.name = EXTENSIONS.KHR_TEXTURE_BASISU;

	}

	GLTFTextureBasisUExtension.prototype.loadTexture = function ( textureIndex ) {

		var parser = this.parser;
		var json = parser.json;

		var textureDef = json.textures[ textureIndex ];

		if ( ! textureDef.extensions || ! textureDef.extensions[ this.name ] ) {

			return null;

		}

		var extension = textureDef.extensions[ this.name ];
		var source = json.images[ extension.source ];
		var loader = parser.options.ktx2Loader;

		if ( ! loader ) {

			throw new Error( 'THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures' );

		}

		return parser.loadTextureImage( textureIndex, source, loader );

	};

	/* BINARY EXTENSION */
	var BINARY_EXTENSION_HEADER_MAGIC = 'glTF';
	var BINARY_EXTENSION_HEADER_LENGTH = 12;
	var BINARY_EXTENSION_CHUNK_TYPES = { JSON: 0x4E4F534A, BIN: 0x004E4942 };

	function GLTFBinaryExtension( data ) {

		this.name = EXTENSIONS.KHR_BINARY_GLTF;
		this.content = null;
		this.body = null;

		var headerView = new DataView( data, 0, BINARY_EXTENSION_HEADER_LENGTH );

		this.header = {
			magic: LoaderUtils.decodeText( new Uint8Array( data.slice( 0, 4 ) ) ),
			version: headerView.getUint32( 4, true ),
			length: headerView.getUint32( 8, true )
		};

		if ( this.header.magic !== BINARY_EXTENSION_HEADER_MAGIC ) {

			throw new Error( 'THREE.GLTFLoader: Unsupported glTF-Binary header.' );

		} else if ( this.header.version < 2.0 ) {

			throw new Error( 'THREE.GLTFLoader: Legacy binary file detected.' );

		}

		var chunkView = new DataView( data, BINARY_EXTENSION_HEADER_LENGTH );
		var chunkIndex = 0;

		while ( chunkIndex < chunkView.byteLength ) {

			var chunkLength = chunkView.getUint32( chunkIndex, true );
			chunkIndex += 4;

			var chunkType = chunkView.getUint32( chunkIndex, true );
			chunkIndex += 4;

			if ( chunkType === BINARY_EXTENSION_CHUNK_TYPES.JSON ) {

				var contentArray = new Uint8Array( data, BINARY_EXTENSION_HEADER_LENGTH + chunkIndex, chunkLength );
				this.content = LoaderUtils.decodeText( contentArray );

			} else if ( chunkType === BINARY_EXTENSION_CHUNK_TYPES.BIN ) {

				var byteOffset = BINARY_EXTENSION_HEADER_LENGTH + chunkIndex;
				this.body = data.slice( byteOffset, byteOffset + chunkLength );

			}

			// Clients must ignore chunks with unknown types.

			chunkIndex += chunkLength;

		}

		if ( this.content === null ) {

			throw new Error( 'THREE.GLTFLoader: JSON content not found.' );

		}

	}

	/**
	 * DRACO Mesh Compression Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_draco_mesh_compression
	 */
	function GLTFDracoMeshCompressionExtension( json, dracoLoader ) {

		if ( ! dracoLoader ) {

			throw new Error( 'THREE.GLTFLoader: No DRACOLoader instance provided.' );

		}

		this.name = EXTENSIONS.KHR_DRACO_MESH_COMPRESSION;
		this.json = json;
		this.dracoLoader = dracoLoader;
		this.dracoLoader.preload();

	}

	GLTFDracoMeshCompressionExtension.prototype.decodePrimitive = function ( primitive, parser ) {

		var json = this.json;
		var dracoLoader = this.dracoLoader;
		var bufferViewIndex = primitive.extensions[ this.name ].bufferView;
		var gltfAttributeMap = primitive.extensions[ this.name ].attributes;
		var threeAttributeMap = {};
		var attributeNormalizedMap = {};
		var attributeTypeMap = {};

		for ( var attributeName in gltfAttributeMap ) {

			var threeAttributeName = ATTRIBUTES[ attributeName ] || attributeName.toLowerCase();

			threeAttributeMap[ threeAttributeName ] = gltfAttributeMap[ attributeName ];

		}

		for ( attributeName in primitive.attributes ) {

			var threeAttributeName = ATTRIBUTES[ attributeName ] || attributeName.toLowerCase();

			if ( gltfAttributeMap[ attributeName ] !== undefined ) {

				var accessorDef = json.accessors[ primitive.attributes[ attributeName ] ];
				var componentType = WEBGL_COMPONENT_TYPES[ accessorDef.componentType ];

				attributeTypeMap[ threeAttributeName ] = componentType;
				attributeNormalizedMap[ threeAttributeName ] = accessorDef.normalized === true;

			}

		}

		return parser.getDependency( 'bufferView', bufferViewIndex ).then( function ( bufferView ) {

			return new Promise( function ( resolve ) {

				dracoLoader.decodeDracoFile( bufferView, function ( geometry ) {

					for ( var attributeName in geometry.attributes ) {

						var attribute = geometry.attributes[ attributeName ];
						var normalized = attributeNormalizedMap[ attributeName ];

						if ( normalized !== undefined ) attribute.normalized = normalized;

					}

					resolve( geometry );

				}, threeAttributeMap, attributeTypeMap );

			} );

		} );

	};

	/**
	 * Texture Transform Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_texture_transform
	 */
	function GLTFTextureTransformExtension() {

		this.name = EXTENSIONS.KHR_TEXTURE_TRANSFORM;

	}

	GLTFTextureTransformExtension.prototype.extendTexture = function ( texture, transform ) {

		texture = texture.clone();

		if ( transform.offset !== undefined ) {

			texture.offset.fromArray( transform.offset );

		}

		if ( transform.rotation !== undefined ) {

			texture.rotation = transform.rotation;

		}

		if ( transform.scale !== undefined ) {

			texture.repeat.fromArray( transform.scale );

		}

		if ( transform.texCoord !== undefined ) {

			console.warn( 'THREE.GLTFLoader: Custom UV sets in "' + this.name + '" extension not yet supported.' );

		}

		texture.needsUpdate = true;

		return texture;

	};

	/**
	 * Specular-Glossiness Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness
	 */

	/**
	 * A sub class of StandardMaterial with some of the functionality
	 * changed via the `onBeforeCompile` callback
	 * @pailhead
	 */

	function GLTFMeshStandardSGMaterial( params ) {

		MeshStandardMaterial.call( this );

		this.isGLTFSpecularGlossinessMaterial = true;

		//various chunks that need replacing
		var specularMapParsFragmentChunk = [
			'#ifdef USE_SPECULARMAP',
			'	uniform sampler2D specularMap;',
			'#endif'
		].join( '\n' );

		var glossinessMapParsFragmentChunk = [
			'#ifdef USE_GLOSSINESSMAP',
			'	uniform sampler2D glossinessMap;',
			'#endif'
		].join( '\n' );

		var specularMapFragmentChunk = [
			'vec3 specularFactor = specular;',
			'#ifdef USE_SPECULARMAP',
			'	vec4 texelSpecular = texture2D( specularMap, vUv );',
			'	texelSpecular = sRGBToLinear( texelSpecular );',
			'	// reads channel RGB, compatible with a glTF Specular-Glossiness (RGBA) texture',
			'	specularFactor *= texelSpecular.rgb;',
			'#endif'
		].join( '\n' );

		var glossinessMapFragmentChunk = [
			'float glossinessFactor = glossiness;',
			'#ifdef USE_GLOSSINESSMAP',
			'	vec4 texelGlossiness = texture2D( glossinessMap, vUv );',
			'	// reads channel A, compatible with a glTF Specular-Glossiness (RGBA) texture',
			'	glossinessFactor *= texelGlossiness.a;',
			'#endif'
		].join( '\n' );

		var lightPhysicalFragmentChunk = [
			'PhysicalMaterial material;',
			'material.diffuseColor = diffuseColor.rgb;',
			'vec3 dxy = max( abs( dFdx( geometryNormal ) ), abs( dFdy( geometryNormal ) ) );',
			'float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );',
			'material.specularRoughness = max( 1.0 - glossinessFactor, 0.0525 );// 0.0525 corresponds to the base mip of a 256 cubemap.',
			'material.specularRoughness += geometryRoughness;',
			'material.specularRoughness = min( material.specularRoughness, 1.0 );',
			'material.specularColor = specularFactor.rgb;',
		].join( '\n' );

		var uniforms = {
			specular: { value: new Color().setHex( 0xffffff ) },
			glossiness: { value: 1 },
			specularMap: { value: null },
			glossinessMap: { value: null }
		};

		this._extraUniforms = uniforms;

		// please see #14031 or #13198 for an alternate approach
		this.onBeforeCompile = function ( shader ) {

			for ( var uniformName in uniforms ) {

				shader.uniforms[ uniformName ] = uniforms[ uniformName ];

			}

			shader.fragmentShader = shader.fragmentShader.replace( 'uniform float roughness;', 'uniform vec3 specular;' );
			shader.fragmentShader = shader.fragmentShader.replace( 'uniform float metalness;', 'uniform float glossiness;' );
			shader.fragmentShader = shader.fragmentShader.replace( '#include <roughnessmap_pars_fragment>', specularMapParsFragmentChunk );
			shader.fragmentShader = shader.fragmentShader.replace( '#include <metalnessmap_pars_fragment>', glossinessMapParsFragmentChunk );
			shader.fragmentShader = shader.fragmentShader.replace( '#include <roughnessmap_fragment>', specularMapFragmentChunk );
			shader.fragmentShader = shader.fragmentShader.replace( '#include <metalnessmap_fragment>', glossinessMapFragmentChunk );
			shader.fragmentShader = shader.fragmentShader.replace( '#include <lights_physical_fragment>', lightPhysicalFragmentChunk );

		};

		/*eslint-disable*/
		Object.defineProperties(
			this,
			{
				specular: {
					get: function () { return uniforms.specular.value; },
					set: function ( v ) { uniforms.specular.value = v; }
				},
				specularMap: {
					get: function () { return uniforms.specularMap.value; },
					set: function ( v ) { uniforms.specularMap.value = v; }
				},
				glossiness: {
					get: function () { return uniforms.glossiness.value; },
					set: function ( v ) { uniforms.glossiness.value = v; }
				},
				glossinessMap: {
					get: function () { return uniforms.glossinessMap.value; },
					set: function ( v ) {

						uniforms.glossinessMap.value = v;
						//how about something like this - @pailhead
						if ( v ) {

							this.defines.USE_GLOSSINESSMAP = '';
							// set USE_ROUGHNESSMAP to enable vUv
							this.defines.USE_ROUGHNESSMAP = '';

						} else {

							delete this.defines.USE_ROUGHNESSMAP;
							delete this.defines.USE_GLOSSINESSMAP;

						}

					}
				}
			}
		);

		/*eslint-enable*/
		delete this.metalness;
		delete this.roughness;
		delete this.metalnessMap;
		delete this.roughnessMap;

		this.setValues( params );

	}

	GLTFMeshStandardSGMaterial.prototype = Object.create( MeshStandardMaterial.prototype );
	GLTFMeshStandardSGMaterial.prototype.constructor = GLTFMeshStandardSGMaterial;

	GLTFMeshStandardSGMaterial.prototype.copy = function ( source ) {

		MeshStandardMaterial.prototype.copy.call( this, source );
		this.specularMap = source.specularMap;
		this.specular.copy( source.specular );
		this.glossinessMap = source.glossinessMap;
		this.glossiness = source.glossiness;
		delete this.metalness;
		delete this.roughness;
		delete this.metalnessMap;
		delete this.roughnessMap;
		return this;

	};

	function GLTFMaterialsPbrSpecularGlossinessExtension() {

		return {

			name: EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS,

			specularGlossinessParams: [
				'color',
				'map',
				'lightMap',
				'lightMapIntensity',
				'aoMap',
				'aoMapIntensity',
				'emissive',
				'emissiveIntensity',
				'emissiveMap',
				'bumpMap',
				'bumpScale',
				'normalMap',
				'normalMapType',
				'displacementMap',
				'displacementScale',
				'displacementBias',
				'specularMap',
				'specular',
				'glossinessMap',
				'glossiness',
				'alphaMap',
				'envMap',
				'envMapIntensity',
				'refractionRatio',
			],

			getMaterialType: function () {

				return GLTFMeshStandardSGMaterial;

			},

			extendParams: function ( materialParams, materialDef, parser ) {

				var pbrSpecularGlossiness = materialDef.extensions[ this.name ];

				materialParams.color = new Color( 1.0, 1.0, 1.0 );
				materialParams.opacity = 1.0;

				var pending = [];

				if ( Array.isArray( pbrSpecularGlossiness.diffuseFactor ) ) {

					var array = pbrSpecularGlossiness.diffuseFactor;

					materialParams.color.fromArray( array );
					materialParams.opacity = array[ 3 ];

				}

				if ( pbrSpecularGlossiness.diffuseTexture !== undefined ) {

					pending.push( parser.assignTexture( materialParams, 'map', pbrSpecularGlossiness.diffuseTexture ) );

				}

				materialParams.emissive = new Color( 0.0, 0.0, 0.0 );
				materialParams.glossiness = pbrSpecularGlossiness.glossinessFactor !== undefined ? pbrSpecularGlossiness.glossinessFactor : 1.0;
				materialParams.specular = new Color( 1.0, 1.0, 1.0 );

				if ( Array.isArray( pbrSpecularGlossiness.specularFactor ) ) {

					materialParams.specular.fromArray( pbrSpecularGlossiness.specularFactor );

				}

				if ( pbrSpecularGlossiness.specularGlossinessTexture !== undefined ) {

					var specGlossMapDef = pbrSpecularGlossiness.specularGlossinessTexture;
					pending.push( parser.assignTexture( materialParams, 'glossinessMap', specGlossMapDef ) );
					pending.push( parser.assignTexture( materialParams, 'specularMap', specGlossMapDef ) );

				}

				return Promise.all( pending );

			},

			createMaterial: function ( materialParams ) {

				var material = new GLTFMeshStandardSGMaterial( materialParams );
				material.fog = true;

				material.color = materialParams.color;

				material.map = materialParams.map === undefined ? null : materialParams.map;

				material.lightMap = null;
				material.lightMapIntensity = 1.0;

				material.aoMap = materialParams.aoMap === undefined ? null : materialParams.aoMap;
				material.aoMapIntensity = 1.0;

				material.emissive = materialParams.emissive;
				material.emissiveIntensity = 1.0;
				material.emissiveMap = materialParams.emissiveMap === undefined ? null : materialParams.emissiveMap;

				material.bumpMap = materialParams.bumpMap === undefined ? null : materialParams.bumpMap;
				material.bumpScale = 1;

				material.normalMap = materialParams.normalMap === undefined ? null : materialParams.normalMap;
				material.normalMapType = TangentSpaceNormalMap;

				if ( materialParams.normalScale ) material.normalScale = materialParams.normalScale;

				material.displacementMap = null;
				material.displacementScale = 1;
				material.displacementBias = 0;

				material.specularMap = materialParams.specularMap === undefined ? null : materialParams.specularMap;
				material.specular = materialParams.specular;

				material.glossinessMap = materialParams.glossinessMap === undefined ? null : materialParams.glossinessMap;
				material.glossiness = materialParams.glossiness;

				material.alphaMap = null;

				material.envMap = materialParams.envMap === undefined ? null : materialParams.envMap;
				material.envMapIntensity = 1.0;

				material.refractionRatio = 0.98;

				return material;

			},

		};

	}

	/**
	 * Mesh Quantization Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_mesh_quantization
	 */
	function GLTFMeshQuantizationExtension() {

		this.name = EXTENSIONS.KHR_MESH_QUANTIZATION;

	}

	/*********************************/
	/********** INTERPOLATION ********/
	/*********************************/

	// Spline Interpolation
	// Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#appendix-c-spline-interpolation
	function GLTFCubicSplineInterpolant( parameterPositions, sampleValues, sampleSize, resultBuffer ) {

		Interpolant.call( this, parameterPositions, sampleValues, sampleSize, resultBuffer );

	}

	GLTFCubicSplineInterpolant.prototype = Object.create( Interpolant.prototype );
	GLTFCubicSplineInterpolant.prototype.constructor = GLTFCubicSplineInterpolant;

	GLTFCubicSplineInterpolant.prototype.copySampleValue_ = function ( index ) {

		// Copies a sample value to the result buffer. See description of glTF
		// CUBICSPLINE values layout in interpolate_() function below.

		var result = this.resultBuffer,
			values = this.sampleValues,
			valueSize = this.valueSize,
			offset = index * valueSize * 3 + valueSize;

		for ( var i = 0; i !== valueSize; i ++ ) {

			result[ i ] = values[ offset + i ];

		}

		return result;

	};

	GLTFCubicSplineInterpolant.prototype.beforeStart_ = GLTFCubicSplineInterpolant.prototype.copySampleValue_;

	GLTFCubicSplineInterpolant.prototype.afterEnd_ = GLTFCubicSplineInterpolant.prototype.copySampleValue_;

	GLTFCubicSplineInterpolant.prototype.interpolate_ = function ( i1, t0, t, t1 ) {

		var result = this.resultBuffer;
		var values = this.sampleValues;
		var stride = this.valueSize;

		var stride2 = stride * 2;
		var stride3 = stride * 3;

		var td = t1 - t0;

		var p = ( t - t0 ) / td;
		var pp = p * p;
		var ppp = pp * p;

		var offset1 = i1 * stride3;
		var offset0 = offset1 - stride3;

		var s2 = - 2 * ppp + 3 * pp;
		var s3 = ppp - pp;
		var s0 = 1 - s2;
		var s1 = s3 - pp + p;

		// Layout of keyframe output values for CUBICSPLINE animations:
		//   [ inTangent_1, splineVertex_1, outTangent_1, inTangent_2, splineVertex_2, ... ]
		for ( var i = 0; i !== stride; i ++ ) {

			var p0 = values[ offset0 + i + stride ]; // splineVertex_k
			var m0 = values[ offset0 + i + stride2 ] * td; // outTangent_k * (t_k+1 - t_k)
			var p1 = values[ offset1 + i + stride ]; // splineVertex_k+1
			var m1 = values[ offset1 + i ] * td; // inTangent_k+1 * (t_k+1 - t_k)

			result[ i ] = s0 * p0 + s1 * m0 + s2 * p1 + s3 * m1;

		}

		return result;

	};

	/*********************************/
	/********** INTERNALS ************/
	/*********************************/

	/* CONSTANTS */

	var WEBGL_CONSTANTS = {
		FLOAT: 5126,
		//FLOAT_MAT2: 35674,
		FLOAT_MAT3: 35675,
		FLOAT_MAT4: 35676,
		FLOAT_VEC2: 35664,
		FLOAT_VEC3: 35665,
		FLOAT_VEC4: 35666,
		LINEAR: 9729,
		REPEAT: 10497,
		SAMPLER_2D: 35678,
		POINTS: 0,
		LINES: 1,
		LINE_LOOP: 2,
		LINE_STRIP: 3,
		TRIANGLES: 4,
		TRIANGLE_STRIP: 5,
		TRIANGLE_FAN: 6,
		UNSIGNED_BYTE: 5121,
		UNSIGNED_SHORT: 5123
	};

	var WEBGL_COMPONENT_TYPES = {
		5120: Int8Array,
		5121: Uint8Array,
		5122: Int16Array,
		5123: Uint16Array,
		5125: Uint32Array,
		5126: Float32Array
	};

	var WEBGL_FILTERS = {
		9728: NearestFilter,
		9729: LinearFilter,
		9984: NearestMipmapNearestFilter,
		9985: LinearMipmapNearestFilter,
		9986: NearestMipmapLinearFilter,
		9987: LinearMipmapLinearFilter
	};

	var WEBGL_WRAPPINGS = {
		33071: ClampToEdgeWrapping,
		33648: MirroredRepeatWrapping,
		10497: RepeatWrapping
	};

	var WEBGL_TYPE_SIZES = {
		'SCALAR': 1,
		'VEC2': 2,
		'VEC3': 3,
		'VEC4': 4,
		'MAT2': 4,
		'MAT3': 9,
		'MAT4': 16
	};

	var ATTRIBUTES = {
		POSITION: 'position',
		NORMAL: 'normal',
		TANGENT: 'tangent',
		TEXCOORD_0: 'uv',
		TEXCOORD_1: 'uv2',
		COLOR_0: 'color',
		WEIGHTS_0: 'skinWeight',
		JOINTS_0: 'skinIndex',
	};

	var PATH_PROPERTIES = {
		scale: 'scale',
		translation: 'position',
		rotation: 'quaternion',
		weights: 'morphTargetInfluences'
	};

	var INTERPOLATION = {
		CUBICSPLINE: undefined, // We use a custom interpolant (GLTFCubicSplineInterpolation) for CUBICSPLINE tracks. Each
		                        // keyframe track will be initialized with a default interpolation type, then modified.
		LINEAR: InterpolateLinear,
		STEP: InterpolateDiscrete
	};

	var ALPHA_MODES = {
		OPAQUE: 'OPAQUE',
		MASK: 'MASK',
		BLEND: 'BLEND'
	};

	var MIME_TYPE_FORMATS = {
		'image/png': RGBAFormat,
		'image/jpeg': RGBFormat
	};

	/* UTILITY FUNCTIONS */

	function resolveURL( url, path ) {

		// Invalid URL
		if ( typeof url !== 'string' || url === '' ) return '';

		// Host Relative URL
		if ( /^https?:\/\//i.test( path ) && /^\//.test( url ) ) {

			path = path.replace( /(^https?:\/\/[^\/]+).*/i, '$1' );

		}

		// Absolute URL http://,https://,//
		if ( /^(https?:)?\/\//i.test( url ) ) return url;

		// Data URI
		if ( /^data:.*,.*$/i.test( url ) ) return url;

		// Blob URL
		if ( /^blob:.*$/i.test( url ) ) return url;

		// Relative URL
		return path + url;

	}

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#default-material
	 */
	function createDefaultMaterial( cache ) {

		if ( cache[ 'DefaultMaterial' ] === undefined ) {

			cache[ 'DefaultMaterial' ] = new MeshStandardMaterial( {
				color: 0xFFFFFF,
				emissive: 0x000000,
				metalness: 1,
				roughness: 1,
				transparent: false,
				depthTest: true,
				side: FrontSide
			} );

		}

		return cache[ 'DefaultMaterial' ];

	}

	function addUnknownExtensionsToUserData( knownExtensions, object, objectDef ) {

		// Add unknown glTF extensions to an object's userData.

		for ( var name in objectDef.extensions ) {

			if ( knownExtensions[ name ] === undefined ) {

				object.userData.gltfExtensions = object.userData.gltfExtensions || {};
				object.userData.gltfExtensions[ name ] = objectDef.extensions[ name ];

			}

		}

	}

	/**
	 * @param {Object3D|Material|BufferGeometry} object
	 * @param {GLTF.definition} gltfDef
	 */
	function assignExtrasToUserData( object, gltfDef ) {

		if ( gltfDef.extras !== undefined ) {

			if ( typeof gltfDef.extras === 'object' ) {

				Object.assign( object.userData, gltfDef.extras );

			} else {

				console.warn( 'THREE.GLTFLoader: Ignoring primitive type .extras, ' + gltfDef.extras );

			}

		}

	}

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#morph-targets
	 *
	 * @param {BufferGeometry} geometry
	 * @param {Array<GLTF.Target>} targets
	 * @param {GLTFParser} parser
	 * @return {Promise<BufferGeometry>}
	 */
	function addMorphTargets( geometry, targets, parser ) {

		var hasMorphPosition = false;
		var hasMorphNormal = false;

		for ( var i = 0, il = targets.length; i < il; i ++ ) {

			var target = targets[ i ];

			if ( target.POSITION !== undefined ) hasMorphPosition = true;
			if ( target.NORMAL !== undefined ) hasMorphNormal = true;

			if ( hasMorphPosition && hasMorphNormal ) break;

		}

		if ( ! hasMorphPosition && ! hasMorphNormal ) return Promise.resolve( geometry );

		var pendingPositionAccessors = [];
		var pendingNormalAccessors = [];

		for ( var i = 0, il = targets.length; i < il; i ++ ) {

			var target = targets[ i ];

			if ( hasMorphPosition ) {

				var pendingAccessor = target.POSITION !== undefined
					? parser.getDependency( 'accessor', target.POSITION )
					: geometry.attributes.position;

				pendingPositionAccessors.push( pendingAccessor );

			}

			if ( hasMorphNormal ) {

				var pendingAccessor = target.NORMAL !== undefined
					? parser.getDependency( 'accessor', target.NORMAL )
					: geometry.attributes.normal;

				pendingNormalAccessors.push( pendingAccessor );

			}

		}

		return Promise.all( [
			Promise.all( pendingPositionAccessors ),
			Promise.all( pendingNormalAccessors )
		] ).then( function ( accessors ) {

			var morphPositions = accessors[ 0 ];
			var morphNormals = accessors[ 1 ];

			if ( hasMorphPosition ) geometry.morphAttributes.position = morphPositions;
			if ( hasMorphNormal ) geometry.morphAttributes.normal = morphNormals;
			geometry.morphTargetsRelative = true;

			return geometry;

		} );

	}

	/**
	 * @param {Mesh} mesh
	 * @param {GLTF.Mesh} meshDef
	 */
	function updateMorphTargets( mesh, meshDef ) {

		mesh.updateMorphTargets();

		if ( meshDef.weights !== undefined ) {

			for ( var i = 0, il = meshDef.weights.length; i < il; i ++ ) {

				mesh.morphTargetInfluences[ i ] = meshDef.weights[ i ];

			}

		}

		// .extras has user-defined data, so check that .extras.targetNames is an array.
		if ( meshDef.extras && Array.isArray( meshDef.extras.targetNames ) ) {

			var targetNames = meshDef.extras.targetNames;

			if ( mesh.morphTargetInfluences.length === targetNames.length ) {

				mesh.morphTargetDictionary = {};

				for ( var i = 0, il = targetNames.length; i < il; i ++ ) {

					mesh.morphTargetDictionary[ targetNames[ i ] ] = i;

				}

			} else {

				console.warn( 'THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.' );

			}

		}

	}

	function createPrimitiveKey( primitiveDef ) {

		var dracoExtension = primitiveDef.extensions && primitiveDef.extensions[ EXTENSIONS.KHR_DRACO_MESH_COMPRESSION ];
		var geometryKey;

		if ( dracoExtension ) {

			geometryKey = 'draco:' + dracoExtension.bufferView
				+ ':' + dracoExtension.indices
				+ ':' + createAttributesKey( dracoExtension.attributes );

		} else {

			geometryKey = primitiveDef.indices + ':' + createAttributesKey( primitiveDef.attributes ) + ':' + primitiveDef.mode;

		}

		return geometryKey;

	}

	function createAttributesKey( attributes ) {

		var attributesKey = '';

		var keys = Object.keys( attributes ).sort();

		for ( var i = 0, il = keys.length; i < il; i ++ ) {

			attributesKey += keys[ i ] + ':' + attributes[ keys[ i ] ] + ';';

		}

		return attributesKey;

	}

	/* GLTF PARSER */

	function GLTFParser( json, options ) {

		this.json = json || {};
		this.extensions = {};
		this.plugins = {};
		this.options = options || {};

		// loader object cache
		this.cache = new GLTFRegistry();

		// associations between Three.js objects and glTF elements
		this.associations = new Map();

		// BufferGeometry caching
		this.primitiveCache = {};

		// Object3D instance caches
		this.meshCache = { refs: {}, uses: {} };
		this.cameraCache = { refs: {}, uses: {} };
		this.lightCache = { refs: {}, uses: {} };

		// Use an ImageBitmapLoader if imageBitmaps are supported. Moves much of the
		// expensive work of uploading a texture to the GPU off the main thread.
		if ( typeof createImageBitmap !== 'undefined' && /Firefox/.test( navigator.userAgent ) === false ) {

			this.textureLoader = new ImageBitmapLoader( this.options.manager );

		} else {

			this.textureLoader = new TextureLoader( this.options.manager );

		}

		this.textureLoader.setCrossOrigin( this.options.crossOrigin );

		this.fileLoader = new FileLoader( this.options.manager );
		this.fileLoader.setResponseType( 'arraybuffer' );

		if ( this.options.crossOrigin === 'use-credentials' ) {

			this.fileLoader.setWithCredentials( true );

		}

	}

	GLTFParser.prototype.setExtensions = function ( extensions ) {

		this.extensions = extensions;

	};

	GLTFParser.prototype.setPlugins = function ( plugins ) {

		this.plugins = plugins;

	};

	GLTFParser.prototype.parse = function ( onLoad, onError ) {

		var parser = this;
		var json = this.json;
		var extensions = this.extensions;

		// Clear the loader cache
		this.cache.removeAll();

		// Mark the special nodes/meshes in json for efficient parse
		this._markDefs();

		Promise.all( [

			this.getDependencies( 'scene' ),
			this.getDependencies( 'animation' ),
			this.getDependencies( 'camera' ),

		] ).then( function ( dependencies ) {

			var result = {
				scene: dependencies[ 0 ][ json.scene || 0 ],
				scenes: dependencies[ 0 ],
				animations: dependencies[ 1 ],
				cameras: dependencies[ 2 ],
				asset: json.asset,
				parser: parser,
				userData: {}
			};

			addUnknownExtensionsToUserData( extensions, result, json );

			assignExtrasToUserData( result, json );

			onLoad( result );

		} ).catch( onError );

	};

	/**
	 * Marks the special nodes/meshes in json for efficient parse.
	 */
	GLTFParser.prototype._markDefs = function () {

		var nodeDefs = this.json.nodes || [];
		var skinDefs = this.json.skins || [];
		var meshDefs = this.json.meshes || [];

		// Nothing in the node definition indicates whether it is a Bone or an
		// Object3D. Use the skins' joint references to mark bones.
		for ( var skinIndex = 0, skinLength = skinDefs.length; skinIndex < skinLength; skinIndex ++ ) {

			var joints = skinDefs[ skinIndex ].joints;

			for ( var i = 0, il = joints.length; i < il; i ++ ) {

				nodeDefs[ joints[ i ] ].isBone = true;

			}

		}

		// Iterate over all nodes, marking references to shared resources,
		// as well as skeleton joints.
		for ( var nodeIndex = 0, nodeLength = nodeDefs.length; nodeIndex < nodeLength; nodeIndex ++ ) {

			var nodeDef = nodeDefs[ nodeIndex ];

			if ( nodeDef.mesh !== undefined ) {

				this._addNodeRef( this.meshCache, nodeDef.mesh );

				// Nothing in the mesh definition indicates whether it is
				// a SkinnedMesh or Mesh. Use the node's mesh reference
				// to mark SkinnedMesh if node has skin.
				if ( nodeDef.skin !== undefined ) {

					meshDefs[ nodeDef.mesh ].isSkinnedMesh = true;

				}

			}

			if ( nodeDef.camera !== undefined ) {

				this._addNodeRef( this.cameraCache, nodeDef.camera );

			}

			if ( nodeDef.extensions
				&& nodeDef.extensions[ EXTENSIONS.KHR_LIGHTS_PUNCTUAL ]
				&& nodeDef.extensions[ EXTENSIONS.KHR_LIGHTS_PUNCTUAL ].light !== undefined ) {

				this._addNodeRef( this.lightCache, nodeDef.extensions[ EXTENSIONS.KHR_LIGHTS_PUNCTUAL ].light );

			}

		}

	};

	/**
	 * Counts references to shared node / Object3D resources. These resources
	 * can be reused, or "instantiated", at multiple nodes in the scene
	 * hierarchy. Mesh, Camera, and Light instances are instantiated and must
	 * be marked. Non-scenegraph resources (like Materials, Geometries, and
	 * Textures) can be reused directly and are not marked here.
	 *
	 * Example: CesiumMilkTruck sample model reuses "Wheel" meshes.
	 */
	GLTFParser.prototype._addNodeRef = function ( cache, index ) {

		if ( index === undefined ) return;

		if ( cache.refs[ index ] === undefined ) {

			cache.refs[ index ] = cache.uses[ index ] = 0;

		}

		cache.refs[ index ] ++;

	};

	/** Returns a reference to a shared resource, cloning it if necessary. */
	GLTFParser.prototype._getNodeRef = function ( cache, index, object ) {

		if ( cache.refs[ index ] <= 1 ) return object;

		var ref = object.clone();

		ref.name += '_instance_' + ( cache.uses[ index ] ++ );

		return ref;

	};

	GLTFParser.prototype._invokeOne = function ( func ) {

		var extensions = Object.values( this.plugins );
		extensions.push( this );

		for ( var i = 0; i < extensions.length; i ++ ) {

			var result = func( extensions[ i ] );

			if ( result ) return result;

		}

	};

	GLTFParser.prototype._invokeAll = function ( func ) {

		var extensions = Object.values( this.plugins );
		extensions.unshift( this );

		var pending = [];

		for ( var i = 0; i < extensions.length; i ++ ) {

			pending.push( func( extensions[ i ] ) );

		}

		return Promise.all( pending );

	};

	/**
	 * Requests the specified dependency asynchronously, with caching.
	 * @param {string} type
	 * @param {number} index
	 * @return {Promise<Object3D|Material|THREE.Texture|AnimationClip|ArrayBuffer|Object>}
	 */
	GLTFParser.prototype.getDependency = function ( type, index ) {

		var cacheKey = type + ':' + index;
		var dependency = this.cache.get( cacheKey );

		if ( ! dependency ) {

			switch ( type ) {

				case 'scene':
					dependency = this.loadScene( index );
					break;

				case 'node':
					dependency = this.loadNode( index );
					break;

				case 'mesh':
					dependency = this._invokeOne( function ( ext ) {

						return ext.loadMesh && ext.loadMesh( index );

					} );
					break;

				case 'accessor':
					dependency = this.loadAccessor( index );
					break;

				case 'bufferView':
					dependency = this._invokeOne( function ( ext ) {

						return ext.loadBufferView && ext.loadBufferView( index );

					} );
					break;

				case 'buffer':
					dependency = this.loadBuffer( index );
					break;

				case 'material':
					dependency = this._invokeOne( function ( ext ) {

						return ext.loadMaterial && ext.loadMaterial( index );

					} );
					break;

				case 'texture':
					dependency = this._invokeOne( function ( ext ) {

						return ext.loadTexture && ext.loadTexture( index );

					} );
					break;

				case 'skin':
					dependency = this.loadSkin( index );
					break;

				case 'animation':
					dependency = this.loadAnimation( index );
					break;

				case 'camera':
					dependency = this.loadCamera( index );
					break;

				case 'light':
					dependency = this.extensions[ EXTENSIONS.KHR_LIGHTS_PUNCTUAL ].loadLight( index );
					break;

				default:
					throw new Error( 'Unknown type: ' + type );

			}

			this.cache.add( cacheKey, dependency );

		}

		return dependency;

	};

	/**
	 * Requests all dependencies of the specified type asynchronously, with caching.
	 * @param {string} type
	 * @return {Promise<Array<Object>>}
	 */
	GLTFParser.prototype.getDependencies = function ( type ) {

		var dependencies = this.cache.get( type );

		if ( ! dependencies ) {

			var parser = this;
			var defs = this.json[ type + ( type === 'mesh' ? 'es' : 's' ) ] || [];

			dependencies = Promise.all( defs.map( function ( def, index ) {

				return parser.getDependency( type, index );

			} ) );

			this.cache.add( type, dependencies );

		}

		return dependencies;

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
	 * @param {number} bufferIndex
	 * @return {Promise<ArrayBuffer>}
	 */
	GLTFParser.prototype.loadBuffer = function ( bufferIndex ) {

		var bufferDef = this.json.buffers[ bufferIndex ];
		var loader = this.fileLoader;

		if ( bufferDef.type && bufferDef.type !== 'arraybuffer' ) {

			throw new Error( 'THREE.GLTFLoader: ' + bufferDef.type + ' buffer type is not supported.' );

		}

		// If present, GLB container is required to be the first buffer.
		if ( bufferDef.uri === undefined && bufferIndex === 0 ) {

			return Promise.resolve( this.extensions[ EXTENSIONS.KHR_BINARY_GLTF ].body );

		}

		var options = this.options;

		return new Promise( function ( resolve, reject ) {

			loader.load( resolveURL( bufferDef.uri, options.path ), resolve, undefined, function () {

				reject( new Error( 'THREE.GLTFLoader: Failed to load buffer "' + bufferDef.uri + '".' ) );

			} );

		} );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
	 * @param {number} bufferViewIndex
	 * @return {Promise<ArrayBuffer>}
	 */
	GLTFParser.prototype.loadBufferView = function ( bufferViewIndex ) {

		var bufferViewDef = this.json.bufferViews[ bufferViewIndex ];

		return this.getDependency( 'buffer', bufferViewDef.buffer ).then( function ( buffer ) {

			var byteLength = bufferViewDef.byteLength || 0;
			var byteOffset = bufferViewDef.byteOffset || 0;
			return buffer.slice( byteOffset, byteOffset + byteLength );

		} );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#accessors
	 * @param {number} accessorIndex
	 * @return {Promise<BufferAttribute|InterleavedBufferAttribute>}
	 */
	GLTFParser.prototype.loadAccessor = function ( accessorIndex ) {

		var parser = this;
		var json = this.json;

		var accessorDef = this.json.accessors[ accessorIndex ];

		if ( accessorDef.bufferView === undefined && accessorDef.sparse === undefined ) {

			// Ignore empty accessors, which may be used to declare runtime
			// information about attributes coming from another source (e.g. Draco
			// compression extension).
			return Promise.resolve( null );

		}

		var pendingBufferViews = [];

		if ( accessorDef.bufferView !== undefined ) {

			pendingBufferViews.push( this.getDependency( 'bufferView', accessorDef.bufferView ) );

		} else {

			pendingBufferViews.push( null );

		}

		if ( accessorDef.sparse !== undefined ) {

			pendingBufferViews.push( this.getDependency( 'bufferView', accessorDef.sparse.indices.bufferView ) );
			pendingBufferViews.push( this.getDependency( 'bufferView', accessorDef.sparse.values.bufferView ) );

		}

		return Promise.all( pendingBufferViews ).then( function ( bufferViews ) {

			var bufferView = bufferViews[ 0 ];

			var itemSize = WEBGL_TYPE_SIZES[ accessorDef.type ];
			var TypedArray = WEBGL_COMPONENT_TYPES[ accessorDef.componentType ];

			// For VEC3: itemSize is 3, elementBytes is 4, itemBytes is 12.
			var elementBytes = TypedArray.BYTES_PER_ELEMENT;
			var itemBytes = elementBytes * itemSize;
			var byteOffset = accessorDef.byteOffset || 0;
			var byteStride = accessorDef.bufferView !== undefined ? json.bufferViews[ accessorDef.bufferView ].byteStride : undefined;
			var normalized = accessorDef.normalized === true;
			var array, bufferAttribute;

			// The buffer is not interleaved if the stride is the item size in bytes.
			if ( byteStride && byteStride !== itemBytes ) {

				// Each "slice" of the buffer, as defined by 'count' elements of 'byteStride' bytes, gets its own InterleavedBuffer
				// This makes sure that IBA.count reflects accessor.count properly
				var ibSlice = Math.floor( byteOffset / byteStride );
				var ibCacheKey = 'InterleavedBuffer:' + accessorDef.bufferView + ':' + accessorDef.componentType + ':' + ibSlice + ':' + accessorDef.count;
				var ib = parser.cache.get( ibCacheKey );

				if ( ! ib ) {

					array = new TypedArray( bufferView, ibSlice * byteStride, accessorDef.count * byteStride / elementBytes );

					// Integer parameters to IB/IBA are in array elements, not bytes.
					ib = new InterleavedBuffer( array, byteStride / elementBytes );

					parser.cache.add( ibCacheKey, ib );

				}

				bufferAttribute = new InterleavedBufferAttribute( ib, itemSize, ( byteOffset % byteStride ) / elementBytes, normalized );

			} else {

				if ( bufferView === null ) {

					array = new TypedArray( accessorDef.count * itemSize );

				} else {

					array = new TypedArray( bufferView, byteOffset, accessorDef.count * itemSize );

				}

				bufferAttribute = new BufferAttribute( array, itemSize, normalized );

			}

			// https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#sparse-accessors
			if ( accessorDef.sparse !== undefined ) {

				var itemSizeIndices = WEBGL_TYPE_SIZES.SCALAR;
				var TypedArrayIndices = WEBGL_COMPONENT_TYPES[ accessorDef.sparse.indices.componentType ];

				var byteOffsetIndices = accessorDef.sparse.indices.byteOffset || 0;
				var byteOffsetValues = accessorDef.sparse.values.byteOffset || 0;

				var sparseIndices = new TypedArrayIndices( bufferViews[ 1 ], byteOffsetIndices, accessorDef.sparse.count * itemSizeIndices );
				var sparseValues = new TypedArray( bufferViews[ 2 ], byteOffsetValues, accessorDef.sparse.count * itemSize );

				if ( bufferView !== null ) {

					// Avoid modifying the original ArrayBuffer, if the bufferView wasn't initialized with zeroes.
					bufferAttribute = new BufferAttribute( bufferAttribute.array.slice(), bufferAttribute.itemSize, bufferAttribute.normalized );

				}

				for ( var i = 0, il = sparseIndices.length; i < il; i ++ ) {

					var index = sparseIndices[ i ];

					bufferAttribute.setX( index, sparseValues[ i * itemSize ] );
					if ( itemSize >= 2 ) bufferAttribute.setY( index, sparseValues[ i * itemSize + 1 ] );
					if ( itemSize >= 3 ) bufferAttribute.setZ( index, sparseValues[ i * itemSize + 2 ] );
					if ( itemSize >= 4 ) bufferAttribute.setW( index, sparseValues[ i * itemSize + 3 ] );
					if ( itemSize >= 5 ) throw new Error( 'THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.' );

				}

			}

			return bufferAttribute;

		} );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#textures
	 * @param {number} textureIndex
	 * @return {Promise<THREE.Texture>}
	 */
	GLTFParser.prototype.loadTexture = function ( textureIndex ) {

		var parser = this;
		var json = this.json;
		var options = this.options;

		var textureDef = json.textures[ textureIndex ];

		var textureExtensions = textureDef.extensions || {};

		var source;

		if ( textureExtensions[ EXTENSIONS.MSFT_TEXTURE_DDS ] ) {

			source = json.images[ textureExtensions[ EXTENSIONS.MSFT_TEXTURE_DDS ].source ];

		} else {

			source = json.images[ textureDef.source ];

		}

		var loader;

		if ( source.uri ) {

			loader = options.manager.getHandler( source.uri );

		}

		if ( ! loader ) {

			loader = textureExtensions[ EXTENSIONS.MSFT_TEXTURE_DDS ]
				? parser.extensions[ EXTENSIONS.MSFT_TEXTURE_DDS ].ddsLoader
				: this.textureLoader;

		}

		return this.loadTextureImage( textureIndex, source, loader );

	};

	GLTFParser.prototype.loadTextureImage = function ( textureIndex, source, loader ) {

		var parser = this;
		var json = this.json;
		var options = this.options;

		var textureDef = json.textures[ textureIndex ];

		var URL = self.URL || self.webkitURL;

		var sourceURI = source.uri;
		var isObjectURL = false;

		if ( source.bufferView !== undefined ) {

			// Load binary image data from bufferView, if provided.

			sourceURI = parser.getDependency( 'bufferView', source.bufferView ).then( function ( bufferView ) {

				isObjectURL = true;
				var blob = new Blob( [ bufferView ], { type: source.mimeType } );
				sourceURI = URL.createObjectURL( blob );
				return sourceURI;

			} );

		}

		return Promise.resolve( sourceURI ).then( function ( sourceURI ) {

			return new Promise( function ( resolve, reject ) {

				var onLoad = resolve;

				if ( loader.isImageBitmapLoader === true ) {

					onLoad = function ( imageBitmap ) {

						resolve( new CanvasTexture( imageBitmap ) );

					};

				}

				loader.load( resolveURL( sourceURI, options.path ), onLoad, undefined, reject );

			} );

		} ).then( function ( texture ) {

			// Clean up resources and configure Texture.

			if ( isObjectURL === true ) {

				URL.revokeObjectURL( sourceURI );

			}

			texture.flipY = false;

			if ( textureDef.name ) texture.name = textureDef.name;

			// Ignore unknown mime types, like DDS files.
			if ( source.mimeType in MIME_TYPE_FORMATS ) {

				texture.format = MIME_TYPE_FORMATS[ source.mimeType ];

			}

			var samplers = json.samplers || {};
			var sampler = samplers[ textureDef.sampler ] || {};

			texture.magFilter = WEBGL_FILTERS[ sampler.magFilter ] || LinearFilter;
			texture.minFilter = WEBGL_FILTERS[ sampler.minFilter ] || LinearMipmapLinearFilter;
			texture.wrapS = WEBGL_WRAPPINGS[ sampler.wrapS ] || RepeatWrapping;
			texture.wrapT = WEBGL_WRAPPINGS[ sampler.wrapT ] || RepeatWrapping;

			parser.associations.set( texture, {
				type: 'textures',
				index: textureIndex
			} );

			return texture;

		} );

	};

	/**
	 * Asynchronously assigns a texture to the given material parameters.
	 * @param {Object} materialParams
	 * @param {string} mapName
	 * @param {Object} mapDef
	 * @return {Promise}
	 */
	GLTFParser.prototype.assignTexture = function ( materialParams, mapName, mapDef ) {

		var parser = this;

		return this.getDependency( 'texture', mapDef.index ).then( function ( texture ) {

			if ( ! texture.isCompressedTexture ) {

				switch ( mapName ) {

					case 'aoMap':
					case 'emissiveMap':
					case 'metalnessMap':
					case 'normalMap':
					case 'roughnessMap':
						texture.format = RGBFormat;
						break;

				}

			}

			// Materials sample aoMap from UV set 1 and other maps from UV set 0 - this can't be configured
			// However, we will copy UV set 0 to UV set 1 on demand for aoMap
			if ( mapDef.texCoord !== undefined && mapDef.texCoord != 0 && ! ( mapName === 'aoMap' && mapDef.texCoord == 1 ) ) {

				console.warn( 'THREE.GLTFLoader: Custom UV set ' + mapDef.texCoord + ' for texture ' + mapName + ' not yet supported.' );

			}

			if ( parser.extensions[ EXTENSIONS.KHR_TEXTURE_TRANSFORM ] ) {

				var transform = mapDef.extensions !== undefined ? mapDef.extensions[ EXTENSIONS.KHR_TEXTURE_TRANSFORM ] : undefined;

				if ( transform ) {

					var gltfReference = parser.associations.get( texture );
					texture = parser.extensions[ EXTENSIONS.KHR_TEXTURE_TRANSFORM ].extendTexture( texture, transform );
					parser.associations.set( texture, gltfReference );

				}

			}

			materialParams[ mapName ] = texture;

		} );

	};

	/**
	 * Assigns final material to a Mesh, Line, or Points instance. The instance
	 * already has a material (generated from the glTF material options alone)
	 * but reuse of the same glTF material may require multiple threejs materials
	 * to accomodate different primitive types, defines, etc. New materials will
	 * be created if necessary, and reused from a cache.
	 * @param  {Object3D} mesh Mesh, Line, or Points instance.
	 */
	GLTFParser.prototype.assignFinalMaterial = function ( mesh ) {

		var geometry = mesh.geometry;
		var material = mesh.material;

		var useVertexTangents = geometry.attributes.tangent !== undefined;
		var useVertexColors = geometry.attributes.color !== undefined;
		var useFlatShading = geometry.attributes.normal === undefined;
		var useSkinning = mesh.isSkinnedMesh === true;
		var useMorphTargets = Object.keys( geometry.morphAttributes ).length > 0;
		var useMorphNormals = useMorphTargets && geometry.morphAttributes.normal !== undefined;

		if ( mesh.isPoints ) {

			var cacheKey = 'PointsMaterial:' + material.uuid;

			var pointsMaterial = this.cache.get( cacheKey );

			if ( ! pointsMaterial ) {

				pointsMaterial = new PointsMaterial();
				Material.prototype.copy.call( pointsMaterial, material );
				pointsMaterial.color.copy( material.color );
				pointsMaterial.map = material.map;
				pointsMaterial.sizeAttenuation = false; // glTF spec says points should be 1px

				this.cache.add( cacheKey, pointsMaterial );

			}

			material = pointsMaterial;

		} else if ( mesh.isLine ) {

			var cacheKey = 'LineBasicMaterial:' + material.uuid;

			var lineMaterial = this.cache.get( cacheKey );

			if ( ! lineMaterial ) {

				lineMaterial = new LineBasicMaterial();
				Material.prototype.copy.call( lineMaterial, material );
				lineMaterial.color.copy( material.color );

				this.cache.add( cacheKey, lineMaterial );

			}

			material = lineMaterial;

		}

		// Clone the material if it will be modified
		if ( useVertexTangents || useVertexColors || useFlatShading || useSkinning || useMorphTargets ) {

			var cacheKey = 'ClonedMaterial:' + material.uuid + ':';

			if ( material.isGLTFSpecularGlossinessMaterial ) cacheKey += 'specular-glossiness:';
			if ( useSkinning ) cacheKey += 'skinning:';
			if ( useVertexTangents ) cacheKey += 'vertex-tangents:';
			if ( useVertexColors ) cacheKey += 'vertex-colors:';
			if ( useFlatShading ) cacheKey += 'flat-shading:';
			if ( useMorphTargets ) cacheKey += 'morph-targets:';
			if ( useMorphNormals ) cacheKey += 'morph-normals:';

			var cachedMaterial = this.cache.get( cacheKey );

			if ( ! cachedMaterial ) {

				cachedMaterial = material.clone();

				if ( useSkinning ) cachedMaterial.skinning = true;
				if ( useVertexTangents ) cachedMaterial.vertexTangents = true;
				if ( useVertexColors ) cachedMaterial.vertexColors = true;
				if ( useFlatShading ) cachedMaterial.flatShading = true;
				if ( useMorphTargets ) cachedMaterial.morphTargets = true;
				if ( useMorphNormals ) cachedMaterial.morphNormals = true;

				this.cache.add( cacheKey, cachedMaterial );

				this.associations.set( cachedMaterial, this.associations.get( material ) );

			}

			material = cachedMaterial;

		}

		// workarounds for mesh and geometry

		if ( material.aoMap && geometry.attributes.uv2 === undefined && geometry.attributes.uv !== undefined ) {

			geometry.setAttribute( 'uv2', geometry.attributes.uv );

		}

		// https://github.com/mrdoob/three.js/issues/11438#issuecomment-507003995
		if ( material.normalScale && ! useVertexTangents ) {

			material.normalScale.y = - material.normalScale.y;

		}

		if ( material.clearcoatNormalScale && ! useVertexTangents ) {

			material.clearcoatNormalScale.y = - material.clearcoatNormalScale.y;

		}

		mesh.material = material;

	};

	GLTFParser.prototype.getMaterialType = function ( /* materialIndex */ ) {

		return MeshStandardMaterial;

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materials
	 * @param {number} materialIndex
	 * @return {Promise<Material>}
	 */
	GLTFParser.prototype.loadMaterial = function ( materialIndex ) {

		var parser = this;
		var json = this.json;
		var extensions = this.extensions;
		var materialDef = json.materials[ materialIndex ];

		var materialType;
		var materialParams = {};
		var materialExtensions = materialDef.extensions || {};

		var pending = [];

		if ( materialExtensions[ EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS ] ) {

			var sgExtension = extensions[ EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS ];
			materialType = sgExtension.getMaterialType();
			pending.push( sgExtension.extendParams( materialParams, materialDef, parser ) );

		} else if ( materialExtensions[ EXTENSIONS.KHR_MATERIALS_UNLIT ] ) {

			var kmuExtension = extensions[ EXTENSIONS.KHR_MATERIALS_UNLIT ];
			materialType = kmuExtension.getMaterialType();
			pending.push( kmuExtension.extendParams( materialParams, materialDef, parser ) );

		} else {

			// Specification:
			// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#metallic-roughness-material

			var metallicRoughness = materialDef.pbrMetallicRoughness || {};

			materialParams.color = new Color( 1.0, 1.0, 1.0 );
			materialParams.opacity = 1.0;

			if ( Array.isArray( metallicRoughness.baseColorFactor ) ) {

				var array = metallicRoughness.baseColorFactor;

				materialParams.color.fromArray( array );
				materialParams.opacity = array[ 3 ];

			}

			if ( metallicRoughness.baseColorTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'map', metallicRoughness.baseColorTexture ) );

			}

			materialParams.metalness = metallicRoughness.metallicFactor !== undefined ? metallicRoughness.metallicFactor : 1.0;
			materialParams.roughness = metallicRoughness.roughnessFactor !== undefined ? metallicRoughness.roughnessFactor : 1.0;

			if ( metallicRoughness.metallicRoughnessTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'metalnessMap', metallicRoughness.metallicRoughnessTexture ) );
				pending.push( parser.assignTexture( materialParams, 'roughnessMap', metallicRoughness.metallicRoughnessTexture ) );

			}

			materialType = this._invokeOne( function ( ext ) {

				return ext.getMaterialType && ext.getMaterialType( materialIndex );

			} );

			pending.push( this._invokeAll( function ( ext ) {

				return ext.extendMaterialParams && ext.extendMaterialParams( materialIndex, materialParams );

			} ) );

		}

		if ( materialDef.doubleSided === true ) {

			materialParams.side = DoubleSide;

		}

		var alphaMode = materialDef.alphaMode || ALPHA_MODES.OPAQUE;

		if ( alphaMode === ALPHA_MODES.BLEND ) {

			materialParams.transparent = true;

			// See: https://github.com/mrdoob/three.js/issues/17706
			materialParams.depthWrite = false;

		} else {

			materialParams.transparent = false;

			if ( alphaMode === ALPHA_MODES.MASK ) {

				materialParams.alphaTest = materialDef.alphaCutoff !== undefined ? materialDef.alphaCutoff : 0.5;

			}

		}

		if ( materialDef.normalTexture !== undefined && materialType !== MeshBasicMaterial ) {

			pending.push( parser.assignTexture( materialParams, 'normalMap', materialDef.normalTexture ) );

			materialParams.normalScale = new Vector2( 1, 1 );

			if ( materialDef.normalTexture.scale !== undefined ) {

				materialParams.normalScale.set( materialDef.normalTexture.scale, materialDef.normalTexture.scale );

			}

		}

		if ( materialDef.occlusionTexture !== undefined && materialType !== MeshBasicMaterial ) {

			pending.push( parser.assignTexture( materialParams, 'aoMap', materialDef.occlusionTexture ) );

			if ( materialDef.occlusionTexture.strength !== undefined ) {

				materialParams.aoMapIntensity = materialDef.occlusionTexture.strength;

			}

		}

		if ( materialDef.emissiveFactor !== undefined && materialType !== MeshBasicMaterial ) {

			materialParams.emissive = new Color().fromArray( materialDef.emissiveFactor );

		}

		if ( materialDef.emissiveTexture !== undefined && materialType !== MeshBasicMaterial ) {

			pending.push( parser.assignTexture( materialParams, 'emissiveMap', materialDef.emissiveTexture ) );

		}

		return Promise.all( pending ).then( function () {

			var material;

			if ( materialType === GLTFMeshStandardSGMaterial ) {

				material = extensions[ EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS ].createMaterial( materialParams );

			} else {

				material = new materialType( materialParams );

			}

			if ( materialDef.name ) material.name = materialDef.name;

			// baseColorTexture, emissiveTexture, and specularGlossinessTexture use sRGB encoding.
			if ( material.map ) material.map.encoding = sRGBEncoding;
			if ( material.emissiveMap ) material.emissiveMap.encoding = sRGBEncoding;

			assignExtrasToUserData( material, materialDef );

			parser.associations.set( material, { type: 'materials', index: materialIndex } );

			if ( materialDef.extensions ) addUnknownExtensionsToUserData( extensions, material, materialDef );

			return material;

		} );

	};

	/**
	 * @param {BufferGeometry} geometry
	 * @param {GLTF.Primitive} primitiveDef
	 * @param {GLTFParser} parser
	 */
	function computeBounds( geometry, primitiveDef, parser ) {

		var attributes = primitiveDef.attributes;

		var box = new Box3();

		if ( attributes.POSITION !== undefined ) {

			var accessor = parser.json.accessors[ attributes.POSITION ];

			var min = accessor.min;
			var max = accessor.max;

			// glTF requires 'min' and 'max', but VRM (which extends glTF) currently ignores that requirement.

			if ( min !== undefined && max !== undefined ) {

				box.set(
					new Vector3( min[ 0 ], min[ 1 ], min[ 2 ] ),
					new Vector3( max[ 0 ], max[ 1 ], max[ 2 ] ) );

			} else {

				console.warn( 'THREE.GLTFLoader: Missing min/max properties for accessor POSITION.' );

				return;

			}

		} else {

			return;

		}

		var targets = primitiveDef.targets;

		if ( targets !== undefined ) {

			var maxDisplacement = new Vector3();
			var vector = new Vector3();

			for ( var i = 0, il = targets.length; i < il; i ++ ) {

				var target = targets[ i ];

				if ( target.POSITION !== undefined ) {

					var accessor = parser.json.accessors[ target.POSITION ];
					var min = accessor.min;
					var max = accessor.max;

					// glTF requires 'min' and 'max', but VRM (which extends glTF) currently ignores that requirement.

					if ( min !== undefined && max !== undefined ) {

						// we need to get max of absolute components because target weight is [-1,1]
						vector.setX( Math.max( Math.abs( min[ 0 ] ), Math.abs( max[ 0 ] ) ) );
						vector.setY( Math.max( Math.abs( min[ 1 ] ), Math.abs( max[ 1 ] ) ) );
						vector.setZ( Math.max( Math.abs( min[ 2 ] ), Math.abs( max[ 2 ] ) ) );

						// Note: this assumes that the sum of all weights is at most 1. This isn't quite correct - it's more conservative
						// to assume that each target can have a max weight of 1. However, for some use cases - notably, when morph targets
						// are used to implement key-frame animations and as such only two are active at a time - this results in very large
						// boxes. So for now we make a box that's sometimes a touch too small but is hopefully mostly of reasonable size.
						maxDisplacement.max( vector );

					} else {

						console.warn( 'THREE.GLTFLoader: Missing min/max properties for accessor POSITION.' );

					}

				}

			}

			// As per comment above this box isn't conservative, but has a reasonable size for a very large number of morph targets.
			box.expandByVector( maxDisplacement );

		}

		geometry.boundingBox = box;

		var sphere = new Sphere();

		box.getCenter( sphere.center );
		sphere.radius = box.min.distanceTo( box.max ) / 2;

		geometry.boundingSphere = sphere;

	}

	/**
	 * @param {BufferGeometry} geometry
	 * @param {GLTF.Primitive} primitiveDef
	 * @param {GLTFParser} parser
	 * @return {Promise<BufferGeometry>}
	 */
	function addPrimitiveAttributes( geometry, primitiveDef, parser ) {

		var attributes = primitiveDef.attributes;

		var pending = [];

		function assignAttributeAccessor( accessorIndex, attributeName ) {

			return parser.getDependency( 'accessor', accessorIndex )
				.then( function ( accessor ) {

					geometry.setAttribute( attributeName, accessor );

				} );

		}

		for ( var gltfAttributeName in attributes ) {

			var threeAttributeName = ATTRIBUTES[ gltfAttributeName ] || gltfAttributeName.toLowerCase();

			// Skip attributes already provided by e.g. Draco extension.
			if ( threeAttributeName in geometry.attributes ) continue;

			pending.push( assignAttributeAccessor( attributes[ gltfAttributeName ], threeAttributeName ) );

		}

		if ( primitiveDef.indices !== undefined && ! geometry.index ) {

			var accessor = parser.getDependency( 'accessor', primitiveDef.indices ).then( function ( accessor ) {

				geometry.setIndex( accessor );

			} );

			pending.push( accessor );

		}

		assignExtrasToUserData( geometry, primitiveDef );

		computeBounds( geometry, primitiveDef, parser );

		return Promise.all( pending ).then( function () {

			return primitiveDef.targets !== undefined
				? addMorphTargets( geometry, primitiveDef.targets, parser )
				: geometry;

		} );

	}

	/**
	 * @param {BufferGeometry} geometry
	 * @param {Number} drawMode
	 * @return {BufferGeometry}
	 */
	function toTrianglesDrawMode( geometry, drawMode ) {

		var index = geometry.getIndex();

		// generate index if not present

		if ( index === null ) {

			var indices = [];

			var position = geometry.getAttribute( 'position' );

			if ( position !== undefined ) {

				for ( var i = 0; i < position.count; i ++ ) {

					indices.push( i );

				}

				geometry.setIndex( indices );
				index = geometry.getIndex();

			} else {

				console.error( 'THREE.GLTFLoader.toTrianglesDrawMode(): Undefined position attribute. Processing not possible.' );
				return geometry;

			}

		}

		//

		var numberOfTriangles = index.count - 2;
		var newIndices = [];

		if ( drawMode === TriangleFanDrawMode ) {

			// gl.TRIANGLE_FAN

			for ( var i = 1; i <= numberOfTriangles; i ++ ) {

				newIndices.push( index.getX( 0 ) );
				newIndices.push( index.getX( i ) );
				newIndices.push( index.getX( i + 1 ) );

			}

		} else {

			// gl.TRIANGLE_STRIP

			for ( var i = 0; i < numberOfTriangles; i ++ ) {

				if ( i % 2 === 0 ) {

					newIndices.push( index.getX( i ) );
					newIndices.push( index.getX( i + 1 ) );
					newIndices.push( index.getX( i + 2 ) );


				} else {

					newIndices.push( index.getX( i + 2 ) );
					newIndices.push( index.getX( i + 1 ) );
					newIndices.push( index.getX( i ) );

				}

			}

		}

		if ( ( newIndices.length / 3 ) !== numberOfTriangles ) {

			console.error( 'THREE.GLTFLoader.toTrianglesDrawMode(): Unable to generate correct amount of triangles.' );

		}

		// build final geometry

		var newGeometry = geometry.clone();
		newGeometry.setIndex( newIndices );

		return newGeometry;

	}

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#geometry
	 *
	 * Creates BufferGeometries from primitives.
	 *
	 * @param {Array<GLTF.Primitive>} primitives
	 * @return {Promise<Array<BufferGeometry>>}
	 */
	GLTFParser.prototype.loadGeometries = function ( primitives ) {

		var parser = this;
		var extensions = this.extensions;
		var cache = this.primitiveCache;

		function createDracoPrimitive( primitive ) {

			return extensions[ EXTENSIONS.KHR_DRACO_MESH_COMPRESSION ]
				.decodePrimitive( primitive, parser )
				.then( function ( geometry ) {

					return addPrimitiveAttributes( geometry, primitive, parser );

				} );

		}

		var pending = [];

		for ( var i = 0, il = primitives.length; i < il; i ++ ) {

			var primitive = primitives[ i ];
			var cacheKey = createPrimitiveKey( primitive );

			// See if we've already created this geometry
			var cached = cache[ cacheKey ];

			if ( cached ) {

				// Use the cached geometry if it exists
				pending.push( cached.promise );

			} else {

				var geometryPromise;

				if ( primitive.extensions && primitive.extensions[ EXTENSIONS.KHR_DRACO_MESH_COMPRESSION ] ) {

					// Use DRACO geometry if available
					geometryPromise = createDracoPrimitive( primitive );

				} else {

					// Otherwise create a new geometry
					geometryPromise = addPrimitiveAttributes( new BufferGeometry(), primitive, parser );

				}

				// Cache this geometry
				cache[ cacheKey ] = { primitive: primitive, promise: geometryPromise };

				pending.push( geometryPromise );

			}

		}

		return Promise.all( pending );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#meshes
	 * @param {number} meshIndex
	 * @return {Promise<Group|Mesh|SkinnedMesh>}
	 */
	GLTFParser.prototype.loadMesh = function ( meshIndex ) {

		var parser = this;
		var json = this.json;

		var meshDef = json.meshes[ meshIndex ];
		var primitives = meshDef.primitives;

		var pending = [];

		for ( var i = 0, il = primitives.length; i < il; i ++ ) {

			var material = primitives[ i ].material === undefined
				? createDefaultMaterial( this.cache )
				: this.getDependency( 'material', primitives[ i ].material );

			pending.push( material );

		}

		pending.push( parser.loadGeometries( primitives ) );

		return Promise.all( pending ).then( function ( results ) {

			var materials = results.slice( 0, results.length - 1 );
			var geometries = results[ results.length - 1 ];

			var meshes = [];

			for ( var i = 0, il = geometries.length; i < il; i ++ ) {

				var geometry = geometries[ i ];
				var primitive = primitives[ i ];

				// 1. create Mesh

				var mesh;

				var material = materials[ i ];

				if ( primitive.mode === WEBGL_CONSTANTS.TRIANGLES ||
					primitive.mode === WEBGL_CONSTANTS.TRIANGLE_STRIP ||
					primitive.mode === WEBGL_CONSTANTS.TRIANGLE_FAN ||
					primitive.mode === undefined ) {

					// .isSkinnedMesh isn't in glTF spec. See ._markDefs()
					mesh = meshDef.isSkinnedMesh === true
						? new SkinnedMesh( geometry, material )
						: new Mesh( geometry, material );

					if ( mesh.isSkinnedMesh === true && ! mesh.geometry.attributes.skinWeight.normalized ) {

						// we normalize floating point skin weight array to fix malformed assets (see #15319)
						// it's important to skip this for non-float32 data since normalizeSkinWeights assumes non-normalized inputs
						mesh.normalizeSkinWeights();

					}

					if ( primitive.mode === WEBGL_CONSTANTS.TRIANGLE_STRIP ) {

						mesh.geometry = toTrianglesDrawMode( mesh.geometry, TriangleStripDrawMode );

					} else if ( primitive.mode === WEBGL_CONSTANTS.TRIANGLE_FAN ) {

						mesh.geometry = toTrianglesDrawMode( mesh.geometry, TriangleFanDrawMode );

					}

				} else if ( primitive.mode === WEBGL_CONSTANTS.LINES ) {

					mesh = new LineSegments( geometry, material );

				} else if ( primitive.mode === WEBGL_CONSTANTS.LINE_STRIP ) {

					mesh = new Line( geometry, material );

				} else if ( primitive.mode === WEBGL_CONSTANTS.LINE_LOOP ) {

					mesh = new LineLoop( geometry, material );

				} else if ( primitive.mode === WEBGL_CONSTANTS.POINTS ) {

					mesh = new Points( geometry, material );

				} else {

					throw new Error( 'THREE.GLTFLoader: Primitive mode unsupported: ' + primitive.mode );

				}

				if ( Object.keys( mesh.geometry.morphAttributes ).length > 0 ) {

					updateMorphTargets( mesh, meshDef );

				}

				mesh.name = meshDef.name || ( 'mesh_' + meshIndex );

				if ( geometries.length > 1 ) mesh.name += '_' + i;

				assignExtrasToUserData( mesh, meshDef );

				parser.assignFinalMaterial( mesh );

				meshes.push( mesh );

			}

			if ( meshes.length === 1 ) {

				return meshes[ 0 ];

			}

			var group = new Group();

			for ( var i = 0, il = meshes.length; i < il; i ++ ) {

				group.add( meshes[ i ] );

			}

			return group;

		} );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#cameras
	 * @param {number} cameraIndex
	 * @return {Promise<THREE.Camera>}
	 */
	GLTFParser.prototype.loadCamera = function ( cameraIndex ) {

		var camera;
		var cameraDef = this.json.cameras[ cameraIndex ];
		var params = cameraDef[ cameraDef.type ];

		if ( ! params ) {

			console.warn( 'THREE.GLTFLoader: Missing camera parameters.' );
			return;

		}

		if ( cameraDef.type === 'perspective' ) {

			camera = new PerspectiveCamera( MathUtils.radToDeg( params.yfov ), params.aspectRatio || 1, params.znear || 1, params.zfar || 2e6 );

		} else if ( cameraDef.type === 'orthographic' ) {

			camera = new OrthographicCamera( - params.xmag, params.xmag, params.ymag, - params.ymag, params.znear, params.zfar );

		}

		if ( cameraDef.name ) camera.name = cameraDef.name;

		assignExtrasToUserData( camera, cameraDef );

		return Promise.resolve( camera );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins
	 * @param {number} skinIndex
	 * @return {Promise<Object>}
	 */
	GLTFParser.prototype.loadSkin = function ( skinIndex ) {

		var skinDef = this.json.skins[ skinIndex ];

		var skinEntry = { joints: skinDef.joints };

		if ( skinDef.inverseBindMatrices === undefined ) {

			return Promise.resolve( skinEntry );

		}

		return this.getDependency( 'accessor', skinDef.inverseBindMatrices ).then( function ( accessor ) {

			skinEntry.inverseBindMatrices = accessor;

			return skinEntry;

		} );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#animations
	 * @param {number} animationIndex
	 * @return {Promise<AnimationClip>}
	 */
	GLTFParser.prototype.loadAnimation = function ( animationIndex ) {

		var json = this.json;

		var animationDef = json.animations[ animationIndex ];

		var pendingNodes = [];
		var pendingInputAccessors = [];
		var pendingOutputAccessors = [];
		var pendingSamplers = [];
		var pendingTargets = [];

		for ( var i = 0, il = animationDef.channels.length; i < il; i ++ ) {

			var channel = animationDef.channels[ i ];
			var sampler = animationDef.samplers[ channel.sampler ];
			var target = channel.target;
			var name = target.node !== undefined ? target.node : target.id; // NOTE: target.id is deprecated.
			var input = animationDef.parameters !== undefined ? animationDef.parameters[ sampler.input ] : sampler.input;
			var output = animationDef.parameters !== undefined ? animationDef.parameters[ sampler.output ] : sampler.output;

			pendingNodes.push( this.getDependency( 'node', name ) );
			pendingInputAccessors.push( this.getDependency( 'accessor', input ) );
			pendingOutputAccessors.push( this.getDependency( 'accessor', output ) );
			pendingSamplers.push( sampler );
			pendingTargets.push( target );

		}

		return Promise.all( [

			Promise.all( pendingNodes ),
			Promise.all( pendingInputAccessors ),
			Promise.all( pendingOutputAccessors ),
			Promise.all( pendingSamplers ),
			Promise.all( pendingTargets )

		] ).then( function ( dependencies ) {

			var nodes = dependencies[ 0 ];
			var inputAccessors = dependencies[ 1 ];
			var outputAccessors = dependencies[ 2 ];
			var samplers = dependencies[ 3 ];
			var targets = dependencies[ 4 ];

			var tracks = [];

			for ( var i = 0, il = nodes.length; i < il; i ++ ) {

				var node = nodes[ i ];
				var inputAccessor = inputAccessors[ i ];
				var outputAccessor = outputAccessors[ i ];
				var sampler = samplers[ i ];
				var target = targets[ i ];

				if ( node === undefined ) continue;

				node.updateMatrix();
				node.matrixAutoUpdate = true;

				var TypedKeyframeTrack;

				switch ( PATH_PROPERTIES[ target.path ] ) {

					case PATH_PROPERTIES.weights:

						TypedKeyframeTrack = NumberKeyframeTrack;
						break;

					case PATH_PROPERTIES.rotation:

						TypedKeyframeTrack = QuaternionKeyframeTrack;
						break;

					case PATH_PROPERTIES.position:
					case PATH_PROPERTIES.scale:
					default:

						TypedKeyframeTrack = VectorKeyframeTrack;
						break;

				}

				var targetName = node.name ? node.name : node.uuid;

				var interpolation = sampler.interpolation !== undefined ? INTERPOLATION[ sampler.interpolation ] : InterpolateLinear;

				var targetNames = [];

				if ( PATH_PROPERTIES[ target.path ] === PATH_PROPERTIES.weights ) {

					// Node may be a Group (glTF mesh with several primitives) or a Mesh.
					node.traverse( function ( object ) {

						if ( object.isMesh === true && object.morphTargetInfluences ) {

							targetNames.push( object.name ? object.name : object.uuid );

						}

					} );

				} else {

					targetNames.push( targetName );

				}

				var outputArray = outputAccessor.array;

				if ( outputAccessor.normalized ) {

					var scale;

					if ( outputArray.constructor === Int8Array ) {

						scale = 1 / 127;

					} else if ( outputArray.constructor === Uint8Array ) {

						scale = 1 / 255;

					} else if ( outputArray.constructor == Int16Array ) {

						scale = 1 / 32767;

					} else if ( outputArray.constructor === Uint16Array ) {

						scale = 1 / 65535;

					} else {

						throw new Error( 'THREE.GLTFLoader: Unsupported output accessor component type.' );

					}

					var scaled = new Float32Array( outputArray.length );

					for ( var j = 0, jl = outputArray.length; j < jl; j ++ ) {

						scaled[ j ] = outputArray[ j ] * scale;

					}

					outputArray = scaled;

				}

				for ( var j = 0, jl = targetNames.length; j < jl; j ++ ) {

					var track = new TypedKeyframeTrack(
						targetNames[ j ] + '.' + PATH_PROPERTIES[ target.path ],
						inputAccessor.array,
						outputArray,
						interpolation
					);

					// Override interpolation with custom factory method.
					if ( sampler.interpolation === 'CUBICSPLINE' ) {

						track.createInterpolant = function InterpolantFactoryMethodGLTFCubicSpline( result ) {

							// A CUBICSPLINE keyframe in glTF has three output values for each input value,
							// representing inTangent, splineVertex, and outTangent. As a result, track.getValueSize()
							// must be divided by three to get the interpolant's sampleSize argument.

							return new GLTFCubicSplineInterpolant( this.times, this.values, this.getValueSize() / 3, result );

						};

						// Mark as CUBICSPLINE. `track.getInterpolation()` doesn't support custom interpolants.
						track.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline = true;

					}

					tracks.push( track );

				}

			}

			var name = animationDef.name ? animationDef.name : 'animation_' + animationIndex;

			return new AnimationClip( name, undefined, tracks );

		} );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#nodes-and-hierarchy
	 * @param {number} nodeIndex
	 * @return {Promise<Object3D>}
	 */
	GLTFParser.prototype.loadNode = function ( nodeIndex ) {

		var json = this.json;
		var extensions = this.extensions;
		var parser = this;

		var nodeDef = json.nodes[ nodeIndex ];

		return ( function () {

			var pending = [];

			if ( nodeDef.mesh !== undefined ) {

				pending.push( parser.getDependency( 'mesh', nodeDef.mesh ).then( function ( mesh ) {

					var node = parser._getNodeRef( parser.meshCache, nodeDef.mesh, mesh );

					// if weights are provided on the node, override weights on the mesh.
					if ( nodeDef.weights !== undefined ) {

						node.traverse( function ( o ) {

							if ( ! o.isMesh ) return;

							for ( var i = 0, il = nodeDef.weights.length; i < il; i ++ ) {

								o.morphTargetInfluences[ i ] = nodeDef.weights[ i ];

							}

						} );

					}

					return node;

				} ) );

			}

			if ( nodeDef.camera !== undefined ) {

				pending.push( parser.getDependency( 'camera', nodeDef.camera ).then( function ( camera ) {

					return parser._getNodeRef( parser.cameraCache, nodeDef.camera, camera );

				} ) );

			}

			if ( nodeDef.extensions
				&& nodeDef.extensions[ EXTENSIONS.KHR_LIGHTS_PUNCTUAL ]
				&& nodeDef.extensions[ EXTENSIONS.KHR_LIGHTS_PUNCTUAL ].light !== undefined ) {

				var lightIndex = nodeDef.extensions[ EXTENSIONS.KHR_LIGHTS_PUNCTUAL ].light;

				pending.push( parser.getDependency( 'light', lightIndex ).then( function ( light ) {

					return parser._getNodeRef( parser.lightCache, lightIndex, light );

				} ) );

			}

			return Promise.all( pending );

		}() ).then( function ( objects ) {

			var node;

			// .isBone isn't in glTF spec. See ._markDefs
			if ( nodeDef.isBone === true ) {

				node = new Bone();

			} else if ( objects.length > 1 ) {

				node = new Group();

			} else if ( objects.length === 1 ) {

				node = objects[ 0 ];

			} else {

				node = new Object3D();

			}

			if ( node !== objects[ 0 ] ) {

				for ( var i = 0, il = objects.length; i < il; i ++ ) {

					node.add( objects[ i ] );

				}

			}

			if ( nodeDef.name ) {

				node.userData.name = nodeDef.name;
				node.name = PropertyBinding.sanitizeNodeName( nodeDef.name );

			}

			assignExtrasToUserData( node, nodeDef );

			if ( nodeDef.extensions ) addUnknownExtensionsToUserData( extensions, node, nodeDef );

			if ( nodeDef.matrix !== undefined ) {

				var matrix = new Matrix4();
				matrix.fromArray( nodeDef.matrix );
				node.applyMatrix4( matrix );

			} else {

				if ( nodeDef.translation !== undefined ) {

					node.position.fromArray( nodeDef.translation );

				}

				if ( nodeDef.rotation !== undefined ) {

					node.quaternion.fromArray( nodeDef.rotation );

				}

				if ( nodeDef.scale !== undefined ) {

					node.scale.fromArray( nodeDef.scale );

				}

			}

			parser.associations.set( node, { type: 'nodes', index: nodeIndex } );

			return node;

		} );

	};

	/**
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#scenes
	 * @param {number} sceneIndex
	 * @return {Promise<Group>}
	 */
	GLTFParser.prototype.loadScene = function () {

		// scene node hierachy builder

		function buildNodeHierachy( nodeId, parentObject, json, parser ) {

			var nodeDef = json.nodes[ nodeId ];

			return parser.getDependency( 'node', nodeId ).then( function ( node ) {

				if ( nodeDef.skin === undefined ) return node;

				// build skeleton here as well

				var skinEntry;

				return parser.getDependency( 'skin', nodeDef.skin ).then( function ( skin ) {

					skinEntry = skin;

					var pendingJoints = [];

					for ( var i = 0, il = skinEntry.joints.length; i < il; i ++ ) {

						pendingJoints.push( parser.getDependency( 'node', skinEntry.joints[ i ] ) );

					}

					return Promise.all( pendingJoints );

				} ).then( function ( jointNodes ) {

					node.traverse( function ( mesh ) {

						if ( ! mesh.isMesh ) return;

						var bones = [];
						var boneInverses = [];

						for ( var j = 0, jl = jointNodes.length; j < jl; j ++ ) {

							var jointNode = jointNodes[ j ];

							if ( jointNode ) {

								bones.push( jointNode );

								var mat = new Matrix4();

								if ( skinEntry.inverseBindMatrices !== undefined ) {

									mat.fromArray( skinEntry.inverseBindMatrices.array, j * 16 );

								}

								boneInverses.push( mat );

							} else {

								console.warn( 'THREE.GLTFLoader: Joint "%s" could not be found.', skinEntry.joints[ j ] );

							}

						}

						mesh.bind( new Skeleton( bones, boneInverses ), mesh.matrixWorld );

					} );

					return node;

				} );

			} ).then( function ( node ) {

				// build node hierachy

				parentObject.add( node );

				var pending = [];

				if ( nodeDef.children ) {

					var children = nodeDef.children;

					for ( var i = 0, il = children.length; i < il; i ++ ) {

						var child = children[ i ];
						pending.push( buildNodeHierachy( child, node, json, parser ) );

					}

				}

				return Promise.all( pending );

			} );

		}

		return function loadScene( sceneIndex ) {

			var json = this.json;
			var extensions = this.extensions;
			var sceneDef = this.json.scenes[ sceneIndex ];
			var parser = this;

			// Loader returns Group, not Scene.
			// See: https://github.com/mrdoob/three.js/issues/18342#issuecomment-578981172
			var scene = new Group();
			if ( sceneDef.name ) scene.name = sceneDef.name;

			assignExtrasToUserData( scene, sceneDef );

			if ( sceneDef.extensions ) addUnknownExtensionsToUserData( extensions, scene, sceneDef );

			var nodeIds = sceneDef.nodes || [];

			var pending = [];

			for ( var i = 0, il = nodeIds.length; i < il; i ++ ) {

				pending.push( buildNodeHierachy( nodeIds[ i ], scene, json, parser ) );

			}

			return Promise.all( pending ).then( function () {

				return scene;

			} );

		};

	}();

	return GLTFLoader;

} )();

export { GLTFLoader };
