/* tslint:disable:switch-default prefer-const */
import {ID, toID} from '@pkmn.cc/data';
import * as client from '@pkmn.cc/client';
import * as template from './data/template.json';

const TEMPLATE: {[id: string]: {[templateName: string]: string}} = template;

type Args = [string, ...string[]];
type KWArgs = {
  [kw: string]: string
};

export class Parser extends client.Parser {
  p1 = 'Player 1';
  p2 = 'Player 2';
  perspective: 0|1;
  gen = 7;
  curLineSection: 'break'|'preMajor'|'major'|'postMajor' = 'break';
  lowercaseRegExp: RegExp|null|undefined = undefined;

  constructor(perspective: 0|1 = 0) {
    super();
    this.perspective = perspective;
  }

  extractMessage(buf: string) {
    let out = '';
    for (const line of buf.split('\n')) {
      const {args, kwArgs} = Parser.parseLine(line);
      out += this.parseArgs(args, kwArgs) || '';
    }
    return out;
  }

  fixLowercase(input: string) {
    if (this.lowercaseRegExp === undefined) {
      const prefixes =
          ['pokemon', 'opposingPokemon', 'team', 'opposingTeam']
              .map(templateId => {
                const template = TEMPLATE.default[templateId];
                if (template.charAt(0) === template.charAt(0).toUpperCase()) {
                  return '';
                }
                const bracketIndex = template.indexOf('[');
                if (bracketIndex >= 0) return template.slice(0, bracketIndex);
                return template;
              })
              .filter(prefix => prefix);
      if (prefixes.length) {
        const buf = `((?:^|\n)(?:  |  \\\(|  \\\[)?)(` +
            prefixes.map(Parser.escapeRegExp).join('|') + `)`;
        this.lowercaseRegExp = new RegExp(buf, 'g');
      } else {
        this.lowercaseRegExp = null;
      }
    }
    if (!this.lowercaseRegExp) return input;
    return input.replace(
        this.lowercaseRegExp,
        (match, p1, p2) => (p1 + p2.charAt(0).toUpperCase() + p2.slice(1)));
  }

  pokemonName(pokemon: string) {
    if (!pokemon) return '';
    if (!pokemon.startsWith('p1') && !pokemon.startsWith('p2')) {
      return `???pokemon:${pokemon}???`;
    }
    if (pokemon.charAt(3) === ':') {
      return pokemon.slice(4).trim();
    } else if (pokemon.charAt(2) === ':') {
      return pokemon.slice(3).trim();
    }
    return `???pokemon:${pokemon}???`;
  }

  pokemon(pokemon: string) {
    if (!pokemon) return '';
    let side;
    switch (pokemon.slice(0, 2)) {
      case 'p1':
        side = 0;
        break;
      case 'p2':
        side = 1;
        break;
      default:
        return `???pokemon:${pokemon}???`;
    }
    const name = this.pokemonName(pokemon);
    const template = TEMPLATE.default[
      side === this.perspective ? 'pokemon' : 'opposingPokemon'
    ];
    return template.replace('[NICKNAME]', name);
  }

  pokemonFull(pokemon: string, details: string): [string, string] {
    const nickname = this.pokemonName(pokemon);

    const species = details.split(',')[0];
    if (nickname === species) return [pokemon.slice(0, 2), `**${species}**`];
    return [pokemon.slice(0, 2), `${nickname} (**${species}**)`];
  }

  trainer(side: string) {
    side = side.slice(0, 2);
    if (side === 'p1') return this.p1;
    if (side === 'p2') return this.p2;
    return `???side:${side}???`;
  }

  team(side: string) {
    side = side.slice(0, 2);
    if (side === (this.perspective === 0 ? 'p1' : 'p2')) {
      return TEMPLATE.default.team;
    }
    return TEMPLATE.default.opposingTeam;
  }

  own(side: string) {
    side = side.slice(0, 2);
    if (side === (this.perspective === 0 ? 'p1' : 'p2')) {
      return 'OWN';
    }
    return '';
  }

  template(type: string, ...namespaces: Array<string|undefined>) {
    for (const namespace of namespaces) {
      if (!namespace) continue;
      if (namespace === 'OWN') {
        return TEMPLATE.default[type + 'Own'] + '\n';
      }
      if (namespace === 'NODEFAULT') {
        return '';
      }
      let id = toID(Parser.effect(namespace));
      if (TEMPLATE[id] && type in TEMPLATE[id]) {
        if (TEMPLATE[id][type].charAt(1) === '.') {
          type = TEMPLATE[id][type].slice(2) as ID;
        }
        if (TEMPLATE[id][type].charAt(0) === '#') {
          id = TEMPLATE[id][type].slice(1) as ID;
        }
        if (!TEMPLATE[id][type]) return '';
        return TEMPLATE[id][type] + '\n';
      }
    }
    if (!TEMPLATE.default[type]) return '';
    return TEMPLATE.default[type] + '\n';
  }

