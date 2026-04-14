import { _ } from "../js/modules/util.js";

// import vitest from 'https://cdn.jsdelivr.net/npm/vitest@4.1.4/+esm'
// console.log(vitest)

describe('Test "util" ', function () {

  describe('Test "formatDate"', function () {
    it("'DDD' Format", function () {
      expect(_.formatDate("2025-10-01", "DDD")).to.equal("Wed");
      expect(_.formatDate("2025-10-02", "DDD")).to.equal("Thu");
      expect(_.formatDate("2025-10-03", "DDD")).to.equal("Fri");
      expect(_.formatDate("2025-10-05", "DDD")).to.equal("Sun");
    });
    it("'DD' Format", function () {
      expect(_.formatDate("2025-10-01", "DD")).to.equal("01");
      expect(_.formatDate("2025-10-02", "DD")).to.equal("02");
      expect(_.formatDate("2025-10-03", "DD")).to.equal("03");
      expect(_.formatDate("2025-10-05", "DD")).to.equal("05");
    });
    it("'MM' Format", function () {
      expect(_.formatDate("2025-10-01", "MM")).to.equal("10");
      expect(_.formatDate("2025-12-02", "MM")).to.equal("12");
      expect(_.formatDate("2025-02-05", "MM")).to.equal("02");
    });
    it("'MMM' Format", function () {
      expect(_.formatDate("2025-10-01", "MMM")).to.equal("Oct");
      expect(_.formatDate("2025-12-02", "MMM")).to.equal("Dec");
      expect(_.formatDate("2025-02-05", "MMM")).to.equal("Feb");
    });
    it("Mixed Format", function () {
      expect(_.formatDate("2025-10-01", "DD-MMM")).to.equal("01-Oct");
      expect(_.formatDate("2025-12-02", "MMM-YY")).to.equal("Dec-25");
      expect(_.formatDate("2025-02-05", "DD/MMM/YY")).to.equal("05/Feb/25");
    });
      
    it("Invalid date", function () {
      expect(_.formatDate("xxx", "DDD")).to.equal("NAD");
      expect(_.formatDate("", "DDD")).to.equal("NAD");
      expect(_.formatDate("")).to.equal("NAD");
      expect(_.formatDate("2025-13-03", "MM")).to.equal("NAD");
      expect(_.formatDate("2025-02-29", "MM")).to.equal("NAD"); //check this
    });
  });

  describe("Test addDays()", function () {
    describe("Core Math Operations", function () {
      it("should add 5 days to a standard date", function () {
        const result = _.addDays("2025-06-01", 5);
        expect(result).to.equal("2025-06-06");
      });

      it("should subtract days correctly with negative input", function () {
        const result = _.addDays("2025-06-10", -5);
        expect(result).to.equal("2025-06-05");
      });

      it("should roll over to the next month correctly", function () {
        const result = _.addDays("2025-01-31", 1);
        expect(result).to.equal("2025-02-01");
      });

      it("should handle year transitions", function () {
        const result = _.addDays("2025-12-31", 1);
        expect(result).to.equal("2026-01-01");
      });
    });

    describe("Calendar Edge Cases", function () {
      it("should respect Leap Years (adding to Feb 28, 2024)", function () {
        const result = _.addDays("2024-02-28", 1);
        expect(result).to.equal("2024-02-29");
      });

      it("should skip Feb 29 on non-Leap Years (2025)", function () {
        const result = _.addDays("2025-02-28", 1);
        expect(result).to.equal("2025-03-01");
      });
    });

    describe("Input Validation & Resilience", function () {
      it("should return the original dateTimeStart if days is 0", function () {
        const input = "2025-01-01";
        expect(_.addDays(input, 0)).to.equal(input);
      });

      it("should return the original dateTimeStart if days is NaN", function () {
        const input = "2025-01-01";
        expect(_.addDays(input, "not-a-number")).to.equal(input);
      });

      it("should correctly parse days if passed as a string", function () {
        // Your code uses Number(days), so this should pass
        expect(_.addDays("2025-01-01", "10")).to.equal("2025-01-11");
      });

      it("should return 10 characters (YYYY-MM-DD)", function () {
        const result = _.addDays("2025-01-01T12:00:00Z", 1);
        expect(result).to.have.lengthOf(10);
        expect(result).to.match(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe("isValidDate() Tests", function () {
    describe("Format 1: YYYY-MM-DD", function () {
      it("should return true for a valid ISO-style date", function () {
        expect(_.isValidDate("2025-05-20")).to.be.true;
      });

      it("should return true for dates with forward slashes (YYYY/MM/DD)", function () {
        expect(_.isValidDate("2025/05/20")).to.be.true;
      });

      it("should return false if the year is before 2000", function () {
        expect(_.isValidDate("1999-12-31")).to.be.false;
      });

      it("should return false for invalid months (e.g., 13)", function () {
        expect(_.isValidDate("2025-13-01")).to.be.false;
      });
      
    });

    describe("Format 2: DD-MMM-YY (Short Year)", function () {
      it("should return true for valid short-year format (e.g., 15-MAY-25)", function () {
        expect(_.isValidDate("15-MAY-25")).to.be.true;
      });

      it("should return true regardless of case (15-may-25)", function () {
        expect(_.isValidDate("15-may-25")).to.be.true;
      });

      it("should return false for invalid month abbreviations", function () {
        expect(_.isValidDate("15-XYZ-25")).to.be.false;
      });
    });

    describe("Format 3: DD-MMM-YYYY (Full Year)", function () {
      it("should return true for valid full-year format (e.g., 20-JAN-2026)", function () {
        expect(_.isValidDate("20-JAN-2026")).to.be.true;
      });

      it("should return false if the DD-MMM-YYYY string is the wrong length", function () {
        // Testing the "date.length != 11" check in your code
        expect(_.isValidDate("1-JAN-2026")).to.be.false;
      });
    });

    describe("Calendar Logic (Leap Years & Month Ends)", function () {
      it("should return true for Feb 29 on a Leap Year (2024)", function () {
        expect(_.isValidDate("2024-02-29")).to.be.true;
      });

      it("should return false for Feb 29 on a Non-Leap Year (2025)", function () {
        expect(_.isValidDate("2025-02-29")).to.be.false;
      });

      it("should return false for invalid days (e.g., 30-Feb)", function () {
        expect(_.isValidDate("2025-02-30")).to.be.false;
      });

      it("should return true for the 31st of months that have 31 days", function () {
        expect(_.isValidDate("2025-01-31")).to.be.true; // January
        expect(_.isValidDate("2025-08-31")).to.be.true; // August
      });

      it("should return false for the 31st of months that only have 30 days", function () {
        expect(_.isValidDate("2025-04-31")).to.be.false; // April
        expect(_.isValidDate("2025-06-31")).to.be.false; // June
      });
    });

    describe("Edge Cases & Invalid Inputs", function () {
      it("should return false for non-string inputs", function () {
        expect(_.isValidDate(20250520)).to.be.false;
        expect(_.isValidDate(null)).to.be.false;
        expect(_.isValidDate(undefined)).to.be.false;
      });

      it("should return false for empty strings", function () {
        expect(_.isValidDate("")).to.be.false;
      });

      it("should return false for complete gibberish", function () {
        expect(_.isValidDate("apple-pie-2025")).to.be.false;
      });
    });
  });

  describe("Test dateTimeDiff()", () => {
    describe("Standard Formats", () => {
      it("should calculate difference in Milliseconds", () => {
        const start = "2023-10-01T12:00:00";
        const end = "2023-10-01T12:00:01";
        expect(_.dateTimeDiff(start, end, "Milliseconds")).to.equal(1000);
      });

      it("should calculate difference in Days (rounded up)", () => {
        const start = "2023-10-01";
        const end = "2023-10-03";
        // 2 full days
        expect(_.dateTimeDiff(start, end, "Days")).to.equal(2);
      });

      it("should calculate difference in Weeks", () => {
        const start = "2023-10-01";
        const end = "2023-10-15";
        expect(_.dateTimeDiff(start, end, "Weeks")).to.equal(2);
      });
    });

    describe("Workdays Logic", () => {
      it("should return 5 workdays for a full week (Mon to Mon)", () => {
        const start = "2023-10-02"; // Monday
        const end = "2023-10-09"; // Following Monday
        // Excludes start day: Tue, Wed, Thu, Fri, Mon = 5
        expect(_.dateTimeDiff(start, end, "Workdays")).to.equal(5);
      });

      it("should skip weekends correctly", () => {
        const start = "2023-10-06"; // Friday
        const end = "2023-10-09"; // Monday
        // Excludes start day: Sat (X), Sun (X), Mon = 1
        expect(_.dateTimeDiff(start, end, "Workdays")).to.equal(1);
      });

      it("should handle large ranges using the weekly jump logic", () => {
        const start = "2023-01-02"; // Monday
        const end = "2023-01-23"; // Monday (3 weeks later)
        expect(_.dateTimeDiff(start, end, "Workdays")).to.equal(15);
      });

      it("should return 0 if start and end are the same day", () => {
        const start = "2023-10-02";
        const end = "2023-10-02";
        expect(_.dateTimeDiff(start, end, "Workdays")).to.equal(0);
      });
    });

    describe("Edge Cases & Normalization", () => {
      it("should be case-insensitive and handle whitespace in format", () => {
        const start = "2023-10-01";
        const end = "2023-10-02";
        expect(_.dateTimeDiff(start, end, "  daYs  ")).to.equal(1);
      });

      it("should handle Date objects as well as strings", () => {
        const start = new Date("2023-10-01");
        const end = new Date("2023-10-02");
        expect(_.dateTimeDiff(start, end, "Days")).to.equal(1);
      });
    });
  });

  describe("Test toRows()", () => {
    it("should split a comma-separated string into chunks of the specified length", () => {
      const input = "a, b, c, d, e, f";
      const result = _.toRows(input, 2);

      expect(result).to.deep.equal([
        ["a", "b"],
        ["c", "d"],
        ["e", "f"],
      ]);
    });

    it("should trim whitespace from each value", () => {
      const input = "apple ,  banana,cherry,  date ";
      const result = _.toRows(input, 2);

      expect(result[0]).to.deep.equal(["apple", "banana"]);
      expect(result[1]).to.deep.equal(["cherry", "date"]);
    });

    it("should handle uneven splits by putting remaining items in the last row", () => {
      const input = "1, 2, 3, 4, 5";
      const result = _.toRows(input, 2);

      expect(result).to.have.lengthOf(3);
      expect(result[2]).to.deep.equal(["5"]);
    });

    it("should coerce string rowLength into a number", () => {
      const input = "a, b, c, d";
      const result = _.toRows(input, "2"); // Passing string instead of number

      expect(result).to.have.lengthOf(2);
      expect(result[0]).to.deep.equal(["a", "b"]);
    });

    describe("Edge Cases & Validation", () => {
      it("should return an empty array if the string is empty or null", () => {
        expect(_.toRows("", 2)).to.be.an("array").that.is.empty;
        expect(_.toRows(null, 2)).to.be.an("array").that.is.empty;
      });

      it("should return an empty array if rowLength is missing or NaN", () => {
        expect(_.toRows("a,b,c", undefined)).to.be.an("array").that.is.empty;
        expect(_.toRows("a,b,c", "not-a-number")).to.be.an("array").that.is
          .empty;
      });

      it("should return an empty array if rowLength is 0", () => {
        // In JS, 0 is falsy, so !(rowLength) will trigger the return
        expect(_.toRows("a,b,c", 0)).to.be.an("array").that.is.empty;
      });
    });
  });
  describe("Test isPresent()", () => {
    describe("Valid Strings", () => {
      it("should return true for a standard string", () => {
        expect(_.isPresent("hello")).to.be.true;
      });

      it("should return true for a string with numbers", () => {
        expect(_.isPresent("123")).to.be.true;
      });

      it("should return true for a string that contains whitespace but also characters", () => {
        expect(_.isPresent("  word  ")).to.be.true;
      });
    });
    describe("Invalid Strings & Empty Values", () => {
      it("should return false for an empty string", () => {
        expect(_.isPresent("")).to.be.false;
      });

      it("should return false for a string containing only whitespace", () => {
        expect(_.isPresent("   ")).to.be.false;
        expect(_.isPresent("\n\t")).to.be.false;
      });

      it("should return false for null", () => {
        expect(_.isPresent(null)).to.be.false;
      });

      it("should return false for undefined", () => {
        expect(_.isPresent(undefined)).to.be.false;
        expect(_.isPresent()).to.be.false;
      });
    });

    describe("Non-String Types", () => {
      it("should return false for numbers", () => {
        expect(_.isPresent(123)).to.be.false;
      });

      it("should return false for booleans", () => {
        expect(_.isPresent(true)).to.be.false;
        expect(_.isPresent(false)).to.be.false;
      });

      it("should return false for objects or arrays", () => {
        expect(_.isPresent({})).to.be.false;
        expect(_.isPresent(["a"])).to.be.false;
      });
    });
  });
});
