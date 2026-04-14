import {
  AnnotationUi,
  PlanUi,
  ChartFilterUi,
  ForecastUi,
  CountTypeUi,
  AxisUi,
} from "../js/modules/chart-types/uis.js";

describe("Test AnnotationUi", () => {
  describe("AnnotationUi.elements", () => {
    it('should return a table named "annotations"', () => {
      const elements = AnnotationUi.elements();
      expect(elements[0]).to.include({ tag: "table", name: "annotations" });
    });

    it("should have the correct select options for positions", () => {
      const tableFields = AnnotationUi.elements()[0].elements;
      const positionField = tableFields.find((f) => f.name === "position");

      expect(positionField.options).to.deep.equal([
        "th",
        "tv",
        "mh",
        "mv",
        "bh",
        "bv",
      ]);
      expect(positionField.default).to.equal("th");
    });
  });
  describe("AnnotationUi.validate - Success", () => {
    it("should return formatted rows when data is valid", () => {
      const values = {
        annotations: [
          "2024-01-01",
          "New Year",
          "th",
          "2024-07-04",
          "Holiday",
          "bv",
        ].join(","),
      };

      const [errors, warnings, attributes, result] =
        AnnotationUi.validate(values);

      expect(errors).to.be.empty;
      expect(result).to.have.lengthOf(2);
      // Check first row content
      expect(result[0].row).to.deep.equal(["2024-01-01", "New Year", "th"]);
    });
  });
  describe("AnnotationUi.validate - Failures", () => {
    it("should catch invalid dates and missing labels", () => {
      const values = {
        annotations: ["not-a-date", "", "th"].join(","),
      };

      const [errors] = AnnotationUi.validate(values);

      expect(errors).to.have.lengthOf(1);
      expect(errors[0].annotations).to.contain("Row 1: Invalid date");
      expect(errors[0].annotations).to.contain("Label required");
    });

    it("should catch invalid position values", () => {
      const values = {
        annotations: ["2024-01-01", "Test", "invalid-pos"].join(","),
      };

      const [errors] = AnnotationUi.validate(values);

      expect(errors[0].annotations).to.contain("Row 1: Invalid position");
    });

    it("should accumulate errors across multiple rows with row numbering", () => {
      const values = {
        annotations: [
          "2024-01-01",
          "Valid",
          "th", // Row 1: Valid
          "invalid",
          "",
          "th", // Row 2: Invalid
        ].join(","),
      };

      const [errors] = AnnotationUi.validate(values);

      expect(errors[0].annotations).to.not.contain("Row 1:");
      expect(errors[0].annotations).to.contain(
        "Row 2: Invalid date, Label required",
      );
    });
  });
  describe("AnnotationUi.validate - Empty State", () => {
    it("should return empty lists if annotations key is missing or empty", () => {
      expect(AnnotationUi.validate({})[0]).to.be.empty;
      expect(AnnotationUi.validate({ annotations: [] })[0]).to.be.empty;
    });
  });
});

