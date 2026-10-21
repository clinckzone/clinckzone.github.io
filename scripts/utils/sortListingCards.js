const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

// Parses the card date written by formatIsoDateToDayMonthYear, e.g.
// "21st October 2026", into a UTC timestamp. Returns null for an empty or
// unrecognised date.
function parseCardDate(text) {
  const match = text
    .trim()
    .match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;

  const [, day, monthName, year] = match;
  const month = MONTHS.indexOf(monthName.toLowerCase());
  if (month === -1) return null;

  return Date.UTC(Number(year), month, Number(day));
}

// Reorders the cards inside a listing's .project-list: dated cards first,
// newest to oldest, then undated cards in the order they already appear.
function sortListingCards(document) {
  const list = document.querySelector(".project-list");
  if (!list) return;

  const cards = [...list.children].filter((el) => el.tagName === "A");

  const dated = [];
  const undated = [];
  for (const card of cards) {
    const dateEl = card.querySelector(".date");
    const time = dateEl ? parseCardDate(dateEl.textContent) : null;
    if (time === null) {
      undated.push(card);
    } else {
      dated.push({ card, time });
    }
  }

  // Array.prototype.sort is stable, so cards with the same date keep their
  // current relative order.
  dated.sort((a, b) => b.time - a.time);

  // Re-append in the new order. Appending an existing node moves it.
  for (const { card } of dated) list.appendChild(card);
  for (const card of undated) list.appendChild(card);
}

module.exports = { parseCardDate, sortListingCards };
