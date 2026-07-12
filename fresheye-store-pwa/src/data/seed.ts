import type { Branch, Catalog, Dept, Inventory, Role, Subcat, User } from '../types';

export const BRANCHES: Branch[] = [
  { id: 'rosh', name: 'ראש העין שכונה C', short: 'ראש העין', addr: 'שבזי 229', tel: '054-6786129' },
  { id: 'oryeh', name: 'אאוטלט אור יהודה', short: 'אור יהודה', addr: 'כרמל 5', tel: '054-8137180' },
  { id: 'kfarsaba', name: 'אאוטלט כפר סבא', short: 'כפר סבא', addr: 'זאב בלפר 15', tel: '054-3104340' },
  { id: 'petah', name: 'אאוטלט פתח תקווה', short: 'פתח תקווה', addr: 'פתח תקווה', tel: '054-9131588' },
  { id: 'beer', name: 'באר יעקב', short: 'באר יעקב', addr: 'יצחק שמיר 14', tel: '054-5161825' },
  { id: 'givat', name: 'גבעתיים', short: 'גבעתיים', addr: 'בורוכוב 54', tel: '054-6262376' },
  { id: 'tlv', name: 'תל אביב', short: 'תל אביב', addr: '—', tel: '—' },
  { id: 'shoham', name: 'שוהם', short: 'שוהם', addr: '—', tel: '—' },
  { id: 'nesz', name: 'נס ציונה', short: 'נס ציונה', addr: '—', tel: '—' },
  { id: 'modiin', name: 'מודיעין', short: 'מודיעין', addr: '—', tel: '—' },
  { id: 'yehud', name: 'יהוד', short: 'יהוד', addr: '—', tel: '—' },
  { id: 'givshmu', name: 'גבעת שמואל', short: 'גבעת שמואל', addr: '—', tel: '—' },
];

export const ROLE_LABELS: Record<Role, string> = {
  clerk: 'מוכרן',
  manager: 'מנהל סניף',
  exec: 'הנהלה',
};

export const SEED_USERS: User[] = [
  { id: 'u1', name: 'דנה לוי', role: 'clerk', branch: 'rosh' },
  { id: 'u2', name: 'יוסי כהן', role: 'manager', branch: 'kfarsaba' },
  { id: 'u3', name: 'מאיה אדרי', role: 'exec', branch: null },
];

export const DEPTS: Dept[] = [
  { id: 'fruit', name: 'פירות' },
  { id: 'veg', name: 'ירקות' },
];

export const SEED_SUBCATS: Subcat[] = [
  { id: 'f_fresh', dept: 'fruit', name: 'פירות טריים' },
  { id: 'f_summer', dept: 'fruit', name: 'פירות קיץ' },
  { id: 'f_dried', dept: 'fruit', name: 'פירות יבשים' },
  { id: 'f_cut', dept: 'fruit', name: 'פירות חתוכים' },
  { id: 'v_garden', dept: 'veg', name: 'ירקות גינה' },
  { id: 'v_roots', dept: 'veg', name: 'ירקות שורש' },
  { id: 'v_lettuce', dept: 'veg', name: 'חסות ונבטים' },
  { id: 'v_herbs', dept: 'veg', name: 'ירק ועשבי תיבול' },
  { id: 'v_mush', dept: 'veg', name: 'פטריות ופרחי מאכל' },
  { id: 'v_organic', dept: 'veg', name: 'ירק אורגני' },
];