describe("Test PlanUi", () => {
  describe("PlanUi.elements", () => {
    it("should return the correct configuration structure", () => {
      const elements = PlanUi.elements();
      const planObject = elements[0];

      expect(planObject).to.include({ tag: "object", name: "plan" });
      expect(planObject.elements).to.have.lengthOf(6);

      // Verify specific field properties
      const scopeTo = planObject.elements.find((e) => e.name === "scopeTo");
      expect(scopeTo.list).to.deep.equal(["Max"]);
    });
  });

  describe("PlanUi.validate - Success", () => {
    it('should validate and expand the "sigmoid" preset', () => {
      const values = {
        plan: "2024-01-01, 2024-12-31, 0, Max, sigmoid, My Plan",
      };
      const [errors, warnings, attributes, result] = PlanUi.validate(values);

      expect(errors).to.be.empty;
      expect(result.points).to.be.an("array");
      expect(result.points[1]).to.equal(0.02); // Checks sigmoid expansion
      expect(result.scopeTo).to.equal("max");
    });

    it("should accept custom numeric arrays for points", () => {
      // Note: assuming _.getArray converts this string to [0, 5, 10]
      const values = { plan: "2024-01-01, 2024-02-01, 10, 100, 0 5 10, Label" };
      const [errors, warnings, attributes, result] = PlanUi.validate(values);

      expect(errors).to.be.empty;
      expect(result.points).to.deep.equal([0, 5, 10]);
    });
  });
  describe("PlanUi.validate - Failures", () => {
    it("should error if end date is before start date", () => {
      const values = { plan: "2024-05-01, 2024-01-01, 0, Max, line, Plan" };
      const [errors] = PlanUi.validate(values);

      expect(errors[0].plan).to.contain("End date must be > start");
    });

    it("should error if scopeFrom is negative", () => {
      const values = { plan: "2024-01-01, 2024-02-01, -5, Max, line, Plan" };
      const [errors] = PlanUi.validate(values);

      expect(errors[0].plan).to.contain("Scope from must be a number >= 0");
    });

    it("should error for invalid points format", () => {
      const values = {
        plan: "2024-01-01, 2024-02-01, 0, Max, justOneNumber, Plan",
      };
      const [errors] = PlanUi.validate(values);

      expect(errors[0].plan).to.contain(
        'Points to must be "line", "sigmoid" or an array of min 2 numbers',
      );
    });
  });
  describe("PlanUi.validate - Edge Cases", () => {
    it("should use the default placeholder if label is empty", () => {
      const values = { plan: "2024-01-01, 2024-02-01, 0, 100, line, " };
      const [, , , result] = PlanUi.validate(values);

      expect(result.label).to.equal("Plan");
    });

    it("should return empty arrays if plan key is missing", () => {
      const [errors] = PlanUi.validate({});
      expect(errors).to.be.empty;
    });
  });
});

describe("Test ChartFilterUi", () => {
  describe("ChartFilterUi.elements", () => {
    const config = { columnNames: ["Sales", "Region", "Date"] };
    const elements = ChartFilterUi.elements({ config });

    it('should return a table element named "chartFilter"', () => {
      expect(elements).to.be.an("array");
      expect(elements[0]).to.include({ tag: "table", name: "chartFilter" });
    });

    it("should include the dynamic column names in the LHS select", () => {
      const tableElements = elements[0].elements;
      const lhsSelect = tableElements.find((el) => el.name === "column");

      expect(lhsSelect.options).to.deep.equal(["Sales", "Region", "Date"]);
    });

    it("should define default values for logical operators", () => {
      const tableElements = elements[0].elements;
      const logicalOp = tableElements.find((el) => el.name === "logicalOp");
      const compareOp = tableElements.find((el) => el.name === "compareOp");

      expect(logicalOp.default).to.equal("and");
      expect(compareOp.default).to.equal("in");
    });
  });

  describe("ChartFilterUi.validate", () => {
    it("should return empty lists if no conditions are provided", () => {
      const input = { chartFilter: [] };
      const [errors, warnings, attributes] = ChartFilterUi.validate(input);

      expect(errors).to.be.empty;
      expect(warnings).to.be.empty;
    });

    it("should return an error string if fields are missing in a row", () => {
      // Input is a flat array representing one row: [relationalOp, lhs, logicalOp, rhs]
      // We leave 'rhs' (index 3) null.
      const input = {
        chartFilter: ["and", "Sales", "eq", ""].join(","),
      };

      const [errors] = ChartFilterUi.validate(input);
      expect(errors).to.have.lengthOf(1);
      expect(errors[0]).to.have.property("chartFilter");
      expect(errors[0].chartFilter).to.contain("Row 1: RHS required");
    });

    it("should accumulate errors across multiple rows", () => {
      const input = {
        chartFilter: [
          "and",
          null,
          "eq",
          "100", // Row 1 missing LHS
          null,
          "Region",
          "in",
          "East", // Row 2 missing Relational Op
        ].join(","),
      };

      const [errors] = ChartFilterUi.validate(input);
      const errorMsg = errors[0].chartFilter;

      expect(errorMsg).to.contain("Row 1: LHS required");
      expect(errorMsg).to.contain("Row 2: Relational op required");
    });

    it("should return correctly formatted data on success", () => {
      const input = {
        chartFilter: ["and", "Sales", "eq", "500"].join(","),
      };

      const [errors, warnings, attributes, result] =
        ChartFilterUi.validate(input);

      expect(errors).to.be.empty;
      expect(result).to.be.an("array").with.lengthOf(1);
      expect(result[0]).to.deep.equal({
        column: "Sales",
        op: "eq",
        values: "500",
        andOr: "and",
      });
    });
  });
});

