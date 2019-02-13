type StatName = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
type TypeName = 'Normal' | 'Fighting' | 'Flying' | 'Poison' | 'Ground' | 'Rock' | 'Bug' | 'Ghost' | 'Steel' |
	'Fire' | 'Water' | 'Grass' | 'Electric' | 'Psychic' | 'Ice' | 'Dragon' | 'Dark' | 'Fairy' | '???';
type StatusName = 'par' | 'psn' | 'frz' | 'slp' | 'brn';
type BoostStatName = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'evasion' | 'accuracy' | 'spc';
type GenderName = 'M' | 'F' | 'N';

/** [id, element?, ...misc] */
type EffectState = any[] & {0: ID};
/** [name, minTimeLeft, maxTimeLeft] */
type WeatherState = [string, number, number];
type EffectTable = {[effectid: string]: EffectState};
type HPColor = 'r' | 'y' | 'g';

type ID = string & {__isID: true};

enum Playback {
	Uninitialized = 0,
	Ready = 1,
	Playing = 2,
	Paused = 3,
	Finished = 4,
	Seeking = 5,
}

const BattleNatures = {
	Adamant: {
		plus: 'atk',
		minus: 'spa',
	},
	Bashful: {},
	Bold: {
		plus: 'def',
		minus: 'atk',
	},
	Brave: {
		plus: 'atk',
		minus: 'spe',
	},
	Calm: {
		plus: 'spd',
		minus: 'atk',
	},
	Careful: {
		plus: 'spd',
		minus: 'spa',
	},
	Docile: {},
	Gentle: {
		plus: 'spd',
		minus: 'def',
	},
	Hardy: {},
	Hasty: {
		plus: 'spe',
		minus: 'def',
	},
	Impish: {
		plus: 'def',
		minus: 'spa',
	},
	Jolly: {
		plus: 'spe',
		minus: 'spa',
	},
	Lax: {
		plus: 'def',
		minus: 'spd',
	},
	Lonely: {
		plus: 'atk',
		minus: 'def',
	},
	Mild: {
		plus: 'spa',
		minus: 'def',
	},
	Modest: {
		plus: 'spa',
		minus: 'atk',
	},
	Naive: {
		plus: 'spe',
		minus: 'spd',
	},
	Naughty: {
		plus: 'atk',
		minus: 'spd',
	},
	Quiet: {
		plus: 'spa',
		minus: 'spe',
	},
	Quirky: {},
	Rash: {
		plus: 'spa',
		minus: 'spd',
	},
	Relaxed: {
		plus: 'def',
		minus: 'spe',
	},
	Sassy: {
		plus: 'spd',
		minus: 'spe',
	},
	Serious: {},
	Timid: {
		plus: 'spe',
		minus: 'atk',
	},
};
const BattleStatIDs = {
	HP: 'hp',
	hp: 'hp',
	Atk: 'atk',
	atk: 'atk',
	Def: 'def',
	def: 'def',
	SpA: 'spa',
	SAtk: 'spa',
	SpAtk: 'spa',
	spa: 'spa',
	spc: 'spa',
	Spc: 'spa',
	SpD: 'spd',
	SDef: 'spd',
	SpDef: 'spd',
	spd: 'spd',
	Spe: 'spe',
	Spd: 'spe',
	spe: 'spe',
};
const BattlePOStatNames = { // only used for interacting with PO
	hp: 'HP',
	atk: 'Atk',
	def: 'Def',
	spa: 'SAtk',
	spd: 'SDef',
	spe: 'Spd',
};
const BattleStatNames = { // proper style
	hp: 'HP',
	atk: 'Atk',
	def: 'Def',
	spa: 'SpA',
	spd: 'SpD',
	spe: 'Spe',
};
const BattleStats = {
	hp: 'HP',
	atk: 'Attack',
	def: 'Defense',
	spa: 'Special Attack',
	spd: 'Special Defense',
	spe: 'Speed',
	accuracy: 'accuracy',
	evasion: 'evasiveness',
	spc: 'Special',
};

