// ============================================================
//  VEXCHESS · Códice Vexborn (personajes cosméticos + lore)
//  Los Vexborn NO afectan a reglas, Elo, emparejamiento ni IA.
//  Su valor es narrativo y educativo: cada uno enseña un concepto
//  real de ajedrez. Arte en assets/vexborn/<formato>/<key>.webp.
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

// Expansiones narrativas (una entrada por colección + el teaser de NULL).
export const EXPANSIONS = {
  origins: {
    key: 'origins', order: 1, phase: 'awakening', available: true, accent: '#FF3B47',
    name: t('vexborn.exp.origins.name'), subtitle: t('vexborn.exp.origins.subtitle'),
    tagline: t('vexborn.exp.origins.tagline'), premise: t('vexborn.exp.origins.premise'),
    status: t('vexborn.exp.origins.status'), keyart: 'assets/vexborn/banner/kael.webp',
  },
  crownfall: {
    key: 'crownfall', order: 2, phase: 'fracture', available: true, accent: '#914FE8',
    name: t('vexborn.exp.crownfall.name'), subtitle: t('vexborn.exp.crownfall.subtitle'),
    tagline: t('vexborn.exp.crownfall.tagline'), premise: t('vexborn.exp.crownfall.premise'),
    status: t('vexborn.exp.crownfall.status'), keyart: 'assets/vexborn/keyart/crownfall.webp',
  },
  nullvariation: {
    key: 'nullvariation', order: 3, phase: 'anomaly', available: false, accent: '#8892A0',
    name: t('vexborn.exp.nullvariation.name'), subtitle: t('vexborn.exp.nullvariation.subtitle'),
    tagline: t('vexborn.exp.nullvariation.tagline'), premise: t('vexborn.exp.nullvariation.premise'),
    status: t('vexborn.exp.nullvariation.status'), keyart: null,
  },
};
export function expansions() { return Object.values(EXPANSIONS).sort((a, b) => a.order - b.order); }

function champ(key, collection, rarity, avatarSrc, extra) {
  return Object.assign({
    key, name: extra.name, collection, rarity, avatarSrc,
    title: t('vexborn.char.' + key + '.title'),
    piece: t('vexborn.char.' + key + '.piece'),
    archetype: t('vexborn.char.' + key + '.archetype'),
    color: t('vexborn.char.' + key + '.color'),
    quote: t('vexborn.char.' + key + '.quote'),
    desc: t('vexborn.char.' + key + '.desc'),
    personality: t('vexborn.char.' + key + '.personality'),
    concept: t('vexborn.char.' + key + '.concept'),
  }, extra.fragment ? { fragment: t('vexborn.char.' + key + '.fragment') } : {});
}

export const VEXBORN = [
  // ---------------- ORIGINS · El Primer Movimiento ----------------
  champ('kael',      'origins', 'origin', 'vex-knight',    { name: 'Kael' }),
  champ('aurelia',   'origins', 'origin', 'ivory-queen',   { name: 'Aurelia' }),
  champ('bastion',   'origins', 'origin', 'cobalt-rook',   { name: 'Bastion' }),
  champ('nyra',      'origins', 'origin', 'violet-bishop', { name: 'Nyra' }),
  champ('pip',       'origins', 'origin', 'teal-pawn',     { name: 'Pip' }),
  champ('ordan',     'origins', 'origin', 'golden-king',   { name: 'Ordan' }),
  champ('noctis',    'origins', 'origin', 'shadow-knight', { name: 'Noctis' }),
  champ('eira-vhal', 'origins', 'mythic', 'rival-duo',     { name: 'Eira & Vhal' }),

  // ---------------- CROWNFALL · La Corona Fracturada ----------------
  champ('rhazek',  'crownfall', 'distinguished', 'rhazek',  { name: 'Rhazek',  fragment: 1 }),
  champ('oryn',    'crownfall', 'distinguished', 'oryn',    { name: 'Oryn',    fragment: 1 }),
  champ('vesra',   'crownfall', 'mythic',        'vesra',   { name: 'Vesra',   fragment: 1 }),
  champ('brakkon', 'crownfall', 'distinguished', 'brakkon', { name: 'Brakkon', fragment: 1 }),
  champ('ilyra',   'crownfall', 'mythic',        'ilyra',   { name: 'Ilyra',   fragment: 1 }),
  champ('tikk',    'crownfall', 'distinguished', 'tikk',    { name: 'Tikk',    fragment: 1 }),
  champ('malrec',  'crownfall', 'mythic',        'malrec',  { name: 'Malrec',  fragment: 1 }),
  champ('solenne', 'crownfall', 'distinguished', 'solenne', { name: 'Solenne', fragment: 1 }),
];

const BY_KEY = Object.fromEntries(VEXBORN.map(v => [v.key, v]));
export function vexbornByKey(key) { return BY_KEY[key] || null; }
export function vexbornByCollection(cid) { return VEXBORN.filter(v => v.collection === cid); }

// Todos los campeones tienen arte dedicado (Origins v2 + Crownfall).
export function vexbornAvailable(v) { return !!(v && v.key); }
// Retrato cuadrado (tarjetas, héroe): avatar premium.
export function vexbornPortrait(v) { return v ? 'assets/vexborn/avatar/' + v.key + '.webp' : null; }
// Card vertical (ficha, colección).
export function vexbornCard(v) { return v ? 'assets/vexborn/card/' + v.key + '.webp' : null; }
// Splash cinematográfico (ficha, héroe).
export function vexbornSplash(v) { return v ? 'assets/vexborn/splash/' + v.key + '.webp' : null; }
// Banner panorámico (cabeceras, fondo del héroe).
export function vexbornBanner(v) { return v ? 'assets/vexborn/banner/' + v.key + '.webp' : null; }
// Avatar equipable (encaja con el sistema de avatares img:<nombre>).
export function vexbornAvatar(v) { return v && v.avatarSrc ? 'img:' + v.avatarSrc : null; }
