function getTeambuilderSprite(pokemon: any, gen: number = 0) {
  if (!pokemon) return '';
  let id = toId(pokemon.species);
  let spriteid = pokemon.spriteid;
  let template = Dex.getTemplate(pokemon.species);
  if (pokemon.species && !spriteid) {
    spriteid = template.spriteid || toId(pokemon.species);
  }
  if (Dex.getTemplate(pokemon.species).exists === false) {
    return 'background-image:url(' + Dex.resourcePrefix + 'sprites/bw/0.png);background-position:10px 5px;background-repeat:no-repeat';
  }
  let shiny = (pokemon.shiny ? '-shiny' : '');
  // let sdata;
  // if (BattlePokemonSprites[id] && BattlePokemonSprites[id].front && !Dex.prefs('bwgfx')) {
  // 	if (BattlePokemonSprites[id].front.anif && pokemon.gender === 'F') {
  // 		spriteid += '-f';
  // 		sdata = BattlePokemonSprites[id].front.anif;
  // 	} else {
  // 		sdata = BattlePokemonSprites[id].front.ani;
  // 	}
  // } else {
  // 	return 'background-image:url(' + Dex.resourcePrefix + 'sprites/bw' + shiny + '/' + spriteid + '.png);background-position:10px 5px;background-repeat:no-repeat';
  // }
  if (Dex.prefs('nopastgens')) gen = 6;
  let spriteDir = Dex.resourcePrefix + 'sprites/xydex';
  if ((!gen || gen >= 6) && !template.isNonstandard && !Dex.prefs('bwgfx')) {
    let offset = '-2px -3px';
    if (template.gen >= 7) offset = '-6px -7px';
    if (id.substr(0, 6) === 'arceus') offset = '-2px 7px';
    if (id === 'garchomp') offset = '-2px 2px';
    if (id === 'garchompmega') offset = '-2px 0px';
    return 'background-image:url(' + spriteDir + shiny + '/' + spriteid + '.png);background-position:' + offset + ';background-repeat:no-repeat';
  }
  spriteDir = Dex.resourcePrefix + 'sprites/bw';
  if (gen <= 1 && template.gen <= 1) spriteDir = Dex.resourcePrefix + 'sprites/rby';
  else if (gen <= 2 && template.gen <= 2) spriteDir = Dex.resourcePrefix + 'sprites/gsc';
  else if (gen <= 3 && template.gen <= 3) spriteDir = Dex.resourcePrefix + 'sprites/rse';
  else if (gen <= 4 && template.gen <= 4) spriteDir = Dex.resourcePrefix + 'sprites/dpp';
  return 'background-image:url(' + spriteDir + shiny + '/' + spriteid + '.png);background-position:10px 5px;background-repeat:no-repeat';
}



const loadedSpriteData = {xy: 1, bw: 0};

