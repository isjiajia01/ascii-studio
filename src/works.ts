import { applyPreset, DEFAULTS, PRESETS, type Params } from './engine/styles';

/**
 * The Library: finished looks on public-domain or CC0 sources (files in public/works/).
 * Each work is a preset plus optional tweaks; the generator opens the same source with the same settings via ?work=<id>.
 * Provenance for every file is recorded here and shown on the page; see DESIGN.md § Library.
 */
export interface Work {
  id: string;
  title: string;
  /** maker and year, as on a museum label */
  by: string;
  medium: string;
  kind: 'image' | 'video';
  file: string;
  w: number; h: number;
  /** seconds, video only */
  dur?: number;
  preset: string;
  tweak?: Partial<Params>;
  /** shown as the look's name when it is not a preset as-is */
  look?: string;
  note: string;
  credit: { author: string; source: string; url: string; licence: string; licenceUrl: string; };
}

const CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/';
const NASA = 'https://www.nasa.gov/nasa-brand-center/images-and-media/';

export const WORKS: Work[] = [
  {
    id: 'pearl', title: 'Girl with a Pearl Earring', by: 'Johannes Vermeer, c. 1665', medium: 'Painting', kind: 'image',
    file: 'pearl.jpg', w: 1367, h: 1600, preset: 'braillecolour',
    note: 'Each braille cell holds up to eight dots, enough to keep the turn of the cheek, the blue turban and the one highlight on the pearl.',
    credit: { author: 'Mauritshuis, The Hague, via Wikimedia Commons', source: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Meisje_met_de_parel.jpg', licence: 'Public domain', licenceUrl: 'https://commons.wikimedia.org/wiki/File:Meisje_met_de_parel.jpg' },
  },
  {
    id: 'launch', title: 'Artemis I lifts off', by: 'NASA / Sam Lott, 16 November 2022', medium: 'Video', kind: 'video',
    file: 'launch.mp4', w: 576, h: 720, dur: 9, preset: 'swarm', tweak: { detail: 110 },
    note: 'Particle swarm turns the exhaust into thousands of drifting sparks, while the rocket and the water tower beside the pad keep their shape.',
    credit: { author: 'NASA / Sam Lott', source: 'NASA Image and Video Library', url: 'https://images.nasa.gov/details/Artemis%20I%20Launch%202022%20CU%20tracking%20from%20Press%20Site_compressed', licence: 'Public domain (NASA media)', licenceUrl: NASA },
  },
  {
    id: 'bridge', title: 'Chain Bridge at night', by: 'Wilfredor, Budapest, 2013', medium: 'Photograph', kind: 'image',
    file: 'bridge.jpg', w: 1600, h: 894, preset: 'poster', tweak: { detail: 100, contrast: 1.3 },
    note: 'Every street light becomes one full dot, and the river keeps its reflections as rows of smaller ones.',
    credit: { author: 'Wilfredor', source: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Sz%C3%A9chenyi_Chain_Bridge_in_Budapest_at_night.jpg', licence: 'CC0 1.0', licenceUrl: CC0 },
  },
  {
    id: 'wave', title: 'The Great Wave', by: 'Katsushika Hokusai, c. 1830–32', medium: 'Woodblock print', kind: 'image',
    file: 'wave.jpg', w: 1600, h: 1075, preset: 'newspaper', tweak: { detail: 110 },
    note: 'A woodblock print goes back to print: black halftone dots on newsprint, the foam claws still sharp.',
    credit: { author: 'The Metropolitan Museum of Art (JP1847)', source: 'The Met Open Access', url: 'https://www.metmuseum.org/art/collection/search/45434', licence: 'Public domain (CC0)', licenceUrl: CC0 },
  },
  {
    id: 'jelly', title: 'Lion’s mane jelly', by: 'Benoît Prieur, Aquarium of the Pacific, 2023', medium: 'Video', kind: 'video',
    file: 'jelly.mp4', w: 720, h: 900, dur: 9, preset: 'classic', look: 'Ice terminal (tuned)',
    tweak: { style: 'detailed', detail: 150, colorMode: 'palette', palette: 'ice', bg: '#020611', glow: 45, contrast: 1.25 },
    note: 'Not a preset: the long Detailed ramp in the Ice palette with glow, so the bell reads as light coming through water.',
    credit: { author: 'Benoît Prieur', source: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:VIDEO_Lion%27s_mane_jelly_Aquarium_of_the_Pacific_July_2023.webm', licence: 'CC0 1.0', licenceUrl: CC0 },
  },
  {
    id: 'lynx', title: 'Carpathian lynx', by: 'Wilfredor, 2024', medium: 'Photograph', kind: 'image',
    file: 'lynx.jpg', w: 1600, h: 1127, preset: 'poster', look: 'Round dots, paper on carbon (tuned)',
    tweak: { colorMode: 'mono', fg: '#f0eadc', bg: '#0b0b0a', detail: 120, contrast: 1.4, brightness: -0.04 },
    note: 'Poster halftone in one ink: warm paper dots on carbon. Big dots carry the pale fur, and the forest behind falls away into small ones.',
    credit: { author: 'Wilfredor', source: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Portrait_of_a_Carpathian_Lynx.jpg', licence: 'CC0 1.0', licenceUrl: CC0 },
  },
  {
    id: 'sea', title: 'Sun on the sea', by: 'Mostafameraji, 2020', medium: 'Video', kind: 'video',
    file: 'sea.mp4', w: 1280, h: 720, dur: 4.6, preset: 'neon', look: 'Neon blocks, Sunset palette',
    tweak: { palette: 'sunset', bg: '#12061f', detail: 110, glow: 30 },
    note: 'Shade blocks in three sunset inks flatten the sky into bands, like a screen print, while the glitter on the water keeps moving.',
    credit: { author: 'Mostafameraji', source: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Ocean_surface_waves_06.ogv', licence: 'CC0 1.0', licenceUrl: CC0 },
  },
  {
    id: 'aldrin', title: 'Buzz Aldrin on the Moon', by: 'Neil Armstrong / NASA, 1969', medium: 'Photograph', kind: 'image',
    file: 'aldrin.jpg', w: 1280, h: 1600, preset: 'noir', tweak: { detail: 130, contrast: 1.2, brightness: 0.05 },
    note: 'Noir braille, lifted a little: the visor and its reflection stay readable, and the suit’s folds turn to fine dots against the grey dust.',
    credit: { author: 'NASA (AS11-40-5903)', source: 'NASA via Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Aldrin_Apollo_11_original.jpg', licence: 'Public domain (NASA media)', licenceUrl: NASA },
  },
  {
    id: 'orion', title: 'Earth from Orion', by: 'NASA, 16 November 2022', medium: 'Video', kind: 'video',
    file: 'orion.mp4', w: 800, h: 600, dur: 12, preset: 'onebit',
    note: 'One bit per pixel: the Earth’s edge turns into a hard white crescent beside the spacecraft’s hull.',
    credit: { author: 'NASA (Johnson Space Center)', source: 'NASA Image and Video Library', url: 'https://images.nasa.gov/details/jsc2022m000270_Orion_First_Imagery_Timelapse_and_Original_221117', licence: 'Public domain (NASA media)', licenceUrl: NASA },
  },
];

export const findWork = (id: string | null) => WORKS.find(w => w.id === id) ?? null;
/** The work's full settings: its preset, then its tweaks. */
export const workParams = (w: Work): Params => ({ ...applyPreset(DEFAULTS, w.preset), ...(w.tweak || {}) });
export const presetName = (id: string) => PRESETS.find(p => p.id === id)?.name ?? id;
export const lookName = (w: Work) => w.look ?? presetName(w.preset);
/** Media live in public/works/, which sits next to every page folder after the build. */
export const workUrl = (w: Work) => new URL('../works/' + w.file, location.href).href;
