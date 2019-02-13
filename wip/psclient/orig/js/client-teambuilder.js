(function (exports, $) {

	// this is a useful global
	var teams;

	exports.TeambuilderRoom = exports.Room.extend({
		smogdexLink: function (template) {
			var template = Dex.getTemplate(template);
			var format = this.curTeam && this.curTeam.format;
			var smogdexid = toId(template.baseSpecies);
			if (template.isNonstandard) {
				return 'http://www.smogon.com/cap/pokemon/strategies/' + smogdexid;
			}

			if (template.speciesid === 'meowstic') {
				smogdexid = 'meowstic-m';
			} else if (template.forme) {
				switch (template.baseSpecies) {
				case 'Vivillon':
				case 'Keldeo':
				case 'Basculin':
				case 'Pikachu':
				case 'Castform':
					break;
				default:
					smogdexid += '-' + toId(template.forme);
					break;
				}
			}

			var generationNumber = 7;
			if (format.substr(0, 3) === 'gen') {
				var number = format.charAt(3);
				if ('1' <= number && number <= '6') {
					generationNumber = +number;
					format = format.substr(4);
				}
			}
			var generation = ['rb', 'gs', 'rs', 'dp', 'bw', 'xy', 'sm'][generationNumber - 1];
			if (format === 'battlespotdoubles') {
				smogdexid += '/vgc15';
			} else if (format === 'doublesou' || format === 'doublesuu') {
				smogdexid += '/doubles';
			} else if (format === 'ou' || format === 'uu' || format === 'ru' || format === 'nu' || format === 'pu' || format === 'lc') {
				smogdexid += '/' + format;
			}
			return 'http://smogon.com/dex/' + generation + '/pokemon/' + smogdexid + '/';
		},
		updateIVs: function () {
			var set = this.curSet;
			if (!set.moves || this.canHyperTrain(set)) return;
			var hasHiddenPower = false;
			for (var i = 0; i < set.moves.length; i++) {
				if (toId(set.moves[i]).slice(0, 11) === 'hiddenpower') {
					hasHiddenPower = true;
					break;
				}
			}
			if (!hasHiddenPower) return;
			var hpTypes = ['Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark'];
			var hpType;
			if (this.curTeam.gen <= 2) {
				var hpDV = Math.floor(set.ivs.hp / 2);
				var atkDV = Math.floor(set.ivs.atk / 2);
				var defDV = Math.floor(set.ivs.def / 2);
				var speDV = Math.floor(set.ivs.spe / 2);
				var spcDV = Math.floor(set.ivs.spa / 2);
				hpType = hpTypes[4 * (atkDV % 4) + (defDV % 4)];
				var expectedHpDV = (atkDV % 2) * 8 + (defDV % 2) * 4 + (speDV % 2) * 2 + (spcDV % 2);
				if (expectedHpDV !== hpDV) {
					set.ivs.hp = expectedHpDV * 2;
					if (set.ivs.hp === 30) set.ivs.hp = 31;
					this.$chart.find('input[name=iv-hp]').val(expectedHpDV);
				}
			} else {
				var hpTypeX = 0;
				var i = 1;
				var stats = {hp: 31, atk: 31, def: 31, spe: 31, spa: 31, spd: 31};
				for (var s in stats) {
					if (set.ivs[s] === undefined) set.ivs[s] = 31;
					hpTypeX += i * (set.ivs[s] % 2);
					i *= 2;
				}
				hpType = hpTypes[Math.floor(hpTypeX * 15 / 63)];
			}
			for (var i = 0; i < set.moves.length; i++) {
				if (toId(set.moves[i]).slice(0, 11) === 'hiddenpower') {
					set.moves[i] = "Hidden Power " + hpType;
					if (i < 4) this.$('input[name=move' + (i + 1) + ']').val("Hidden Power " + hpType);
				}
			}
		},
		chooseMove: function (moveName, resetSpeed) {
			var set = this.curSet;
			if (!set) return;
			var gen = this.curTeam.gen;

			var minSpe;
			if (resetSpeed) minSpe = false;
			if (moveName.substr(0, 13) === 'Hidden Power ') {
				if (!this.canHyperTrain(set)) {
					var hpType = moveName.substr(13);

					set.ivs = {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31};
					if (this.curTeam.gen > 2) {
						for (var i in exports.BattleTypeChart[hpType].HPivs) {
							set.ivs[i] = exports.BattleTypeChart[hpType].HPivs[i];
						}
					} else {
						for (var i in exports.BattleTypeChart[hpType].HPdvs) {
							set.ivs[i] = exports.BattleTypeChart[hpType].HPdvs[i] * 2;
						}
						var atkDV = Math.floor(set.ivs.atk / 2);
						var defDV = Math.floor(set.ivs.def / 2);
						var speDV = Math.floor(set.ivs.spe / 2);
						var spcDV = Math.floor(set.ivs.spa / 2);
						var expectedHpDV = (atkDV % 2) * 8 + (defDV % 2) * 4 + (speDV % 2) * 2 + (spcDV % 2);
						set.ivs.hp = expectedHpDV * 2;
						if (set.ivs.hp === 30) set.ivs.hp = 31;
					}
				}
			} else if (moveName === 'Return') {
				this.curSet.happiness = 255;
			} else if (moveName === 'Frustration') {
				this.curSet.happiness = 0;
			} else if (moveName === 'Gyro Ball') {
				minSpe = true;
			}

			if (this.curTeam.format === 'gen7hiddentype') return;

			var minAtk = true;
			if (set.ability === 'Battle Bond') minAtk = false; // only available through an event with 31 Atk IVs
			var hpModulo = (this.curTeam.gen >= 6 ? 2 : 4);
			var hasHiddenPower = false;
			var moves = set.moves;
			for (var i = 0; i < moves.length; ++i) {
				if (!moves[i]) continue;
				if (moves[i].substr(0, 13) === 'Hidden Power ') hasHiddenPower = true;
				var move = Dex.getMove(moves[i]);
				if (Dex.getCategory(move, this.curTeam.gen) === 'Physical' &&
						!move.damage && !move.ohko && move.id !== 'rapidspin' && move.id !== 'foulplay' && move.id !== 'endeavor' && move.id !== 'counter') {
					minAtk = false;
				} else if (move.id === 'metronome' || move.id === 'assist' || move.id === 'copycat' || move.id === 'mefirst') {
					minAtk = false;
				}
				if (minSpe === false && moveName === 'Gyro Ball') {
					minSpe = undefined;
				}
			}

			if (!set.ivs) {
				if (minSpe === undefined && (!minAtk || gen < 3)) return;
				set.ivs = {};
			}
			if (!set.ivs['spe'] && set.ivs['spe'] !== 0) set.ivs['spe'] = 31;
			if (minSpe) {
				// min Spe
				set.ivs['spe'] = (hasHiddenPower ? set.ivs['spe'] % hpModulo : 0);
			} else if (minSpe === false) {
				// max Spe
				set.ivs['spe'] = (hasHiddenPower ? 30 + (set.ivs['spe'] % 2) : 31);
			}
			if (gen < 3) return;
			if (!set.ivs['atk'] && set.ivs['atk'] !== 0) set.ivs['atk'] = 31;
			if (minAtk) {
				// min Atk
				set.ivs['atk'] = (hasHiddenPower ? set.ivs['atk'] % hpModulo : 0);
			} else {
				// max Atk
				set.ivs['atk'] = (hasHiddenPower ? 30 + (set.ivs['atk'] % 2) : 31);
			}
		},
	
		// EV guesser

		guessRole: function () {
			var set = this.curSet;
			if (!set) return '?';
			if (!set.moves) return '?';

			var moveCount = {
				'Physical': 0,
				'Special': 0,
				'PhysicalAttack': 0,
				'SpecialAttack': 0,
				'PhysicalSetup': 0,
				'SpecialSetup': 0,
				'Support': 0,
				'Setup': 0,
				'Restoration': 0,
				'Offense': 0,
				'Stall': 0,
				'SpecialStall': 0,
				'PhysicalStall': 0,
				'Ultrafast': 0
			};
			var hasMove = {};
			var template = Dex.getTemplate(set.species || set.name);
			var stats = this.getBaseStats(template);
			if (!stats) return '?';
			var itemid = toId(set.item);
			var abilityid = toId(set.ability);

			if (set.moves.length < 4 && template.id !== 'unown' && template.id !== 'ditto' && this.curTeam.gen > 2) return '?';

			for (var i = 0, len = set.moves.length; i < len; i++) {
				var move = Dex.getMove(set.moves[i]);
				hasMove[move.id] = 1;
				if (move.category === 'Status') {
					if (move.id === 'batonpass' || move.id === 'healingwish' || move.id === 'lunardance') {
						moveCount['Support']++;
					} else if (move.id === 'metronome' || move.id === 'assist' || move.id === 'copycat' || move.id === 'mefirst') {
						moveCount['Physical'] += 0.5;
						moveCount['Special'] += 0.5;
					} else if (move.id === 'naturepower') {
						moveCount['Special']++;
					} else if (move.id === 'protect' || move.id === 'detect' || move.id === 'spikyshield' || move.id === 'kingsshield') {
						moveCount['Stall']++;
					} else if (move.id === 'wish') {
						moveCount['Restoration']++;
						moveCount['Stall']++;
						moveCount['Support']++;
					} else if (move.heal) {
						moveCount['Restoration']++;
						moveCount['Stall']++;
					} else if (move.target === 'self') {
						if (move.id === 'agility' || move.id === 'rockpolish' || move.id === 'shellsmash' || move.id === 'growth' || move.id === 'workup') {
							moveCount['PhysicalSetup']++;
							moveCount['SpecialSetup']++;
						} else if (move.id === 'dragondance' || move.id === 'swordsdance' || move.id === 'coil' || move.id === 'bulkup' || move.id === 'curse' || move.id === 'bellydrum') {
							moveCount['PhysicalSetup']++;
						} else if (move.id === 'nastyplot' || move.id === 'tailglow' || move.id === 'quiverdance' || move.id === 'calmmind' || move.id === 'geomancy') {
							moveCount['SpecialSetup']++;
						}
						if (move.id === 'substitute') moveCount['Stall']++;
						moveCount['Setup']++;
					} else {
						if (move.id === 'toxic' || move.id === 'leechseed' || move.id === 'willowisp') moveCount['Stall']++;
						moveCount['Support']++;
					}
				} else if (move.id === 'counter' || move.id === 'endeavor' || move.id === 'metalburst' || move.id === 'mirrorcoat' || move.id === 'rapidspin') {
					moveCount['Support']++;
				} else if (move.id === 'nightshade' || move.id === 'seismictoss' || move.id === 'psywave' || move.id === 'superfang' || move.id === 'naturesmadness' || move.id === 'foulplay' || move.id === 'endeavor' || move.id === 'finalgambit') {
					moveCount['Offense']++;
				} else if (move.id === 'fellstinger') {
					moveCount['PhysicalSetup']++;
					moveCount['Setup']++;
				} else {
					moveCount[move.category]++;
					moveCount['Offense']++;
					if (move.id === 'knockoff') moveCount['Support']++;
					if (move.id === 'scald' || move.id === 'voltswitch' || move.id === 'uturn') moveCount[move.category] -= 0.2;
				}
			}
			if (hasMove['batonpass']) moveCount['Support'] += moveCount['Setup'];
			moveCount['PhysicalAttack'] = moveCount['Physical'];
			moveCount['Physical'] += moveCount['PhysicalSetup'];
			moveCount['SpecialAttack'] = moveCount['Special'];
			moveCount['Special'] += moveCount['SpecialSetup'];

			if (hasMove['dragondance'] || hasMove['quiverdance']) moveCount['Ultrafast'] = 1;

			var isFast = (stats.spe > 95);
			var physicalBulk = (stats.hp + 75) * (stats.def + 87);
			var specialBulk = (stats.hp + 75) * (stats.spd + 87);

			if (hasMove['willowisp'] || hasMove['acidarmor'] || hasMove['irondefense'] || hasMove['cottonguard']) {
				physicalBulk *= 1.6;
				moveCount['PhysicalStall']++;
			} else if (hasMove['scald'] || hasMove['bulkup'] || hasMove['coil'] || hasMove['cosmicpower']) {
				physicalBulk *= 1.3;
				if (hasMove['scald']) { // partial stall goes in reverse
					moveCount['SpecialStall']++;
				} else {
					moveCount['PhysicalStall']++;
				}
			}
			if (abilityid === 'flamebody') physicalBulk *= 1.1;

			if (hasMove['calmmind'] || hasMove['quiverdance'] || hasMove['geomancy']) {
				specialBulk *= 1.3;
				moveCount['SpecialStall']++;
			}
			if (template.id === 'tyranitar') specialBulk *= 1.5;

			if (hasMove['bellydrum']) {
				physicalBulk *= 0.6;
				specialBulk *= 0.6;
			}
			if (moveCount['Restoration']) {
				physicalBulk *= 1.5;
				specialBulk *= 1.5;
			} else if (hasMove['painsplit'] && hasMove['substitute']) {
				// SubSplit isn't generally a stall set
				moveCount['Stall']--;
			} else if (hasMove['painsplit'] || hasMove['rest']) {
				physicalBulk *= 1.4;
				specialBulk *= 1.4;
			}
			if ((hasMove['bodyslam'] || hasMove['thunder']) && abilityid === 'serenegrace' || hasMove['thunderwave']) {
				physicalBulk *= 1.1;
				specialBulk *= 1.1;
			}
			if ((hasMove['ironhead'] || hasMove['airslash']) && abilityid === 'serenegrace') {
				physicalBulk *= 1.1;
				specialBulk *= 1.1;
			}
			if (hasMove['gigadrain'] || hasMove['drainpunch'] || hasMove['hornleech']) {
				physicalBulk *= 1.15;
				specialBulk *= 1.15;
			}
			if (itemid === 'leftovers' || itemid === 'blacksludge') {
				physicalBulk *= 1 + 0.1 * (1 + moveCount['Stall'] / 1.5);
				specialBulk *= 1 + 0.1 * (1 + moveCount['Stall'] / 1.5);
			}
			if (hasMove['leechseed']) {
				physicalBulk *= 1 + 0.1 * (1 + moveCount['Stall'] / 1.5);
				specialBulk *= 1 + 0.1 * (1 + moveCount['Stall'] / 1.5);
			}
			if ((itemid === 'flameorb' || itemid === 'toxicorb') && abilityid !== 'magicguard') {
				if (itemid === 'toxicorb' && abilityid === 'poisonheal') {
					physicalBulk *= 1 + 0.1 * (2 + moveCount['Stall']);
					specialBulk *= 1 + 0.1 * (2 + moveCount['Stall']);
				} else {
					physicalBulk *= 0.8;
					specialBulk *= 0.8;
				}
			}
			if (itemid === 'lifeorb') {
				physicalBulk *= 0.7;
				specialBulk *= 0.7;
			}
			if (abilityid === 'multiscale' || abilityid === 'magicguard' || abilityid === 'regenerator') {
				physicalBulk *= 1.4;
				specialBulk *= 1.4;
			}
			if (itemid === 'eviolite') {
				physicalBulk *= 1.5;
				specialBulk *= 1.5;
			}
			if (itemid === 'assaultvest') specialBulk *= 1.5;

			var bulk = physicalBulk + specialBulk;
			if (bulk < 46000 && stats.spe >= 70) isFast = true;
			if (hasMove['trickroom']) isFast = false;
			moveCount['bulk'] = bulk;
			moveCount['physicalBulk'] = physicalBulk;
			moveCount['specialBulk'] = specialBulk;

			if (hasMove['agility'] || hasMove['dragondance'] || hasMove['quiverdance'] || hasMove['rockpolish'] || hasMove['shellsmash'] || hasMove['flamecharge']) {
				isFast = true;
			} else if (abilityid === 'unburden' || abilityid === 'speedboost' || abilityid === 'motordrive') {
				isFast = true;
				moveCount['Ultrafast'] = 1;
			} else if (abilityid === 'chlorophyll' || abilityid === 'swiftswim' || abilityid === 'sandrush') {
				isFast = true;
				moveCount['Ultrafast'] = 2;
			} else if (itemid === 'salacberry') {
				isFast = true;
			}
			if (hasMove['agility'] || hasMove['shellsmash'] || hasMove['autotomize'] || hasMove['shiftgear'] || hasMove['rockpolish']) moveCount['Ultrafast'] = 2;
			moveCount['Fast'] = isFast ? 1 : 0;

			this.moveCount = moveCount;
			this.hasMove = hasMove;

			if (template.id === 'ditto') return abilityid === 'imposter' ? 'Physically Defensive' : 'Fast Bulky Support';
			if (template.id === 'shedinja') return 'Fast Physical Sweeper';

			if (itemid === 'choiceband' && moveCount['PhysicalAttack'] >= 2) {
				if (!isFast) return 'Bulky Band';
				return 'Fast Band';
			} else if (itemid === 'choicespecs' && moveCount['SpecialAttack'] >= 2) {
				if (!isFast) return 'Bulky Specs';
				return 'Fast Specs';
			} else if (itemid === 'choicescarf') {
				if (moveCount['PhysicalAttack'] === 0) return 'Special Scarf';
				if (moveCount['SpecialAttack'] === 0) return 'Physical Scarf';
				if (moveCount['PhysicalAttack'] > moveCount['SpecialAttack']) return 'Physical Biased Mixed Scarf';
				if (moveCount['PhysicalAttack'] < moveCount['SpecialAttack']) return 'Special Biased Mixed Scarf';
				if (stats.atk < stats.spa) return 'Special Biased Mixed Scarf';
				return 'Physical Biased Mixed Scarf';
			}

			if (template.id === 'unown') return 'Fast Special Sweeper';

			if (moveCount['PhysicalStall'] && moveCount['Restoration']) {
				return 'Specially Defensive';
			}
			if (moveCount['SpecialStall'] && moveCount['Restoration'] && itemid !== 'lifeorb') {
				return 'Physically Defensive';
			}

			var offenseBias = '';
			if (stats.spa > stats.atk && moveCount['Special'] > 1) offenseBias = 'Special';
			else if (stats.atk > stats.spa && moveCount['Physical'] > 1) offenseBias = 'Physical';
			else if (moveCount['Special'] > moveCount['Physical']) offenseBias = 'Special';
			else offenseBias = 'Physical';

			if (moveCount['Stall'] + moveCount['Support'] / 2 <= 2 && bulk < 135000 && moveCount[offenseBias] >= 1.5) {
				if (isFast) {
					if (bulk > 80000 && !moveCount['Ultrafast']) return 'Bulky ' + offenseBias + ' Sweeper';
					return 'Fast ' + offenseBias + ' Sweeper';
				} else {
					if (moveCount[offenseBias] >= 3 || moveCount['Stall'] <= 0) {
						return 'Bulky ' + offenseBias + ' Sweeper';
					}
				}
			}

			if (isFast && abilityid !== 'prankster') {
				if (stats.spe > 100 || bulk < 55000 || moveCount['Ultrafast']) {
					return 'Fast Bulky Support';
				}
			}
			if (moveCount['SpecialStall']) return 'Physically Defensive';
			if (moveCount['PhysicalStall']) return 'Specially Defensive';
			if (template.id === 'blissey' || template.id === 'chansey') return 'Physically Defensive';
			if (specialBulk >= physicalBulk) return 'Specially Defensive';
			return 'Physically Defensive';
		},
		ensureMinEVs: function (evs, stat, min, evTotal) {
			if (!evs[stat]) evs[stat] = 0;
			var diff = min - evs[stat];
			if (diff <= 0) return evTotal;
			if (evTotal <= 504) {
				var change = Math.min(508 - evTotal, diff);
				evTotal += change;
				evs[stat] += change;
				diff -= change;
			}
			if (diff <= 0) return evTotal;
			var evPriority = {def: 1, spd: 1, hp: 1, atk: 1, spa: 1, spe: 1};
			for (var i in evPriority) {
				if (i === stat) continue;
				if (evs[i] && evs[i] > 128) {
					evs[i] -= diff;
					evs[stat] += diff;
					return evTotal;
				}
			}
			return evTotal; // can't do it :(
		},
		ensureMaxEVs: function (evs, stat, min, evTotal) {
			if (!evs[stat]) evs[stat] = 0;
			var diff = evs[stat] - min;
			if (diff <= 0) return evTotal;
			evs[stat] -= diff;
			evTotal -= diff;
			return evTotal; // can't do it :(
		},
		guessEVs: function (role) {
			var set = this.curSet;
			if (!set) return {};
			var template = Dex.getTemplate(set.species || set.name);
			var stats = this.getBaseStats(template);

			var hasMove = this.hasMove;
			var moveCount = this.moveCount;

			var evs = {};
			var plusStat = '';
			var minusStat = '';

			var statChart = {
				'Bulky Band': ['atk', 'hp'],
				'Fast Band': ['spe', 'atk'],
				'Bulky Specs': ['spa', 'hp'],
				'Fast Specs': ['spe', 'spa'],
				'Physical Scarf': ['spe', 'atk'],
				'Special Scarf': ['spe', 'spa'],
				'Physical Biased Mixed Scarf': ['spe', 'atk'],
				'Special Biased Mixed Scarf': ['spe', 'spa'],
				'Fast Physical Sweeper': ['spe', 'atk'],
				'Fast Special Sweeper': ['spe', 'spa'],
				'Bulky Physical Sweeper': ['atk', 'hp'],
				'Bulky Special Sweeper': ['spa', 'hp'],
				'Fast Bulky Support': ['spe', 'hp'],
				'Physically Defensive': ['def', 'hp'],
				'Specially Defensive': ['spd', 'hp']
			};

			plusStat = statChart[role][0];
			if (role === 'Fast Bulky Support') moveCount['Ultrafast'] = 0;
			if (plusStat === 'spe' && (moveCount['Ultrafast'] || evs['spe'] < 252)) {
				if (statChart[role][1] === 'atk' || statChart[role][1] == 'spa') {
					plusStat = statChart[role][1];
				} else if (moveCount['Physical'] >= 3) {
					plusStat = 'atk';
				} else if (stats.spd > stats.def) {
					plusStat = 'spd';
				} else {
					plusStat = 'def';
				}
			}

			var supportsEVs = !this.curTeam.format.startsWith('gen7letsgo');
			var supportsAVs = !supportsEVs && this.curTeam.format.endsWith('norestrictions');

			if (supportsAVs) {
				evs = {hp:200, atk:200, def:200, spa:200, spd:200, spe:200};
				if (!moveCount['PhysicalAttack']) evs.atk = 0;
				if (!moveCount['SpecialAttack']) evs.spa = 0;
				if (hasMove['gyroball'] || hasMove['trickroom']) evs.spe = 0;
			} else if (!supportsEVs) {
				evs = {};
			} else if (this.curTeam && this.ignoreEVLimits) {
				evs = {hp:252, atk:252, def:252, spa:252, spd:252, spe:252};
				if (!moveCount['PhysicalAttack']) evs.atk = 0;
				if (!moveCount['SpecialAttack'] && this.curTeam.gen > 1) evs.spa = 0;
				if (hasMove['gyroball'] || hasMove['trickroom']) evs.spe = 0;
				if (this.curTeam.gen === 1) evs.spd = 0;
				if (this.curTeam.gen < 3) return evs;
			} else {
				if (!statChart[role]) return {};

				var evTotal = 0;

				var i = statChart[role][0];
				var stat = this.getStat(i, null, 252, plusStat === i ? 1.1 : 1.0);
				var ev = 252;
				while (ev > 0 && stat <= this.getStat(i, null, ev - 4, plusStat === i ? 1.1 : 1.0)) ev -= 4;
				evs[i] = ev;
				evTotal += ev;

				var i = statChart[role][1];
				if (i === 'hp' && set.level && set.level < 20) i = 'spd';
				var stat = this.getStat(i, null, 252, plusStat === i ? 1.1 : 1.0);
				var ev = 252;
				while (ev > 0 && stat <= this.getStat(i, null, ev - 4, plusStat === i ? 1.1 : 1.0)) ev -= 4;
				evs[i] = ev;
				evTotal += ev;

				var SRweaknesses = ['Fire', 'Flying', 'Bug', 'Ice'];
				var SRresistances = ['Ground', 'Steel', 'Fighting'];
				var SRweak = 0;
				if (set.ability !== 'Magic Guard' && set.ability !== 'Mountaineer') {
					if (SRweaknesses.indexOf(template.types[0]) >= 0) {
						SRweak++;
					} else if (SRresistances.indexOf(template.types[0]) >= 0) {
						SRweak--;
					}
					if (SRweaknesses.indexOf(template.types[1]) >= 0) {
						SRweak++;
					} else if (SRresistances.indexOf(template.types[1]) >= 0) {
						SRweak--;
					}
				}
				var hpDivisibility = 0;
				var hpShouldBeDivisible = false;
				var hp = evs['hp'] || 0;
				stat = this.getStat('hp', null, hp, 1);
				if ((set.item === 'Leftovers' || set.item === 'Black Sludge') && hasMove['substitute'] && stat !== 404) {
					hpDivisibility = 4;
				} else if (set.item === 'Leftovers' || set.item === 'Black Sludge') {
					hpDivisibility = 0;
				} else if (hasMove['bellydrum'] && (set.item || '').slice(-5) === 'Berry') {
					hpDivisibility = 2;
					hpShouldBeDivisible = true;
				} else if (hasMove['substitute'] && (set.item || '').slice(-5) === 'Berry') {
					hpDivisibility = 4;
					hpShouldBeDivisible = true;
				} else if (SRweak >= 2 || hasMove['bellydrum']) {
					hpDivisibility = 2;
				} else if (SRweak >= 1 || hasMove['substitute'] || hasMove['transform']) {
					hpDivisibility = 4;
				} else if (set.ability !== 'Magic Guard') {
					hpDivisibility = 8;
				}

				if (hpDivisibility) {
					while (hp < 252 && evTotal < 508 && !(stat % hpDivisibility) !== hpShouldBeDivisible) {
						hp += 4;
						stat = this.getStat('hp', null, hp, 1);
						evTotal += 4;
					}
					while (hp > 0 && !(stat % hpDivisibility) !== hpShouldBeDivisible) {
						hp -= 4;
						stat = this.getStat('hp', null, hp, 1);
						evTotal -= 4;
					}
					while (hp > 0 && stat === this.getStat('hp', null, hp - 4, 1)) {
						hp -= 4;
						evTotal -= 4;
					}
					if (hp || evs['hp']) evs['hp'] = hp;
				}

				if (template.id === 'tentacruel') evTotal = this.ensureMinEVs(evs, 'spe', 16, evTotal);
				if (template.id === 'skarmory') evTotal = this.ensureMinEVs(evs, 'spe', 24, evTotal);
				if (template.id === 'jirachi') evTotal = this.ensureMinEVs(evs, 'spe', 32, evTotal);
				if (template.id === 'celebi') evTotal = this.ensureMinEVs(evs, 'spe', 36, evTotal);
				if (template.id === 'volcarona') evTotal = this.ensureMinEVs(evs, 'spe', 52, evTotal);
				if (template.id === 'gliscor') evTotal = this.ensureMinEVs(evs, 'spe', 72, evTotal);
				if (template.id === 'dragonite' && evs['hp']) evTotal = this.ensureMaxEVs(evs, 'spe', 220, evTotal);
				if (evTotal < 508) {
					var remaining = 508 - evTotal;
					if (remaining > 252) remaining = 252;
					i = null;
					if (!evs['atk'] && moveCount['PhysicalAttack'] >= 1) {
						i = 'atk';
					} else if (!evs['spa'] && moveCount['SpecialAttack'] >= 1) {
						i = 'spa';
					} else if (stats.hp == 1 && !evs['def']) {
						i = 'def';
					} else if (stats.def === stats.spd && !evs['spd']) {
						i = 'spd';
					} else if (!evs['spd']) {
						i = 'spd';
					} else if (!evs['def']) {
						i = 'def';
					}
					if (i) {
						ev = remaining;
						stat = this.getStat(i, null, ev);
						while (ev > 0 && stat === this.getStat(i, null, ev - 4)) ev -= 4;
						if (ev) evs[i] = ev;
						remaining -= ev;
					}
					if (remaining && !evs['spe']) {
						ev = remaining;
						stat = this.getStat('spe', null, ev);
						while (ev > 0 && stat === this.getStat('spe', null, ev - 4)) ev -= 4;
						if (ev) evs['spe'] = ev;
					}
				}

			}

			if (hasMove['gyroball'] || hasMove['trickroom']) {
				minusStat = 'spe';
			} else if (!moveCount['PhysicalAttack']) {
				minusStat = 'atk';
			} else if (moveCount['SpecialAttack'] < 1 && !evs['spa']) {
				if (moveCount['SpecialAttack'] < moveCount['PhysicalAttack']) {
					minusStat = 'spa';
				} else if (!evs['atk']) {
					minusStat = 'atk';
				}
			} else if (moveCount['PhysicalAttack'] < 1 && !evs['atk']) {
				minusStat = 'atk';
			} else if (stats.def > stats.spe && stats.spd > stats.spe && !evs['spe']) {
				minusStat = 'spe';
			} else if (stats.def > stats.spd) {
				minusStat = 'spd';
			} else {
				minusStat = 'def';
			}

			if (plusStat === minusStat) {
				minusStat = (plusStat === 'spe' ? 'spd' : 'spe');
			}

			evs.plusStat = plusStat;
			evs.minusStat = minusStat;

			return evs;
		},

		// Stat calculator

		getStat: function (stat, set, evOverride, natureOverride) {
			var supportsEVs = !this.curTeam.format.startsWith('gen7letsgo');
			var supportsAVs = !supportsEVs;
			if (!set) set = this.curSet;
			if (!set) return 0;

			if (!set.ivs) set.ivs = {
				hp: 31,
				atk: 31,
				def: 31,
				spa: 31,
				spd: 31,
				spe: 31
			};
			if (!set.evs) set.evs = {};

			// do this after setting set.evs because it's assumed to exist
			// after getStat is run
			var template = Dex.getTemplate(set.species);
			if (!template.exists) return 0;

			if (!set.level) set.level = 100;
			if (typeof set.ivs[stat] === 'undefined') set.ivs[stat] = 31;

			var baseStat = (this.getBaseStats(template))[stat];
			var iv = (set.ivs[stat] || 0);
			if (this.curTeam.gen <= 2) iv &= 30;
			var ev = set.evs[stat];
			if (evOverride !== undefined) ev = evOverride;
			if (ev === undefined) ev = (this.curTeam.gen > 2 ? 0 : 252);

			if (stat === 'hp') {
				if (baseStat === 1) return 1;
				if (!supportsEVs) return Math.floor(Math.floor(2 * baseStat + iv + 100) * set.level / 100 + 10) + (supportsAVs ? ev : 0);
				return Math.floor(Math.floor(2 * baseStat + iv + Math.floor(ev / 4) + 100) * set.level / 100 + 10);
			}
			var val = Math.floor(Math.floor(2 * baseStat + iv + Math.floor(ev / 4)) * set.level / 100 + 5);
			if (!supportsEVs) {
				val = Math.floor(Math.floor(2 * baseStat + iv) * set.level / 100 + 5);
			}
			if (natureOverride) {
				val *= natureOverride;
			} else if (BattleNatures[set.nature] && BattleNatures[set.nature].plus === stat) {
				val *= 1.1;
			} else if (BattleNatures[set.nature] && BattleNatures[set.nature].minus === stat) {
				val *= 0.9;
			}
			if (!supportsEVs) {
				var friendshipValue = Math.floor((70 / 255 / 10 + 1) * 100);
				val = Math.floor(val) * friendshipValue / 100 + (supportsAVs ? ev : 0);
			}
			return Math.floor(val);
		},

		// initialization

		getGen: function (format) {
			format = '' + format;
			if (!format) return 7;
			if (format.substr(0, 3) !== 'gen') return 6;
			return parseInt(format.substr(3, 1), 10) || 6;
		}
	});
})(window, jQuery);
