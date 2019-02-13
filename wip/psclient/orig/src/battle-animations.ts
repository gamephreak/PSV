/**
 * Pokemon Showdown Battle Animations
 *
 * There are the specific resource files and scripts for misc animations
 *
 * Licensing note: PS's client has complicated licensing:
 * - The client as a whole is AGPLv3
 * - The battle replay/animation engine (battle-*.ts) by itself is MIT
 *
 * @author Guangcong Luo <guangcongluo@gmail.com>
 * @license MIT
 */

/*

Most of this file is: CC0 (public domain)
  <http://creativecommons.org/publicdomain/zero/1.0/>

This license DOES extend to all images in the fx/ folder, with the exception of icicle.png, lightning.png, and bone.png.

icicle.png and lightning.png by Clint Bellanger are triple-licensed GPLv2/GPLv3/CC-BY-SA-3.0.
  <http://opengameart.org/content/icicle-spell>
  <http://opengameart.org/content/lightning-shock-spell>

rocks.png, rock1.png, rock2.png by PO user "Gilad" is licensed GPLv3.

This license DOES NOT extend to any images in the sprites/ folder.

This license DOES NOT extend to any other files in this repository.

*/

class BattleScene {
	battle: Battle;
	animating = true;
	acceleration = 1;

	/** Note: Not the actual generation of the battle, but the gen of the sprites/background */
	gen = 7;
	/** 1 = singles, 2 = doubles, 3 = triples */
	activeCount = 1;

	numericId = 0;
	$frame: JQuery;
	$battle: JQuery = null!;
	$options: JQuery = null!;
	log: BattleLog;
	$terrain: JQuery = null!;
	$weather: JQuery = null!;
	$bgEffect: JQuery = null!;
	$bg: JQuery = null!;
	$sprite: JQuery = null!;
	$sprites: [JQuery, JQuery] = [null!, null!];
	$spritesFront: [JQuery, JQuery] = [null!, null!];
	$stat: JQuery = null!;
	$fx: JQuery = null!;
	$leftbar: JQuery = null!;
	$rightbar: JQuery = null!;
	$turn: JQuery = null!;
	$messagebar: JQuery = null!;
	$delay: JQuery = null!;
	$hiddenMessage: JQuery = null!;

	sideConditions: [{[id: string]: Sprite[]}, {[id: string]: Sprite[]}] = [{}, {}];

	preloadDone = 0;
	preloadNeeded = 0;
	bgm: string | null = null;
	backdropImage: string = '';
	bgmNum = 0;
	preloadCache: {[url: string]: HTMLImageElement} = {};

	messagebarOpen = false;
	interruptionCount = 1;
	curWeather = '';
	curTerrain = '';

	// Animation state
	////////////////////////////////////

	timeOffset = 0;
	pokemonTimeOffset = 0;
	minDelay = 0;
	/** jQuery objects that need to finish animating */
	activeAnimations = $();

	constructor(battle: Battle, $frame: JQuery, $logFrame: JQuery) {
		this.battle = battle;
		$frame.addClass('battle');
		this.$frame = $frame;
		this.log = new BattleLog($logFrame[0] as HTMLDivElement, this);
		this.log.battleParser!.pokemonName = (pokemonId: string) => {
			if (!pokemonId) return '';
			if (battle.ignoreNicks || battle.ignoreOpponent) {
				const pokemon = battle.getPokemon(pokemonId);
				if (pokemon) return pokemon.species;
			}
			if (!pokemonId.startsWith('p1') && !pokemonId.startsWith('p2')) return '???pokemon:' + pokemonId + '???';
			if (pokemonId.charAt(3) === ':') return pokemonId.slice(4).trim();
			else if (pokemonId.charAt(2) === ':') return pokemonId.slice(3).trim();
			return '???pokemon:' + pokemonId + '???';
		};

		let numericId = 0;
		if (battle.id) {
			numericId = parseInt(battle.id.slice(battle.id.lastIndexOf('-') + 1), 10);
		}
		if (!numericId) {
			numericId = Math.floor(Math.random() * 1000000);
		}
		this.numericId = numericId;

		this.preloadEffects();
		// reset() is called during battle initialization, so it doesn't need to be called here
	}

	reset() {
		this.updateGen();

		// Log frame
		/////////////

		if (this.$options) {
			this.log.reset();
		} else {
			this.$options = $('<div class="battle-options"></div>');
			$(this.log.elem).prepend(this.$options);
		}

		// Battle frame
		///////////////

		this.$frame.empty();
		this.$battle = $('<div class="innerbattle"></div>');
		this.$frame.append(this.$battle);

		this.$bg = $('<div class="backdrop" style="background-image:url(' + Dex.resourcePrefix + this.backdropImage + ');display:block;opacity:0.8"></div>');
		this.$terrain = $('<div class="weather"></div>');
		this.$weather = $('<div class="weather"></div>');
		this.$bgEffect = $('<div></div>');
		this.$sprite = $('<div></div>');

		this.$sprites = [$('<div></div>'), $('<div></div>')];
		this.$spritesFront = [$('<div></div>'), $('<div></div>')];

		this.$sprite.append(this.$sprites[1]);
		this.$sprite.append(this.$spritesFront[1]);
		this.$sprite.append(this.$spritesFront[0]);
		this.$sprite.append(this.$sprites[0]);

		this.$stat = $('<div role="complementary" aria-label="Active Pokemon"></div>');
		this.$fx = $('<div></div>');
		this.$leftbar = $('<div class="leftbar" role="complementary" aria-label="Your Team"></div>');
		this.$rightbar = $('<div class="rightbar" role="complementary" aria-label="Opponent\'s Team"></div>');
		this.$turn = $('<div></div>');
		this.$messagebar = $('<div class="messagebar message"></div>');
		this.$delay = $('<div></div>');
		this.$hiddenMessage = $('<div class="message" style="position:absolute;display:block;visibility:hidden"></div>');

		this.$battle.append(this.$bg);
		this.$battle.append(this.$terrain);
		this.$battle.append(this.$weather);
		this.$battle.append(this.$bgEffect);
		this.$battle.append(this.$sprite);
		this.$battle.append(this.$stat);
		this.$battle.append(this.$fx);
		this.$battle.append(this.$leftbar);
		this.$battle.append(this.$rightbar);
		this.$battle.append(this.$turn);
		this.$battle.append(this.$messagebar);
		this.$battle.append(this.$delay);
		this.$battle.append(this.$hiddenMessage);

		if (!this.animating) {
			this.$battle.append('<div class="seeking"><strong>seeking...</strong></div>');
		}

		this.messagebarOpen = false;
		this.timeOffset = 0;
		this.pokemonTimeOffset = 0;
		this.curTerrain = '';
		this.curWeather = '';

		this.log.battleParser!.perspective = this.battle.sidesSwitched ? 1 : 0;
	}

	

	// Sprite handling
	/////////////////////////////////////////////////////////////////////

