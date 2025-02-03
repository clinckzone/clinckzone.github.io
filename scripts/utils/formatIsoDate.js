function formatIsoDateToDayMonthYear(isoString) {
  // Create a Date object from the ISO string
  const date = new Date(isoString);

  // Helper function to get the ordinal suffix (st, nd, rd, th)
  function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return "th"; // covers 4th, 5th ... 20th
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  }

  // Extract the parts of the date (using UTC to match the .000Z time)
  const day = date.getUTCDate();
  const month = date.toLocaleString("en", { month: "long", timeZone: "UTC" });
  const year = date.getUTCFullYear();

  // Combine them into the final string
  return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
}

module.exports = { formatIsoDateToDayMonthYear };
