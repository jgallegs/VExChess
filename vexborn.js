// ============================================================
//  VEXCHESS · Catálogo de Vexborn (personajes cosméticos)
//  Los Vexborn NO afectan a reglas, Elo, emparejamiento ni IA.
//  Assets en assets/vexborn/<key>/ (splash, card, banner, avatares).
// ============================================================
import { t } from './i18n.js?v=9';

// Rarezas (solo presentación, nunca jugabilidad).
export const RARITY = {
  origin:        { label: t('vexborn.rarity.origin'),        color: '#F6C453', order: 3 },
  mythic:        { label: t('vexborn.rarity.mythic'),        color: '#914FE8', order: 2 },
  distinguished: { label: t('vexborn.rarity.distinguished'), color: '#21CCE5', order: 1 },
  legacy:        { label: t('vexborn.rarity.legacy'),        color: '#FF3B47', order: 4 },
};
export function rarityMeta(r) { return RARITY[r] || RARITY.distinguished; }

// Colecciones.
export const COLLECTIONS = {
  origins:     { label: t('vexborn.collection.origins.label'),     desc: t('vexborn.collection.origins.desc') },
  expansion01: { label: t('vexborn.collection.expansion01.label'), desc: t('vexborn.collection.expansion01.desc') },
};

// key: usado en rutas de assets y como avatar equipado (avatar = 'vexborn:<key>').
export const VEXBORN = [
  // ---------------- ORIGINS (los 8 avatares originales) ----------------
  {
    key: 'kael', name: 'Kael', title: t('vexborn.char.kael.title'), collection: 'origins', rarity: 'origin',
    piece: t('vexborn.char.kael.piece'), archetype: t('vexborn.char.kael.archetype'), color: t('vexborn.char.kael.color'), avatarSrc: 'vex-knight',
    quote: t('vexborn.char.kael.quote'),
    desc: t('vexborn.char.kael.desc'),
    personality: t('vexborn.char.kael.personality'),
  },
  {
    key: 'aurelia', name: 'Aurelia', title: t('vexborn.char.aurelia.title'), collection: 'origins', rarity: 'origin',
    piece: t('vexborn.char.aurelia.piece'), archetype: t('vexborn.char.aurelia.archetype'), color: t('vexborn.char.aurelia.color'), avatarSrc: 'ivory-queen',
    quote: t('vexborn.char.aurelia.quote'),
    desc: t('vexborn.char.aurelia.desc'),
    personality: t('vexborn.char.aurelia.personality'),
  },
  {
    key: 'bastion', name: 'Bastion', title: t('vexborn.char.bastion.title'), collection: 'origins', rarity: 'origin',
    piece: t('vexborn.char.bastion.piece'), archetype: t('vexborn.char.bastion.archetype'), color: t('vexborn.char.bastion.color'), avatarSrc: 'cobalt-rook',
    quote: t('vexborn.char.bastion.quote'),
    desc: t('vexborn.char.bastion.desc'),
    personality: t('vexborn.char.bastion.personality'),
  },
  {
    key: 'nyra', name: 'Nyra', title: t('vexborn.char.nyra.title'), collection: 'origins', rarity: 'origin',
    piece: t('vexborn.char.nyra.piece'), archetype: t('vexborn.char.nyra.archetype'), color: t('vexborn.char.nyra.color'), avatarSrc: 'violet-bishop',
    quote: t('vexborn.char.nyra.quote'),
    desc: t('vexborn.char.nyra.desc'),
    personality: t('vexborn.char.nyra.personality'),
  },
  {
    key: 'pip', name: 'Pip', title: t('vexborn.char.pip.title'), collection: 'origins', rarity: 'origin',
    piece: t('vexborn.char.pip.piece'), archetype: t('vexborn.char.pip.archetype'), color: t('vexborn.char.pip.color'), avatarSrc: 'teal-pawn',
    quote: t('vexborn.char.pip.quote'),
    desc: t('vexborn.char.pip.desc'),
    personality: t('vexborn.char.pip.personality'),
  },
  {
    key: 'ordan', name: 'Ordan', title: t('vexborn.char.ordan.title'), collection: 'origins', rarity: 'origin',
    piece: t('vexborn.char.ordan.piece'), archetype: t('vexborn.char.ordan.archetype'), color: t('vexborn.char.ordan.color'), avatarSrc: 'golden-king',
    quote: t('vexborn.char.ordan.quote'),
    desc: t('vexborn.char.ordan.desc'),
    personality: t('vexborn.char.ordan.personality'),
  },
  {
    key: 'noctis', name: 'Noctis', title: t('vexborn.char.noctis.title'), collection: 'origins', rarity: 'origin',
    piece: t('vexborn.char.noctis.piece'), archetype: t('vexborn.char.noctis.archetype'), color: t('vexborn.char.noctis.color'), avatarSrc: 'shadow-knight',
    quote: t('vexborn.char.noctis.quote'),
    desc: t('vexborn.char.noctis.desc'),
    personality: t('vexborn.char.noctis.personality'),
  },
  {
    key: 'eira-vhal', name: 'Eira & Vhal', title: t('vexborn.char.eira-vhal.title'), collection: 'origins', rarity: 'mythic',
    piece: t('vexborn.char.eira-vhal.piece'), archetype: t('vexborn.char.eira-vhal.archetype'), color: t('vexborn.char.eira-vhal.color'), avatarSrc: 'rival-duo',
    quote: t('vexborn.char.eira-vhal.quote'),
    desc: t('vexborn.char.eira-vhal.desc'),
    personality: t('vexborn.char.eira-vhal.personality'),
  },

  // ---------------- EXPANSIÓN 01 (8 personajes nuevos) ----------------
  {
    key: 'rhazek', name: 'Rhazek', title: t('vexborn.char.rhazek.title'), collection: 'expansion01', rarity: 'distinguished',
    piece: t('vexborn.char.rhazek.piece'), archetype: t('vexborn.char.rhazek.archetype'), color: t('vexborn.char.rhazek.color'), avatarSrc: 'rhazek',
    quote: t('vexborn.char.rhazek.quote'),
    desc: t('vexborn.char.rhazek.desc'),
    personality: t('vexborn.char.rhazek.personality'),
  },
  {
    key: 'oryn', name: 'Oryn', title: t('vexborn.char.oryn.title'), collection: 'expansion01', rarity: 'distinguished',
    piece: t('vexborn.char.oryn.piece'), archetype: t('vexborn.char.oryn.archetype'), color: t('vexborn.char.oryn.color'), avatarSrc: 'oryn',
    quote: t('vexborn.char.oryn.quote'),
    desc: t('vexborn.char.oryn.desc'),
    personality: t('vexborn.char.oryn.personality'),
  },
  {
    key: 'vesra', name: 'Vesra', title: t('vexborn.char.vesra.title'), collection: 'expansion01', rarity: 'mythic',
    piece: t('vexborn.char.vesra.piece'), archetype: t('vexborn.char.vesra.archetype'), color: t('vexborn.char.vesra.color'), avatarSrc: 'vesra',
    quote: t('vexborn.char.vesra.quote'),
    desc: t('vexborn.char.vesra.desc'),
    personality: t('vexborn.char.vesra.personality'),
  },
  {
    key: 'brakkon', name: 'Brakkon', title: t('vexborn.char.brakkon.title'), collection: 'expansion01', rarity: 'distinguished',
    piece: t('vexborn.char.brakkon.piece'), archetype: t('vexborn.char.brakkon.archetype'), color: t('vexborn.char.brakkon.color'), avatarSrc: 'brakkon',
    quote: t('vexborn.char.brakkon.quote'),
    desc: t('vexborn.char.brakkon.desc'),
    personality: t('vexborn.char.brakkon.personality'),
  },
  {
    key: 'ilyra', name: 'Ilyra', title: t('vexborn.char.ilyra.title'), collection: 'expansion01', rarity: 'mythic',
    piece: t('vexborn.char.ilyra.piece'), archetype: t('vexborn.char.ilyra.archetype'), color: t('vexborn.char.ilyra.color'), avatarSrc: 'ilyra',
    quote: t('vexborn.char.ilyra.quote'),
    desc: t('vexborn.char.ilyra.desc'),
    personality: t('vexborn.char.ilyra.personality'),
  },
  {
    key: 'tikk', name: 'Tikk', title: t('vexborn.char.tikk.title'), collection: 'expansion01', rarity: 'distinguished',
    piece: t('vexborn.char.tikk.piece'), archetype: t('vexborn.char.tikk.archetype'), color: t('vexborn.char.tikk.color'), avatarSrc: 'tikk',
    quote: t('vexborn.char.tikk.quote'),
    desc: t('vexborn.char.tikk.desc'),
    personality: t('vexborn.char.tikk.personality'),
  },
  {
    key: 'malrec', name: 'Malrec', title: t('vexborn.char.malrec.title'), collection: 'expansion01', rarity: 'mythic',
    piece: t('vexborn.char.malrec.piece'), archetype: t('vexborn.char.malrec.archetype'), color: t('vexborn.char.malrec.color'), avatarSrc: 'malrec',
    quote: t('vexborn.char.malrec.quote'),
    desc: t('vexborn.char.malrec.desc'),
    personality: t('vexborn.char.malrec.personality'),
  },
  {
    key: 'solenne', name: 'Solenne', title: t('vexborn.char.solenne.title'), collection: 'expansion01', rarity: 'distinguished',
    piece: t('vexborn.char.solenne.piece'), archetype: t('vexborn.char.solenne.archetype'), color: t('vexborn.char.solenne.color'), avatarSrc: 'solenne',
    quote: t('vexborn.char.solenne.quote'),
    desc: t('vexborn.char.solenne.desc'),
    personality: t('vexborn.char.solenne.personality'),
  },
];

const BY_KEY = Object.fromEntries(VEXBORN.map(v => [v.key, v]));
export function vexbornByKey(key) { return BY_KEY[key] || null; }

// ¿Tiene arte disponible? Los Origins usan los avatares que ya están en el
// proyecto; los de la Expansión llegan cuando se añada su splash art.
export function vexbornAvailable(v) { return !!(v && v.avatarSrc); }
// Retrato del personaje (por ahora, su avatar de identidad).
export function vexbornPortrait(v) { return v && v.avatarSrc ? 'assets/social/avatars/' + v.avatarSrc + '.png' : null; }
// Avatar equipable (encaja con el sistema de avatares img:<nombre>).
export function vexbornAvatar(v) { return v && v.avatarSrc ? 'img:' + v.avatarSrc : null; }
// Splash cinematográfico (arte completo del personaje) para la ficha.
export function vexbornSplash(v) { return v ? 'assets/vexborn/splash/' + v.key + '.webp' : null; }