  maybeAbility(effect: string|undefined, holder: string) {
    if (!effect) return '';
    if (!effect.startsWith('ability:')) return '';
    return this.ability(effect.slice(8).trim(), holder);
  }

  ability(name: string|undefined, holder: string) {
    if (!name) return '';
    return TEMPLATE.default.abilityActivation
               .replace('[POKEMON]', this.pokemon(holder))
               .replace('[ABILITY]', Parser.effect(name)) +
        '\n';
  }

  stat(stat: string) {
    const entry = TEMPLATE[stat || 'stats'];
    if (!entry || !entry.statName) return `???stat:${stat}???`;
    return entry.statName;
  }

  lineSection(args: Args, kwArgs: KWArgs) {
    const cmd = args[0];
    switch (cmd) {
      case 'done':
      case 'turn':
        return 'break';
      case 'move':
      case 'cant':
      case 'switch':
      case 'drag':
      case 'upkeep':
      case 'start':
      case '-mega':
        return 'major';
      case 'switchout':
      case 'faint':
        return 'preMajor';
      case '-zpower':
        return 'postMajor';
      case '-damage': {
        const id = toID(Parser.effect(kwArgs.from));
        if (id === 'confusion') return 'major';
        return 'postMajor';
      }
      case '-curestatus': {
        const id = toID(Parser.effect(kwArgs.from));
        if (id === 'naturalcure') return 'preMajor';
        return 'postMajor';
      }
      case '-start': {
        const id = toID(Parser.effect(kwArgs.from));
        if (id === 'protean') return 'preMajor';
        return 'postMajor';
      }
      case '-activate': {
        const id = toID(Parser.effect(args[2]));
        if (id === 'confusion' || id === 'attract') return 'preMajor';
        return 'postMajor';
      }
    }
    return (cmd.charAt(0) === '-' ? 'postMajor' : '');
  }

  sectionBreak(args: Args, kwArgs: KWArgs) {
    const prevSection = this.curLineSection;
    const curSection = this.lineSection(args, kwArgs);
    if (!curSection) return false;
    this.curLineSection = curSection;
    switch (curSection) {
      case 'break':
        if (prevSection !== 'break') return true;
        return false;
      case 'preMajor':
      case 'major':
        if (prevSection === 'postMajor' || prevSection === 'major') return true;
        return false;
      case 'postMajor':
        return false;
    }
  }

  parseArgs(args: Args, kwArgs: KWArgs, noSectionBreak?: boolean) {
    const buf = !noSectionBreak && this.sectionBreak(args, kwArgs) ? '\n' : '';
    return buf + this.fixLowercase(this.parseArgsInner(args, kwArgs) || '');
  }