	addSprite(sprite: PokemonSprite) {
		if (sprite.$el) this.$sprites[sprite.siden].append(sprite.$el);
	}
	showEffect(effect: string | SpriteData, start: ScenePos, end: ScenePos, transition: string, after?: string) {
		if (typeof effect === 'string') effect = BattleEffects[effect] as SpriteData;
		if (!start.time) start.time = 0;
		if (!end.time) end.time = start.time + 500;
		start.time += this.timeOffset;
		end.time += this.timeOffset;
		if (!end.scale && end.scale !== 0 && start.scale) end.scale = start.scale;
		if (!end.xscale && end.xscale !== 0 && start.xscale) end.xscale = start.xscale;
		if (!end.yscale && end.yscale !== 0 && start.yscale) end.yscale = start.yscale;
		end = {...start, ...end};

		let startpos = this.pos(start, effect);
		let endpos = this.posT(end, effect, transition, start);

		let $effect = $('<img src="' + effect.url + '" style="display:block;position:absolute" />');
		this.$fx.append($effect);
		$effect = this.$fx.children().last();

		if (start.time) {
			$effect.css({...startpos, opacity: 0});
			$effect.delay(start.time).animate({
				opacity: startpos.opacity,
			}, 1);
		} else {
			$effect.css(startpos);
		}
		$effect.animate(endpos, end.time! - start.time);
		if (after === 'fade') {
			$effect.animate({
				opacity: 0,
			}, 100);
		}
		if (after === 'explode') {
			if (end.scale) end.scale *= 3;
			if (end.xscale) end.xscale *= 3;
			if (end.yscale) end.yscale *= 3;
			end.opacity = 0;
			let endendpos = this.pos(end, effect);
			$effect.animate(endendpos, 200);
		}
		this.waitFor($effect);
	}
	backgroundEffect(bg: string, duration: number, opacity = 1, delay = 0) {
		let $effect = $('<div class="background"></div>');
		$effect.css({
			background: bg,
			display: 'block',
			opacity: 0,
		});
		this.$bgEffect.append($effect);
		$effect.delay(delay).animate({
			opacity,
		}, 250).delay(duration - 250);
		$effect.animate({
			opacity: 0,
		}, 250);
	}

	/**
	 * Converts a PS location (x, y, z, scale, xscale, yscale, opacity)
	 * to a jQuery position (top, left, width, height, opacity) suitable
	 * for passing into `jQuery#css` or `jQuery#animate`.
	 * The display property is passed through if it exists.
	 */
	pos(loc: ScenePos, obj: SpriteData) {
		loc = {
			x: 0,
			y: 0,
			z: 0,
			scale: 1,
			opacity: 1,
			...loc,
		};
		if (!loc.xscale && loc.xscale !== 0) loc.xscale = loc.scale;
		if (!loc.yscale && loc.yscale !== 0) loc.yscale = loc.scale;

		let left = 210;
		let top = 245;
		let scale = 1.5 - 0.5 * ((loc.z!) / 200);
		if (scale < .1) scale = .1;

		left += (410 - 190) * ((loc.z!) / 200);
		top += (135 - 245) * ((loc.z!) / 200);
		left += Math.floor(loc.x! * scale);
		top -= Math.floor(loc.y! * scale /* - loc.x * scale / 4 */);
		let width = Math.floor(obj.w * scale * loc.xscale!);
		let height = Math.floor(obj.h * scale * loc.yscale!);
		let hoffset = Math.floor((obj.h - (obj.y || 0) * 2) * scale * loc.yscale!);
		left -= Math.floor(width / 2);
		top -= Math.floor(hoffset / 2);

		let pos: JQuery.PlainObject = {
			left,
			top,
			width,
			height,
			opacity: loc.opacity,
		};
		if (loc.display) pos.display = loc.display;
		return pos;
	}

	// Messagebar and log
	/////////////////////////////////////////////////////////////////////

	preemptCatchup() {
		this.log.preemptCatchup();
	}
	message(message: string) {
		if (!this.messagebarOpen) {
			this.log.addSpacer();
			if (this.animating) {
				this.$messagebar.empty();
				this.$messagebar.css({
					display: 'block',
					opacity: 0,
					height: 'auto',
				});
				this.$messagebar.animate({
					opacity: 1,
				}, this.battle.messageFadeTime / this.acceleration);
			}
		}
		if (this.battle.hardcoreMode && message.slice(0, 8) === '<small>(') {
			message = '';
		}
		if (message && this.animating) {
			this.$hiddenMessage.append('<p></p>');
			let $message = this.$hiddenMessage.children().last();
			$message.html(message);
			$message.css({
				display: 'block',
				opacity: 0,
			});
			$message.animate({
				height: 'hide',
			}, 1, () => {
				$message.appendTo(this.$messagebar);
				$message.animate({
					height: 'show',
					'padding-bottom': 4,
					opacity: 1,
				}, this.battle.messageFadeTime / this.acceleration);
			});
			this.waitFor($message);
		}
		this.messagebarOpen = true;
	}
	maybeCloseMessagebar(args: Args, kwArgs: KWArgs) {
		if (this.log.battleParser!.sectionBreak(args, kwArgs)) {
			if (!this.messagebarOpen) return false;
			this.closeMessagebar();
			return true;
		}
		return false;
	}
	closeMessagebar() {
		if (this.messagebarOpen) {
			this.messagebarOpen = false;
			if (this.animating) {
				this.$messagebar.delay(this.battle.messageShownTime / this.acceleration).animate({
					opacity: 0,
				}, this.battle.messageFadeTime / this.acceleration);
				this.waitFor(this.$messagebar);
			}
			return true;
		}
		return false;
	}

	// General updating
	/////////////////////////////////////////////////////////////////////

	updateGen() {
		let gen = this.battle.gen;
		if (Dex.prefs('nopastgens')) gen = 6;
		if (Dex.prefs('bwgfx') && gen > 5) gen = 5;
		this.gen = gen;
		this.activeCount = this.battle.mySide && this.battle.mySide.active.length || 1;

		if (gen <= 1) this.backdropImage = 'fx/bg-gen1.png?';
		else if (gen <= 2) this.backdropImage = 'fx/bg-gen2.png?';
		else if (gen <= 3) this.backdropImage = 'fx/' + BattleBackdropsThree[this.numericId % BattleBackdropsThree.length] + '?';
		else if (gen <= 4) this.backdropImage = 'fx/' + BattleBackdropsFour[this.numericId % BattleBackdropsFour.length];
		else if (gen <= 5) this.backdropImage = 'fx/' + BattleBackdropsFive[this.numericId % BattleBackdropsFive.length];
		else this.backdropImage = 'sprites/gen6bgs/' + BattleBackdrops[this.numericId % BattleBackdrops.length];

		if (this.$bg) {
			this.$bg.css('background-image', 'url(' + Dex.resourcePrefix + '' + this.backdropImage + ')');
		}
	}

	getDetailsText(pokemon: Pokemon) {
		let name = pokemon.side && pokemon.side.n && (this.battle.ignoreOpponent || this.battle.ignoreNicks) ? pokemon.species : pokemon.name;
		if (name !== pokemon.species) {
				name += ' (' + pokemon.species + ')';
		}
		if (pokemon === pokemon.side.active[0]) {
			name += ' (active)';
		} else if (pokemon.fainted) {
			name += ' (fainted)';
		} else {
			let statustext = '';
			if (pokemon.hp !== pokemon.maxhp) {
				statustext += pokemon.hpDisplay();
			}
			if (pokemon.status) {
				if (statustext) statustext += '|';
				statustext += pokemon.status;
			}
			if (statustext) {
				name += ' (' + statustext + ')';
			}
		}
		return BattleLog.escapeHTML(name);
	}

