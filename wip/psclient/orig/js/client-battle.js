(function ($) {

	var BattleRoom = this.BattleRoom = ConsoleRoom.extend({
		type: 'battle',
		title: '',
		add: function (data) {
			if (!data) return;
			if (data.substr(0, 6) === '|init|') {
				return this.init(data);
			}
			if (data.substr(0, 9) === '|request|') {
				data = data.slice(9);

				var requestData = null;
				var choiceText = null;

				var nlIndex = data.indexOf('\n');
				if (/[0-9]/.test(data.charAt(0)) && data.charAt(1) === '|') {
					// message format:
					//   |request|CHOICEINDEX|CHOICEDATA
					//   REQUEST

					// This is backwards compatibility with old code that violates the
					// expectation that server messages can be streamed line-by-line.
					// Please do NOT EVER push protocol changes without a pull request.
					// https://github.com/Zarel/Pokemon-Showdown/commit/e3c6cbe4b91740f3edc8c31a1158b506f5786d72#commitcomment-21278523
					choiceText = '?';
					data = data.slice(2, nlIndex);
				} else if (nlIndex >= 0) {
					// message format:
					//   |request|REQUEST
					//   |sentchoice|CHOICE
					if (data.slice(nlIndex + 1, nlIndex + 13) === '|sentchoice|') {
						choiceText = data.slice(nlIndex + 13);
					}
					data = data.slice(0, nlIndex);
				}

				try {
					requestData = JSON.parse(data);
				} catch (err) {}
				return this.receiveRequest(requestData, choiceText);
			}

			var log = data.split('\n');
			for (var i = 0; i < log.length; i++) {
				var logLine = log[i];

				if (logLine === '|') {
					this.callbackWaiting = false;
					this.controlsShown = false;
					this.$controls.html('');
				}

				if (logLine.substr(0, 10) === '|callback|') {
					// TODO: Maybe a more sophisticated UI for this.
					// In singles, this isn't really necessary because some elements of the UI will be
					// immediately disabled. However, in doubles/triples it might not be obvious why
					// the player is being asked to make a new decision without the following messages.
					var args = logLine.substr(10).split('|');
					var pokemon = isNaN(Number(args[1])) ? this.battle.getPokemon(args[1]) : this.battle.mySide.active[args[1]];
					var requestData = this.request.active[pokemon ? pokemon.slot : 0];
					delete this.choice;
					switch (args[0]) {
					case 'trapped':
						requestData.trapped = true;
						var pokeName = pokemon.side.n === 0 ? BattleLog.escapeHTML(pokemon.name) : "The opposing " + (this.battle.ignoreOpponent || this.battle.ignoreNicks ? pokemon.species : BattleLog.escapeHTML(pokemon.name));
						this.battle.activityQueue.push('|message|' + pokeName + ' is trapped and cannot switch!');
						break;
					case 'cant':
						for (var i = 0; i < requestData.moves.length; i++) {
							if (requestData.moves[i].id === args[3]) {
								requestData.moves[i].disabled = true;
							}
						}
						args.splice(1, 1, pokemon.getIdent());
						this.battle.activityQueue.push('|' + args.join('|'));
						break;
					}
				} else if (logLine.substr(0, 7) === '|title|') { // eslint-disable-line no-empty
				} else if (logLine.substr(0, 5) === '|win|' || logLine === '|tie') {
					this.battleEnded = true;
					this.battle.activityQueue.push(logLine);
				} else if (logLine.substr(0, 6) === '|chat|' || logLine.substr(0, 3) === '|c|' || logLine.substr(0, 9) === '|chatmsg|' || logLine.substr(0, 10) === '|inactive|') {
					this.battle.instantAdd(logLine);
				} else {
					this.battle.activityQueue.push(logLine);
				}
			}
			this.battle.add('', Dex.prefs('noanim'));
			this.updateControls();
		},

		/*********************************************************
		 * Battle stuff
		 *********************************************************/



		timerInterval: 0,
		getTimerHTML: function (nextTick) {
			var time = 'Timer';
			var timerTicking = (this.battle.kickingInactive && this.request && !this.request.wait && !(this.choice && this.choice.waiting)) ? ' timerbutton-on' : '';

			if (!nextTick) {
				var self = this;
				if (this.timerInterval) {
					clearInterval(this.timerInterval);
					this.timerInterval = 0;
				}
				if (timerTicking) this.timerInterval = setInterval(function () {
					var $timerButton = self.$('.timerbutton');
					if ($timerButton.length) {
						$timerButton.replaceWith(self.getTimerHTML(true));
					} else {
						clearInterval(self.timerInterval);
						self.timerInterval = 0;
					}
				}, 1000);
			} else if (this.battle.kickingInactive > 1) {
				this.battle.kickingInactive--;
				if (this.battle.totalTimeLeft) this.battle.totalTimeLeft--;
			}

			if (this.battle.kickingInactive) {
				var secondsLeft = this.battle.kickingInactive;
				if (secondsLeft !== true) {
					if (secondsLeft <= 10 && timerTicking) {
						timerTicking = ' timerbutton-critical';
					}
					var minutesLeft = Math.floor(secondsLeft / 60);
					secondsLeft -= minutesLeft * 60;
					time = '' + minutesLeft + ':' + (secondsLeft < 10 ? '0' : '') + secondsLeft;

					secondsLeft = this.battle.totalTimeLeft;
					if (secondsLeft) {
						minutesLeft = Math.floor(secondsLeft / 60);
						secondsLeft -= minutesLeft * 60;
						time += ' | ' + minutesLeft + ':' + (secondsLeft < 10 ? '0' : '') + secondsLeft + ' total';
					}
				} else {
					time = '-:--';
				}
			}
			return '<button name="openTimer" class="button timerbutton' + timerTicking + '"><i class="fa fa-hourglass-start"></i> ' + time + '</button>';
		},
	
		updateMoveControls: function (type) {
			var switchables = this.request && this.request.side ? this.myPokemon : [];

			if (type !== 'movetarget') {
				while (switchables[this.choice.choices.length] && switchables[this.choice.choices.length].fainted && this.choice.choices.length + 1 < this.battle.mySide.active.length) {
					this.choice.choices.push('pass');
				}
			}

			var moveTarget = this.choice ? this.choice.moveTarget : '';
			var pos = this.choice.choices.length - (type === 'movetarget' ? 1 : 0);

			var hpRatio = switchables[pos].hp / switchables[pos].maxhp;

			var curActive = this.request && this.request.active && this.request.active[pos];
			if (!curActive) return;
			var trapped = curActive.trapped;
			var canMegaEvo = curActive.canMegaEvo || switchables[pos].canMegaEvo;
			var canZMove = curActive.canZMove || switchables[pos].canZMove;
			var canUltraBurst = curActive.canUltraBurst || switchables[pos].canUltraBurst;
			if (canZMove && typeof canZMove[0] === 'string') {
				canZMove = _.map(canZMove, function (move) {
					return {move: move, target: Dex.getMove(move).target};
				});
			}

			this.finalDecisionMove = curActive.maybeDisabled || false;
			this.finalDecisionSwitch = curActive.maybeTrapped || false;
			for (var i = pos + 1; i < this.battle.mySide.active.length; ++i) {
				var p = this.battle.mySide.active[i];
				if (p && !p.fainted) {
					this.finalDecisionMove = this.finalDecisionSwitch = false;
					break;
				}
			}

			var requestTitle = '';
			if (type === 'move2' || type === 'movetarget') {
				requestTitle += '<button name="clearChoice">Back</button> ';
			}

			// Target selector
			if (type === 'movetarget') {
				requestTitle += 'At who? ';

				var targetMenus = ['', ''];
				var myActive = this.battle.mySide.active;
				var yourActive = this.battle.yourSide.active;
				var yourSlot = yourActive.length - 1 - pos;

				for (var i = yourActive.length - 1; i >= 0; i--) {
					var pokemon = yourActive[i];

					var disabled = false;
					if (moveTarget === 'adjacentAlly' || moveTarget === 'adjacentAllyOrSelf') {
						disabled = true;
					} else if (moveTarget === 'normal' || moveTarget === 'adjacentFoe') {
						if (Math.abs(yourSlot - i) > 1) disabled = true;
					}

					if (disabled) {
						targetMenus[0] += '<button disabled="disabled"></button> ';
					} else if (!pokemon || pokemon.fainted) {
						targetMenus[0] += '<button name="chooseMoveTarget" value="' + (i + 1) + '"><span class="picon" style="' + Dex.getPokemonIcon('missingno') + '"></span></button> ';
					} else {
						targetMenus[0] += '<button name="chooseMoveTarget" value="' + (i + 1) + '"' + this.tooltips.tooltipAttrs("your" + i, 'pokemon', true) + '><span class="picon" style="' + Dex.getPokemonIcon(pokemon) + '"></span>' + (this.battle.ignoreOpponent || this.battle.ignoreNicks ? pokemon.species : BattleLog.escapeHTML(pokemon.name)) + '<span class="hpbar' + pokemon.getHPColorClass() + '"><span style="width:' + (Math.round(pokemon.hp * 92 / pokemon.maxhp) || 1) + 'px"></span></span>' + (pokemon.status ? '<span class="status ' + pokemon.status + '"></span>' : '') + '</button> ';
					}
				}
				for (var i = 0; i < myActive.length; i++) {
					var pokemon = myActive[i];

					var disabled = false;
					if (moveTarget === 'adjacentFoe') {
						disabled = true;
					} else if (moveTarget === 'normal' || moveTarget === 'adjacentAlly' || moveTarget === 'adjacentAllyOrSelf') {
						if (Math.abs(pos - i) > 1) disabled = true;
					}
					if (moveTarget !== 'adjacentAllyOrSelf' && pos == i) disabled = true;

					if (disabled) {
						targetMenus[1] += '<button disabled="disabled" style="visibility:hidden"></button> ';
					} else if (!pokemon || pokemon.fainted) {
						targetMenus[1] += '<button name="chooseMoveTarget" value="' + (-(i + 1)) + '"><span class="picon" style="' + Dex.getPokemonIcon('missingno') + '"></span></button> ';
					} else {
						targetMenus[1] += '<button name="chooseMoveTarget" value="' + (-(i + 1)) + '"' + this.tooltips.tooltipAttrs(i, 'sidepokemon') + '><span class="picon" style="' + Dex.getPokemonIcon(pokemon) + '"></span>' + BattleLog.escapeHTML(pokemon.name) + '<span class="hpbar' + pokemon.getHPColorClass() + '"><span style="width:' + (Math.round(pokemon.hp * 92 / pokemon.maxhp) || 1) + 'px"></span></span>' + (pokemon.status ? '<span class="status ' + pokemon.status + '"></span>' : '') + '</button> ';
					}
				}

				this.$controls.html(
					'<div class="controls">' +
					'<div class="whatdo">' + requestTitle + this.getTimerHTML() + '</div>' +
					'<div class="switchmenu" style="display:block">' + targetMenus[0] + '<div style="clear:both"></div> </div>' +
					'<div class="switchmenu" style="display:block">' + targetMenus[1] + '</div>' +
					'</div>'
				);
			} else {
				// Move chooser
				var hpBar = '<small class="' + (hpRatio < 0.2 ? 'critical' : hpRatio < 0.5 ? 'weak' : 'healthy') + '">HP ' + switchables[pos].hp + '/' + switchables[pos].maxhp + '</small>';
				requestTitle += ' What will <strong>' + BattleLog.escapeHTML(switchables[pos].name) + '</strong> do? ' + hpBar;

				var hasMoves = false;
				var moveMenu = '';
				var movebuttons = '';
				for (var i = 0; i < curActive.moves.length; i++) {
					var moveData = curActive.moves[i];
					var move = Dex.getMove(moveData.move);
					var name = move.name;
					var pp = moveData.pp + '/' + moveData.maxpp;
					if (!moveData.maxpp) pp = '&ndash;';
					if (move.id === 'Struggle' || move.id === 'Recharge') pp = '&ndash;';
					if (move.id === 'Recharge') move.type = '&ndash;';
					if (name.substr(0, 12) === 'Hidden Power') name = 'Hidden Power';
					var moveType = this.tooltips.getMoveType(move, this.battle.mySide.active[pos] || this.myPokemon[pos]);
					if (moveData.disabled) {
						movebuttons += '<button disabled="disabled"' + this.tooltips.tooltipAttrs(moveData.move, 'move') + '>';
					} else {
						movebuttons += '<button class="type-' + moveType + '" name="chooseMove" value="' + (i + 1) + '" data-move="' + BattleLog.escapeHTML(moveData.move) + '" data-target="' + BattleLog.escapeHTML(moveData.target) + '"' + this.tooltips.tooltipAttrs(moveData.move, 'move') + '>';
						hasMoves = true;
					}
					movebuttons += name + '<br /><small class="type">' + (moveType ? Dex.getType(moveType).name : "Unknown") + '</small> <small class="pp">' + pp + '</small>&nbsp;</button> ';
				}
				if (!hasMoves) {
					moveMenu += '<button class="movebutton" name="chooseMove" value="0" data-move="Struggle" data-target="randomNormal">Struggle<br /><small class="type">Normal</small> <small class="pp">&ndash;</small>&nbsp;</button> ';
				} else {
					if (canZMove) {
						movebuttons = '<div class="movebuttons-noz">' + movebuttons + '</div><div class="movebuttons-z" style="display:none">';
						for (var i = 0; i < curActive.moves.length; i++) {
							var moveData = curActive.moves[i];
							var move = Dex.getMove(moveData.move);
							var moveType = this.tooltips.getMoveType(move, this.battle.mySide.active[pos] || this.myPokemon[pos]);
							if (canZMove[i]) {
								movebuttons += '<button class="type-' + moveType + '" name="chooseMove" value="' + (i + 1) + '" data-move="' + BattleLog.escapeHTML(canZMove[i].move) + '" data-target="' + BattleLog.escapeHTML(canZMove[i].target) + '"' + this.tooltips.tooltipAttrs(moveData.move, 'zmove') + '>';
								movebuttons += canZMove[i].move + '<br /><small class="type">' + (moveType ? Dex.getType(moveType).name : "Unknown") + '</small> <small class="pp">1/1</small>&nbsp;</button> ';
							} else {
								movebuttons += '<button disabled="disabled">&nbsp;</button>';
							}
						}
						movebuttons += '</div>';
					}
					moveMenu += movebuttons;
				}
				if (canMegaEvo) {
					moveMenu += '<br /><label class="megaevo"><input type="checkbox" name="megaevo" />&nbsp;Mega&nbsp;Evolution</label>';
				} else if (canZMove) {
					moveMenu += '<br /><label class="megaevo"><input type="checkbox" name="zmove" />&nbsp;Z-Power</label>';
				} else if (canUltraBurst) {
					moveMenu += '<br /><label class="megaevo"><input type="checkbox" name="ultraburst" />&nbsp;Ultra Burst</label>';
				}
				if (this.finalDecisionMove) {
					moveMenu += '<em style="display:block;clear:both">You <strong>might</strong> have some moves disabled, so you won\'t be able to cancel an attack!</em><br/>';
				}
				moveMenu += '<div style="clear:left"></div>';

				var moveControls = (
					'<div class="movecontrols">' +
					'<div class="moveselect"><button name="selectMove">Attack</button></div>' +
					'<div class="movemenu">' + moveMenu + '</div>' +
					'</div>'
				);

				var shiftControls = '';
				if (this.battle.gameType === 'triples' && pos !== 1) {
					shiftControls += '<div class="shiftselect"><button name="chooseShift">Shift</button></div>';
				}

				var switchMenu = '';
				if (trapped) {
					switchMenu += '<em>You are trapped and cannot switch!</em>';
				} else {
					for (var i = 0; i < switchables.length; i++) {
						var pokemon = switchables[i];
						pokemon.name = pokemon.ident.substr(4);
						if (pokemon.fainted || i < this.battle.mySide.active.length || this.choice.switchFlags[i]) {
							switchMenu += '<button class="disabled" name="chooseDisabled" value="' + BattleLog.escapeHTML(pokemon.name) + (pokemon.fainted ? ',fainted' : i < this.battle.mySide.active.length ? ',active' : '') + '"' + this.tooltips.tooltipAttrs(i, 'sidepokemon') + '><span class="picon" style="' + Dex.getPokemonIcon(pokemon) + '"></span>' + BattleLog.escapeHTML(pokemon.name) + (pokemon.hp ? '<span class="hpbar' + pokemon.getHPColorClass() + '"><span style="width:' + (Math.round(pokemon.hp * 92 / pokemon.maxhp) || 1) + 'px"></span></span>' + (pokemon.status ? '<span class="status ' + pokemon.status + '"></span>' : '') : '') + '</button> ';
						} else {
							switchMenu += '<button name="chooseSwitch" value="' + i + '"' + this.tooltips.tooltipAttrs(i, 'sidepokemon') + '><span class="picon" style="' + Dex.getPokemonIcon(pokemon) + '"></span>' + BattleLog.escapeHTML(pokemon.name) + '<span class="hpbar' + pokemon.getHPColorClass() + '"><span style="width:' + (Math.round(pokemon.hp * 92 / pokemon.maxhp) || 1) + 'px"></span></span>' + (pokemon.status ? '<span class="status ' + pokemon.status + '"></span>' : '') + '</button> ';
						}
					}
					if (this.finalDecisionSwitch && this.battle.gen > 2) {
						switchMenu += '<em style="display:block;clear:both">You <strong>might</strong> be trapped, so you won\'t be able to cancel a switch!</em><br/>';
					}
				}
				var switchControls = (
					'<div class="switchcontrols">' +
					'<div class="switchselect"><button name="selectSwitch">Switch</button></div>' +
					'<div class="switchmenu">' + switchMenu + '</div>' +
					'</div>'
				);

				this.$controls.html(
					'<div class="controls">' +
					'<div class="whatdo">' + requestTitle + this.getTimerHTML() + '</div>' +
					moveControls + shiftControls + switchControls +
					'</div>'
				);
			}
		},
		updateSwitchControls: function (type) {
			var pos = this.choice.choices.length;

			if (type !== 'switchposition' && this.request.forceSwitch !== true && !this.choice.freedomDegrees) {
				while (!this.request.forceSwitch[pos] && pos < 6) {
					pos = this.choice.choices.push('pass');
				}
			}

			var switchables = this.request && this.request.side ? this.myPokemon : [];
			var myActive = this.battle.mySide.active;

			var requestTitle = '';
			if (type === 'switch2' || type === 'switchposition') {
				requestTitle += '<button name="clearChoice">Back</button> ';
			}

			// Place selector
			if (type === 'switchposition') {
				// TODO? hpbar
				requestTitle += "Which Pokémon will it switch in for?";
				var controls = '<div class="switchmenu" style="display:block">';
				for (var i = 0; i < myActive.length; i++) {
					var pokemon = this.myPokemon[i];
					if (pokemon && !pokemon.fainted || this.choice.switchOutFlags[i]) {
						controls += '<button disabled' + this.tooltips.tooltipAttrs(i, 'sidepokemon') + '><span class="picon" style="' + Dex.getPokemonIcon(pokemon) + '"></span>' + BattleLog.escapeHTML(pokemon.name) + (!pokemon.fainted ? '<span class="hpbar' + pokemon.getHPColorClass() + '"><span style="width:' + (Math.round(pokemon.hp * 92 / pokemon.maxhp) || 1) + 'px"></span></span>' + (pokemon.status ? '<span class="status ' + pokemon.status + '"></span>' : '') : '') + '</button> ';
					} else if (!pokemon) {
						controls += '<button disabled></button> ';
					} else {
						controls += '<button name="chooseSwitchTarget" value="' + i + '"' + this.tooltips.tooltipAttrs(i, 'sidepokemon') + '><span class="picon" style="' + Dex.getPokemonIcon(pokemon) + '"></span>' + BattleLog.escapeHTML(pokemon.name) + '<span class="hpbar' + pokemon.getHPColorClass() + '"><span style="width:' + (Math.round(pokemon.hp * 92 / pokemon.maxhp) || 1) + 'px"></span></span>' + (pokemon.status ? '<span class="status ' + pokemon.status + '"></span>' : '') + '</button> ';
					}
				}
				controls += '</div>';
				this.$controls.html(
					'<div class="controls">' +
					'<div class="whatdo">' + requestTitle + this.getTimerHTML() + '</div>' +
					controls +
					'</div>'
				);
			} else {
				if (this.choice.freedomDegrees >= 1) {
					requestTitle += "Choose a Pokémon to send to battle!";
				} else {
					requestTitle += "Switch <strong>" + BattleLog.escapeHTML(switchables[pos].name) + "</strong> to:";
				}

				var switchMenu = '';
				for (var i = 0; i < switchables.length; i++) {
					var pokemon = switchables[i];
					if (pokemon.fainted || i < this.battle.mySide.active.length || this.choice.switchFlags[i]) {
						switchMenu += '<button class="disabled" name="chooseDisabled" value="' + BattleLog.escapeHTML(pokemon.name) + (pokemon.fainted ? ',fainted' : i < this.battle.mySide.active.length ? ',active' : '') + '"' + this.tooltips.tooltipAttrs(i, 'sidepokemon') + '>';
					} else {
						switchMenu += '<button name="chooseSwitch" value="' + i + '"' + this.tooltips.tooltipAttrs(i, 'sidepokemon') + '>';
					}
					switchMenu += '<span class="picon" style="' + Dex.getPokemonIcon(pokemon) + '"></span>' + BattleLog.escapeHTML(pokemon.name) + (!pokemon.fainted ? '<span class="hpbar' + pokemon.getHPColorClass() + '"><span style="width:' + (Math.round(pokemon.hp * 92 / pokemon.maxhp) || 1) + 'px"></span></span>' + (pokemon.status ? '<span class="status ' + pokemon.status + '"></span>' : '') : '') + '</button> ';
				}

				var controls = (
					'<div class="switchcontrols">' +
					'<div class="switchselect"><button name="selectSwitch">Switch</button></div>' +
					'<div class="switchmenu">' + switchMenu + '</div>' +
					'</div>'
				);
				this.$controls.html(
					'<div class="controls">' +
					'<div class="whatdo">' + requestTitle + this.getTimerHTML() + '</div>' +
					controls +
					'</div>'
				);
				this.selectSwitch();
			}
		},
		updateTeamControls: function (type) {
			var switchables = this.request && this.request.side ? this.myPokemon : [];
			var maxIndex = Math.min(switchables.length, 24);

			var requestTitle = "";
			if (this.choice.done) {
				requestTitle = '<button name="clearChoice">Back</button> ' + "What about the rest of your team?";
			} else {
				requestTitle = "How will you start the battle?";
			}

			var switchMenu = '';
			for (var i = 0; i < maxIndex; i++) {
				var oIndex = this.choice.teamPreview[i] - 1;
				var pokemon = switchables[oIndex];
				if (i < this.choice.done) {
					switchMenu += '<button disabled="disabled"' + this.tooltips.tooltipAttrs(oIndex, 'sidepokemon') + '><span class="picon" style="' + Dex.getPokemonIcon(pokemon) + '"></span>' + BattleLog.escapeHTML(pokemon.name) + '</button> ';
				} else {
					switchMenu += '<button name="chooseTeamPreview" value="' + i + '"' + this.tooltips.tooltipAttrs(oIndex, 'sidepokemon') + '><span class="picon" style="' + Dex.getPokemonIcon(pokemon) + '"></span>' + BattleLog.escapeHTML(pokemon.name) + '</button> ';
				}
			}

			var controls = (
				'<div class="switchcontrols">' +
				'<div class="switchselect"><button name="selectSwitch">' + (this.choice.done ? '' + "Choose a Pokémon for slot " + (this.choice.done + 1) : "Choose Lead") + '</button></div>' +
				'<div class="switchmenu">' + switchMenu + '</div>' +
				'</div>'
			);
			this.$controls.html(
				'<div class="controls">' +
				'<div class="whatdo">' + requestTitle + this.getTimerHTML() + '</div>' +
				controls +
				'</div>'
			);
			this.selectSwitch();
		},
		updateWaitControls: function () {
			var buf = '<div class="controls">';
			buf += this.getPlayerChoicesHTML();
			if (!this.battle.mySide.name || !this.battle.yourSide.name || !this.request) {
				if (this.battle.kickingInactive) {
					buf += '<p><button class="button" name="setTimer" value="off">Stop timer</button> <small>&larr; Your opponent has disconnected. This will give them more time to reconnect.</small></p>';
				} else {
					buf += '<p><button class="button" name="setTimer" value="on">Claim victory</button> <small>&larr; Your opponent has disconnected. Click this if they don\'t reconnect.</small></p>';
				}
			}
			this.$controls.html(buf + '</div>');
		},

		getPlayerChoicesHTML: function () {
			var buf = '<p>' + this.getTimerHTML();
			if (!this.choice || !this.choice.waiting) {
				return buf + '<em>Waiting for opponent...</em></p>';
			}
			buf += '<small>';

			if (this.choice.teamPreview) {
				var myPokemon = this.battle.mySide.pokemon;
				var leads = [];
				for (var i = 0; i < this.choice.count; i++) {
					leads.push(myPokemon[this.choice.teamPreview[i] - 1].species);
				}
				buf += leads.join(', ') + ' will be sent out first.<br />';
			} else if (this.choice.choices) {
				var myActive = this.battle.mySide.active;
				for (var i = 0; i < this.choice.choices.length; i++) {
					var parts = this.choice.choices[i].split(' ');
					switch (parts[0]) {
					case 'move':
						var move = this.request.active[i].moves[parts[1] - 1].move;
						var target = '';
						buf += myActive[i].species + ' will ';
						if (parts.length > 2) {
							var targetPos = parts[2];
							if (targetPos === 'mega') {
								buf += 'mega evolve, then ';
								targetPos = parts[3];
							}
							if (targetPos === 'zmove') {
								move = this.request.active[i].canZMove[parts[1] - 1].move;
								targetPos = parts[3];
							}
							if (targetPos) {
								var targetActive = this.battle.yourSide.active;
								// Targeting your own side in doubles / triples
								if (targetPos < 0) {
									targetActive = myActive;
									targetPos = -targetPos;
									target += 'your ';
								}
								if (targetActive[targetPos - 1]) {
									target += targetActive[targetPos - 1].species;
								} else {
									target = ''; // targeting an empty slot
								}
							}
						}
						buf += 'use ' + Dex.getMove(move).name + (target ? ' against ' + target : '') + '.<br />';
						break;
					case 'switch':
						buf += '' + this.myPokemon[parts[1] - 1].species + ' will switch in';
						if (myActive[i]) {
							buf += ', replacing ' + myActive[i].species;
						}
						buf += '.<br />';
						break;
					case 'shift':
						buf += myActive[i].species + ' will shift position.<br />';
						break;
					}
				}
			}
			buf += '</small></p>';
			if (!this.finalDecision && !this.battle.hardcoreMode) {
				buf += '<p><small><em>Waiting for opponent...</em></small> <button class="button" name="undoChoice">Cancel</button></p>';
			}
			return buf;
		},

		/**
		 * Sends a decision; pass it an array of choices like ['move 1', 'switch 2']
		 * and it'll send `/choose move 1,switch 2|3`
		 * (where 3 is the rqid).
		 *
		 * (The rqid helps verify that the decision is sent in response to the
		 * correct request.)
		 */
		sendDecision: function (message) {
			if (!$.isArray(message)) return this.send('/' + message + '|' + this.request.rqid);
			var buf = '/choose ';
			for (var i = 0; i < message.length; i++) {
				if (message[i]) buf += message[i] + ',';
			}
			this.send(buf.substr(0, buf.length - 1) + '|' + this.request.rqid);
		},
		request: null,
		receiveRequest: function (request, choiceText) {
			if (!request) {
				this.side = '';
				return;
			}
			request.requestType = 'move';
			if (request.forceSwitch) {
				request.requestType = 'switch';
			} else if (request.teamPreview) {
				request.requestType = 'team';
			} else if (request.wait) {
				request.requestType = 'wait';
			}

			var choice = null;
			if (choiceText) {
				choice = {waiting: true};
			}
			this.choice = choice;
			this.finalDecision = this.finalDecisionMove = this.finalDecisionSwitch = false;
			this.request = request;
			if (request.side) {
				this.updateSideLocation(request.side);
			}
			this.notifyRequest();
			this.updateControls(true);
		},
		notifyRequest: function () {
			var oName = this.battle.yourSide.name;
			if (oName) oName = " against " + oName;
			switch (this.request.requestType) {
			case 'move':
				this.notify("Your move!", "Move in your battle" + oName, 'choice');
				break;
			case 'switch':
				this.notify("Your switch!", "Switch in your battle" + oName, 'choice');
				break;
			case 'team':
				this.notify("Team preview!", "Choose your team order in your battle" + oName, 'choice');
				break;
			}
		},
		updateSideLocation: function (sideData) {
			if (!sideData.id) return;
			this.side = sideData.id;
			if (this.battle.sidesSwitched !== !!(this.side === 'p2')) {
				this.battle.switchSides();
				this.$chat = this.$chatFrame.find('.inner');
			}
		},
		updateSide: function (sideData) {
			this.myPokemon = sideData.pokemon;
			for (var i = 0; i < sideData.pokemon.length; i++) {
				var pokemonData = sideData.pokemon[i];
				this.battle.parseDetails(pokemonData.ident.substr(4), pokemonData.ident, pokemonData.details, pokemonData);
				this.battle.parseHealth(pokemonData.condition, pokemonData);
				pokemonData.hpDisplay = Pokemon.prototype.hpDisplay;
				pokemonData.getPixelRange = Pokemon.prototype.getPixelRange;
				pokemonData.getFormattedRange = Pokemon.prototype.getFormattedRange;
				pokemonData.getHPColorClass = Pokemon.prototype.getHPColorClass;
				pokemonData.getHPColor = Pokemon.prototype.getHPColor;
			}
		},

		// buttons
		joinBattle: function () {
			this.send('/joinbattle');
		},
		setTimer: function (setting) {
			this.send('/timer ' + setting);
		},
		forfeit: function () {
			this.send('/forfeit');
		},
		saveReplay: function () {
			this.send('/savereplay');
		},
		openBattleOptions: function () {
			app.addPopup(BattleOptionsPopup, {battle: this.battle, room: this});
		},
		clickReplayDownloadButton: function (e) {
			var filename = (this.battle.tier || 'Battle').replace(/[^A-Za-z0-9]/g, '');

			// ladies and gentlemen, JavaScript dates
			var date = new Date();
			filename += '-' + date.getFullYear();
			filename += (date.getMonth() >= 9 ? '-' : '-0') + (date.getMonth() + 1);
			filename += (date.getDate() >= 10 ? '-' : '-0') + date.getDate();

			filename += '-' + toId(this.battle.p1.name);
			filename += '-' + toId(this.battle.p2.name);

			e.currentTarget.href = BattleLog.createReplayFileHref(this);
			e.currentTarget.download = filename + '.html';

			e.stopPropagation();
		},
		switchSides: function () {
			this.battle.switchSides();
		},
		pause: function () {
			this.tooltips.hideTooltip();
			this.battlePaused = true;
			this.battle.pause();
			this.updateControls();
		},
		resume: function () {
			this.tooltips.hideTooltip();
			this.battlePaused = false;
			this.battle.play();
			this.updateControls();
		},
		instantReplay: function () {
			this.tooltips.hideTooltip();
			this.request = null;
			this.battlePaused = false;
			this.battle.reset();
			this.battle.play();
		},
		skipTurn: function () {
			this.battle.skipTurn();
		},
		rewindTurn: function () {
			if (this.battle.turn) {
				this.battle.fastForwardTo(this.battle.turn - 1);
			}
		},
		goToEnd: function () {
			this.battle.fastForwardTo(-1);
		},
		register: function (userid) {
			var registered = app.user.get('registered');
			if (registered && registered.userid !== userid) registered = false;
			if (!registered && userid === app.user.get('userid')) {
				app.addPopup(RegisterPopup);
			}
		},
		closeAndMainMenu: function () {
			this.close();
			app.focusRoom('');
		},
		closeAndRematch: function () {
			app.rooms[''].requestNotifications();
			app.rooms[''].challenge(this.battle.yourSide.name, this.battle.tier);
			this.close();
			app.focusRoom('');
		},

		// choice buttons
		chooseMove: function (pos, e) {
			if (!this.choice) return;
			this.tooltips.hideTooltip();

			if (pos !== undefined) { // pos === undefined if called by chooseMoveTarget()
				var myActive = this.battle.mySide.active;
				var isMega = !!(this.$('input[name=megaevo]')[0] || '').checked;
				var isZMove = !!(this.$('input[name=zmove]')[0] || '').checked;
				var isUltraBurst = !!(this.$('input[name=ultraburst]')[0] || '').checked;

				var target = e.getAttribute('data-target');
				var choosableTargets = {normal: 1, any: 1, adjacentAlly: 1, adjacentAllyOrSelf: 1, adjacentFoe: 1};

				this.choice.choices.push('move ' + pos + (isMega ? ' mega' : '') + (isZMove ? ' zmove' : '') + (isUltraBurst ? ' ultra' : ''));
				if (myActive.length > 1 && target in choosableTargets) {
					this.choice.type = 'movetarget';
					this.choice.moveTarget = target;
					this.updateControlsForPlayer();
					return false;
				}
			}

			this.endChoice();
		},
		chooseMoveTarget: function (posString) {
			this.choice.choices[this.choice.choices.length - 1] += ' ' + posString;
			this.chooseMove();
		},
		chooseShift: function () {
			if (!this.choice) return;
			this.tooltips.hideTooltip();

			this.choice.choices.push('shift');
			this.endChoice();
		},
		chooseSwitch: function (pos) {
			if (!this.choice) return;
			this.tooltips.hideTooltip();

			if (pos !== undefined) { // pos === undefined if called by chooseSwitchTarget()
				this.choice.switchFlags[pos] = true;
				if (this.choice.freedomDegrees >= 1) {
					// Request selection of a Pokémon that will be switched out.
					this.choice.type = 'switchposition';
					this.updateControlsForPlayer();
					return false;
				}
				// Default: left to right.
				this.choice.switchOutFlags[this.choice.choices.length] = true;
				this.choice.choices.push('switch ' + (parseInt(pos, 10) + 1));
				this.endChoice();
				return;
			}

			// After choosing the position to which a pokemon will switch in (Doubles/Triples end-game).
			if (!this.request || this.request.requestType !== 'switch') return false; //??
			if (this.choice.canSwitch > _.filter(this.choice.choices, function (choice) {return choice;}).length) {
				// More switches are pending.
				this.choice.type = 'switch2';
				this.updateControlsForPlayer();
				return false;
			}

			this.endTurn();
		},
		chooseSwitchTarget: function (posString) {
			var slotSwitchIn = 0; // one-based
			for (var i in this.choice.switchFlags) {
				if (this.choice.choices.indexOf('switch ' + (+i + 1)) === -1) {
					slotSwitchIn = +i + 1;
					break;
				}
			}
			this.choice.choices[posString] = 'switch ' + slotSwitchIn;
			this.choice.switchOutFlags[posString] = true;
			this.chooseSwitch();
		},
		chooseTeamPreview: function (pos) {
			if (!this.choice) return;
			pos = parseInt(pos, 10);
			this.tooltips.hideTooltip();
			if (this.choice.count) {
				var temp = this.choice.teamPreview[pos];
				this.choice.teamPreview[pos] = this.choice.teamPreview[this.choice.done];
				this.choice.teamPreview[this.choice.done] = temp;

				this.choice.done++;

				if (this.choice.done < Math.min(this.choice.teamPreview.length, this.choice.count)) {
					this.choice.type = 'team2';
					this.updateControlsForPlayer();
					return false;
				}
			} else {
				this.choice.teamPreview = [pos + 1];
			}

			this.endTurn();
		},
		chooseDisabled: function (data) {
			this.tooltips.hideTooltip();
			data = data.split(',');
			if (data[1] === 'fainted') {
				app.addPopupMessage("" + data[0] + " has no energy left to battle!");
			} else if (data[1] === 'active') {
				app.addPopupMessage("" + data[0] + " is already in battle!");
			} else {
				app.addPopupMessage("" + data[0] + " is already selected!");
			}
		},
		endChoice: function () {
			var choiceIndex = this.choice.choices.length - 1;
			if (!this.nextChoice()) {
				this.endTurn();
			} else if (this.request.partial) {
				for (var i = choiceIndex; i < this.choice.choices.length; i++) {
					this.sendDecision(this.choice.choices[i]);
				}
			}
		},
		nextChoice: function () {
			var choices = this.choice.choices;
			var myActive = this.battle.mySide.active;

			if (this.request.requestType === 'switch' && this.request.forceSwitch !== true) {
				while (choices.length < myActive.length && !this.request.forceSwitch[choices.length]) {
					choices.push('pass');
				}
				if (choices.length < myActive.length) {
					this.choice.type = 'switch2';
					this.updateControlsForPlayer();
					return true;
				}
			} else if (this.request.requestType === 'move') {
				while (choices.length < myActive.length && !myActive[choices.length]) {
					choices.push('pass');
				}

				if (choices.length < myActive.length) {
					this.choice.type = 'move2';
					this.updateControlsForPlayer();
					return true;
				}
			}

			return false;
		},
		endTurn: function () {
			var act = this.request && this.request.requestType;
			if (act === 'team') {
				if (this.choice.teamPreview.length >= 10) {
					this.sendDecision('team ' + this.choice.teamPreview.join(','));
				} else {
					this.sendDecision('team ' + this.choice.teamPreview.join(''));
				}
			} else {
				if (act === 'switch') {
					// Assert that the remaining Pokémon won't switch, even though
					// the player could have decided otherwise.
					for (var i = 0; i < this.battle.mySide.active.length; i++) {
						if (!this.choice.choices[i]) this.choice.choices[i] = 'pass';
					}
				}

				if (this.choice.choices.length >= (this.choice.count || this.battle.mySide.active.length)) {
					this.sendDecision(this.choice.choices);
				}

				if (!this.finalDecision) {
					var lastChoice = this.choice.choices[this.choice.choices.length - 1];
					if (lastChoice.substr(0, 5) === 'move ' && this.finalDecisionMove) {
						this.finalDecisionMove = true;
					} else if (lastChoice.substr(0, 7) === 'switch' && this.finalDecisionSwitch) {
						this.finalDecisionSwitch = true;
					}
				}
			}
			this.closeNotification('choice');

			this.choice.waiting = true;
			this.updateControlsForPlayer();
		},
		undoChoice: function (pos) {
			this.send('/undo');
			this.notifyRequest();

			this.clearChoice();
		},
		clearChoice: function () {
			this.choice = null;
			this.updateControlsForPlayer();
		},
		leaveBattle: function () {
			this.tooltips.hideTooltip();
			this.send('/leavebattle');
			this.side = '';
			this.closeNotification('choice');
		},
		selectSwitch: function () {
			this.tooltips.hideTooltip();
			this.$controls.find('.controls').attr('class', 'controls switch-controls');
		},
		selectMove: function () {
			this.tooltips.hideTooltip();
			this.$controls.find('.controls').attr('class', 'controls move-controls');
		}
	}, {
		readReplayFile: function (file) {
			var reader = new FileReader();
			reader.onload = function (e) {
				var html = e.target.result;
				var titleStart = html.indexOf('<title>');
				var titleEnd = html.indexOf('</title>');
				var title = 'Uploaded Replay';
				if (titleStart >= 0 && titleEnd > titleStart) {
					title = html.slice(titleStart + 7, titleEnd - 1);
					var colonIndex = title.indexOf(':');
					var hyphenIndex = title.lastIndexOf('-');
					if (hyphenIndex > colonIndex + 2) {
						title = title.substring(colonIndex + 2, hyphenIndex - 1);
					} else {
						title = title.substring(colonIndex + 2);
					}
				}
				var index1 = html.indexOf('<script type="text/plain" class="battle-log-data">');
				var index2 = html.indexOf('<script type="text/plain" class="log">');
				if (index1 < 0 && index2 < 0) return alert("Unrecognized HTML file: Only replay files are supported.");
				if (index1 >= 0) {
					html = html.slice(index1 + 50);
				} else if (index2 >= 0) {
					html = html.slice(index2 + 38);
				}
				var index3 = html.indexOf('</script>');
				html = html.slice(0, index3);
				html = html.replace(/\\\//g, '/');
				app.receive('>battle-uploadedreplay\n|init|battle\n|title|' + title + '\n' + html);
				app.receive('>battle-uploadedreplay\n|expire|Uploaded replay');
			};
			reader.readAsText(file);
		}
	});



}).call(this, jQuery);