  parseArgsInner(args: Args, kwArgs: KWArgs) {
    const cmd = args[0];
    switch (cmd) {
      case 'player': {
        const [, side, name] = args;
        if (side === 'p1' && name) {
          this.p1 = name;
        } else if (side === 'p2' && name) {
          this.p2 = name;
        }
        return '';
      }

      case 'gen': {
        const [, num] = args;
        // tslint:disable-next-line:ban
        this.gen = parseInt(num, 10);
        return '';
      }

      case 'turn': {
        const [, num] = args;
        return this.template('turn').replace('[NUMBER]', num) + '\n';
      }

      case 'start': {
        return this.template('startBattle')
            .replace('[TRAINER]', this.p1)
            .replace('[TRAINER]', this.p2);
      }

      case 'win':
      case 'tie': {
        const [, name] = args;
        if (cmd === 'tie' || !name) {
          return this.template('tieBattle')
              .replace('[TRAINER]', this.p1)
              .replace('[TRAINER]', this.p2);
        }
        return this.template('winBattle').replace('[TRAINER]', name);
      }

      case 'switch': {
        const [, pokemon, details] = args;
        const [side, fullname] = this.pokemonFull(pokemon, details);
        const template = this.template('switchIn', this.own(side));
        return template.replace('[TRAINER]', this.trainer(side))
            .replace('[FULLNAME]', fullname);
      }

      case 'drag': {
        const [, pokemon, details] = args;
        const [side, fullname] = this.pokemonFull(pokemon, details);
        const template = this.template('drag');
        return template.replace('[TRAINER]', this.trainer(side))
            .replace('[FULLNAME]', fullname);
      }

      case 'detailschange':
      case '-transform':
      case '-formechange': {
        const [, pokemon, arg2, arg3] = args;
        let newSpecies = '';
        switch (cmd) {
          case 'detailschange':
            newSpecies = arg2.split(',')[0].trim();
            break;
          case '-transform':
            newSpecies = arg3;
            break;
          case '-formechange':
            newSpecies = arg2;
            break;
        }
        const newSpeciesId = toID(newSpecies);
        let id = '';
        let templateName = 'transform';
        if (cmd !== '-transform') {
          switch (newSpeciesId) {
            case 'greninjaash':
              id = 'battlebond';
              break;
            case 'mimikyubusted':
              id = 'disguise';
              break;
            case 'zygardecomplete':
              id = 'powerconstruct';
              break;
            case 'necrozmaultra':
              id = 'ultranecroziumz';
              break;
            case 'darmanitanzen':
              id = 'zenmode';
              break;
            case 'darmanitan':
              id = 'zenmode';
              templateName = 'transformEnd';
              break;
            case 'aegislashblade':
              id = 'stancechange';
              break;
            case 'aegislash':
              id = 'stancechange';
              templateName = 'transformEnd';
              break;
            case 'wishiwashischool':
              id = 'schooling';
              break;
            case 'wishiwashi':
              id = 'schooling';
              templateName = 'transformEnd';
              break;
            case 'miniormeteor':
              id = 'shieldsdown';
              break;
            case 'minior':
              id = 'shieldsdown';
              templateName = 'transformEnd';
              break;
          }
        } else if (newSpecies) {
          id = 'transform';
        }
        const template =
            this.template(templateName, id, kwArgs.msg ? '' : 'NODEFAULT');
        const line1 = this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        return line1 +
            template.replace('[POKEMON]', this.pokemon(pokemon))
                .replace('[SPECIES]', newSpecies);
      }

      case 'switchout': {
        const [, pokemon] = args;
        const side = pokemon.slice(0, 2);
        const template =
            this.template('switchOut', kwArgs.from, this.own(side));
        return template.replace('[TRAINER]', this.trainer(side))
            .replace('[NICKNAME]', this.pokemonName(pokemon))
            .replace('[POKEMON]', this.pokemon(pokemon));
      }

      case 'faint': {
        const [, pokemon] = args;
        const template = this.template('faint');
        return template.replace('[POKEMON]', this.pokemon(pokemon));
      }

      case 'swap': {
        const [, pokemon, target] = args;
        if (!target || !isNaN(Number(target))) {
          const template = this.template('swapCenter');
          return template.replace('[POKEMON]', this.pokemon(pokemon));
        }
        const template = this.template('swap');
        return template.replace('[POKEMON]', this.pokemon(pokemon))
            .replace('[TARGET]', this.pokemon(target));
      }

      case 'move': {
        const [, pokemon, move] = args;
        let line1 = this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        if (kwArgs.zEffect) {
          line1 = this.template('zEffect').replace(
              '[POKEMON]', this.pokemon(pokemon));
        }
        const template = this.template('move', kwArgs.from);
        return line1 +
            template.replace('[POKEMON]', this.pokemon(pokemon))
                .replace('[MOVE]', move);
      }

      case 'cant': {
        let [, pokemon, effect, move] = args;
        const id = toID(Parser.effect(effect));
        switch (id) {
          case 'damp':
          case 'dazzling':
          case 'queenlymajesty':
            // thanks Marty
            [pokemon, kwArgs.of] = [kwArgs.of, pokemon];
            break;
        }
        const template = this.template('cant', effect, 'NODEFAULT') ||
            this.template(move ? 'cant' : 'cantNoMove');
        const line1 = this.maybeAbility(effect, kwArgs.of || pokemon);
        return line1 +
            template.replace('[POKEMON]', this.pokemon(pokemon))
                .replace('[MOVE]', move);
      }

      case 'message': {
        const [, message] = args;
        return '' + message + '\n';
      }

      case '-start': {
        const [, pokemon, effect, arg3] = args;
        const line1 = this.maybeAbility(effect, pokemon) ||
            this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        const id = toID(Parser.effect(effect));
        if (id === 'typechange') {
          const template = this.template('typeChange', kwArgs.from);
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[TYPE]', arg3)
                  .replace('[SOURCE]', this.pokemon(kwArgs.of));
        }
        if (id === 'typeadd') {
          const template = this.template('typeAdd', kwArgs.from);
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[TYPE]', arg3);
        }
        if (id.startsWith('stockpile')) {
          const num = id.slice(9);
          const template = this.template('start', 'stockpile');
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[NUMBER]', num);
        }
        if (id.startsWith('perish')) {
          const num = id.slice(6);
          const template = this.template('activate', 'perishsong');
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[NUMBER]', num);
        }
        let templateId = 'start';
        if (kwArgs.already) templateId = 'alreadyStarted';
        if (kwArgs.fatigue) templateId = 'startFromFatigue';
        if (kwArgs.zeffect) templateId = 'startFromZEffect';
        if (kwArgs.damage) templateId = 'activate';
        if (kwArgs.block) templateId = 'block';
        if (kwArgs.upkeep) templateId = 'upkeep';
        if (id === 'reflect' || id === 'lightscreen') templateId = 'startGen1';
        if (templateId === 'start' && kwArgs.from &&
            kwArgs.from.startsWith('item:')) {
          templateId += 'FromItem';
        }
        const template = this.template(templateId, effect);
        return line1 +
            template.replace('[POKEMON]', this.pokemon(pokemon))
                .replace('[EFFECT]', Parser.effect(effect))
                .replace('[MOVE]', arg3)
                .replace('[SOURCE]', this.pokemon(kwArgs.of))
                .replace('[ITEM]', Parser.effect(kwArgs.from));
      }

      case '-end': {
        const [, pokemon, effect] = args;
        const line1 = this.maybeAbility(effect, pokemon) ||
            this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        const id = toID(Parser.effect(effect));
        if (id === 'doomdesire' || id === 'futuresight') {
          const template = this.template('activate', effect);
          return line1 + template.replace('[TARGET]', this.pokemon(pokemon));
        }
        const templateId = 'end';
        let template = '';
        if (kwArgs.from && kwArgs.from.startsWith('item:')) {
          template = this.template('endFromItem', effect);
        }
        if (!template) template = this.template(templateId, effect);
        return line1 +
            template.replace('[POKEMON]', this.pokemon(pokemon))
                .replace('[EFFECT]', Parser.effect(effect))
                .replace('[SOURCE]', this.pokemon(kwArgs.of));
      }

      case '-ability': {
        let [, pokemon, ability, oldAbility, arg4] = args;
        let line1 = '';
        if (oldAbility &&
            (oldAbility.startsWith('p1') || oldAbility.startsWith('p2') ||
             oldAbility === 'boost')) {
          arg4 = oldAbility;
          oldAbility = '';
        }
        if (oldAbility) line1 += this.ability(oldAbility, pokemon);
        line1 += this.ability(ability, pokemon);
        if (kwArgs.fail) {
          const template = this.template('block', kwArgs.from);
          return line1 + template;
        }
        if (kwArgs.from) {
          line1 = this.maybeAbility(kwArgs.from, pokemon) + line1;
          const template = this.template('changeAbility', kwArgs.from);
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[ABILITY]', Parser.effect(ability))
                  .replace('[SOURCE]', this.pokemon(kwArgs.of));
        }
        const id = toID(Parser.effect(ability));
        if (id === 'unnerve') {
          const template = this.template('start', ability);
          return line1 + template.replace('[TEAM]', this.team(arg4));
        }
        let templateId = 'start';
        if (id === 'anticipation' || id === 'sturdy') templateId = 'activate';
        const template = this.template(templateId, ability, 'NODEFAULT');
        return line1 + template.replace('[POKEMON]', this.pokemon(pokemon));
      }

      case '-endability': {
        const [, pokemon, ability] = args;
        if (ability) return this.ability(ability, pokemon);
        const line1 = this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        const template = this.template('start', 'Gastro Acid');
        return line1 + template.replace('[POKEMON]', this.pokemon(pokemon));
      }

      case '-item': {
        const [, pokemon, item] = args;
        const id = toID(Parser.effect(kwArgs.from));
        let target = '';
        if (['magician', 'pickpocket'].includes(id)) {
          [target, kwArgs.of] = [kwArgs.of, ''];
        }
        const line1 = this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        if (['thief', 'covet', 'bestow', 'magician', 'pickpocket'].includes(
                id)) {
          const template = this.template('takeItem', kwArgs.from);
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[ITEM]', Parser.effect(item))
                  .replace('[SOURCE]', this.pokemon(target || kwArgs.of));
        }
        if (id === 'frisk') {
          const template = this.template(
              kwArgs.of && pokemon && kwArgs.of !== pokemon ?
                  'activate' :
                  'activateNoTarget',
              'Frisk');
          return line1 +
              template.replace('[POKEMON]', this.pokemon(kwArgs.of))
                  .replace('[ITEM]', Parser.effect(item))
                  .replace('[TARGET]', this.pokemon(pokemon));
        }
        if (kwArgs.from) {
          const template = this.template('addItem', kwArgs.from);
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[ITEM]', Parser.effect(item));
        }
        const template = this.template('start', item, 'NODEFAULT');
        return line1 + template.replace('[POKEMON]', this.pokemon(pokemon));
      }

      case '-enditem': {
        const [, pokemon, item] = args;
        const line1 = this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        if (kwArgs.eat) {
          const template = this.template('eatItem', kwArgs.from);
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[ITEM]', Parser.effect(item));
        }
        const id = toID(Parser.effect(kwArgs.from));
        if (id === 'gem') {
          const template = this.template('useGem', item);
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[ITEM]', Parser.effect(item))
                  .replace('[MOVE]', kwArgs.move);
        }
        if (id === 'stealeat') {
          const template = this.template('removeItem', 'Bug Bite');
          return line1 +
              template.replace('[SOURCE]', this.pokemon(kwArgs.of))
                  .replace('[ITEM]', Parser.effect(item));
        }
        if (kwArgs.from) {
          const template = this.template('removeItem', kwArgs.from);
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[ITEM]', Parser.effect(item))
                  .replace('[SOURCE]', this.pokemon(kwArgs.of));
        }
        if (kwArgs.weaken) {
          const template = this.template('activateWeaken');
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[ITEM]', Parser.effect(item));
        }
        let template = this.template('end', item, 'NODEFAULT');
        if (!template) {
          template = this.template('activateItem')
                         .replace('[ITEM]', Parser.effect(item));
        }
        return line1 +
            template.replace('[POKEMON]', this.pokemon(pokemon))
                .replace('[TARGET]', this.pokemon(kwArgs.of));
      }

      case '-status': {
        const [, pokemon, status] = args;
        const line1 = this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        if (toID(Parser.effect(kwArgs.from)) === 'rest') {
          const template = this.template('startFromRest', status);
          return line1 + template.replace('[POKEMON]', this.pokemon(pokemon));
        }
        const template = this.template('start', status);
        return line1 + template.replace('[POKEMON]', this.pokemon(pokemon));
      }

      case '-curestatus': {
        const [, pokemon, status] = args;
        if (toID(Parser.effect(kwArgs.from)) === 'naturalcure') {
          const template = this.template('activate', kwArgs.from);
          return template.replace('[POKEMON]', this.pokemon(pokemon));
        }
        const line1 = this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        if (kwArgs.from && kwArgs.from.startsWith('item:')) {
          const template = this.template('endFromItem', status);
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[ITEM]', Parser.effect(kwArgs.from));
        }
        if (kwArgs.thaw) {
          const template = this.template('endFromMove', status);
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[MOVE]', Parser.effect(kwArgs.from));
        }
        let template = this.template('end', status, 'NODEFAULT');
        if (!template) {
          template = this.template('end').replace('[EFFECT]', status);
        }
        return line1 + template.replace('[POKEMON]', this.pokemon(pokemon));
      }

      case '-cureteam': {
        return this.template('activate', kwArgs.from);
      }

      case '-singleturn':
      case '-singlemove': {
        const [, pokemon, effect] = args;
        const line1 = this.maybeAbility(effect, kwArgs.of || pokemon) ||
            this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        const id = toID(Parser.effect(effect));
        if (id === 'instruct') {
          const template = this.template('activate', effect);
          return line1 +
              template.replace('[POKEMON]', this.pokemon(kwArgs.of))
                  .replace('[TARGET]', this.pokemon(pokemon));
        }
        let template = this.template('start', effect, 'NODEFAULT');
        if (!template) {
          template =
              this.template('start').replace('[EFFECT]', Parser.effect(effect));
        }
        return line1 +
            template.replace('[POKEMON]', this.pokemon(pokemon))
                .replace('[SOURCE]', this.pokemon(kwArgs.of))
                .replace('[TEAM]', this.team(pokemon.slice(0, 2)));
      }

      case '-sidestart': {
        const [, side, effect] = args;
        let template = this.template('start', effect, 'NODEFAULT');
        if (!template) {
          template = this.template('startTeamEffect')
                         .replace('[EFFECT]', Parser.effect(effect));
        }
        return template.replace('[TEAM]', this.team(side));
      }

      case '-sideend': {
        const [, side, effect] = args;
        let template = this.template('end', effect, 'NODEFAULT');
        if (!template) {
          template = this.template('endTeamEffect')
                         .replace('[EFFECT]', Parser.effect(effect));
        }
        return template.replace('[TEAM]', this.team(side));
      }

      case '-weather': {
        const [, weather] = args;
        if (!weather || weather === 'none') {
          const template = this.template('end', kwArgs.from, 'NODEFAULT');
          if (!template) {
            return this.template('endFieldEffect')
                .replace('[EFFECT]', Parser.effect(weather));
          }
          return template;
        }
        if (kwArgs.upkeep) {
          return this.template('upkeep', weather, 'NODEFAULT');
        }
        const line1 = this.maybeAbility(kwArgs.from, kwArgs.of);
        let template = this.template('start', weather, 'NODEFAULT');
        if (!template) {
          template = this.template('startFieldEffect')
                         .replace('[EFFECT]', Parser.effect(weather));
        }
        return line1 + template;
      }

      case '-fieldstart':
      case '-fieldactivate': {
        const [, effect] = args;
        const line1 = this.maybeAbility(kwArgs.from, kwArgs.of);
        let templateId = cmd.slice(6);
        if (toID(Parser.effect(effect)) === 'perishsong') {
          templateId = 'start';
        }
        let template = this.template(templateId, effect, 'NODEFAULT');
        if (!template) {
          template = this.template('startFieldEffect')
                         .replace('[EFFECT]', Parser.effect(effect));
        }
        return line1 + template.replace('[POKEMON]', this.pokemon(kwArgs.of));
      }

      case '-fieldend': {
        const [, effect] = args;
        let template = this.template('end', effect, 'NODEFAULT');
        if (!template) {
          template = this.template('endFieldEffect')
                         .replace('[EFFECT]', Parser.effect(effect));
        }
        return template;
      }

      case '-sethp': {
        const effect = kwArgs.from;
        return this.template('activate', effect);
      }

      case '-message': {
        const [, message] = args;
        return '  ' + message + '\n';
      }

      case '-hint': {
        const [, message] = args;
        return '  (' + message + ')\n';
      }

      case '-activate': {
        let [, pokemon, effect, target] = args;
        const id = toID(Parser.effect(effect));
        if (id === 'celebrate') {
          return this.template('activate', 'celebrate')
              .replace('[TRAINER]', this.trainer(pokemon.slice(0, 2)));
        }
        if (!target && [
              'hyperspacefury', 'hyperspacehole', 'phantomforce', 'shadowforce',
              'feint'
            ].includes(id)) {
          [pokemon, target] = [kwArgs.of, pokemon];
          if (!pokemon) pokemon = target;
        }
        if (!target) target = kwArgs.of || pokemon;

        let line1 = this.maybeAbility(effect, pokemon);

        if (id === 'lockon' || id === 'mindreader') {
          const template = this.template('start', effect);
          return line1 +
              template.replace('[POKEMON]', this.pokemon(kwArgs.of))
                  .replace('[SOURCE]', this.pokemon(pokemon));
        }

        let templateId = 'activate';
        if (id === 'forewarn' && pokemon === target) {
          templateId = 'activateNoTarget';
        }
        let template = this.template(templateId, effect, 'NODEFAULT');
        if (!template) {
          if (line1) return line1;  // Abilities don't have a default template
          template = this.template('activate');
          return line1 + template.replace('[EFFECT]', Parser.effect(effect));
        }

        if (id === 'brickbreak') {
          template = template.replace('[TEAM]', this.team(target.slice(0, 2)));
        }
        if (kwArgs.ability) {
          line1 += this.ability(kwArgs.ability, pokemon);
        }
        if (kwArgs.ability2) {
          line1 += this.ability(kwArgs.ability2, target);
        }
        if (id === 'mummy') {
          line1 += this.ability('Mummy', target);
          template = this.template('changeAbility', 'Mummy');
        }
        if (kwArgs.move || kwArgs.number || kwArgs.item) {
          template = template.replace('[MOVE]', kwArgs.move)
                         .replace('[NUMBER]', kwArgs.number)
                         .replace('[ITEM]', kwArgs.item);
        }
        return line1 +
            template.replace('[POKEMON]', this.pokemon(pokemon))
                .replace('[TARGET]', this.pokemon(target))
                .replace('[SOURCE]', this.pokemon(kwArgs.of));
      }

      case '-prepare': {
        const [, pokemon, effect, target] = args;
        const template = this.template('prepare', effect);
        return template.replace('[POKEMON]', this.pokemon(pokemon))
            .replace('[TARGET]', this.pokemon(target));
      }

      case '-damage': {
        const [, pokemon, , percentage] = args;
        let template = this.template('damage', kwArgs.from, 'NODEFAULT');
        const line1 = this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        const id = toID(Parser.effect(kwArgs.from));
        if (template) {
          return line1 + template.replace('[POKEMON]', this.pokemon(pokemon));
        }

        if (!kwArgs.from) {
          template = this.template(percentage ? 'damagePercentage' : 'damage');
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[PERCENTAGE]', percentage);
        }
        if (kwArgs.from.startsWith('item:')) {
          template =
              this.template(kwArgs.of ? 'damageFromPokemon' : 'damageFromItem');
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[ITEM]', Parser.effect(kwArgs.from))
                  .replace('[SOURCE]', this.pokemon(kwArgs.of));
        }
        if (kwArgs.partiallytrapped || id === 'bind' || id === 'wrap') {
          template = this.template('damageFromPartialTrapping');
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[MOVE]', Parser.effect(kwArgs.from));
        }

        template = this.template('damage');
        return line1 + template.replace('[POKEMON]', this.pokemon(pokemon));
      }

      case '-heal': {
        const [, pokemon] = args;
        let template = this.template('heal', kwArgs.from, 'NODEFAULT');
        const line1 = this.maybeAbility(kwArgs.from, pokemon);
        if (template) {
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[SOURCE]', this.pokemon(kwArgs.of))
                  .replace('[NICKNAME]', kwArgs.wisher);
        }

        if (kwArgs.from && !kwArgs.from.startsWith('ability:')) {
          template = this.template('healFromEffect');
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[EFFECT]', Parser.effect(kwArgs.from));
        }

        template = this.template('heal');
        return line1 + template.replace('[POKEMON]', this.pokemon(pokemon));
      }

      case '-boost':
      case '-unboost': {
        let [, pokemon, stat, num] = args;
        if (stat === 'spa' && this.gen === 1) stat = 'spc';
        // tslint:disable-next-line:ban
        const amount = parseInt(num, 10);
        const line1 = this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        let templateId = cmd.slice(1);
        if (amount >= 3) {
          templateId += '3';
        } else if (amount >= 2) {
          templateId += '2';
        } else if (amount === 0) {
          templateId += '0';
        }
        if (amount && kwArgs.zeffect) {
          templateId +=
              (kwArgs.multiple ? 'MultipleFromZEffect' : 'FromZEffect');
        } else if (amount && kwArgs.from && kwArgs.from.startsWith('item:')) {
          templateId += 'FromItem';
        }
        const template = this.template(templateId, kwArgs.from);
        return line1 +
            template.replace('[POKEMON]', this.pokemon(pokemon))
                .replace('[STAT]', this.stat(stat));
      }

      case '-setboost': {
        const [, pokemon] = args;
        const effect = kwArgs.from;
        const line1 = this.maybeAbility(effect, kwArgs.of || pokemon);
        const template = this.template('boost', effect);
        return line1 + template.replace('[POKEMON]', this.pokemon(pokemon));
      }

      case '-swapboost': {
        const [, pokemon, target] = args;
        const line1 = this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        const id = toID(Parser.effect(kwArgs.from));
        let templateId = 'swapBoost';
        if (id === 'guardswap') templateId = 'swapDefensiveBoost';
        if (id === 'powerswap') templateId = 'swapOffensiveBoost';
        const template = this.template(templateId, kwArgs.from);
        return line1 +
            template.replace('[POKEMON]', this.pokemon(pokemon))
                .replace('[TARGET]', this.pokemon(target));
      }

      case '-copyboost': {
        const [, pokemon, target] = args;
        const line1 = this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        const template = this.template('copyBoost', kwArgs.from);
        return line1 +
            template.replace('[POKEMON]', this.pokemon(pokemon))
                .replace('[TARGET]', this.pokemon(target));
      }

      case '-clearboost':
      case '-clearpositiveboost':
      case '-clearnegativeboost': {
        const [, pokemon, source] = args;
        const line1 = this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        let templateId = 'clearBoost';
        if (kwArgs.zeffect) templateId = 'clearBoostFromZEffect';
        const template = this.template(templateId, kwArgs.from);
        return line1 +
            template.replace('[POKEMON]', this.pokemon(pokemon))
                .replace('[SOURCE]', this.pokemon(source));
      }

      case '-invertboost': {
        const [, pokemon] = args;
        const line1 = this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        const template = this.template('invertBoost', kwArgs.from);
        return line1 + template.replace('[POKEMON]', this.pokemon(pokemon));
      }

      case '-clearallboost': {
        return this.template('clearAllBoost', kwArgs.from);
      }

      case '-crit':
      case '-supereffective':
      case '-resisted': {
        const [, pokemon] = args;
        let templateId = cmd.slice(1);
        if (templateId === 'supereffective') templateId = 'superEffective';
        if (kwArgs.spread) templateId += 'Spread';
        const template = this.template(templateId);
        return template.replace('[POKEMON]', this.pokemon(pokemon));
      }

      case '-block': {
        const [, pokemon, effect, move] = args;
        const line1 = this.maybeAbility(effect, kwArgs.of || pokemon);
        const template = this.template('block', effect);
        return line1 +
            template.replace('[POKEMON]', this.pokemon(pokemon))
                .replace('[MOVE]', move);
      }

      case '-fail': {
        let [, pokemon, effect, stat] = args;
        const id = toID(Parser.effect(effect));
        const blocker = toID(Parser.effect(kwArgs.from));
        const line1 = this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        let templateId = 'block';
        if (['desolateland', 'primordialsea'].includes(blocker) &&
            !['sunnyday', 'raindance', 'sandstorm', 'hail'].includes(id)) {
          templateId = 'blockMove';
        } else if (blocker === 'uproar' && kwArgs.msg) {
          templateId = 'blockSelf';
        }
        let template = this.template(templateId, kwArgs.from);
        if (template) {
          return line1 + template.replace('[POKEMON]', this.pokemon(pokemon));
        }

        if (id === 'unboost') {
          template = this.template(stat ? 'failSingular' : 'fail', 'unboost');
          if (toID(Parser.effect(kwArgs.from)) === 'flowerveil') {
            template = this.template('block', kwArgs.from);
            pokemon = kwArgs.of;
          }
          return line1 +
              template.replace('[POKEMON]', this.pokemon(pokemon))
                  .replace('[STAT]', stat);
        }

        templateId = 'fail';
        if (['brn', 'frz', 'par', 'psn', 'slp', 'substitute'].includes(id)) {
          templateId = 'alreadyStarted';
        }
        if (kwArgs.heavy) templateId = 'failTooHeavy';
        if (kwArgs.weak) templateId = 'fail';
        if (kwArgs.forme) templateId = 'failWrongForme';
        template = this.template(templateId, id);
        return line1 + template.replace('[POKEMON]', this.pokemon(pokemon));
      }

      case '-immune': {
        const [, pokemon] = args;
        const line1 = this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        let template = this.template('block', kwArgs.from);
        if (!template) {
          const templateId = kwArgs.ohko ? 'immuneOHKO' : 'immune';
          template = this.template(
              pokemon ? templateId : 'immuneNoPokemon', kwArgs.from);
        }
        return line1 + template.replace('[POKEMON]', this.pokemon(pokemon));
      }

      case '-miss': {
        const [, source, pokemon] = args;
        const line1 = this.maybeAbility(kwArgs.from, kwArgs.of || pokemon);
        if (!pokemon) {
          const template = this.template('missNoPokemon');
          return line1 + template.replace('[SOURCE]', this.pokemon(source));
        }
        const template = this.template('miss');
        return line1 + template.replace('[POKEMON]', this.pokemon(pokemon));
      }

      case '-center':
      case '-ohko':
      case '-combine': {
        return this.template(cmd.slice(1));
      }

      case '-notarget': {
        return this.template('noTarget');
      }

      case '-mega':
      case '-primal': {
        const [, pokemon, species, item] = args;
        let id = '';
        let templateId = cmd.slice(1);
        if (species === 'Rayquaza') {
          id = 'dragonascent';
          templateId = 'megaNoItem';
        }
        if (!id && cmd === '-mega' && this.gen < 7) templateId = 'megaGen6';
        if (!item && cmd === '-mega') templateId = 'megaNoItem';
        let template = this.template(templateId);
        const side = pokemon.slice(0, 2);
        const pokemonName = this.pokemon(pokemon);
        if (cmd === '-mega') {
          const template2 = this.template('transformMega');
          template += template2.replace('[POKEMON]', pokemonName)
                          .replace('[SPECIES]', species);
        }
        return template.replace('[POKEMON]', pokemonName)
            .replace('[ITEM]', item)
            .replace('[TRAINER]', this.trainer(side));
      }

      case '-zpower': {
        const [, pokemon] = args;
        const template = this.template('zPower');
        return template.replace('[POKEMON]', this.pokemon(pokemon));
      }

      case '-burst': {
        const [, pokemon] = args;
        const template = this.template('activate', 'Ultranecrozium Z');
        return template.replace('[POKEMON]', this.pokemon(pokemon));
      }

      case '-zbroken': {
        const [, pokemon] = args;
        const template = this.template('zBroken');
        return template.replace('[POKEMON]', this.pokemon(pokemon));
      }

      case '-hitcount': {
        const [, , num] = args;
        if (num === '1') {
          return this.template('hitCountSingular');
        }
        return this.template('hitCount').replace('[NUMBER]', num);
      }

      case '-waiting': {
        const [, pokemon, target] = args;
        const template = this.template('activate', 'Water Pledge');
        return template.replace('[POKEMON]', this.pokemon(pokemon))
            .replace('[TARGET]', this.pokemon(target));
      }

      case '-anim': {
        return '';
      }

      default: { return null; }
    }
  }

  static escapeRegExp(input: string) {
    return input.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
  }
}