const BattleBaseSpeciesChart = [
	'pikachu',
	'pichu',
	'unown',
	'castform',
	'deoxys',
	'burmy',
	'wormadam',
	'cherrim',
	'shellos',
	'gastrodon',
	'rotom',
	'giratina',
	'shaymin',
	'arceus',
	'basculin',
	'darmanitan',
	'deerling',
	'sawsbuck',
	'tornadus',
	'thundurus',
	'landorus',
	'kyurem',
	'keldeo',
	'meloetta',
	'genesect',
	'vivillon',
	'flabebe',
	'floette',
	'florges',
	'furfrou',
	'aegislash',
	'pumpkaboo',
	'gourgeist',
	'meowstic',
	'hoopa',
	'zygarde',
	'lycanroc',
	'wishiwashi',
	'minior',
	'mimikyu',
	'greninja',
	'oricorio',
	'silvally',
	'necrozma',

	// alola totems
	'raticate',
	'marowak',
	'kommoo',

	// mega evolutions
	'charizard',
	'mewtwo',
	// others are hardcoded by ending with 'mega'
];


const Dex = {



	/**
	 * This is used to sanitize strings from data files like `moves.js` and
	 * `teambuilder-tables.js`.
	 *
	 * This makes sure untrusted strings can't wreak havoc if someone forgets to
	 * escape it before putting it in HTML.
	 *
	 * None of these characters belong in these files, anyway. (They can be used
	 * in move descriptions, but those are served from `text.js`, which are
	 * definitely always treated as unsanitized.)
	 */
	sanitizeName(name: any) {
		if (!name) return '';
		return ('' + name).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').slice(0, 50);
	},

	prefs(prop: string, value?: any, save?: boolean) {
		// @ts-ignore
		if (window.Storage && Storage.prefs) return Storage.prefs(prop, value, save);
		return undefined;
	},

	getShortName(name: string) {
		let shortName = name.replace(/[^A-Za-z0-9]+$/, '');
		if (shortName.indexOf('(') >= 0) {
			shortName += name.slice(shortName.length).replace(/[^\(\)]+/g, '').replace(/\(\)/g, '');
		}
		return shortName;
	},

	getEffect(name: string | null | undefined): PureEffect | Item | Ability | Move {
		name = (name || '').trim();
		if (name.substr(0, 5) === 'item:') {
			return Dex.getItem(name.substr(5).trim());
		} else if (name.substr(0, 8) === 'ability:') {
			return Dex.getAbility(name.substr(8).trim());
		} else if (name.substr(0, 5) === 'move:') {
			return Dex.getMove(name.substr(5).trim());
		}
		let id = toId(name);
		return new PureEffect(id, name);
	},

	getMove(nameOrMove: string | Move | null | undefined): Move {
		if (nameOrMove && typeof nameOrMove !== 'string') {
			// TODO: don't accept Moves here
			return nameOrMove;
		}
		let name = nameOrMove || '';
		let id = toId(nameOrMove);
		if (window.BattleAliases && id in BattleAliases) {
			name = BattleAliases[id];
			id = toId(name);
		}
		if (!window.BattleMovedex) window.BattleMovedex = {};
		let data = window.BattleMovedex[id];
		if (data && typeof data.exists === 'boolean') return data;

		if (!data && id.substr(0, 11) === 'hiddenpower' && id.length > 11) {
			let [, hpWithType, hpPower] = /([a-z]*)([0-9]*)/.exec(id)!;
			data = {
				...(window.BattleMovedex[hpWithType] || {}),
				basePower: Number(hpPower) || 60,
			};
		}
		if (!data && id.substr(0, 6) === 'return' && id.length > 6) {
			data = {
				...(window.BattleMovedex['return'] || {}),
				basePower: Number(id.slice(6)),
			};
		}
		if (!data && id.substr(0, 11) === 'frustration' && id.length > 11) {
			data = {
				...(window.BattleMovedex['frustration'] || {}),
				basePower: Number(id.slice(11)),
			};
		}

		if (!data) data = {exists: false};
		let move = new Move(id, name, data);
		window.BattleMovedex[id] = move;
		return move;
	},

	getCategory(move: Move, gen: number, type?: string) {
		if (gen <= 3 && move.category !== 'Status') {
			return [
				'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Psychic', 'Dark', 'Dragon',
			].includes(type || move.type) ? 'Special' : 'Physical';
		}
		return move.category;
	},

	getItem(nameOrItem: string | Item | null | undefined): Item {
		if (nameOrItem && typeof nameOrItem !== 'string') {
			// TODO: don't accept Items here
			return nameOrItem;
		}
		let name = nameOrItem || '';
		let id = toId(nameOrItem);
		if (window.BattleAliases && id in BattleAliases) {
			name = BattleAliases[id];
			id = toId(name);
		}
		if (!window.BattleItems) window.BattleItems = {};
		let data = window.BattleItems[id];
		if (data && typeof data.exists === 'boolean') return data;
		if (!data) data = {exists: false};
		let item = new Item(id, name, data);
		window.BattleItems[id] = item;
		return item;
	},

	getAbility(nameOrAbility: string | Ability | null | undefined): Ability {
		if (nameOrAbility && typeof nameOrAbility !== 'string') {
			// TODO: don't accept Abilities here
			return nameOrAbility;
		}
		let name = nameOrAbility || '';
		let id = toId(nameOrAbility);
		if (window.BattleAliases && id in BattleAliases) {
			name = BattleAliases[id];
			id = toId(name);
		}
		if (!window.BattleAbilities) window.BattleAbilities = {};
		let data = window.BattleAbilities[id];
		if (data && typeof data.exists === 'boolean') return data;
		if (!data) data = {exists: false};
		let ability = new Ability(id, name, data);
		window.BattleAbilities[id] = ability;
		return ability;
	},

	getTemplate(nameOrTemplate: string | Template | null | undefined): Template {
		if (nameOrTemplate && typeof nameOrTemplate !== 'string') {
			// TODO: don't accept Templates here
			return nameOrTemplate;
		}
		let name = nameOrTemplate || '';
		let id = toId(nameOrTemplate);
		let formid = id;
		if (!window.BattlePokedexAltForms) window.BattlePokedexAltForms = {};
		if (formid in window.BattlePokedexAltForms) return window.BattlePokedexAltForms[formid];
		if (window.BattleAliases && id in BattleAliases) {
			name = BattleAliases[id];
			id = toId(name);
		}
		if (!window.BattlePokedex) window.BattlePokedex = {};
		let data = window.BattlePokedex[id];

		let template: Template;
		if (data && typeof data.exists === 'boolean') {
			template = data;
		} else {
			if (!data) data = {exists: false};
			template = new Template(id, name, data);
			window.BattlePokedex[id] = template;
		}

		if (formid === id || !template.otherForms || !template.otherForms.includes(formid)) {
			return template;
		}
		let forme = formid.slice(id.length);
		forme = forme[0].toUpperCase() + forme.slice(1);
		name = template.baseSpecies + (forme ? '-' + forme : '');

		template = window.BattlePokedexAltForms[formid] = new Template(formid, name, {
			...template,
			name,
			forme,
		});
		return template;
	},

	getTier(pokemon: Pokemon, gen = 7, isDoubles = false): string {
		let table = window.BattleTeambuilderTable;
		gen = Math.floor(gen);
		if (gen < 0 || gen > 7) gen = 7;
		if (gen < 7 && !isDoubles) table = table['gen' + gen];
		if (isDoubles) table = table['gen' + gen + 'doubles'];
		// Prevents Pokemon from having their tier displayed as 'undefined' when they're in a previous generation teambuilder
		if (this.getTemplate(pokemon.species).gen > gen) return 'Illegal';
		return table.overrideTier[toId(pokemon.species)];
	},

	getType(type: any): Effect {
		if (!type || typeof type === 'string') {
			let id = toId(type) as string;
			id = id.substr(0, 1).toUpperCase() + id.substr(1);
			type = (window.BattleTypeChart && window.BattleTypeChart[id]) || {};
			if (type.damageTaken) type.exists = true;
			if (!type.id) type.id = id;
			if (!type.name) type.name = id;
			if (!type.effectType) {
				type.effectType = 'Type';
			}
		}
		return type;
	},

	getAbilitiesFor(template: any, gen = 7): {[id: string]: string} {
		template = this.getTemplate(template);
		if (gen < 3 || !template.abilities) return {};
		const id = template.id;
		const templAbilities = template.abilities;
		const table = (gen >= 7 ? null : window.BattleTeambuilderTable['gen' + gen]);
		if (!table) return {...templAbilities};
		const abilities: {[id: string]: string} = {};

		if (table.overrideAbility && id in table.overrideAbility) {
			abilities['0'] = table.overrideAbility[id];
		} else {
			abilities['0'] = templAbilities['0'];
		}
		const removeSecondAbility = table.removeSecondAbility && id in table.removeSecondAbility;
		if (!removeSecondAbility && templAbilities['1']) {
			abilities['1'] = templAbilities['1'];
		}
		if (gen >= 5 && templAbilities['H']) abilities['H'] = templAbilities['H'];
		if (gen >= 7 && templAbilities['S']) abilities['S'] = templAbilities['S'];

		return abilities;
	},

	hasAbility(template: any, ability: string, gen = 7) {
		const abilities = this.getAbilitiesFor(template, gen);
		for (const i in abilities) {
			if (ability === abilities[i]) return true;
		}
		return false;
	},

	
};