function loadSpriteData(gen: 'xy' | 'bw') {
  if (this.loadedSpriteData[gen]) return;
  this.loadedSpriteData[gen] = 1;

  let path = $('script[src*="pokedex-mini.js"]').attr('src') || '';
  let qs = '?' + (path.split('?')[1] || '');
  path = (path.match(/.+?(?=data\/pokedex-mini\.js)/) || [])[0] || '';

  let el = document.createElement('script');
  el.src = path + 'data/pokedex-mini-bw.js' + qs;
  document.getElementsByTagName('body')[0].appendChild(el);
}
function getSpriteData(pokemon: Pokemon | Template | string, siden: number, options: {
  gen?: number, shiny?: boolean, gender?: GenderName, afd?: boolean, noScale?: boolean,
} = {gen: 6}) {
  if (!options.gen) options.gen = 6;
  if (pokemon instanceof Pokemon) {
    if (pokemon.volatiles.transform) {
      options.shiny = pokemon.volatiles.transform[2];
      options.gender = pokemon.volatiles.transform[3];
    } else {
      options.shiny = pokemon.shiny;
      options.gender = pokemon.gender;
    }
    pokemon = pokemon.getSpecies();
  }
  const template = Dex.getTemplate(pokemon);
  let spriteData = {
    w: 96,
    h: 96,
    y: 0,
    url: Dex.resourcePrefix + 'sprites/',
    pixelated: true,
    isBackSprite: false,
    cryurl: '',
    shiny: options.shiny,
  };
  let name = template.spriteid;
  let dir;
  let facing;
  if (siden) {
    dir = '';
    facing = 'front';
  } else {
    spriteData.isBackSprite = true;
    dir = '-back';
    facing = 'back';
  }

  // Decide what gen sprites to use.
  let fieldGenNum = options.gen;
  if (Dex.prefs('nopastgens')) fieldGenNum = 6;
  if (Dex.prefs('bwgfx') && fieldGenNum >= 6) fieldGenNum = 5;
  let genNum = Math.max(fieldGenNum, Math.min(template.gen, 5));
  let gen = ['', 'rby', 'gsc', 'rse', 'dpp', 'bw', 'xy', 'xy'][genNum];

  let animationData = null;
  let miscData = null;
  let speciesid = template.speciesid;
  if (template.isTotem) speciesid = toId(name);
  if (gen === 'xy' && window.BattlePokemonSprites) {
    animationData = BattlePokemonSprites[speciesid];
  }
  if (gen === 'bw' && window.BattlePokemonSpritesBW) {
    animationData = BattlePokemonSpritesBW[speciesid];
  }
  if (window.BattlePokemonSprites) miscData = BattlePokemonSprites[speciesid];
  if (!miscData && window.BattlePokemonSpritesBW) miscData = BattlePokemonSpritesBW[speciesid];
  if (!animationData) animationData = {};
  if (!miscData) miscData = {};

  if (miscData.num > 0) {
    let baseSpeciesid = toId(template.baseSpecies);
    spriteData.cryurl = 'audio/cries/' + baseSpeciesid;
    let formeid = template.formeid;
    if (template.isMega || formeid && (
      formeid === '-sky' ||
      formeid === '-therian' ||
      formeid === '-primal' ||
      formeid === '-eternal' ||
      baseSpeciesid === 'kyurem' ||
      baseSpeciesid === 'necrozma' ||
      formeid === '-super' ||
      formeid === '-unbound' ||
      formeid === '-midnight' ||
      formeid === '-school' ||
      baseSpeciesid === 'oricorio' ||
      baseSpeciesid === 'zygarde'
    )) {
      spriteData.cryurl += formeid;
    }
    spriteData.cryurl += (window.nodewebkit ? '.ogg' : '.mp3');
  }

  if (options.shiny && options.gen > 1) dir += '-shiny';

  // April Fool's 2014
  if (window.Config && Config.server && Config.server.afd || options.afd) {
    dir = 'afd' + dir;
    spriteData.url += dir + '/' + name + '.png';
    return spriteData;
  }

  if (animationData[facing + 'f'] && options.gender === 'F') facing += 'f';
  let allowAnim = !Dex.prefs('noanim') && !Dex.prefs('nogif');
  if (allowAnim && genNum >= 6) spriteData.pixelated = false;
  if (allowAnim && animationData[facing] && genNum >= 5) {
    if (facing.slice(-1) === 'f') name += '-f';
    dir = gen + 'ani' + dir;

    spriteData.w = animationData[facing].w;
    spriteData.h = animationData[facing].h;
    spriteData.url += dir + '/' + name + '.gif';
  } else {
    // There is no entry or enough data in pokedex-mini.js
    // Handle these in case-by-case basis; either using BW sprites or matching the played gen.
    if (gen === 'xy') gen = 'bw';
    dir = gen + dir;

    // Gender differences don't exist prior to Gen 4,
    // so there are no sprites for it
    if (genNum >= 4 && miscData['frontf'] && options.gender === 'F') {
      name += '-f';
    }

    spriteData.url += dir + '/' + name + '.png';
  }

  if (!options.noScale) {
    if (fieldGenNum > 5) {
      // no scaling
    } else if (!spriteData.isBackSprite || fieldGenNum === 5) {
      spriteData.w *= 2;
      spriteData.h *= 2;
      spriteData.y += -16;
    } else {
      // backsprites are multiplied 1.5x by the 3D engine
      spriteData.w *= 2 / 1.5;
      spriteData.h *= 2 / 1.5;
      spriteData.y += -11;
    }
    if (fieldGenNum === 5) spriteData.y = -35;
    if (fieldGenNum === 5 && spriteData.isBackSprite) spriteData.y += 40;
    if (genNum <= 2) spriteData.y += 2;
  }
  if (template.isTotem && !options.noScale) {
    spriteData.w *= 1.5;
    spriteData.h *= 1.5;
    spriteData.y += -11;
  }

  return spriteData;
}
