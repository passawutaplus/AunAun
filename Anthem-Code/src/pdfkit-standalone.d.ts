// pdfkit's browser build ships without types; aboutCvTextPdf.ts types the slice it uses.
declare module "pdfkit/js/pdfkit.standalone.js" {
  const PDFDocument: unknown;
  export default PDFDocument;
}
