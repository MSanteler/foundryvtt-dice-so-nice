"use strict"

export class DiceNotation {

	/**
	 * A roll object from Foundry 
	 * @param {Roll} rolls 
	 */
	constructor(rolls) {
		this.dice = [];
		rolls.dice.forEach(die => {
			//We only are able to handle this list of number of face in 3D for now
			if([2, 3, 4, 6, 8, 10, 12, 20, 100].includes(die.faces)) {
				for(let i =0; i< die.number; i++){
					this.addDie(die, i);
					if(die.faces == 100){
						this.addDie(die, i, true);
					}
				}
			}
		});
	}

	addDie(fvttDie, index, isd10of100 = false){
		let dsnDie = {};
		let dieValue = fvttDie.values[index];
		if(fvttDie.faces == 100) {
			//For d100, we create two d10 dice
			if(isd10of100) {
				dieValue = dieValue%10;
				dsnDie.resultLabel = fvttDie.constructor.getResultLabel(dieValue);
			}
			else {
				dieValue = parseInt(dieValue/10);
				dsnDie.resultLabel = fvttDie.constructor.getResultLabel(dieValue*10);
			}
		} else
			dsnDie.resultLabel = fvttDie.constructor.getResultLabel(dieValue);
		dsnDie.result = dieValue;

		//If it is not a standard die ("d"), we need to prepend "d" to the denominator. If it is, we append the number of face
		dsnDie.type = fvttDie.constructor.DENOMINATION;
		if(fvttDie.constructor.name == "Die")
			dsnDie.type += isd10of100 ? "10":fvttDie.faces;
		else {
			dsnDie.type = "d"+dsnDie.type;
		}
		dsnDie.vectors = [];
		//Contains optionals flavor (core) and colorset (dsn) infos.
		dsnDie.options = duplicate(fvttDie.options);
		this.dice.push(dsnDie);
	}
}