	updateSidebar(side: Side) {
		if (!this.animating) return;
		let pokemonhtml = '';
		let noShow = this.battle.hardcoreMode && this.battle.gen < 7;
		let pokemonCount = Math.max(side.pokemon.length, 6);
		for (let i = 0; i < pokemonCount; i++) {
			let poke = side.pokemon[i];
			if (i >= side.totalPokemon && i >= side.pokemon.length) {
				pokemonhtml += '<span class="picon" style="' + Dex.getPokemonIcon('pokeball-none') + '"></span>';
			} else if (noShow && poke && poke.fainted) {
				pokemonhtml += '<span class="picon" style="' + Dex.getPokemonIcon('pokeball-fainted') + '" title="Fainted" aria-label="Fainted"></span>';
			} else if (noShow && poke && poke.status) {
				pokemonhtml += '<span class="picon" style="' + Dex.getPokemonIcon('pokeball-statused') + '" title="Status" aria-label="Status"></span>';
			} else if (noShow) {
				pokemonhtml += '<span class="picon" style="' + Dex.getPokemonIcon('pokeball') + '" title="Non-statused" aria-label="Non-statused"></span>';
			} else if (!poke) {
				pokemonhtml += '<span class="picon" style="' + Dex.getPokemonIcon('pokeball') + '" title="Not revealed" aria-label="Not revealed"></span>';
			} else if (!poke.ident && this.battle.teamPreviewCount && this.battle.teamPreviewCount < side.pokemon.length) {
				const details = this.getDetailsText(poke);
				pokemonhtml += '<span class="picon" style="' + Dex.getPokemonIcon(poke, !side.n) + ';opacity:0.6" title="' + details + '" aria-label="' + details + '"></span>';
			} else {
				const details = this.getDetailsText(poke);
				pokemonhtml += '<span class="picon" style="' + Dex.getPokemonIcon(poke, !side.n) + '" title="' + details + '" aria-label="' + details + '"></span>';
			}
			if (i % 3 === 2) pokemonhtml += '</div><div class="teamicons">';
		}
		pokemonhtml = '<div class="teamicons">' + pokemonhtml + '</div>';
		const $sidebar = (side.n ? this.$rightbar : this.$leftbar);
		if (side.name) {
			$sidebar.html('<div class="trainer"><strong>' + BattleLog.escapeHTML(side.name) + '</strong><div class="trainersprite" style="background-image:url(' + Dex.resolveAvatar(side.spriteid) + ')"></div>' + pokemonhtml + '</div>');
			$sidebar.find('.trainer').css('opacity', 1);
		} else {
			$sidebar.find('.trainer').css('opacity', 0.4);
		}
	}
	updateSidebars() {
		for (const side of this.battle.sides) this.updateSidebar(side);
	}
	updateStatbars() {
		for (const side of this.battle.sides) {
			for (const active of side.active) {
				if (active) active.sprite.updateStatbar(active);
			}
		}
	}

	pseudoWeatherLeft(pWeather: WeatherState) {
		let buf = '<br />' + Dex.getMove(pWeather[0]).name;
		if (!pWeather[1] && pWeather[2]) {
			pWeather[1] = pWeather[2];
			pWeather[2] = 0;
		}
		if (this.battle.gen < 7 && this.battle.hardcoreMode) return buf;
		if (pWeather[2]) {
			return buf + ' <small>(' + pWeather[1] + ' or ' + pWeather[2] + ' turns)</small>';
		}
		if (pWeather[1]) {
			return buf + ' <small>(' + pWeather[1] + ' turn' + (pWeather[1] === 1 ? '' : 's') + ')</small>';
		}
		return buf; // weather not found
	}
	sideConditionLeft(cond: [string, number, number, number], siden: number) {
		if (!cond[2] && !cond[3]) return '';
		let buf = '<br />' + (siden ? "Foe's " : "") + Dex.getMove(cond[0]).name;
		if (!cond[2] && cond[3]) {
			cond[2] = cond[3];
			cond[3] = 0;
		}
		if (this.battle.gen < 7 && this.battle.hardcoreMode) return buf;
		if (!cond[3]) {
			return buf + ' <small>(' + cond[2] + ' turn' + (cond[2] === 1 ? '' : 's') + ')</small>';
		}
		return buf + ' <small>(' + cond[2] + ' or ' + cond[3] + ' turns)</small>';
	}
	weatherLeft() {
		if (this.battle.gen < 7 && this.battle.hardcoreMode) return '';
		if (this.battle.weatherMinTimeLeft !== 0) {
			return ' <small>(' + this.battle.weatherMinTimeLeft + ' or ' + this.battle.weatherTimeLeft + ' turns)</small>';
		}
		if (this.battle.weatherTimeLeft !== 0) {
			return ' <small>(' + this.battle.weatherTimeLeft + ' turn' + (this.battle.weatherTimeLeft === 1 ? '' : 's') + ')</small>';
		}
		return '';
	}
	upkeepWeather() {
		const isIntense = (this.curWeather === 'desolateland' || this.curWeather === 'primordialsea' || this.curWeather === 'deltastream');
		this.$weather.animate({
			opacity: 1.0,
		}, 300).animate({
			opacity: isIntense ? 0.9 : 0.5,
		}, 300);
	}
	updateWeather(instant?: boolean) {
		if (!this.animating) return;
		let isIntense = false;
		const weatherNameTable: {[id: string]: string} = {
			sunnyday: 'Sun',
			desolateland: 'Intense Sun',
			raindance: 'Rain',
			primordialsea: 'Heavy Rain',
			sandstorm: 'Sandstorm',
			hail: 'Hail',
			deltastream: 'Strong Winds',
		};
		let weather = this.battle.weather;
		let terrain = '' as ID;
		for (const pseudoWeatherData of this.battle.pseudoWeather) {
			let pwid = toId(pseudoWeatherData[0]);
			switch (pwid) {
			case 'electricterrain':
			case 'grassyterrain':
			case 'mistyterrain':
			case 'psychicterrain':
				terrain = pwid;
				break;
			default:
				if (!terrain) terrain = 'pseudo' as ID;
				break;
			}
		}
		if (weather === 'desolateland' || weather === 'primordialsea' || weather === 'deltastream') {
			isIntense = true;
		}

		let weatherhtml = '';
		if (weather && weather in weatherNameTable) {
			weatherhtml += '<br />' + weatherNameTable[weather] + this.weatherLeft();
		}
		for (const pseudoWeather of this.battle.pseudoWeather) {
			weatherhtml += this.pseudoWeatherLeft(pseudoWeather);
		}
		for (const side of this.battle.sides) {
			for (const id in side.sideConditions) {
				weatherhtml += this.sideConditionLeft(side.sideConditions[id], side.n);
			}
		}

		if (instant) {
			this.$weather.html('<em>' + weatherhtml + '</em>');
			if (this.curWeather === weather && this.curTerrain === terrain) return;
			this.$terrain.attr('class', terrain ? 'weather ' + terrain + 'weather' : 'weather');
			this.curTerrain = terrain;
			this.$weather.attr('class', weather ? 'weather ' + weather + 'weather' : 'weather');
			this.$weather.css('opacity', isIntense || !weather ? 0.9 : 0.5);
			this.curWeather = weather;
			return;
		}

		if (weather !== this.curWeather) {
			this.$weather.animate({
				opacity: 0,
			}, this.curWeather ? 300 : 100, () => {
				this.$weather.html('<em>' + weatherhtml + '</em>');
				this.$weather.attr('class', weather ? 'weather ' + weather + 'weather' : 'weather');
				this.$weather.animate({opacity: isIntense || !weather ? 0.9 : 0.5}, 300);
			});
			this.curWeather = weather;
		} else {
			this.$weather.html('<em>' + weatherhtml + '</em>');
		}

		if (terrain !== this.curTerrain) {
			this.$terrain.animate({
				top: 360,
				opacity: 0,
			}, this.curTerrain ? 400 : 1, () => {
				this.$terrain.attr('class', terrain ? 'weather ' + terrain + 'weather' : 'weather');
				this.$terrain.animate({top: 0, opacity: 1}, 400);
			});
			this.curTerrain = terrain;
		}
	}

