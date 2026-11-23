"use strict";
// todo move to param
export const DISPLAY_OTHERS = "..."; //String.fromCharCode(8230)  //UNICODEU+02026 HEX CODE&#x2026; HTML CODE&#8230; HTML ENTITY&hellip; CSS CODE\2026
export const DISPLAY_INVALID = "UND"; //String.fromCharCode(8264) //QUESTION EXCLAMATION MARK//"?" //HTML CODE&#8264;
export const DISPLAY_INVALID_NUMBER = "NAN";
export const DISPLAY_INVALID_DATE = "NAD";
export const DISPLAY_SPACES = "SP"; //String.fromCharCode(8709) //"Space" //&#8709;
export const DISPLAY_LESS = "LT";
export const DISPLAY_MORE = "GT";

export const isInvalidDisplay = (x) =>
  x == DISPLAY_INVALID ||
  x == DISPLAY_INVALID_DATE ||
  x == DISPLAY_INVALID_NUMBER;

export const displayOrder = [
  DISPLAY_LESS,
  DISPLAY_MORE,
  DISPLAY_OTHERS,
  DISPLAY_SPACES,
  DISPLAY_INVALID_DATE,
  DISPLAY_INVALID_NUMBER,
  DISPLAY_INVALID,
];

export const ANNOTATION_POSITIONS = [
  "th",
  "top horizotal",
  "tv",
  "top vertical",
  "mh",
  "mid horizontal",
  "mv",
  "mid vertical",
  "bh",
  "botton horizontal",
  "bv",
  "bottom vertical",
];

const region = undefined; // to do move to param?

export const MONTHS = Array.from({ length: 12 }, (_, m) => {
  const date = new Date(2026, m, 1);
  return new Intl.DateTimeFormat(region, { month: "short" }).format(date);
});

export const WEEKDAYS = Array.from({ length: 7 }, (_, wd) => {
  const date = new Date(2026, 9, 11 + wd); //2026-10-11 is Sunday
  return new Intl.DateTimeFormat(region, { weekday: "short" }).format(date);
});
//to do move to param?
export const WORKDAYS = [0, 1, 1, 1, 1, 1, 0];

export const MAX_BAR_CATS = 30;
export const MAX_2X2_CATS = 10;
