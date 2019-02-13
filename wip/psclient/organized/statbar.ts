type Descriptor = "bad" | "good" | "netural";

// formechange
// typechange
// typeadd
// trapped
// doomdesire
// futuresight
// substitute TODO
// itemremoved

let statusTable: {[id: string]: [Descriptor, String]?} = {
  throatchop: ['bad', 'Throat Chop'],
  confusion: ['bad', 'Confused'],
  healblock: ['bad', 'Heal Block'],
  yawn: ['bad', 'Drowsy'],
  flashfire: ['good', 'Flash Fire'],
  imprison: ['good', 'Imprisoning foe'],
  autotomize: ['neutral', 'Lightened'],
  miracleeye: ['bad', 'Miracle Eye'],
  foresight: ['bad', 'Foresight'],
  telekinesis: ['neutral', 'Telekinesis'],
  transform: ['neutral', 'Transformed'], // TODO
  powertrick: ['neutral', 'Power Trick'],
  curse: ['bad', 'Curse'],
  nightmare: ['bad', 'Nightmare'],
  attract: ['bad', 'Attract'],
  torment: ['bad', 'Torment'],
  taunt: ['bad', 'Taunt'],
  disable: ['bad', 'Disable'],
  embargo: ['bad', 'Embargo'],
  ingrain: ['good', 'Ingrain'],
  aquaring: ['good', 'Aqua Ring'],
  stockpile1: ['good', 'Stockpile'],
  stockpile2: ['good', 'Stockpile&times;2'],
  stockpile3: ['good', 'Stockpile&times;3'],
  perish0: ['bad', 'Perish now'],
  perish1: ['bad', 'Perish next turn'],
  perish2: ['bad', 'Perish in 2'],
  perish3: ['bad', 'Perish in 3'],
  airballoon: ['good', 'Balloon'],
  leechseed: ['bad', 'Leech Seed'],
  encore: ['bad', 'Encore'],
  mustrecharge: ['bad', 'Must recharge'],
  bide: ['good', 'Bide'],
  magnetrise: ['good', 'Magnet Rise'],
  smackdown: ['bad', 'Smack Down'],
  focusenergy: ['good', 'Focus Energy'],
  slowstart: ['bad', 'Slow Start'],
  mimic: ['good', 'Mimic'],
  watersport: ['good', 'Water Sport'],
  mudsport: ['good', 'Mud Sport'],
  uproar: ['neutral', 'Uproar'],
  rage: ['neutral', 'Rage'],
  roost: ['neutral', 'Landed'],
  protect: ['good', 'Protect'],
  quickguard: ['good', 'Quick Guard'],
  wideguard: ['good', 'Wide Guard'],
  craftyshield: ['good', 'Crafty Shield'],
  matblock: ['good', 'Mat Block'],
  helpinghand: ['good', 'Helping Hand'],
  magiccoat: ['good', 'Magic Coat'],
  destinybond: ['good', 'Destiny Bond'],
  snatch: ['good', 'Snatch'],
  grudge: ['good', 'Grudge'],
  endure: ['good', 'Endure'],
  focuspunch: ['neutral', 'Focusing'],
  shelltrap: ['neutral', 'Trap set'],
  powder: ['bad', 'Powder'],
  electrify: ['bad', 'Electrify'],
  ragepowder: ['good', 'Rage Powder'],
  followme: ['good', 'Follow Me'],
  instruct: ['neutral', 'Instruct'],
  beakblast: ['neutral', 'Beak Blast'],
  laserfocus: ['good', 'Laser Focus'],
  spotlight: ['neutral', 'Spotlight'],
  bind: ['bad', 'Bind'],
  clamp: ['bad', 'Clamp'],
  firespin: ['bad', 'Fire Spin'],
  infestation: ['bad', 'Infestation'],
  magmastorm: ['bad', 'Magma Storm'],
  sandtomb: ['bad', 'Sand Tomb'],
  whirlpool: ['bad', 'Whirlpool'],
  wrap: ['bad', 'Wrap'],
  lightscreen: ['good', 'Light Screen'],
  reflect: ['good', 'Reflect'],
};



function getStatbarHTML(pokemon: Pokemon) {
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

function resetStatbar(pokemon: Pokemon, startHidden?: boolean) {
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

function updateStatbarIfExists(pokemon: Pokemon, updatePrevhp?: boolean, updateHp?: boolean) {
  if (this.$statbar) {
    this.updateStatbar(pokemon, updatePrevhp, updateHp);
  }
}

function updateStatbar(pokemon: Pokemon, updatePrevhp?: boolean, updateHp?: boolean) {
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

function updateHPText(pokemon: Pokemon) {
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

// par: -webkit-filter:  sepia(100%) hue-rotate(373deg) saturate(592%);
//      -webkit-filter:  sepia(100%) hue-rotate(22deg) saturate(820%) brightness(29%);
// psn: -webkit-filter:  sepia(100%) hue-rotate(618deg) saturate(285%);
// brn: -webkit-filter:  sepia(100%) hue-rotate(311deg) saturate(469%);
// slp: -webkit-filter:  grayscale(100%);
// frz: -webkit-filter:  sepia(100%) hue-rotate(154deg) saturate(759%) brightness(23%);