	addSideCondition(siden: number, id: ID, instant?: boolean) {
		if (!this.animating) return;
		const side = this.battle.sides[siden];
		switch (id) {
		case 'auroraveil':
			const auroraveil = new Sprite(BattleEffects.auroraveil, {
				display: 'block',
				x: side.x,
				y: side.y,
				z: side.behind(-14),
				xscale: 1,
				yscale: 0,
				opacity: 0.1,
			}, this);
			this.$spritesFront[siden].append(auroraveil.$el!);
			this.sideConditions[siden][id] = [auroraveil];
			auroraveil.anim({
				opacity: 0.7,
				time: instant ? 0 : 400,
			}).anim({
				opacity: 0.3,
				time: instant ? 0 : 300,
			});
			break;
		case 'reflect':
			const reflect = new Sprite(BattleEffects.reflect, {
				display: 'block',
				x: side.x,
				y: side.y,
				z: side.behind(-17),
				xscale: 1,
				yscale: 0,
				opacity: 0.1,
			}, this);
			this.$spritesFront[siden].append(reflect.$el!);
			this.sideConditions[siden][id] = [reflect];
			reflect.anim({
				opacity: 0.7,
				time: instant ? 0 : 400,
			}).anim({
				opacity: 0.3,
				time: instant ? 0 : 300,
			});
			break;
		case 'safeguard':
			const safeguard = new Sprite(BattleEffects.safeguard, {
				display: 'block',
				x: side.x,
				y: side.y,
				z: side.behind(-20),
				xscale: 1,
				yscale: 0,
				opacity: 0.1,
			}, this);
			this.$spritesFront[siden].append(safeguard.$el!);
			this.sideConditions[siden][id] = [safeguard];
			safeguard.anim({
				opacity: 0.7,
				time: instant ? 0 : 400,
			}).anim({
				opacity: 0.3,
				time: instant ? 0 : 300,
			});
			break;
		case 'lightscreen':
			const lightscreen = new Sprite(BattleEffects.lightscreen, {
				display: 'block',
				x: side.x,
				y: side.y,
				z: side.behind(-23),
				xscale: 1,
				yscale: 0,
				opacity: 0.1,
			}, this);
			this.$spritesFront[siden].append(lightscreen.$el!);
			this.sideConditions[siden][id] = [lightscreen];
			lightscreen.anim({
				opacity: 0.7,
				time: instant ? 0 : 400,
			}).anim({
				opacity: 0.3,
				time: instant ? 0 : 300,
			});
			break;
		case 'mist':
			const mist = new Sprite(BattleEffects.mist, {
				display: 'block',
				x: side.x,
				y: side.y,
				z: side.behind(-27),
				xscale: 1,
				yscale: 0,
				opacity: 0.1,
			}, this);
			this.$spritesFront[siden].append(mist.$el!);
			this.sideConditions[siden][id] = [mist];
			mist.anim({
				opacity: 0.7,
				time: instant ? 0 : 400,
			}).anim({
				opacity: 0.3,
				time: instant ? 0 : 300,
			});
			break;
		case 'stealthrock':
			const rock1 = new Sprite(BattleEffects.rock1, {
				display: 'block',
				x: side.leftof(-40),
				y: side.y - 10,
				z: side.z,
				opacity: 0.5,
				scale: 0.2,
			}, this);

			const rock2 = new Sprite(BattleEffects.rock2, {
				display: 'block',
				x: side.leftof(-20),
				y: side.y - 40,
				z: side.z,
				opacity: 0.5,
				scale: 0.2,
			}, this);

			const rock3 = new Sprite(BattleEffects.rock1, {
				display: 'block',
				x: side.leftof(30),
				y: side.y - 20,
				z: side.z,
				opacity: 0.5,
				scale: 0.2,
			}, this);

			const rock4 = new Sprite(BattleEffects.rock2, {
				display: 'block',
				x: side.leftof(10),
				y: side.y - 30,
				z: side.z,
				opacity: 0.5,
				scale: 0.2,
			}, this);

			this.$spritesFront[siden].append(rock1.$el!);
			this.$spritesFront[siden].append(rock2.$el!);
			this.$spritesFront[siden].append(rock3.$el!);
			this.$spritesFront[siden].append(rock4.$el!);
			this.sideConditions[siden][id] = [rock1, rock2, rock3, rock4];
			break;
		case 'spikes':
			let spikeArray = this.sideConditions[siden]['spikes'];
			if (!spikeArray) {
				spikeArray = [];
				this.sideConditions[siden]['spikes'] = spikeArray;
			}
			let levels = this.battle.sides[siden].sideConditions['spikes'][1];
			if (spikeArray.length < 1 && levels >= 1) {
				const spike1 = new Sprite(BattleEffects.caltrop, {
					display: 'block',
					x: side.x - 25,
					y: side.y - 40,
					z: side.z,
					scale: 0.3,
				}, this);
				this.$spritesFront[siden].append(spike1.$el!);
				spikeArray.push(spike1);
			}
			if (spikeArray.length < 2 && levels >= 2) {
				const spike2 = new Sprite(BattleEffects.caltrop, {
					display: 'block',
					x: side.x + 30,
					y: side.y - 45,
					z: side.z,
					scale: .3,
				}, this);
				this.$spritesFront[siden].append(spike2.$el!);
				spikeArray.push(spike2);
			}
			if (spikeArray.length < 3 && levels >= 3) {
				const spike3 = new Sprite(BattleEffects.caltrop, {
					display: 'block',
					x: side.x + 50,
					y: side.y - 40,
					z: side.z,
					scale: .3,
				}, this);
				this.$spritesFront[siden].append(spike3.$el!);
				spikeArray.push(spike3);
			}
			break;
		case 'toxicspikes':
			let tspikeArray = this.sideConditions[siden]['toxicspikes'];
			if (!tspikeArray) {
				tspikeArray = [];
				this.sideConditions[siden]['toxicspikes'] = tspikeArray;
			}
			let tspikeLevels = this.battle.sides[siden].sideConditions['toxicspikes'][1];
			if (tspikeArray.length < 1 && tspikeLevels >= 1) {
				const tspike1 = new Sprite(BattleEffects.poisoncaltrop, {
					display: 'block',
					x: side.x + 5,
					y: side.y - 40,
					z: side.z,
					scale: 0.3,
				}, this);
				this.$spritesFront[siden].append(tspike1.$el!);
				tspikeArray.push(tspike1);
			}
			if (tspikeArray.length < 2 && tspikeLevels >= 2) {
				const tspike2 = new Sprite(BattleEffects.poisoncaltrop, {
					display: 'block',
					x: side.x - 15,
					y: side.y - 35,
					z: side.z,
					scale: .3,
				}, this);
				this.$spritesFront[siden].append(tspike2.$el!);
				tspikeArray.push(tspike2);
			}
			break;
		case 'stickyweb':
			const web = new Sprite(BattleEffects.web, {
				display: 'block',
				x: side.x + 15,
				y: side.y - 35,
				z: side.z,
				opacity: 0.4,
				scale: 0.7,
			}, this);
			this.$spritesFront[siden].append(web.$el!);
			this.sideConditions[siden][id] = [web];
			break;
		}
	}
	removeSideCondition(siden: number, id: ID) {
		if (!this.animating) return;
		if (this.sideConditions[siden][id]) {
			for (const sprite of this.sideConditions[siden][id]) sprite.destroy();
			delete this.sideConditions[siden][id];
		}
	}
	resetSideConditions() {
		for (let siden = 0; siden < this.sideConditions.length; siden++) {
			for (const id in this.sideConditions[siden]) {
				this.removeSideCondition(siden, id as ID);
			}
			for (const id in this.battle.sides[siden].sideConditions) {
				this.addSideCondition(siden, id as ID, true);
			}
		}
	}