// Side Conditions:
//
// auroraveil
// reflect
// safeguard
// lightscreen
// mist
// stealthrock
// spikes
// toxicspikes
// stickyweb

function recalculatePos(slot: number) {
  let moreActive = this.scene.activeCount - 1;
  let statbarOffset = 0;
  if (this.scene.gen <= 4 && moreActive) {
    this.x = (slot - 0.52) * (this.isBackSprite ? -1 : 1) * -55;
    this.y = (this.isBackSprite ? -1 : 1) + 1;
    if (!this.isBackSprite) statbarOffset = 30 * slot;
    if (this.isBackSprite) statbarOffset = -28 * slot;
  } else {
    switch (moreActive) {
      case 0:
        this.x = 0;
        break;
      case 1:
        if (this.sp.pixelated) {
          this.x = (slot * -100 + 18) * (this.isBackSprite ? -1 : 1);
        } else {
          this.x = (slot * -75 + 18) * (this.isBackSprite ? -1 : 1);
        }
        break;
      case 2:
        this.x = (slot * -70 + 20) * (this.isBackSprite ? -1 : 1);
        break;
    }
    this.y = (slot * 10) * (this.isBackSprite ? -1 : 1);
    if (!this.isBackSprite) statbarOffset = 17 * slot;
    if (!this.isBackSprite && !moreActive && this.sp.pixelated) statbarOffset = 15;
    if (this.isBackSprite) statbarOffset = -7 * slot;
    if (!this.isBackSprite && moreActive === 2) statbarOffset = 14 * slot - 10;
  }
  if (this.scene.gen <= 2) {
    statbarOffset += this.isBackSprite ? 1 : 20;
  } else if (this.scene.gen <= 3) {
    statbarOffset += this.isBackSprite ? 5 : 30;
  } else {
    statbarOffset += this.isBackSprite ? 20 : 30;
  }

  let pos = this.scene.pos({
    x: this.x,
    y: this.y,
    z: this.z,
  }, {
    w: 0,
    h: 96,
  });
  pos.top += 40;

  this.left = pos.left;
  this.top = pos.top;
  this.statbarLeft = pos.left - 80;
  this.statbarTop = pos.top - 73 - statbarOffset;

  if (moreActive) {
    // make sure element is in the right z-order
    if (!slot && this.isBackSprite || slot && !this.isBackSprite) {
      this.$el.prependTo(this.$el.parent());
    } else {
      this.$el.appendTo(this.$el.parent());
    }
  }
}




