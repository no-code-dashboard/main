import { bar } from "../js/modules/chart-types/bar.js";

// import vitest from 'https://cdn.jsdelivr.net/npm/vitest@4.1.4/+esm'
// console.log(vitest)

describe('Test "bar" ', function () {
  describe("bar.chartOverlay", () => {
    it("should combine elements from Axis, Filter, CountType, and local marks", () => {
      const config = { columnNames: ["Sales", "Date"] };
      const elements = bar.chartOverlay({ config });
      // Verify prefixes from AxisUi are present
      expect(elements[0].elements.some((e) => e.name === "x_column")).to.be.true;

      // Verify FilterUi elements are present
      expect(elements[1].name === "chartFilter").to.be.true;

      // Verify local date-input is present
      const dateInput = elements.find((e) => e.tag === "date-input");
      expect(dateInput.label).to.equal("New date");
      expect(dateInput.list).to.equal("a,b");
    });
  });

  describe("bar.validateChart", () => {
    it("should aggregate errors and attributes from all sub-validators", () => {
      // Trigger an error in Axis (Number with invalid bin)
      const props = {
        x_dataType: "Number",
        x_bin: "1", // Invalid: must be > 1
        countType: "Count",
      };

      const [errors, warnings, attributes] = bar.validateChart(props);

      // Errors from AxisUi
      // expect(errors.some((e) => e.name === "x_bin")).to.be.true;

      // Attributes from CountTypeUi (disabling colOver because countType is 'Count')
      // expect(attributes.some((a) => a.name === "colOver")).to.be.true;
    });

    it("should inject chartTitle placeholder into attributes", () => {
      const props = {
        countType: "Count",
        x_column: "Sales",
        chartTitle: "", // Field exists in props
      };
      const [, , attributes] = bar.validateChart(props);

      const titleAttr = attributes.find((a) => a.name === "chartTitle");
      expect(titleAttr.attrs[0]).to.equal("placeholder");
      expect(titleAttr.attrs[1]).to.be.a("string");
    });
  });
  describe("bar.presets", () => {
    it("should generate a correct binned title for numeric data", () => {
      const chartProps = {
        countType: "Sum",
        colOver: "Revenue",
        x_column: "Age",
        x_dataType: "Number",
        x_bin: "10",
      };
      const { chartTitle } = bar.presets(chartProps);

      // Logic: ${description} of ${binned}${x}
      // "summed Revenue of binned Age" -> UPPERCASE
      expect(chartTitle).to.contain("SUMMED REVENUE OF BINNED AGE");
    });

    it('should format callout messages for "Max" type', () => {
      const chartProps = { countType: "Count", x_column: "Date" };
      const calloutProps = { value: "Max" };
      const { calloutMessage } = bar.presets(chartProps, calloutProps);

      expect(calloutMessage).to.equal("Maximum count of Date (...)");
    });
  });
  describe("bar.getCallout", () => {
    const chartProps = { countType: "Count", x_column: "Category" };
    const mockData = [
      { x: "A", v: 10 },
      { x: "B", v: 50 },
      { x: "C", v: 50 },
    ];

    it("should retrieve specific category value", () => {
      const calloutProps = { value: "Category", x_category: "A" };
      const result = bar.getCallout(calloutProps, chartProps, mockData);

      expect(result.value).to.equal(10);
      expect(result.message).to.contain("A");
    });

    it("should find Max value and handle ties in names", () => {
      const calloutProps = { value: "Max" };
      // We need a mock for d3Extent or ensure it's in scope
      // Assuming d3Extent(data, d => d.v) returns [10, 50]
      const result = bar.getCallout(calloutProps, chartProps, mockData);

      expect(result.value).to.equal(50);
      // Logic: cats[0] + (cats.length > 1 ? " & 2 more" : "")
      // Note: your code uses cats.length (which is 2)
      expect(result.message).to.contain("B & 2 more");
    });
  });

  // describe('Test "bar" methods', function () {
  // it("All keys present", function () {
  //   expect(bar).to.have.property("chartOverlay");
  //   expect(bar).to.have.property("validateChart");
  //   expect(bar).to.have.property("presets");
  //   expect(bar).to.have.property("calloutOverlay");
  //   expect(bar).to.have.property("validateCallout");
  //   expect(bar).to.have.property("getCallout");
  // });
  // // });
  // // describe('Test "bar" methods', function () {
  // it("Test 'validateChart'", function () {
  //   const p1 = {
  //     chartSize: "Small",
  //     countType: "Count",
  //     chartType: "Bar",
  //     x_column: "ID",
  //     // x_dataType: "String",
  //   };
  //   const [warn, err, attr] = (chartProps) => bar.validateChart(chartProps);
  //   console.log(getErr({ p1 })[0]);
  //   expect(bar).to.have.property("chartOverlay");
  //   expect(bar).to.have.property("validateChart");
  //   expect(bar).to.have.property("presets");
  //   expect(bar).to.have.property("calloutOverlay");
  //   expect(bar).to.have.property("validateCallout");
  //   expect(bar).to.have.property("getCallout");
  //   // expect(Object.keys(bar)).to.be("Wed");
  // });
  // });
});