	typeAnim(pokemon: Pokemon, types: string) {
		const result = BattleLog.escapeHTML(types).split('/').map(type =>
			'<img src="' + Dex.resourcePrefix + 'sprites/types/' + type + '.png" alt="' + type + '" class="pixelated" />'
		).join(' ');
		this.resultAnim(pokemon, result, 'neutral');
	}
	resultAnim(pokemon: Pokemon, result: string, type: 'bad' | 'good' | 'neutral' | StatusName) {
		if (!this.animating) return;
		let $effect = $('<div class="result ' + type + 'result"><strong>' + result + '</strong></div>');
		this.$fx.append($effect);
		$effect.delay(this.timeOffset).css({
			display: 'block',
			opacity: 0,
			top: pokemon.sprite.top - 5,
			left: pokemon.sprite.left - 75,
		}).animate({
			opacity: 1,
		}, 1);
		$effect.animate({
			opacity: 0,
			top: pokemon.sprite.top - 65,
		}, 1000, 'swing');
		this.wait(this.acceleration < 2 ? 350 : 250);
		pokemon.sprite.updateStatbar(pokemon);
		if (this.acceleration < 3) this.waitFor($effect);
	}
	abilityActivateAnim(pokemon: Pokemon, result: string) {
		if (!this.animating) return;
		this.$fx.append('<div class="result abilityresult"><strong>' + result + '</strong></div>');
		let $effect = this.$fx.children().last();
		$effect.delay(this.timeOffset).css({
			display: 'block',
			opacity: 0,
			top: pokemon.sprite.top + 15,
			left: pokemon.sprite.left - 75,
		}).animate({
			opacity: 1,
		}, 1);
		$effect.delay(800).animate({
			opacity: 0,
		}, 400, 'swing');
		this.wait(100);
		pokemon.sprite.updateStatbar(pokemon);
		if (this.acceleration < 3) this.waitFor($effect);
	}
	damageAnim(pokemon: Pokemon, damage: number | string) {
		if (!this.animating) return;
		if (!pokemon.sprite.$statbar) return;
		pokemon.sprite.updateHPText(pokemon);

		let $hp = pokemon.sprite.$statbar.find('div.hp');
		let w = pokemon.hpWidth(150);
		let hpcolor = pokemon.getHPColor();
		let callback;
		if (hpcolor === 'y') {
			callback = () => { $hp.addClass('hp-yellow'); };
		}
		if (hpcolor === 'r') {
			callback = () => { $hp.addClass('hp-yellow hp-red'); };
		}

		this.resultAnim(pokemon, this.battle.hardcoreMode ? 'Damage' : '&minus;' + damage, 'bad');

		$hp.animate({
			width: w,
			'border-right-width': w ? 1 : 0,
		}, 350, callback);
	}
	healAnim(pokemon: Pokemon, damage: number | string) {
		if (!this.animating) return;
		if (!pokemon.sprite.$statbar) return;
		pokemon.sprite.updateHPText(pokemon);

		let $hp = pokemon.sprite.$statbar.find('div.hp');
		let w = pokemon.hpWidth(150);
		let hpcolor = pokemon.getHPColor();
		let callback;
		if (hpcolor === 'g') {
			callback = () => { $hp.removeClass('hp-yellow hp-red'); };
		}
		if (hpcolor === 'y') {
			callback = () => { $hp.removeClass('hp-red'); };
		}

		this.resultAnim(pokemon, this.battle.hardcoreMode ? 'Heal' : '+' + damage, 'good');

		$hp.animate({
			width: w,
			'border-right-width': w ? 1 : 0,
		}, 350, callback);
	}
}

	// Misc
	/////////////////////////////////////////////////////////////////////
  
interface ScenePos {
	x?: number;
	y?: number;
	z?: number;
	scale?: number;
	xscale?: number;
	yscale?: number;
	opacity?: number;
	time?: number;
	display?: string;
}
interface InitScenePos {
	x: number;
	y: number;
	z: number;
	scale?: number;
	xscale?: number;
	yscale?: number;
	opacity?: number;
	time?: number;
	display?: string;
}

class Sprite {
	scene: BattleScene;
	$el: JQuery = null!;
	sp: SpriteData;
	x: number;
	y: number;
	z: number;
	constructor(spriteData: SpriteData | null, pos: InitScenePos, scene: BattleScene) {
		this.scene = scene;
		let sp = null;
		if (spriteData) {
			sp = spriteData;
			let rawHTML = sp.rawHTML ||
				'<img src="' + sp.url + '" style="display:none;position:absolute"' + (sp.pixelated ? ' class="pixelated"' : '') + ' />';
			this.$el = $(rawHTML);
		} else {
			sp = {
				w: 0,
				h: 0,
				url: '',
			};
		}
		this.sp = sp;

		this.x = pos.x;
		this.y = pos.y;
		this.z = pos.z;
		if (pos.opacity !== 0 && spriteData) this.$el!.css(scene.pos(pos, sp));

		if (!spriteData) {
			this.delay = function () { return this; };
			this.anim = function () { return this; };
		}
	}
}

class PokemonSprite extends Sprite {
	siden: number;
	forme = '';
	cryurl: string | undefined = undefined;

	subsp: SpriteData | null = null;
	$sub: JQuery | null = null;
	isSubActive = false;

	$statbar: JQuery | null = null;
	isBackSprite: boolean;
	isMissedPokemon = false;
	/**
	 * If the pokemon is transformed, sprite.sp will be the transformed
	 * SpriteData and sprite.oldsp will hold the original form's SpriteData
	 */
	oldsp: SpriteData | null = null;

