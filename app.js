const e = React.createElement;

function App() {
  const [labels, setLabels] = React.useState("");

  // Layout & code settings
  const [columns, setColumns] = React.useState(3);
  const [marginH, setMarginH] = React.useState(10); 
  const [marginV, setMarginV] = React.useState(10); 
  const [paddingH, setPaddingH] = React.useState(3);
  const [paddingV, setPaddingV] = React.useState(3);
  const [fontSize, setFontSize] = React.useState(10);
  const [codeSizeMm, setCodeSizeMm] = React.useState(12);
  const [dpi, setDpi] = React.useState(200);
  const [paper, setPaper] = React.useState("A4");
  const [codeType, setCodeType] = React.useState("datamatrix");
  const [textPosition, setTextPosition] = React.useState("top");

  // NEW: Number of replicates
  const [replicates, setReplicates] = React.useState(1);

  // Presets
  const [presets, setPresets] = React.useState([]);
  const [currentPresetName, setCurrentPresetName] = React.useState("Default");
  const [presetNameInput, setPresetNameInput] = React.useState("Default");

  // For import file input
  const fileInputRef = React.useRef(null);

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
    replicates: 1
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
    setReplicates(p.replicates ?? 1);
  }

  React.useEffect(function () {
    let storedPresets = [];
    const raw = window.localStorage.getItem("labelPresets");
    if (raw) {
      try { storedPresets = JSON.parse(raw) || []; }
      catch (e) { storedPresets = []; }
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
    if (!name) name = currentPresetName || "Preset";

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
      replicates
    };

    const existingIndex = presets.findIndex((p) => p.name === name);
    const next = presets.slice();

    if (existingIndex >= 0) next[existingIndex] = presetData;
    else next.push(presetData);

    setPresets(next);
    setCurrentPresetName(name);
    setPresetNameInput(name);

    window.localStorage.setItem("labelPresets", JSON.stringify(next));
    window.localStorage.setItem("labelLastPreset", name);
  };

  const handleDeletePreset = function () {
    if (currentPresetName === "Default") return;

    const next = presets.filter((p) => p.name !== currentPresetName);
    let fallback = next.find((p) => p.name === "Default") || next[0] || defaultPreset;

    const finalPresets = next.length ? next : [defaultPreset];
    setPresets(finalPresets);
    applyPresetToState(fallback);
    setCurrentPresetName(fallback.name);
    setPresetNameInput(fallback.name);

    window.localStorage.setItem("labelPresets", JSON.stringify(finalPresets));
    window.localStorage.setItem("labelLastPreset", fallback.name);
  };

  // --- Export presets as JSON ---
  const handleExportPresets = function () {
    const data = {
      presets: presets,
      lastPreset: currentPresetName,
      version: 2
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "label-presets.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Import presets ---
  const handleImportClick = function () {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImportFileChange = function (ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function () {
      try {
        const parsed = JSON.parse(reader.result);
        let importedPresets = [];

        if (Array.isArray(parsed)) importedPresets = parsed;
        else if (parsed && Array.isArray(parsed.presets))
          importedPresets = parsed.presets;
        else {
          alert("Invalid presets file format.");
          return;
        }

        // Ensure default exists
        if (!importedPresets.some((p) => p.name === defaultPreset.name)) {
          importedPresets.unshift(defaultPreset);
        }

        const finalPresets = importedPresets;
        setPresets(finalPresets);
        window.localStorage.setItem("labelPresets", JSON.stringify(finalPresets));

        const lastName =
          parsed.lastPreset ||
          window.localStorage.getItem("labelLastPreset") ||
          defaultPreset.name;

        const presetToApply =
          finalPresets.find((p) => p.name === lastName) || finalPresets[0];

        applyPresetToState(presetToApply);
        setCurrentPresetName(presetToApply.name);
        setPresetNameInput(presetToApply.name);
        window.localStorage.setItem("labelLastPreset", presetToApply.name);
      } catch (err) {
        console.error(err);
        alert("Could not read presets file.");
      } finally {
        ev.target.value = ""; // allow re-import of same file
      }
    };

    reader.readAsText(file);
  };

  // -------------------------------------------------------
  //               LABEL GENERATION + REPLICATES
  // -------------------------------------------------------

  const generate = async function () {
    let list = labels
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (!list.length) {
      alert("No labels provided.");
      return;
    }

    // NEW: Expand list by number of replicates
    let expanded = [];
    for (let item of list) {
      for (let r = 0; r < replicates; r++) {
        expanded.push(item);
      }
    }
    list = expanded;

    const jsPDF = window.jspdf.jsPDF;

    let pageWmm = 210, pageHmm = 297;
    if (paper === "LETTER") { pageWmm = 216; pageHmm = 279; }

    const mmToPt = (mm) => mm * 2.83465;
    const pageW = mmToPt(pageWmm);
    const pageH = mmToPt(pageHmm);

    const pdf = new jsPDF({ unit: "pt", format: [pageW, pageH] });
    pdf.setFont("courier", "normal");

    const marginHPt = mmToPt(marginH);
    const marginVPt = mmToPt(marginV);
    const paddingHPt = mmToPt(paddingH);
    const paddingVPt = mmToPt(paddingV);
    const codeSide = mmToPt(codeSizeMm);

    const contentW = pageW - 2 * marginHPt;
    const contentH = pageH - 2 * marginVPt;
    const textHeight = fontSize * 1.2;

    const cellW = contentW / columns;
    const cellH = 2 * paddingVPt + textHeight + codeSide;

    const rows = Math.floor(contentH / cellH);
    if (rows <= 0) {
      alert("Settings produce zero rows per page.");
      return;
    }

    const perPage = rows * columns;
    const canvas = document.createElement("canvas");

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

      // Dotted label boundary
      try { if (pdf.setLineDash) pdf.setLineDash([2, 2], 0); } catch {}
      pdf.setDrawColor(150);
      pdf.setLineWidth(0.3);
      pdf.rect(xLabel, yLabel, cellW, cellH);
      try { if (pdf.setLineDash) pdf.setLineDash([]); } catch {}

      // Inner content area
      const xInner = xLabel + paddingHPt;
      const yInner = yLabel + paddingVPt;
      const innerW = cellW - 2 * paddingHPt;
      const innerH = cellH - 2 * paddingVPt;

      // Generate code
      const px = dpi * 1.2;
      canvas.width = px;
      canvas.height = px;

      const bcid = codeType === "qrcode" ? "qrcode" : "datamatrix";
      try {
        bwipjs.toCanvas(canvas, { bcid, text: item, scale: 4, includetext: false });
      } catch (err) {
        alert("Failed to generate code for: " + item);
        throw err;
      }

      const img = canvas.toDataURL("image/png");
      pdf.setFontSize(fontSize);

      if (textPosition === "top") {
        const ty = yInner + textHeight;
        pdf.text(item, xInner + innerW / 2, ty, { align: "center" });

        const cx = xInner + innerW / 2 - codeSide / 2;
        const cy = ty + 4;
        pdf.addImage(img, "PNG", cx, cy, codeSide, codeSide);
      }

      else if (textPosition === "bottom") {
        const cx = xInner + innerW / 2 - codeSide / 2;
        const cy = yInner;
        pdf.addImage(img, "PNG", cx, cy, codeSide, codeSide);

        const ty = yInner + innerH - 4;
        pdf.text(item, xInner + innerW / 2, ty, { align: "center" });
      }

      else if (textPosition === "left") {
        const cx = xInner + innerW - codeSide;
        const cy = yInner + (innerH - codeSide) / 2;
        pdf.addImage(img, "PNG", cx, cy, codeSide, codeSide);

        const ty = yInner + innerH / 2 + fontSize / 2 - 2;
        pdf.text(item, xInner + 2, ty, { align: "left" });
      }

      else if (textPosition === "right") {
        const cx = xInner;
        const cy = yInner + (innerH - codeSide) / 2;
        pdf.addImage(img, "PNG", cx, cy, codeSide, codeSide);

        const ty = yInner + innerH / 2 + fontSize / 2 - 2;
        pdf.text(item, xInner + codeSide + 4, ty, { align: "left" });
      }
    }

    pdf.save("labels.pdf");
  };

  // -------------------------------------------------------
  //                     UI LAYOUT
  // -------------------------------------------------------

  return e(
    "div",
    { className: "card shadow-sm h-100 w-100" },
    e(
      "div",
      { className: "card-body" },

      // hidden file input for import
      e("input", {
        type: "file",
        accept: "application/json",
        style: { display: "none" },
        ref: fileInputRef,
        onChange: handleImportFileChange
      }),

      // Preset controls
      e(
        "div",
        { className: "row g-3 mb-2 align-items-end" },

        e(
          "div",
          { className: "col-md-4" },
          e("label", { className: "form-label mb-1" }, "Preset"),
          e(
            "select",
            {
              className: "form-select form-select-sm",
              value: currentPresetName,
              onChange: (ev) => handleSelectPreset(ev.target.value)
            },
            presets.map((p) =>
              e("option", { key: p.name, value: p.name }, p.name)
            )
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
            onChange: (ev) => setPresetNameInput(ev.target.value)
          })
        ),

        e(
          "div",
          { className: "col-md-4 d-grid" },
          e("label", { className: "form-label mb-1 invisible" }, "Save"),
          e(
            "button",
            { className: "btn btn-sm btn-outline-primary", onClick: handleSavePreset },
            "Save preset"
          )
        )
      ),

      // Export / Import buttons
      e(
        "div",
        { className: "d-flex gap-2 mb-3" },
        e(
          "button",
          {
            type: "button",
            className: "btn btn-sm btn-outline-secondary",
            onClick: handleExportPresets
          },
          "Export presets"
        ),
        e(
          "button",
          {
            type: "button",
            className: "btn btn-sm btn-outline-secondary",
            onClick: handleImportClick
          },
          "Import presets"
        )
      ),

      // Label input
      e(
        "div",
        { className: "mb-3" },
        e("label", { className: "form-label" }, "Labels (one per line)"),
        e("textarea", {
          className: "form-control",
          rows: 4,
          value: labels,
          onChange: (ev) => setLabels(ev.target.value)
        })
      ),

      // FIRST ROW: columns, font size, code size, DPI
      e(
        "div",
        { className: "row g-3" },

        e(
          "div",
          { className: "col-md-2" },
          e("label", { className: "form-label" }, "Columns"),
          e("input", {
            type: "number",
            className: "form-control",
            value: columns,
            onChange: (ev) => setColumns(Math.max(1, Number(ev.target.value) || 1))
          })
        ),

        // NEW: Number of replicates
        e(
          "div",
          { className: "col-md-2" },
          e("label", { className: "form-label" }, "Replicates"),
          e("input", {
            type: "number",
            className: "form-control",
            value: replicates,
            min: 1,
            onChange: (ev) =>
              setReplicates(Math.max(1, Number(ev.target.value) || 1))
          })
        ),

        e(
          "div",
          { className: "col-md-2" },
          e("label", { className: "form-label" }, "Font size (pt)"),
          e("input", {
            type: "number",
            className: "form-control",
            value: fontSize,
            onChange: (ev) => setFontSize(Number(ev.target.value) || 1)
          })
        ),

        e(
          "div",
          { className: "col-md-2" },
          e("label", { className: "form-label" }, "Code size (mm)"),
          e("input", {
            type: "number",
            className: "form-control",
            value: codeSizeMm,
            onChange: (ev) => setCodeSizeMm(Number(ev.target.value) || 1)
          })
        ),

        e(
          "div",
          { className: "col-md-2" },
          e("label", { className: "form-label" }, "DPI"),
          e("input", {
            type: "number",
            className: "form-control",
            value: dpi,
            onChange: (ev) => setDpi(Number(ev.target.value) || 72)
          })
        )
      ),

      // SECOND ROW: margins + padding
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
            onChange: (ev) => setMarginH(Number(ev.target.value) || 0)
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
            onChange: (ev) => setMarginV(Number(ev.target.value) || 0)
          })
        ),

        e(
          "div",
          { className: "col-md-3" },
          e("label", { className: "form-label" }, "Padding X (mm)"),
          e("input", {
            type: "number",
            className: "form-control",
            value: paddingH,
            onChange: (ev) => setPaddingH(Number(ev.target.value) || 0)
          })
        ),

        e(
          "div",
          { className: "col-md-3" },
          e("label", { className: "form-label" }, "Padding Y (mm)"),
          e("input", {
            type: "number",
            className: "form-control",
            value: paddingV,
            onChange: (ev) => setPaddingV(Number(ev.target.value) || 0)
          })
        )
      ),

      // THIRD ROW: code type, text position, paper size
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
              onChange: (ev) => setCodeType(ev.target.value)
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
              onChange: (ev) => setTextPosition(ev.target.value)
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
              onChange: (ev) => setPaper(ev.target.value)
            },
            e("option", { value: "A4" }, "A4"),
            e("option", { value: "LETTER" }, "Letter")
          )
        )
      ),

      // Buttons
      e(
        "div",
        { className: "d-flex justify-content-between align-items-center mt-4" },

        e(
          "button",
          { className: "btn btn-primary", onClick: generate },
          "Generate PDF"
        ),

        e(
          "button",
          {
            className: "btn btn-outline-danger",
            onClick: handleDeletePreset,
            disabled: currentPresetName === "Default"
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