// Side Conditions:
//
// auroraveil
// reflect
// safeguard
// lightscreen
// mist
// stealthrock
// spikes
// toxicspikes
// stickyweb

function recalculatePos(slot: number) {
  let moreActive = this.scene.activeCount - 1;
  let statbarOffset = 0;
  if (this.scene.gen <= 4 && moreActive) {
    this.x = (slot - 0.52) * (this.isBackSprite ? -1 : 1) * -55;
    this.y = (this.isBackSprite ? -1 : 1) + 1;
    if (!this.isBackSprite) statbarOffset = 30 * slot;
    if (this.isBackSprite) statbarOffset = -28 * slot;
  } else {
    switch (moreActive) {
      case 0:
        this.x = 0;
        break;
      case 1:
        if (this.sp.pixelated) {
          this.x = (slot * -100 + 18) * (this.isBackSprite ? -1 : 1);
        } else {
          this.x = (slot * -75 + 18) * (this.isBackSprite ? -1 : 1);
        }
        break;
      case 2:
        this.x = (slot * -70 + 20) * (this.isBackSprite ? -1 : 1);
        break;
    }
    this.y = (slot * 10) * (this.isBackSprite ? -1 : 1);
    if (!this.isBackSprite) statbarOffset = 17 * slot;
    if (!this.isBackSprite && !moreActive && this.sp.pixelated) statbarOffset = 15;
    if (this.isBackSprite) statbarOffset = -7 * slot;
    if (!this.isBackSprite && moreActive === 2) statbarOffset = 14 * slot - 10;
  }
  if (this.scene.gen <= 2) {
    statbarOffset += this.isBackSprite ? 1 : 20;
  } else if (this.scene.gen <= 3) {
    statbarOffset += this.isBackSprite ? 5 : 30;
  } else {
    statbarOffset += this.isBackSprite ? 20 : 30;
  }

  let pos = this.scene.pos({
    x: this.x,
    y: this.y,
    z: this.z,
  }, {
    w: 0,
    h: 96,
  });
  pos.top += 40;

  this.left = pos.left;
  this.top = pos.top;
  this.statbarLeft = pos.left - 80;
  this.statbarTop = pos.top - 73 - statbarOffset;

  if (moreActive) {
    // make sure element is in the right z-order
    if (!slot && this.isBackSprite || slot && !this.isBackSprite) {
      this.$el.prependTo(this.$el.parent());
    } else {
      this.$el.appendTo(this.$el.parent());
    }
  }
}
// Side Conditions:
//
// auroraveil
// reflect
// safeguard
// lightscreen
// mist
// stealthrock
// spikes
// toxicspikes
// stickyweb