	statbarLeft = 0;
	statbarTop = 0;
	left = 0;
	top = 0;

	removeTransform() {
		if (!this.scene.animating) return;
		if (!this.oldsp) return;
		let sp = this.oldsp;
		this.cryurl = sp.cryurl;
		this.sp = sp;
		this.oldsp = null;

		const $el = this.isSubActive ? this.$sub! : this.$el;
		$el.attr('src', sp.url!);
		$el.css(this.scene.pos({
			x: this.x,
			y: this.y,
			z: (this.isSubActive ? this.behind(30) : this.z),
			opacity: (this.$sub ? .3 : 1),
		}, sp));
	}
	animSub(instant?: boolean, noAnim?: boolean) {
		if (!this.scene.animating) return;
		if (this.$sub) return;
		const subsp = Dex.getSpriteData('substitute', this.siden, {
			gen: this.scene.gen,
		});
		this.subsp = subsp;
		this.$sub = $('<img src="' + subsp.url + '" style="display:block;opacity:0;position:absolute"' + (subsp.pixelated ? ' class="pixelated"' : '') + ' />');
		this.scene.$spritesFront[this.siden].append(this.$sub);
		this.isSubActive = true;
		if (instant) {
			if (!noAnim) this.animReset();
			return;
		}
		this.$el.animate(this.scene.pos({
			x: this.x,
			y: this.y,
			z: this.behind(30),
			opacity: 0.3,
		}, this.sp), 500);
		this.$sub.css(this.scene.pos({
			x: this.x,
			y: this.y + 50,
			z: this.z,
			opacity: 0,
		}, subsp));
		this.$sub.animate(this.scene.pos({
			x: this.x,
			y: this.y,
			z: this.z,
		}, subsp), 500);
		this.scene.waitFor(this.$sub);
	}