describe("Test ForecastUi", () => {
  describe("ForecastUi.elements", () => {
    it("should return a nested object structure for forecast", () => {
      const elements = ForecastUi.elements();
      const forecastObj = elements[0];

      expect(forecastObj.tag).to.equal("object");
      expect(forecastObj.name).to.equal("forecast");
      expect(forecastObj.elements).to.have.lengthOf(3);

      const lookBack = forecastObj.elements.find((e) => e.name === "lookBack");
      expect(lookBack.tag).to.equal("text");
    });
  });
  describe("ForecastUi.validate - Success", () => {
    it("should parse valid comma-separated input", () => {
      // Input: lookBack, forecastTo, label
      const values = { forecast: "30, max, Growth Plan" };
      const [errors, warnings, attributes, result] =
        ForecastUi.validate(values);

      expect(errors).to.be.empty;
      expect(result).to.deep.include({
        lookBack: "30",
        forecastTo: "max",
        label: "Growth Plan",
      });
    });

    it("should generate a dynamic label placeholder if label is empty", () => {
      const values = { forecast: "14, max, " };
      const [, , , result] = ForecastUi.validate(values);

      // Should use the logic: "Forecast (14 days)"
      expect(result.label).to.equal("Forecast (14 days)");
    });
    it("should generate a dynamic label placeholder based on lookBack", () => {
      const values = { forecast: "7, max, " };
      const [, , , result] = ForecastUi.validate(values);

      // Should use the logic: "Forecast (lookBack days)"
      expect(result.label).to.equal("Forecast (7 days)");
    });

    it("should accept a valid date for forecastTo", () => {
      const values = { forecast: "10, 2026-12-31, " };
      const [errors] = ForecastUi.validate(values);

      expect(errors).to.be.empty;
    });
  });
  describe("ForecastUi.validate - Failures", () => {
    it("should error if lookBack is not a positive integer", () => {
      const values = { forecast: "-5, max, Plan" };
      const [errors] = ForecastUi.validate(values);

      expect(errors[0].forecast).to.contain("Look back must be a integer > 0");
    });

    it('should error if forecastTo is neither "max" nor a valid date', () => {
      const values = { forecast: "30, not-a-date, Plan" };
      const [errors] = ForecastUi.validate(values);

      expect(errors[0].forecast).to.contain(
        'Forecast to must be "max" or date',
      );
    });

    it("should accumulate multiple errors in the same row", () => {
      const values = { forecast: "abc, invalid, " };
      const [errors] = ForecastUi.validate(values);

      expect(errors[0].forecast).to.contain("Look back must be a integer > 0");
      expect(errors[0].forecast).to.contain(
        'Forecast to must be "max" or date',
      );
    });
  });
});

describe("Test CountTypeUi", () => {
  describe("CountTypeUi.elements", () => {
    const config = { columnNames: ["Revenue", "Users"] };

    it('should include "Over column" when hasColOver is true', () => {
      const elements = CountTypeUi.elements({ config, hasColOver: true });
      const selects = elements[0].elements;

      expect(selects.find((e) => e.name === "colOver")).to.exist;
      expect(selects.find((e) => e.name === "colOver").options).to.deep.equal([
        "Revenue",
        "Users",
      ]);
    });

    it('should exclude "Over column" when hasColOver is false', () => {
      const elements = CountTypeUi.elements({ config, hasColOver: false });
      const selects = elements[0].elements;

      // The code returns an empty object {} if hasColOver is false
      const colOverElement = selects.find((e) => e.name === "colOver");
      expect(colOverElement).to.be.undefined;
    });
  });
  describe("CountTypeUi.validate", () => {
    it('should disable "colOver" when countType is "Count"', () => {
      const values = { countType: "Count", colOver: "Revenue" };
      const [errors, warnings, attributes] = CountTypeUi.validate(values);
      const colOverAttr = attributes.find((a) => a.name === "colOver");
      expect(colOverAttr.attrs).to.deep.equal(["disabled", true]);
    });

    it('should enable "colOver" for "Sum" or "Average"', () => {
      const values = { countType: "Sum", colOver: "Revenue" };
      const [, , attributes] = CountTypeUi.validate(values);
      const lastAttr = attributes.filter((a) => a.name === "colOver").pop();
      expect(lastAttr.attrs).to.deep.equal(["disabled", false]);
    });
  });
  describe("CountTypeUi.description", () => {
    it('should return "count" for the Count type', () => {
      expect(CountTypeUi.description({ countType: "Count" })).to.equal("count");
    });

    it('should return "summed [column]" for Sum type', () => {
      const desc = CountTypeUi.description({
        countType: "Sum",
        colOver: "Revenue",
      });
      expect(desc).to.equal("summed Revenue");
    });

    it('should return "average [column]" for Average type', () => {
      const desc = CountTypeUi.description({
        countType: "Average",
        colOver: "Users",
      });
      expect(desc).to.equal("average Users");
    });

    it("should fallback gracefully if colOver is missing", () => {
      // Falls back to lowercased countType
      expect(CountTypeUi.description({ countType: "Sum" })).to.equal("sum");
    });
  });
});