function recalculatePos(slot: number) {
  let moreActive = this.scene.activeCount - 1;
  let statbarOffset = 0;
  if (this.scene.gen <= 4 && moreActive) {
    this.x = (slot - 0.52) * (this.isBackSprite ? -1 : 1) * -55;
    this.y = (this.isBackSprite ? -1 : 1) + 1;
    if (!this.isBackSprite) statbarOffset = 30 * slot;
    if (this.isBackSprite) statbarOffset = -28 * slot;
  } else {
    switch (moreActive) {
      case 0:
        this.x = 0;
        break;
      case 1:
        if (this.sp.pixelated) {
          this.x = (slot * -100 + 18) * (this.isBackSprite ? -1 : 1);
        } else {
          this.x = (slot * -75 + 18) * (this.isBackSprite ? -1 : 1);
        }
        break;
      case 2:
        this.x = (slot * -70 + 20) * (this.isBackSprite ? -1 : 1);
        break;
    }
    this.y = (slot * 10) * (this.isBackSprite ? -1 : 1);
    if (!this.isBackSprite) statbarOffset = 17 * slot;
    if (!this.isBackSprite && !moreActive && this.sp.pixelated) statbarOffset = 15;
    if (this.isBackSprite) statbarOffset = -7 * slot;
    if (!this.isBackSprite && moreActive === 2) statbarOffset = 14 * slot - 10;
  }
  if (this.scene.gen <= 2) {
    statbarOffset += this.isBackSprite ? 1 : 20;
  } else if (this.scene.gen <= 3) {
    statbarOffset += this.isBackSprite ? 5 : 30;
  } else {
    statbarOffset += this.isBackSprite ? 20 : 30;
  }

  let pos = this.scene.pos({
    x: this.x,
    y: this.y,
    z: this.z,
  }, {
    w: 0,
    h: 96,
  });
  pos.top += 40;

  this.left = pos.left;
  this.top = pos.top;
  this.statbarLeft = pos.left - 80;
  this.statbarTop = pos.top - 73 - statbarOffset;

  if (moreActive) {
    // make sure element is in the right z-order
    if (!slot && this.isBackSprite || slot && !this.isBackSprite) {
      this.$el.prependTo(this.$el.parent());
    } else {
      this.$el.appendTo(this.$el.parent());
    }
  }
}
