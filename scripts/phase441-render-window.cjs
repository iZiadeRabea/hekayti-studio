// Isolated synthetic Chromium render only; does not open the owner's app or database.
const { app, BrowserWindow } = require("electron");
const { readFile, writeFile } = require("node:fs/promises");
const { join, resolve } = require("node:path");
const root = resolve(process.argv[2]);
if (!root.split(/[\\/]/).at(-1).startsWith("hekayti-phase44-ui-"))
  throw Error("Synthetic evidence directory required");
app.setPath("userData", join(root, "electron-data"));
app.on("window-all-closed", () => {});
app
  .whenReady()
  .then(async () => {
    const input = JSON.parse(
      await readFile(join(root, "render-input.json"), "utf8"),
    );
    const out = [];
    for (const kind of ["digital", "print"]) {
      const win = new BrowserWindow({
        show: false,
        width: 1000,
        height: 1100,
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
        },
      });
      await win.loadFile(join(root, `synthetic-composition-${kind}.html`));
      const measurement = await win.webContents.executeJavaScript(
        input.measure,
      );
      if (measurement.errors.length || !measurement.fontReady) {
        const metrics = await win.webContents.executeJavaScript(
          `Array.from(document.querySelectorAll('[data-box]')).map(b=>{const t=b.querySelector('.book-text'),c=getComputedStyle(b);return {id:b.dataset.box,height:b.clientHeight,width:b.clientWidth,padding:c.padding,th:t.scrollHeight,tw:t.scrollWidth,tc:t.clientHeight}})`,
        );
        throw Error(JSON.stringify({ measurement, metrics }));
      }
      const pdf = await win.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        generateTaggedPDF: true,
      });
      await writeFile(join(root, `synthetic-composition-${kind}.pdf`), pdf);
      out.push({ kind, ...measurement, bytes: pdf.length });
      win.destroy();
    }
    await writeFile(
      join(root, "native-render-results.json"),
      JSON.stringify(out, null, 2),
    );
    app.quit();
  })
  .catch((e) => {
    console.error(e);
    app.exit(1);
  });
