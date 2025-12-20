import { Vector3, Object3D } from 'three';
import {memoLoader} from '../PolyForge'
const _v1 = /*@__PURE__*/ new Vector3();
const _v2 = /*@__PURE__*/ new Vector3();


class DLOD extends Object3D {

	constructor() {

		super();
        this.loader = memoLoader;
		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isDLOD = true;
        
        this.activeLodObject = null;
		/**
		 * The current LOD index.
		 *
		 * @private
		 * @type {number}
		 * @default 0
		 */
		this._currentLevel = 0;

		this.type = 'DLOD';

		Object.defineProperties( this, {
			/**
			 * This array holds the LOD levels.
			 *
			 * @name DLOD#levels
			 * @type {Array<{assetId:string,distance:number,hysteresis:number}>}
			 */
			levels: {
				enumerable: true,
				value: []
			}
		} );

		/**
		 * Whether the LOD object is updated automatically by the renderer per frame
		 * or not. If set to `false`, you have to call {@link LOD#update} in the
		 * render loop by yourself.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.autoUpdate = true;

	}

	copy( source ) {

		super.copy( source, false );

		const levels = source.levels;

		for ( let i = 0, l = levels.length; i < l; i ++ ) {

			const level = levels[ i ];

			this.addLevel( level.assetId, level.distance, level.hysteresis );

		}

		this.autoUpdate = source.autoUpdate;

		return this;

	}
    static fromLevels( levels, loader ) {
        const dlod = new DLOD(loader);
        for ( let i = 0, l = levels.length; i < l; i ++ ) {

			const level = levels[ i ];

			dlod.addLevel( level.assetId, level.distance, level.hysteresis );

		}
        return dlod;
    }
	/**
	 * Adds a mesh that will display at a certain distance and greater. Typically
	 * the further away the distance, the lower the detail on the mesh.
	 *
	 * @param {string} assetId - The 3D object to display at this level.
	 * @param {number} [distance=0] - The distance at which to display this level of detail.
	 * @param {number} [hysteresis=0] - Threshold used to avoid flickering at LOD boundaries, as a fraction of distance.
	 * @return {DLOD} A reference to this instance.
	 */
	addLevel( assetId, distance = 0, hysteresis = 0 ) {

		distance = Math.abs( distance );

		const levels = this.levels;

		let l;

		for ( l = 0; l < levels.length; l ++ ) {

			if ( distance < levels[ l ].distance ) {

				break;

			}

		}

		levels.splice( l, 0, { distance: distance, hysteresis: hysteresis, assetId } );


		return this;

	}

	/**
	 * Removes an existing level, based on the distance from the camera.
	 * Returns `true` when the level has been removed. Otherwise `false`.
	 *
	 * @param {number} levelIndex - Distance of the level to remove.
	 * @return {boolean} Whether the level has been removed or not.
	 */
	removeLevel( levelIndex ) {

		const levels = this.levels;
			if ( levels[ levelIndex ] ) {

				const removedElements = levels.splice( levelIndex, 1 );

				return true;

			}
        return false;
	}

	/**
	 * Returns the currently active LOD level index.
	 *
	 * @return {number} The current active LOD level index.
	 */
	getCurrentLevel() {

		return this._currentLevel;

	}



    async loadLODLevel(level, onLoad){
        const data = await this.loader.load(level)
        onLoad?.(data)
        return data
    }


	/**
	 * Returns a reference to the first 3D object that is greater than
	 * the given distance.
	 *
	 * @param {number} distance - The LOD distance.
	 * @return {?Object3D} The found 3D object. `null` if no 3D object has been found.
	 */
	getLevelForDistance(distance) {

    const levels = this.levels;

    if (levels.length === 0) return -1;

    for (let i = 1; i < levels.length; i++) {

      let d = levels[i].distance;

      if (i === this._currentLevel) {
        d -= d * levels[i].hysteresis;
      }

      if (distance < d) return i - 1;
    }

    return levels.length - 1;
  }

	/**
	 * Computes intersection points between a casted ray and this LOD.
	 *
	 * @param {Raycaster} raycaster - The raycaster.
	 * @param {Array<Object>} intersects - The target array that holds the intersection points.
	 */
	raycast( raycaster, intersects ) {

		const levels = this.levels;

		if ( levels.length > 0 ) {
			this.activeLodObject?.raycast?.( raycaster, intersects );

		}

	}

	/**
	 * Updates the LOD by computing which LOD level should be visible according
	 * to the current distance of the given camera.
	 *
	 * @param {Camera} camera - The camera the scene is rendered with.
	 */
	update( camera ) {
console.log('inside lod')
		const levels = this.levels;

		if ( levels.length > 1 ) {

			_v1.setFromMatrixPosition( camera.matrixWorld );
			_v2.setFromMatrixPosition( this.matrixWorld );

			const distance = _v1.distanceTo( _v2 ) / camera.zoom;

			
			const levelIndex = this.getLevelForDistance(distance);
			
			const level = levels[levelIndex]
			
			let scope = this;
			this.loadLODLevel(level, (object)=>{
			    scope.remove(scope.activeLodObject)
			    scope.add(object)
			    scope.activeLodObject = object
			    scope._currentLevel = levelIndex;
			})
		}

	}

	toJSON( meta ) {
		const data = super.toJSON( meta );
		if ( this.autoUpdate === false ) data.object.autoUpdate = false;
		data.object.userData=data.object.userData?data.object.userData:{}
		data.object.userData.type="DLOD"
		data.object.userData.levels = this.levels;
		return data;
	}

}


export { DLOD };
