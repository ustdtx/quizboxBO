export default {
  readAndValidate() {
    storeValue("csvErrors", []);
    storeValue("validatedCSV", []);

    const fileObj = CSV.files[0];
    if (!fileObj) {
      showAlert("No file selected", "error");
      return;
    }

    // Since dataFormat = Binary, the 'data' is already a CSV string
    const csvText = fileObj.data;

    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          console.log(result.errors);
          showAlert("CSV parsing failed", "error");
          return;
        }
        this.validateCSV(result.data);
      },
      error: (err) => {
        console.log(err);
        showAlert("Error parsing CSV", "error");
      }
    });
  },

  validateCSV(rows) {
    const requiredHeaders = [
      "question",
      "lang",
      "options",
      "correctAnswer",
      "points",
      "type",
      "explanation"
    ];

    let errors = [];

    if (!rows || rows.length === 0) {
      errors.push({ row: "-", field: "File", message: "CSV is empty" });
    }

    if (rows.length) {
      const headers = Object.keys(rows[0]);
      for (let h of requiredHeaders) {
        if (!headers.includes(h)) {
          errors.push({ row: 1, field: "Header", message: `Missing column: ${h}` });
        }
      }
    }

    const selectedLang = CSV_lang.selectedOptionValue;

    rows.forEach((r, i) => {
      const rowNo = i + 2;

      if (!r.question?.trim()) errors.push({ row: rowNo, field: "question", message: "Question is empty" });
      if (r.lang !== selectedLang) errors.push({ row: rowNo, field: "lang", message: `Must be "${selectedLang}"` });

      const options = r.options?.split("|").map(o => o.trim());
      if (!options || options.length < 2) errors.push({ row: rowNo, field: "options", message: "Invalid options format (use | to separate)" });
      if (options && !options.includes(r.correctAnswer?.trim())) errors.push({ row: rowNo, field: "correctAnswer", message: "Not found in options" });

      if (isNaN(Number(r.points))) errors.push({ row: rowNo, field: "points", message: "Must be a number" });

      const cleanType = r.type?.replace(",", "");
      if (!["mcq", "true_false", "mixed"].includes(cleanType)) errors.push({ row: rowNo, field: "type", message: "Invalid type" });

      if (!r.explanation && !r.type?.endsWith(",")) errors.push({ row: rowNo, field: "type", message: "Comma required if explanation is empty" });
    });

    if (errors.length > 0) {
      storeValue("csvErrors", errors);
      showModal(CSV_ErrorModal.name);
      showAlert(`${errors.length} error(s) found in CSV`, "error");
      return false;
    }

    storeValue("validatedCSV", rows);
    storeValue("csvErrors", []);
    closeModal(CSV_ErrorModal.name);
    showAlert("CSV is valid ✅", "success");
    return true;
  }
};
