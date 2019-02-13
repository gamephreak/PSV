class Side {
	battle: Battle;
	name = '';
	id = '';
	n: number;
	foe: Side = null!;
	spriteid: string | number = 262;
	totalPokemon = 6;
	x = 0;
	y = 0;
	z = 0;
	missedPokemon: Pokemon = null!;

	wisher: Pokemon | null = null;

	active = [null] as (Pokemon | null)[];
	lastPokemon = null as Pokemon | null;
	pokemon = [] as Pokemon[];

	/** [effectName, levels, minDuration, maxDuration] */
	sideConditions: {[id: string]: [string, number, number, number]} = {};

	constructor(battle: Battle, n: number) {
		this.battle = battle;
		this.n = n;
		this.updateSprites();
	}

	rollTrainerSprites() {
		let sprites = [1, 2, 101, 102, 169, 170];
		this.spriteid = sprites[Math.floor(Math.random() * sprites.length)];
	}

	behindx(offset: number) {
		return this.x + (!this.n ? -1 : 1) * offset;
	}
	behindy(offset: number) {
		return this.y + (!this.n ? 1 : -1) * offset;
	}
	leftof(offset: number) {
		return (!this.n ? -1 : 1) * offset;
	}
	behind(offset: number) {
		return this.z + (!this.n ? -1 : 1) * offset;
	}

	clearPokemon() {
		for (const pokemon of this.pokemon) pokemon.destroy();
		this.pokemon = [];
		for (let i = 0; i < this.active.length; i++) this.active[i] = null;
		this.lastPokemon = null;
	}
	reset() {
		this.clearPokemon();
		this.updateSprites();
		this.sideConditions = {};
	}
	updateSprites() {
		this.z = (this.n ? 200 : 0);
		this.battle.scene.updateSpritesForSide(this);
	}
	setAvatar(spriteid: string) {
		this.spriteid = spriteid;
	}
	setName(name: string, spriteid?: string | number) {
		if (name) this.name = name;
		this.id = toId(this.name);
		if (spriteid) {
			this.spriteid = spriteid;
		} else {
			this.rollTrainerSprites();
			if (this.foe && this.spriteid === this.foe.spriteid) this.rollTrainerSprites();
		}
		if (this.battle.stagnateCallback) this.battle.stagnateCallback(this.battle);
	}
	addSideCondition(effect: Effect) {
		let condition = effect.id;
		if (this.sideConditions[condition]) {
			if (condition === 'spikes' || condition === 'toxicspikes') {
				this.sideConditions[condition][1]++;
			}
			this.battle.scene.addSideCondition(this.n, condition);
			return;
		}
		// Side conditions work as: [effectName, levels, minDuration, maxDuration]
		switch (condition) {
		case 'auroraveil':
			this.sideConditions[condition] = [effect.name, 1, 5, 8];
			break;
		case 'reflect':
			this.sideConditions[condition] = [effect.name, 1, 5, this.battle.gen >= 4 ? 8 : 0];
			break;
		case 'safeguard':
			this.sideConditions[condition] = [effect.name, 1, 5, 0];
			break;
		case 'lightscreen':
			this.sideConditions[condition] = [effect.name, 1, 5, this.battle.gen >= 4 ? 8 : 0];
			break;
		case 'mist':
			this.sideConditions[condition] = [effect.name, 1, 5, 0];
			break;
		case 'tailwind':
			this.sideConditions[condition] = [effect.name, 1, this.battle.gen >= 5 ? 4 : 3, 0];
			break;
		case 'luckychant':
			this.sideConditions[condition] = [effect.name, 1, 5, 0];
			break;
		case 'stealthrock':
			this.sideConditions[condition] = [effect.name, 1, 0, 0];
			break;
		case 'spikes':
			this.sideConditions[condition] = [effect.name, 1, 0, 0];
			break;
		case 'toxicspikes':
			this.sideConditions[condition] = [effect.name, 1, 0, 0];
			break;
		case 'stickyweb':
			this.sideConditions[condition] = [effect.name, 1, 0, 0];
			break;
		default:
			this.sideConditions[condition] = [effect.name, 1, 0, 0];
			break;
		}
		this.battle.scene.addSideCondition(this.n, condition);
	}
	removeSideCondition(condition: string) {
		const id = toId(condition);
		if (!this.sideConditions[id]) return;
		delete this.sideConditions[id];
		this.battle.scene.removeSideCondition(this.n, id);
	}
	newPokemon(data: any, replaceSlot = -1) {
		let poke = new Pokemon(data, this);
		if (!poke.ability && poke.baseAbility) poke.ability = poke.baseAbility;
		poke.reset();

		if (replaceSlot >= 0) {
			this.pokemon[replaceSlot] = poke;
		} else {
			this.pokemon.push(poke);
		}
		if (this.pokemon.length > this.totalPokemon || this.battle.speciesClause) {
			// check for Illusion
			let existingTable: {[searchid: string]: number} = {};
			let toRemove = -1;
			for (let poke1i = 0; poke1i < this.pokemon.length; poke1i++) {
				let poke1 = this.pokemon[poke1i];
				if (!poke1.searchid) continue;
				if (poke1.searchid in existingTable) {
					let poke2i = existingTable[poke1.searchid];
					let poke2 = this.pokemon[poke2i];
					if (poke === poke1) {
						toRemove = poke2i;
					} else if (poke === poke2) {
						toRemove = poke1i;
					} else if (this.active.indexOf(poke1) >= 0) {
						toRemove = poke2i;
					} else if (this.active.indexOf(poke2) >= 0) {
						toRemove = poke1i;
					} else if (poke1.fainted && !poke2.fainted) {
						toRemove = poke2i;
					} else {
						toRemove = poke1i;
					}
					break;
				}
				existingTable[poke1.searchid] = poke1i;
			}
			if (toRemove >= 0) {
				if (this.pokemon[toRemove].fainted) {
					// A fainted Pokemon was actually a Zoroark
					let illusionFound = null;
					for (const curPoke of this.pokemon) {
						if (curPoke === poke) continue;
						if (curPoke.fainted) continue;
						if (this.active.indexOf(curPoke) >= 0) continue;
						if (curPoke.species === 'Zoroark' || curPoke.species === 'Zorua' || curPoke.ability === 'Illusion') {
							illusionFound = curPoke;
							break;
						}
					}
					if (!illusionFound) {
						// This is Hackmons; we'll just guess a random unfainted Pokemon.
						// This will keep the fainted Pokemon count correct, and will
						// eventually become correct as incorrect guesses are switched in
						// and reguessed.
						for (const curPoke of this.pokemon) {
							if (curPoke === poke) continue;
							if (curPoke.fainted) continue;
							if (this.active.indexOf(curPoke) >= 0) continue;
							illusionFound = curPoke;
							break;
						}
					}
					if (illusionFound) {
						illusionFound.fainted = true;
						illusionFound.hp = 0;
						illusionFound.status = '';
					}
				}
				this.pokemon.splice(toRemove, 1);
			}
		}
		this.battle.scene.updateSidebar(this);

		return poke;
	}

	switchIn(pokemon: Pokemon, slot?: number) {
		if (slot === undefined) slot = pokemon.slot;
		this.active[slot] = pokemon;
		pokemon.slot = slot;
		pokemon.clearVolatile();
		pokemon.lastMove = '';
		this.battle.lastMove = 'switch-in';
		if (this.lastPokemon && (this.lastPokemon.lastMove === 'batonpass' || this.lastPokemon.lastMove === 'zbatonpass')) {
			pokemon.copyVolatileFrom(this.lastPokemon);
		}

		this.battle.scene.animSummon(pokemon, slot);

		if (this.battle.switchCallback) this.battle.switchCallback(this.battle, this);
	}
	dragIn(pokemon: Pokemon, slot = pokemon.slot) {
		let oldpokemon = this.active[slot];
		if (oldpokemon === pokemon) return;
		this.lastPokemon = oldpokemon;
		if (oldpokemon) {
			this.battle.scene.animDragOut(oldpokemon);
			oldpokemon.clearVolatile();
		}
		pokemon.clearVolatile();
		pokemon.lastMove = '';
		this.battle.lastMove = 'switch-in';
		this.active[slot] = pokemon;
		pokemon.slot = slot;

		this.battle.scene.animDragIn(pokemon, slot);

		if (this.battle.dragCallback) this.battle.dragCallback(this.battle, this);
	}
	replace(pokemon: Pokemon, slot = pokemon.slot) {
		let oldpokemon = this.active[slot];
		if (pokemon === oldpokemon) return;
		this.lastPokemon = oldpokemon;
		pokemon.clearVolatile();
		if (oldpokemon) {
			pokemon.lastMove = oldpokemon.lastMove;
			pokemon.hp = oldpokemon.hp;
			pokemon.maxhp = oldpokemon.maxhp;
			pokemon.hpcolor = oldpokemon.hpcolor;
			pokemon.status = oldpokemon.status;
			pokemon.copyVolatileFrom(oldpokemon, true);
			pokemon.statusData = {...oldpokemon.statusData};
			// we don't know anything about the illusioned pokemon except that it's not fainted
			// technically we also know its status but only at the end of the turn, not here
			oldpokemon.fainted = false;
			oldpokemon.hp = oldpokemon.maxhp;
			oldpokemon.status = '???';
		}
		this.active[slot] = pokemon;
		pokemon.slot = slot;

		if (oldpokemon) {
			this.battle.scene.animUnsummon(oldpokemon, true);
		}
		this.battle.scene.animSummon(pokemon, slot, true);
		// not sure if we want a different callback
		if (this.battle.dragCallback) this.battle.dragCallback(this.battle, this);
	}
	switchOut(pokemon: Pokemon, slot = pokemon.slot) {
		if (pokemon.lastMove !== 'batonpass' && pokemon.lastMove !== 'zbatonpass') {
			pokemon.clearVolatile();
		} else {
			pokemon.removeVolatile('transform' as ID);
			pokemon.removeVolatile('formechange' as ID);
		}
		if (pokemon.lastMove === 'uturn' || pokemon.lastMove === 'voltswitch') {
			this.battle.log(['switchout', pokemon.ident], {from: pokemon.lastMove});
		} else if (pokemon.lastMove !== 'batonpass' && pokemon.lastMove !== 'zbatonpass') {
			this.battle.log(['switchout', pokemon.ident]);
		}
		pokemon.statusData.toxicTurns = 0;
		if (this.battle.gen === 5) pokemon.statusData.sleepTurns = 0;
		this.lastPokemon = pokemon;
		this.active[slot] = null;

		this.battle.scene.animUnsummon(pokemon);
	}
	swapTo(pokemon: Pokemon, slot: number, kwArgs: KWArgs) {
		if (pokemon.slot === slot) return;
		let target = this.active[slot];

		let oslot = pokemon.slot;

		pokemon.slot = slot;
		if (target) target.slot = oslot;

		this.active[slot] = pokemon;
		this.active[oslot] = target;

		this.battle.scene.animUnsummon(pokemon, true);
		if (target) this.battle.scene.animUnsummon(target, true);

		this.battle.scene.animSummon(pokemon, slot, true);
		if (target) this.battle.scene.animSummon(target, oslot, true);
	}
	swapWith(pokemon: Pokemon, target: Pokemon, kwArgs: KWArgs) {
		// method provided for backwards compatibility only
		if (pokemon === target) return;

		let oslot = pokemon.slot;
		let nslot = target.slot;

		pokemon.slot = nslot;
		target.slot = oslot;
		this.active[nslot] = pokemon;
		this.active[oslot] = target;

		this.battle.scene.animUnsummon(pokemon, true);
		this.battle.scene.animUnsummon(target, true);

		this.battle.scene.animSummon(pokemon, nslot, true);
		this.battle.scene.animSummon(target, oslot, true);
	}
	faint(pokemon: Pokemon, slot = pokemon.slot) {
		pokemon.clearVolatile();
		this.lastPokemon = pokemon;
		this.active[slot] = null;

		pokemon.fainted = true;
		pokemon.hp = 0;

		this.battle.scene.animFaint(pokemon);
		if (this.battle.faintCallback) this.battle.faintCallback(this.battle, this);
	}
	destroy() {
		this.clearPokemon();
		this.battle = null!;
		this.foe = null!;
	}
}
