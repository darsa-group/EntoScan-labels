const e = React.createElement;

function App() {
  const [labels, setLabels] = React.useState("");

  // Layout & code settings
  const [columns, setColumns] = React.useState(3);
  const [marginH, setMarginH] = React.useState(10); // mm
  const [marginV, setMarginV] = React.useState(10); // mm
  const [paddingH, setPaddingH] = React.useState(3); // mm
  const [paddingV, setPaddingV] = React.useState(3); // mm
  const [fontSize, setFontSize] = React.useState(10);     // pt
  const [codeSizeMm, setCodeSizeMm] = React.useState(12); // mm
  const [dpi, setDpi] = React.useState(200);
  const [paper, setPaper] = React.useState("A4");
  const [codeType, setCodeType] = React.useState("datamatrix"); // "datamatrix" or "qrcode"
  const [textPosition, setTextPosition] = React.useState("top"); // "top", "bottom", "left", "right"

  // Presets
  const [presets, setPresets] = React.useState([]);
  const [currentPresetName, setCurrentPresetName] = React.useState("Default");
  const [presetNameInput, setPresetNameInput] = React.useState("Default");

  const defaultPreset = {
    name: "Default",
    columns: 3,
    marginH: 10,
    marginV: 10,
    paddingH: 3,
    paddingV: 3,
    fontSize: 10,
    codeSizeMm: 12,
    dpi: 200,
    paper: "A4",
    codeType: "datamatrix",
    textPosition: "top",
  };

  function applyPresetToState(p) {
    setColumns(p.columns);
    setMarginH(p.marginH);
    setMarginV(p.marginV);
    setPaddingH(p.paddingH);
    setPaddingV(p.paddingV);
    setFontSize(p.fontSize);
    setCodeSizeMm(p.codeSizeMm);
    setDpi(p.dpi);
    setPaper(p.paper);
    setCodeType(p.codeType);
    setTextPosition(p.textPosition);
  }

  React.useEffect(function () {
    // Load presets from localStorage
    let storedPresets = [];
    const raw = window.localStorage.getItem("labelPresets");
    if (raw) {
      try {
        storedPresets = JSON.parse(raw) || [];
      } catch (e) {
        storedPresets = [];
      }
    }

    if (!Array.isArray(storedPresets) || storedPresets.length === 0) {
      storedPresets = [defaultPreset];
    }

    // Ensure default exists
    if (!storedPresets.some((p) => p.name === defaultPreset.name)) {
      storedPresets.unshift(defaultPreset);
    }

    setPresets(storedPresets);

    const lastName =
      window.localStorage.getItem("labelLastPreset") || defaultPreset.name;
    const presetToApply =
      storedPresets.find((p) => p.name === lastName) || storedPresets[0];

    applyPresetToState(presetToApply);
    setCurrentPresetName(presetToApply.name);
    setPresetNameInput(presetToApply.name);
  }, []);

  const handleSelectPreset = function (name) {
    setCurrentPresetName(name);
    const p = presets.find((pr) => pr.name === name);
    if (p) {
      applyPresetToState(p);
      setPresetNameInput(p.name);
      window.localStorage.setItem("labelLastPreset", p.name);
    }
  };

  const handleSavePreset = function () {
    let name = (presetNameInput || "").trim();
    if (!name) {
      name = currentPresetName || "Preset";
    }

    const presetData = {
      name,
      columns,
      marginH,
      marginV,
      paddingH,
      paddingV,
      fontSize,
      codeSizeMm,
      dpi,
      paper,
      codeType,
      textPosition,
    };

    const existingIndex = presets.findIndex((p) => p.name === name);
    const next = presets.slice();

    if (existingIndex >= 0) {
      next[existingIndex] = presetData;
    } else {
      next.push(presetData);
    }

    setPresets(next);
    setCurrentPresetName(name);
    setPresetNameInput(name);
    window.localStorage.setItem("labelPresets", JSON.stringify(next));
    window.localStorage.setItem("labelLastPreset", name);
  };

  const handleDeletePreset = function () {
    if (currentPresetName === "Default") {
      return;
    }
    const next = presets.filter((p) => p.name !== currentPresetName);
    let fallback = next.find((p) => p.name === "Default");
    if (!fallback) {
      fallback = next[0] || defaultPreset;
    }

    const finalPresets = next.length ? next : [defaultPreset];
    setPresets(finalPresets);
    applyPresetToState(fallback);
    setCurrentPresetName(fallback.name);
    setPresetNameInput(fallback.name);
    window.localStorage.setItem("labelPresets", JSON.stringify(finalPresets));
    window.localStorage.setItem("labelLastPreset", fallback.name);
  };

  const generate = async function () {
    const list = labels
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!list.length) {
      alert("No labels provided.");
      return;
    }

    const jsPDF = window.jspdf.jsPDF;

    // Paper size
    let pageWmm = 210,
      pageHmm = 297;
    if (paper === "LETTER") {
      pageWmm = 216;
      pageHmm = 279;
    }

    const mmToPt = (mm) => mm * 2.83465;

    const pageW = mmToPt(pageWmm);
    const pageH = mmToPt(pageHmm);

    const pdf = new jsPDF({
      unit: "pt",
      format: [pageW, pageH],
    });

    pdf.setFont("courier", "normal");

    // Margins and padding in points
    const marginHPt = mmToPt(marginH);
    const marginVPt = mmToPt(marginV);
    const paddingHPt = mmToPt(paddingH);
    const paddingVPt = mmToPt(paddingV);
    const codeSide = mmToPt(codeSizeMm);

    const contentW = pageW - 2 * marginHPt;
    const contentH = pageH - 2 * marginVPt;

    const textHeight = fontSize * 1.2;

    // Label width: columns evenly split
    const cellW = contentW / columns;

    // Label height: padding top + text + code + padding bottom
    const cellH = 2 * paddingVPt + textHeight + codeSide;

    // Number of rows that fit
    const rows = Math.floor(contentH / cellH);
    const perPage = rows * columns;

    if (rows <= 0) {
      alert(
        "Settings produce zero rows per page. Adjust margins, padding, or code/text size."
      );
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    for (let i = 0; i < list.length; i++) {
      if (i > 0 && i % perPage === 0) {
        pdf.addPage();
        pdf.setFont("courier", "normal");
      }

      const item = list[i];
      const indexOnPage = i % perPage;
      const col = indexOnPage % columns;
      const row = Math.floor(indexOnPage / columns);

      const xLabel = marginHPt + col * cellW;
      const yLabel = marginVPt + row * cellH;

      // Label boundary (dotted)
      try {
        if (pdf.setLineDash) {
          pdf.setLineDash([2, 2], 0);
        }
      } catch (e) {}
      pdf.setDrawColor(150);
      pdf.setLineWidth(0.3);
      pdf.rect(xLabel, yLabel, cellW, cellH);
      try {
        if (pdf.setLineDash) {
          pdf.setLineDash([]);
        }
      } catch (e) {}

      // Inner content area (after padding)
      const xInner = xLabel + paddingHPt;
      const yInner = yLabel + paddingVPt;
      const innerW = cellW - 2 * paddingHPt;
      const innerH = cellH - 2 * paddingVPt;

      // Prepare code image
      const px = dpi * 1.2;
      canvas.width = px;
      canvas.height = px;

      const bcid = codeType === "qrcode" ? "qrcode" : "datamatrix";

      try {
        bwipjs.toCanvas(canvas, {
          bcid: bcid,
          text: item,
          scale: 4,
          includetext: false,
        });
      } catch (err) {
        alert("Failed to generate code for: " + item);
        throw err;
      }

      const img = canvas.toDataURL("image/png");
      pdf.setFontSize(fontSize);

      if (textPosition === "top") {
        const textY_top = yInner + textHeight;
        const textX_top = xInner + innerW / 2;
        pdf.text(item, textX_top, textY_top, { align: "center" });

        const codeX_top = xInner + innerW / 2 - codeSide / 2;
        const codeY_top = textY_top + 4;
        pdf.addImage(img, "PNG", codeX_top, codeY_top, codeSide, codeSide);
      } else if (textPosition === "bottom") {
        const codeX_bottom = xInner + innerW / 2 - codeSide / 2;
        const codeY_bottom = yInner;
        pdf.addImage(img, "PNG", codeX_bottom, codeY_bottom, codeSide, codeSide);

        const textY_bottom = yInner + innerH - 4;
        const textX_bottom = xInner + innerW / 2;
        pdf.text(item, textX_bottom, textY_bottom, { align: "center" });
      } else if (textPosition === "left") {
        const codeX_left = xInner + innerW - codeSide;
        const codeY_left = yInner + (innerH - codeSide) / 2;
        pdf.addImage(img, "PNG", codeX_left, codeY_left, codeSide, codeSide);

        const textY_left = yInner + innerH / 2 + fontSize / 2 - 2;
        const textX_left = xInner + 2;
        pdf.text(item, textX_left, textY_left, { align: "left" });
      } else if (textPosition === "right") {
        const codeX_right = xInner;
        const codeY_right = yInner + (innerH - codeSide) / 2;
        pdf.addImage(img, "PNG", codeX_right, codeY_right, codeSide, codeSide);

        const textY_right = yInner + innerH / 2 + fontSize / 2 - 2;
        const textX_right = xInner + codeSide + 4;
        pdf.text(item, textX_right, textY_right, { align: "left" });
      }
    }

    pdf.save("labels.pdf");
  };

  return e(
    "div",
    { className: "card shadow-sm" },
    e(
      "div",
      { className: "card-body" },

      // Preset controls
      e(
        "div",
        { className: "row g-3 mb-3 align-items-end" },
        e(
          "div",
          { className: "col-md-4" },
          e("label", { className: "form-label mb-1" }, "Preset"),
          e(
            "select",
            {
              className: "form-select form-select-sm",
              value: currentPresetName,
              onChange: function (ev) {
                handleSelectPreset(ev.target.value);
              },
            },
            presets.map(function (p) {
              return e("option", { key: p.name, value: p.name }, p.name);
            })
          )
        ),
        e(
          "div",
          { className: "col-md-4" },
          e("label", { className: "form-label mb-1" }, "Preset name"),
          e("input", {
            type: "text",
            className: "form-control form-control-sm",
            value: presetNameInput,
            onChange: function (ev) {
              setPresetNameInput(ev.target.value);
            },
          })
        ),
        e(
          "div",
          { className: "col-md-4 d-grid" },
          e("label", { className: "form-label mb-1 invisible" }, "Save"),
          e(
            "button",
            {
              className: "btn btn-sm btn-outline-primary",
              onClick: handleSavePreset,
            },
            "Save preset"
          )
        )
      ),

      e(
        "div",
        { className: "mb-3" },
        e("label", { className: "form-label" }, "Labels (one per line)"),
        e("textarea", {
          className: "form-control",
          rows: 4,
          value: labels,
          onChange: function (ev) {
            setLabels(ev.target.value);
          },
        })
      ),

      e(
        "div",
        { className: "row g-3" },
        e(
          "div",
          { className: "col-md-3" },
          e("label", { className: "form-label" }, "Columns"),
          e("input", {
            type: "number",
            className: "form-control",
            value: columns,
            onChange: function (ev) {
              setColumns(Math.max(1, Number(ev.target.value) || 1));
            },
          })
        ),
        e(
          "div",
          { className: "col-md-3" },
          e("label", { className: "form-label" }, "Font size (pt)"),
          e("input", {
            type: "number",
            className: "form-control",
            value: fontSize,
            onChange: function (ev) {
              setFontSize(Number(ev.target.value) || 1);
            },
          })
        ),
        e(
          "div",
          { className: "col-md-3" },
          e("label", { className: "form-label" }, "Code size (mm)"),
          e("input", {
            type: "number",
            className: "form-control",
            value: codeSizeMm,
            onChange: function (ev) {
              setCodeSizeMm(Number(ev.target.value) || 1);
            },
          })
        ),
        e(
          "div",
          { className: "col-md-3" },
          e("label", { className: "form-label" }, "DPI"),
          e("input", {
            type: "number",
            className: "form-control",
            value: dpi,
            onChange: function (ev) {
              setDpi(Number(ev.target.value) || 72);
            },
          })
        )
      ),

      e(
        "div",
        { className: "row g-3 mt-1" },
        e(
          "div",
          { className: "col-md-3" },
          e("label", { className: "form-label" }, "Horizontal margin (mm)"),
          e("input", {
            type: "number",
            className: "form-control",
            value: marginH,
            onChange: function (ev) {
              setMarginH(Number(ev.target.value) || 0);
            },
          })
        ),
        e(
          "div",
          { className: "col-md-3" },
          e("label", { className: "form-label" }, "Vertical margin (mm)"),
          e("input", {
            type: "number",
            className: "form-control",
            value: marginV,
            onChange: function (ev) {
              setMarginV(Number(ev.target.value) || 0);
            },
          })
        ),
        e(
          "div",
          { className: "col-md-3" },
          e("label", { className: "form-label" }, "Padding X inside (mm)"),
          e("input", {
            type: "number",
            className: "form-control",
            value: paddingH,
            onChange: function (ev) {
              setPaddingH(Number(ev.target.value) || 0);
            },
          })
        ),
        e(
          "div",
          { className: "col-md-3" },
          e("label", { className: "form-label" }, "Padding Y inside (mm)"),
          e("input", {
            type: "number",
            className: "form-control",
            value: paddingV,
            onChange: function (ev) {
              setPaddingV(Number(ev.target.value) || 0);
            },
          })
        )
      ),

      e(
        "div",
        { className: "row g-3 mt-1" },
        e(
          "div",
          { className: "col-md-4" },
          e("label", { className: "form-label" }, "Code type"),
          e(
            "select",
            {
              className: "form-select",
              value: codeType,
              onChange: function (ev) {
                setCodeType(ev.target.value);
              },
            },
            e("option", { value: "datamatrix" }, "DataMatrix"),
            e("option", { value: "qrcode" }, "QR Code")
          )
        ),
        e(
          "div",
          { className: "col-md-4" },
          e("label", { className: "form-label" }, "Text position"),
          e(
            "select",
            {
              className: "form-select",
              value: textPosition,
              onChange: function (ev) {
                setTextPosition(ev.target.value);
              },
            },
            e("option", { value: "top" }, "Top"),
            e("option", { value: "bottom" }, "Bottom"),
            e("option", { value: "left" }, "Left"),
            e("option", { value: "right" }, "Right")
          )
        ),
        e(
          "div",
          { className: "col-md-4" },
          e("label", { className: "form-label" }, "Paper size"),
          e(
            "select",
            {
              className: "form-select",
              value: paper,
              onChange: function (ev) {
                setPaper(ev.target.value);
              },
            },
            e("option", { value: "A4" }, "A4"),
            e("option", { value: "LETTER" }, "Letter")
          )
        )
      ),

      e(
        "div",
        { className: "d-flex justify-content-between align-items-center mt-4" },
        e(
          "button",
          {
            className: "btn btn-primary",
            onClick: generate,
          },
          "Generate PDF"
        ),
        e(
          "button",
          {
            className: "btn btn-outline-danger",
            onClick: handleDeletePreset,
            disabled: currentPresetName === "Default",
          },
          currentPresetName === "Default"
            ? "Cannot delete default preset"
            : "Delete current preset"
        )
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(e(App));