	animReset() {
		if (!this.scene.animating) return;
		if (this.$sub) {
			this.isSubActive = true;
			this.$el.stop(true, false);
			this.$sub.stop(true, false);
			this.$el.css(this.scene.pos({
				x: this.x,
				y: this.y,
				z: this.behind(30),
				opacity: .3,
			}, this.sp));
			this.$sub.css(this.scene.pos({
				x: this.x,
				y: this.y,
				z: this.z,
			}, this.subsp!));
		} else {
			this.$el.stop(true, false);
			this.$el.css(this.scene.pos({
				x: this.x,
				y: this.y,
				z: this.z,
			}, this.sp));
		}
	}
	recalculatePos(slot: number) {
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
	animTransform(pokemon: Pokemon, isCustomAnim?: boolean, isPermanent?: boolean) {
		if (!this.scene.animating && !isPermanent) return;
		let sp = Dex.getSpriteData(pokemon, this.isBackSprite ? 0 : 1, {
			gen: this.scene.gen,
		});
		let oldsp = this.sp;
		if (isPermanent) {
			this.oldsp = null;
		} else if (!this.oldsp) {
			this.oldsp = oldsp;
		}
		this.sp = sp;
		this.cryurl = sp.cryurl;

		if (!this.scene.animating) return;
		let speciesid = toId(pokemon.getSpecies());
		let doCry = false;
		const scene = this.scene;
		if (isCustomAnim) {
			if (speciesid === 'kyogreprimal') {
				BattleOtherAnims.primalalpha.anim(scene, [this]);
				doCry = true;
			} else if (speciesid === 'groudonprimal') {
				BattleOtherAnims.primalomega.anim(scene, [this]);
				doCry = true;
			} else if (speciesid === 'necrozmaultra') {
				BattleOtherAnims.ultraburst.anim(scene, [this]);
				doCry = true;
			} else if (speciesid === 'zygardecomplete') {
				BattleOtherAnims.powerconstruct.anim(scene, [this]);
			} else if (speciesid === 'wishiwashischool' || speciesid === 'greninjaash') {
				BattleOtherAnims.schoolingin.anim(scene, [this]);
			} else if (speciesid === 'wishiwashi') {
				BattleOtherAnims.schoolingout.anim(scene, [this]);
			} else if (speciesid === 'mimikyubusted' || speciesid === 'mimikyubustedtotem') {
				// standard animation
			} else {
				BattleOtherAnims.megaevo.anim(scene, [this]);
				doCry = true;
			}
		}
		// Constructing here gives us 300ms extra time to preload the new sprite
		let $newEl = $('<img src="' + sp.url + '" style="display:block;opacity:0;position:absolute"' + (sp.pixelated ? ' class="pixelated"' : '') + ' />');
		$newEl.css(this.scene.pos({
			x: this.x,
			y: this.y,
			z: this.z,
			yscale: 0,
			xscale: 0,
			opacity: 0,
		}, sp));
		this.$el.animate(this.scene.pos({
			x: this.x,
			y: this.y,
			z: this.z,
			yscale: 0,
			xscale: 0,
			opacity: 0.3,
		}, oldsp), 300, () => {
			if (this.cryurl && doCry) {
				BattleSound.playEffect(this.cryurl);
			}
			this.$el.replaceWith($newEl);
			this.$el = $newEl;
			this.$el.animate(scene.pos({
				x: this.x,
				y: this.y,
				z: this.z,
				opacity: 1,
			}, sp), 300);
		});
		this.scene.wait(500);

		if (isPermanent) {
			this.scene.updateSidebar(pokemon.side);
			this.resetStatbar(pokemon);
		} else {
			this.updateStatbar(pokemon);
		}
	}
	addEffect(id: ID, instant?: boolean) {
		if (id in this.effects) {
			this.pokeEffect(id);
			return;
		}
		if (id === 'substitute') {
			this.animSub(instant);
		} else if (id === 'leechseed') {
			const pos1 = {
				display: 'block',
				x: this.x - 30,
				y: this.y - 40,
				z: this.z,
				scale: .2,
				opacity: .6,
			};
			const pos2 = {
				display: 'block',
				x: this.x + 40,
				y: this.y - 35,
				z: this.z,
				scale: .2,
				opacity: .6,
			};
			const pos3 = {
				display: 'block',
				x: this.x + 20,
				y: this.y - 25,
				z: this.z,
				scale: .2,
				opacity: .6,
			};

			const leechseed1 = new Sprite(BattleEffects.energyball, pos1, this.scene);
			const leechseed2 = new Sprite(BattleEffects.energyball, pos2, this.scene);
			const leechseed3 = new Sprite(BattleEffects.energyball, pos3, this.scene);
			this.scene.$spritesFront[this.siden].append(leechseed1.$el!);
			this.scene.$spritesFront[this.siden].append(leechseed2.$el!);
			this.scene.$spritesFront[this.siden].append(leechseed3.$el!);
			this.effects['leechseed'] = [leechseed1, leechseed2, leechseed3];
		} else if (id === 'protect' || id === 'magiccoat') {
			const protect = new Sprite(BattleEffects.protect, {
				display: 'block',
				x: this.x,
				y: this.y,
				z: this.behind(-15),
				xscale: 1,
				yscale: 0,
				opacity: .1,
			}, this.scene);
			this.scene.$spritesFront[this.siden].append(protect.$el!);
			this.effects[id] = [protect];
			protect.anim({
				opacity: .9,
				time: instant ? 0 : 400,
			}).anim({
				opacity: .4,
				time: instant ? 0 : 300,
			});
		}
	}

	// Statbar
	/////////////////////////////////////////////////////////////////////

	getStatbarHTML(pokemon: Pokemon) {
		let buf = '<div class="statbar' + (this.siden ? ' lstatbar' : ' rstatbar') + '" style="display: none">';
		buf += '<strong>' + (this.siden && (this.scene.battle.ignoreOpponent || this.scene.battle.ignoreNicks) ? pokemon.species : BattleLog.escapeHTML(pokemon.name));
		let gender = pokemon.gender;
		if (gender) buf += ' <img src="' + Dex.resourcePrefix + 'fx/gender-' + gender.toLowerCase() + '.png" alt="' + gender + '" />';
		buf += (pokemon.level === 100 ? '' : ' <small>L' + pokemon.level + '</small>');

		let symbol = '';
		if (pokemon.species.indexOf('-Mega') >= 0) symbol = 'mega';
		else if (pokemon.species === 'Kyogre-Primal') symbol = 'alpha';
		else if (pokemon.species === 'Groudon-Primal') symbol = 'omega';
		if (symbol) {
			buf += ' <img src="' + Dex.resourcePrefix + 'sprites/misc/' + symbol + '.png" alt="' + symbol + '" style="vertical-align:text-bottom;" />';
		}

		buf += '</strong><div class="hpbar"><div class="hptext"></div><div class="hptextborder"></div><div class="prevhp"><div class="hp"></div></div><div class="status"></div>';
		buf += '</div>';
		return buf;
	}

	resetStatbar(pokemon: Pokemon, startHidden?: boolean) {
		if (this.$statbar) {
			this.$statbar.remove();
			this.$statbar = null;
		}
		this.updateStatbar(pokemon, true);
		if (!startHidden && this.$statbar) {
			this.$statbar!.css({
				display: 'block',
				left: this.statbarLeft,
				top: this.statbarTop,
				opacity: 1,
			});
		}
	}

	updateStatbarIfExists(pokemon: Pokemon, updatePrevhp?: boolean, updateHp?: boolean) {
		if (this.$statbar) {
			this.updateStatbar(pokemon, updatePrevhp, updateHp);
		}
	}

	updateStatbar(pokemon: Pokemon, updatePrevhp?: boolean, updateHp?: boolean) {
		if (!this.scene.animating) return;
		if (!pokemon.isActive()) {
			if (this.$statbar) this.$statbar.hide();
			return;
		}
		if (!this.$statbar) {
			this.$statbar = $(this.getStatbarHTML(pokemon));
			this.scene.$stat.append(this.$statbar);
			updatePrevhp = true;
		}
		let hpcolor;
		if (updatePrevhp || updateHp) {
			hpcolor = pokemon.getHPColor();
			let w = pokemon.hpWidth(150);
			let $hp = this.$statbar.find('.hp');
			$hp.css({
				width: w,
				'border-right-width': (w ? 1 : 0),
			});
			if (hpcolor === 'g') $hp.removeClass('hp-yellow hp-red');
			else if (hpcolor === 'y') $hp.removeClass('hp-red').addClass('hp-yellow');
			else $hp.addClass('hp-yellow hp-red');
			this.updateHPText(pokemon);
		}
		if (updatePrevhp) {
			let $prevhp = this.$statbar.find('.prevhp');
			$prevhp.css('width', pokemon.hpWidth(150) + 1);
			if (hpcolor === 'g') $prevhp.removeClass('prevhp-yellow prevhp-red');
			else if (hpcolor === 'y') $prevhp.removeClass('prevhp-red').addClass('prevhp-yellow');
			else $prevhp.addClass('prevhp-yellow prevhp-red');
		}
		let status = '';
		if (pokemon.status === 'brn') {
			status += '<span class="brn">BRN</span> ';
		} else if (pokemon.status === 'psn') {
			status += '<span class="psn">PSN</span> ';
		} else if (pokemon.status === 'tox') {
			status += '<span class="psn">TOX</span> ';
		} else if (pokemon.status === 'slp') {
			status += '<span class="slp">SLP</span> ';
		} else if (pokemon.status === 'par') {
			status += '<span class="par">PAR</span> ';
		} else if (pokemon.status === 'frz') {
			status += '<span class="frz">FRZ</span> ';
		}
		if (pokemon.volatiles.typechange && pokemon.volatiles.typechange[1]) {
			let types = pokemon.volatiles.typechange[1].split('/');
			status += '<img src="' + Dex.resourcePrefix + 'sprites/types/' + encodeURIComponent(types[0]) + '.png" alt="' + types[0] + '" class="pixelated" /> ';
			if (types[1]) {
				status += '<img src="' + Dex.resourcePrefix + 'sprites/types/' + encodeURIComponent(types[1]) + '.png" alt="' + types[1] + '" class="pixelated" /> ';
			}
		}
		if (pokemon.volatiles.typeadd) {
			const type = pokemon.volatiles.typeadd[1];
			status += '+<img src="' + Dex.resourcePrefix + 'sprites/types/' + type + '.png" alt="' + type + '" class="pixelated" /> ';
		}
		for (const stat in pokemon.boosts) {
			if (pokemon.boosts[stat]) {
				status += '<span class="' + pokemon.getBoostType(stat as BoostStatName) + '">' + pokemon.getBoost(stat as BoostStatName) + '</span> ';
			}
		}
		let statusTable: {[id: string]: string} = {
			formechange: '',
			typechange: '',
			typeadd: '',
			trapped: '', // linked volatiles are not implemented yet
			throatchop: '<span class="bad">Throat&nbsp;Chop</span> ',
			confusion: '<span class="bad">Confused</span> ',
			healblock: '<span class="bad">Heal&nbsp;Block</span> ',
			yawn: '<span class="bad">Drowsy</span> ',
			flashfire: '<span class="good">Flash&nbsp;Fire</span> ',
			imprison: '<span class="good">Imprisoning&nbsp;foe</span> ',
			autotomize: '<span class="neutral">Lightened</span> ',
			miracleeye: '<span class="bad">Miracle&nbsp;Eye</span> ',
			foresight: '<span class="bad">Foresight</span> ',
			telekinesis: '<span class="neutral">Telekinesis</span> ',
			transform: '<span class="neutral">Transformed</span> ',
			powertrick: '<span class="neutral">Power&nbsp;Trick</span> ',
			curse: '<span class="bad">Curse</span> ',
			nightmare: '<span class="bad">Nightmare</span> ',
			attract: '<span class="bad">Attract</span> ',
			torment: '<span class="bad">Torment</span> ',
			taunt: '<span class="bad">Taunt</span> ',
			disable: '<span class="bad">Disable</span> ',
			embargo: '<span class="bad">Embargo</span> ',
			ingrain: '<span class="good">Ingrain</span> ',
			aquaring: '<span class="good">Aqua&nbsp;Ring</span> ',
			stockpile1: '<span class="good">Stockpile</span> ',
			stockpile2: '<span class="good">Stockpile&times;2</span> ',
			stockpile3: '<span class="good">Stockpile&times;3</span> ',
			perish0: '<span class="bad">Perish&nbsp;now</span>',
			perish1: '<span class="bad">Perish&nbsp;next&nbsp;turn</span> ',
			perish2: '<span class="bad">Perish&nbsp;in&nbsp;2</span> ',
			perish3: '<span class="bad">Perish&nbsp;in&nbsp;3</span> ',
			airballoon: '<span class="good">Balloon</span> ',
			leechseed: '<span class="bad">Leech&nbsp;Seed</span> ',
			encore: '<span class="bad">Encore</span> ',
			mustrecharge: '<span class="bad">Must&nbsp;recharge</span> ',
			bide: '<span class="good">Bide</span> ',
			magnetrise: '<span class="good">Magnet&nbsp;Rise</span> ',
			smackdown: '<span class="bad">Smack&nbsp;Down</span> ',
			focusenergy: '<span class="good">Focus&nbsp;Energy</span> ',
			slowstart: '<span class="bad">Slow&nbsp;Start</span> ',
			doomdesire: '',
			futuresight: '',
			mimic: '<span class="good">Mimic</span> ',
			watersport: '<span class="good">Water&nbsp;Sport</span> ',
			mudsport: '<span class="good">Mud&nbsp;Sport</span> ',
			substitute: '',
			// sub graphics are handled elsewhere, see Battle.Sprite.animSub()
			uproar: '<span class="neutral">Uproar</span>',
			rage: '<span class="neutral">Rage</span>',
			roost: '<span class="neutral">Landed</span>',
			protect: '<span class="good">Protect</span>',
			quickguard: '<span class="good">Quick&nbsp;Guard</span>',
			wideguard: '<span class="good">Wide&nbsp;Guard</span>',
			craftyshield: '<span class="good">Crafty&nbsp;Shield</span>',
			matblock: '<span class="good">Mat&nbsp;Block</span>',
			helpinghand: '<span class="good">Helping&nbsp;Hand</span>',
			magiccoat: '<span class="good">Magic&nbsp;Coat</span>',
			destinybond: '<span class="good">Destiny&nbsp;Bond</span>',
			snatch: '<span class="good">Snatch</span>',
			grudge: '<span class="good">Grudge</span>',
			endure: '<span class="good">Endure</span>',
			focuspunch: '<span class="neutral">Focusing</span>',
			shelltrap: '<span class="neutral">Trap&nbsp;set</span>',
			powder: '<span class="bad">Powder</span>',
			electrify: '<span class="bad">Electrify</span>',
			ragepowder: '<span class="good">Rage&nbsp;Powder</span>',
			followme: '<span class="good">Follow&nbsp;Me</span>',
			instruct: '<span class="neutral">Instruct</span>',
			beakblast: '<span class="neutral">Beak&nbsp;Blast</span>',
			laserfocus: '<span class="good">Laser&nbsp;Focus</span>',
			spotlight: '<span class="neutral">Spotlight</span>',
			itemremoved: '',
			// partial trapping
			bind: '<span class="bad">Bind</span>',
			clamp: '<span class="bad">Clamp</span>',
			firespin: '<span class="bad">Fire Spin</span>',
			infestation: '<span class="bad">Infestation</span>',
			magmastorm: '<span class="bad">Magma Storm</span>',
			sandtomb: '<span class="bad">Sand Tomb</span>',
			whirlpool: '<span class="bad">Whirlpool</span>',
			wrap: '<span class="bad">Wrap</span>',
			// Gen 1
			lightscreen: '<span class="good">Light&nbsp;Screen</span>',
			reflect: '<span class="good">Reflect</span>',
		};
		for (let i in pokemon.volatiles) {
			if (typeof statusTable[i] === 'undefined') status += '<span class="neutral">[[' + i + ']]</span>';
			else status += statusTable[i];
		}
		for (let i in pokemon.turnstatuses) {
			if (typeof statusTable[i] === 'undefined') status += '<span class="neutral">[[' + i + ']]</span>';
			else status += statusTable[i];
		}
		for (let i in pokemon.movestatuses) {
			if (typeof statusTable[i] === 'undefined') status += '<span class="neutral">[[' + i + ']]</span>';
			else status += statusTable[i];
		}
		let statusbar = this.$statbar.find('.status');
		statusbar.html(status);
	}

	updateHPText(pokemon: Pokemon) {
		if (!this.$statbar) return;
		let $hptext = this.$statbar.find('.hptext');
		let $hptextborder = this.$statbar.find('.hptextborder');
		if (pokemon.maxhp === 48 || this.scene.battle.hardcoreMode && pokemon.maxhp === 100) {
			$hptext.hide();
			$hptextborder.hide();
		} else if (this.scene.battle.hardcoreMode) {
			$hptext.html(pokemon.hp + '/');
			$hptext.show();
			$hptextborder.show();
		} else {
			$hptext.html(pokemon.hpWidth(100) + '%');
			$hptext.show();
			$hptextborder.show();
		}
	}
}

// par: -webkit-filter:  sepia(100%) hue-rotate(373deg) saturate(592%);
//      -webkit-filter:  sepia(100%) hue-rotate(22deg) saturate(820%) brightness(29%);
// psn: -webkit-filter:  sepia(100%) hue-rotate(618deg) saturate(285%);
// brn: -webkit-filter:  sepia(100%) hue-rotate(311deg) saturate(469%);
// slp: -webkit-filter:  grayscale(100%);
// frz: -webkit-filter:  sepia(100%) hue-rotate(154deg) saturate(759%) brightness(23%);

const BattleBackdropsThree = [
	'bg-gen3.png',
	'bg-gen3-cave.png',
	'bg-gen3-ocean.png',
	'bg-gen3-sand.png',
	'bg-gen3-forest.png',
	'bg-gen3-arena.png',
];
const BattleBackdropsFour = [
	'bg-gen4.png',
	'bg-gen4-cave.png',
	'bg-gen4-snow.png',
	'bg-gen4-indoors.png',
	'bg-gen4-water.png',
];
const BattleBackdropsFive = [
	'bg-beach.png',
	'bg-beachshore.png',
	'bg-desert.png',
	'bg-meadow.png',
	'bg-thunderplains.png',
	'bg-city.png',
	'bg-earthycave.png',
	'bg-mountain.png',
	'bg-volcanocave.png',
	'bg-dampcave.png',
	'bg-forest.png',
	'bg-river.png',
	'bg-deepsea.png',
	'bg-icecave.png',
	'bg-route.png',
];
const BattleBackdrops = [
	'bg-aquacordetown.jpg',
	'bg-beach.jpg',
	'bg-city.jpg',
	'bg-dampcave.jpg',
	'bg-darkbeach.jpg',
	'bg-darkcity.jpg',
	'bg-darkmeadow.jpg',
	'bg-deepsea.jpg',
	'bg-desert.jpg',
	'bg-earthycave.jpg',
	'bg-elite4drake.jpg',
	'bg-forest.jpg',
	'bg-icecave.jpg',
	'bg-leaderwallace.jpg',
	'bg-library.jpg',
	'bg-meadow.jpg',
	'bg-orasdesert.jpg',
	'bg-orassea.jpg',
	'bg-skypillar.jpg',
];