describe("Test AxisUi", () => {
  describe("AxisUi.elements", () => {
    const config = { columnNames: ["Sales", "Date"] };

    it("should apply the prefix to all element names", () => {
      const prefix = "xAxis_";
      const result = AxisUi.elements({ config, prefix, legend: "X Axis" });
      const elements = result[0].elements;

      // Check a few specific fields
      expect(elements.find((e) => e.label === "Column").name).to.equal(
        "xAxis_column",
      );
      expect(elements.find((e) => e.label === "Data type").name).to.equal(
        "xAxis_dataType",
      );
    });

    it("should sort the data types alphabetically", () => {
      const dataTypes = ["String", "Date", "Number"];
      const result = AxisUi.elements({ config, prefix: "", dataTypes });
      const typeField = result[0].elements.find((e) => e.name === "dataType");

      expect(typeField.options).to.deep.equal(["Date", "Number", "String"]);
    });
  });
  describe("AxisUi.validate - Visibility & Data Types", () => {
    const prefix = "x_";
    const HIDE = { attrs: "hidden" }; // Mock constants
    const SHOW = { attrs: "visible" };

    it('should show only "dateFormat" when dataType is Date', () => {
      const values = { x_dataType: "Date" };
      const [errors, warnings, attributes] = AxisUi.validate(values, prefix);

      // Should contain the HIDE attribute for all 4 fields initially
      expect(attributes[0].names).to.include("x_dateFormat");

      // Should then push a SHOW attribute specifically for dateFormat
      const showAttr = attributes.find((a) => a.name === "x_dateFormat");
      expect(showAttr).to.exist;
    });

    it('should show "separator" for List types', () => {
      const values = { x_dataType: "List" };
      const [, , attributes] = AxisUi.validate(values, prefix);

      expect(attributes.find((a) => a.name === "x_separator")).to.exist;
    });
  });
  describe("AxisUi.validate - Bin Validation", () => {
    const prefix = "x_";

    it("should allow a valid integer bin (> 1)", () => {
      const values = { x_dataType: "Number", x_bin: "5" };
      const [errors] = AxisUi.validate(values, prefix);
      expect(errors).to.be.empty;
    });

    it("should error if bin is an integer <= 1", () => {
      const values = { x_dataType: "Number", x_bin: "1" };
      const [errors] = AxisUi.validate(values, prefix);
      expect(errors[0].message).to.contain("Must be integer > 1");
    });

    it("should allow an increasing sequence of numbers", () => {
      const values = { x_dataType: "Number", x_bin: "10, 20, 30" };
      const [errors] = AxisUi.validate(values, prefix);
      expect(errors).to.be.empty;
    });

    it("should error if the sequence is not increasing", () => {
      const values = { x_dataType: "Number", x_bin: "10, 5, 20" };
      const [errors] = AxisUi.validate(values, prefix);
      expect(errors[0].message).to.contain("list of increasing numbers");
    });

    it("should error if the sequence contains non-numbers", () => {
      const values = { x_dataType: "Number", x_bin: "10, abc, 30" };
      const [errors] = AxisUi.validate(values, prefix);
      expect(errors[0].name).to.equal("x_bin");
    });
  });
});