// unitG (grams), par/reorder (kg), bulk, subcat id
export const SEED_CATALOG: Catalog = {
  'עגבנייה': { unitG: 110, boxKg: 5, par: 25, reorder: 8, bulk: false, cat: 'v_garden', freshH: 24, calib: 0 },
  'מלפפון': { unitG: 120, boxKg: 5, par: 20, reorder: 6, bulk: false, cat: 'v_garden', freshH: 24, calib: 0 },
  'פלפל אדום': { unitG: 160, boxKg: 5, par: 18, reorder: 5, bulk: false, cat: 'v_garden', freshH: 24, calib: 0 },
  'חציל': { unitG: 250, boxKg: 5, par: 15, reorder: 4, bulk: false, cat: 'v_garden', freshH: 24, calib: 0 },
  'קישוא': { unitG: 200, boxKg: 5, par: 15, reorder: 4, bulk: false, cat: 'v_garden', freshH: 24, calib: 0 },
  'כרוב': { unitG: 1200, boxKg: 10, par: 12, reorder: 3, bulk: false, cat: 'v_garden', freshH: 24, calib: 0 },
  'בצל יבש': { unitG: 130, boxKg: 10, par: 30, reorder: 10, bulk: false, cat: 'v_roots', freshH: 48, calib: 0 },
  'תפוח אדמה': { unitG: 150, boxKg: 10, par: 40, reorder: 12, bulk: false, cat: 'v_roots', freshH: 48, calib: 0 },
  'גזר': { unitG: 70, boxKg: 10, par: 25, reorder: 8, bulk: false, cat: 'v_roots', freshH: 48, calib: 0 },
  'חסה': { unitG: 300, boxKg: 5, par: 10, reorder: 3, bulk: false, cat: 'v_lettuce', freshH: 24, calib: 0 },
  'פטריות שמפיניון': { unitG: 0, boxKg: 3, par: 9, reorder: 3, bulk: true, cat: 'v_mush', freshH: 24, calib: 0 },
  'בזיליקום': { unitG: 0, boxKg: 1, par: 4, reorder: 1, bulk: true, cat: 'v_herbs', freshH: 24, calib: 0 },
  'תפוח עץ': { unitG: 180, boxKg: 10, par: 30, reorder: 9, bulk: false, cat: 'f_fresh', freshH: 48, calib: 0 },
  'בננה': { unitG: 120, boxKg: 13, par: 28, reorder: 8, bulk: false, cat: 'f_fresh', freshH: 24, calib: 0 },
  'תפוז': { unitG: 200, boxKg: 10, par: 25, reorder: 7, bulk: false, cat: 'f_fresh', freshH: 48, calib: 0 },
  'לימון': { unitG: 90, boxKg: 10, par: 12, reorder: 3, bulk: false, cat: 'f_fresh', freshH: 48, calib: 0 },
  'אגס': { unitG: 170, boxKg: 10, par: 18, reorder: 5, bulk: false, cat: 'f_fresh', freshH: 48, calib: 0 },
  'אבטיח': { unitG: 4000, boxKg: 20, par: 20, reorder: 5, bulk: false, cat: 'f_summer', freshH: 24, calib: 0 },
  'ענבים': { unitG: 0, boxKg: 4, par: 14, reorder: 4, bulk: true, cat: 'f_summer', freshH: 24, calib: 0 },
  'תות שדה': { unitG: 0, boxKg: 2, par: 8, reorder: 2, bulk: true, cat: 'f_summer', freshH: 12, calib: 0 },
};

const HOUR = 3600 * 1000;

export function seedInventory(): Inventory {
  const t = Date.now();
  const mk = (kg: number, h: number, by: string) => ({ kg, at: t - h * HOUR, by, conf: 0.9, backKg: 0, backAt: null, backBy: null });
  return {
    rosh: {
      'עגבנייה': mk(6.4, 2, 'דנה לוי'),
      'מלפפון': mk(14.2, 2, 'דנה לוי'),
      'בננה': mk(22.1, 3, 'דנה לוי'),
      'תפוח עץ': mk(5.2, 2, 'דנה לוי'),
      'אבטיח': mk(48, 27, 'דנה לוי'),
      'גזר': mk(18, 4, 'דנה לוי'),
    },
    kfarsaba: {
      'עגבנייה': mk(19.8, 1, 'יוסי כהן'),
      'פלפל אדום': mk(3.1, 1, 'יוסי כהן'),
      'גזר': mk(9.5, 5, 'יוסי כהן'),
      'תפוז': mk(24, 1, 'יוסי כהן'),
      'חסה': mk(2.4, 6, 'יוסי כהן'),
      'בננה': mk(15, 2, 'יוסי כהן'),
    },
    givat: {
      'תפוח אדמה': mk(11, 30, 'רן ש.'),
      'בצל יבש': mk(27, 30, 'רן ש.'),
      'ענבים': mk(3.2, 4, 'רן ש.'),
      'חציל': mk(14, 5, 'רן ש.'),
      'בננה': mk(7.5, 5, 'רן ש.'),
    },
    oryeh: {
      'עגבנייה': mk(22, 2, 'ליאת מ.'),
      'מלפפון': mk(17, 2, 'ליאת מ.'),
      'תפוח עץ': mk(26, 3, 'ליאת מ.'),
      'אבטיח': mk(60, 3, 'ליאת מ.'),
    },
    beer: {
      'תפוז': mk(4.5, 50, '—'),
      'לימון': mk(2, 50, '—'),
    },
  };
}
